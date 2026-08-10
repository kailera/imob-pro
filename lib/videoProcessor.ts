import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./storage";
import { prisma } from "./prisma";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { getPendingVideoFileKey, replacePendingVideoUrl } from "./vistorias/videoMedia";
import type { Prisma } from "@/generated/prisma";

export type VideoProcessingTarget =
  | { kind: "inspection-comment"; id: string }
  | { kind: "contestacao"; id: string };

class VideoQueue {
  private queue: { fileKey: string; target?: VideoProcessingTarget }[] = [];
  private processing = false;

  async enqueue(fileKey: string, target?: VideoProcessingTarget) {
    // Evita duplicatas na fila
    if (this.queue.some(item => item.fileKey === fileKey)) {
      console.log(`[VideoProcessor] Arquivo já está na fila: ${fileKey}`);
      return;
    }
    this.queue.push({ fileKey, target });
    console.log(`[VideoProcessor] Adicionado à fila: ${fileKey}. Tamanho da fila: ${this.queue.length}`);
    this.processNext();
  }

  private async processNext() {
    if (this.processing) return;
    const next = this.queue.shift();
    if (!next) return;

    this.processing = true;
    try {
      console.log(`[VideoProcessor] Iniciando processamento de: ${next.fileKey}`);
      await this.compressVideo(next.fileKey, next.target);
      console.log(`[VideoProcessor] Concluído processamento de: ${next.fileKey}`);
    } catch (err) {
      console.error(`[VideoProcessor] Falha ao processar ${next.fileKey}:`, err);
    } finally {
      this.processing = false;
      // Chama recursivamente para processar o próximo
      this.processNext();
    }
  }

  private async compressVideo(fileKey: string, target?: VideoProcessingTarget) {
    const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";
    const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
    
    const filename = path.basename(fileKey);
    const filenameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
    const finalKey = `comments/${filenameWithoutExt}.mp4`;
    const finalPublicUrl = `${endpoint}/${bucketName}/${finalKey}`;

    if (isDevMock) {
      console.log(`[VideoProcessor][Mock] Compressão ignorada; mantendo o arquivo original: ${fileKey}`);
      return;
    }

    const tempDir = os.tmpdir();
    const localInputPath = path.join(tempDir, `input-${filename}`);
    const localOutputPath = path.join(tempDir, `output-${filenameWithoutExt}.mp4`);

    try {
      // 1. Download do original do S3
      console.log(`[VideoProcessor] Baixando ${fileKey} de S3 para ${localInputPath}...`);
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      }));
      
      if (!response.Body) throw new Error("Stream de arquivo vindo do S3 está vazio.");
      const inputBytes = await response.Body.transformToByteArray();
      fs.writeFileSync(localInputPath, inputBytes);

      // 2. Executar compressão via FFmpeg local
      console.log(`[VideoProcessor] Compactando ${localInputPath} para ${localOutputPath}...`);
      // Escala para 720p (-vf scale=-2:720), codec x264, qualidade média/boa (crf 26), preset rápido (fast), áudio aac mono 64k
      const ffmpegCmd = `ffmpeg -y -i "${localInputPath}" -vf "scale=-2:720" -vcodec libx264 -crf 26 -preset fast -acodec aac -ac 1 -ar 44100 -b:a 64k "${localOutputPath}"`;
      
      await new Promise<void>((resolve, reject) => {
        exec(ffmpegCmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`[VideoProcessor] Erro ao rodar FFmpeg:`, stderr);
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // 3. Fazer upload do vídeo compactado para S3
      console.log(`[VideoProcessor] Fazendo upload do compactado ${finalKey} para S3...`);
      const fileBuffer = fs.readFileSync(localOutputPath);
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: finalKey,
        Body: fileBuffer,
        ContentType: "video/mp4",
      }));

      // 4. Atualizar banco de dados
      console.log(`[VideoProcessor] Atualizando URLs no banco de dados para ${finalPublicUrl}...`);
      await this.updateDatabaseUrls(fileKey, finalPublicUrl, target);

      // 5. Excluir original do S3
      console.log(`[VideoProcessor] Removendo arquivo original bruto do S3: ${fileKey}`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      }));

      console.log(`[VideoProcessor] Compressão concluída com sucesso para ${fileKey}`);
    } catch (error) {
      console.error(`[VideoProcessor] Falha no processamento de vídeo para ${fileKey}:`, error);
      throw error;
    } finally {
      // Limpar arquivos locais temporários do contêiner
      try {
        if (fs.existsSync(localInputPath)) fs.unlinkSync(localInputPath);
        if (fs.existsSync(localOutputPath)) fs.unlinkSync(localOutputPath);
      } catch (err) {
        console.error("[VideoProcessor] Erro ao limpar arquivos temporários locais:", err);
      }
    }
  }

  private async updateDatabaseUrls(fileKey: string, finalPublicUrl: string, target?: VideoProcessingTarget) {
    // 1. Atualizar MidiaComentario
    try {
      const midias = await prisma.midiaComentario.findMany({
        where: {
          url: {
            contains: fileKey,
          },
        },
      });

      for (const midia of midias) {
        await prisma.midiaComentario.update({
          where: { id: midia.id },
          data: { url: finalPublicUrl, tipo: "VIDEO" },
        });
        console.log(`[VideoProcessor] MidiaComentario id ${midia.id} atualizado para a nova URL.`);
      }
    } catch (err) {
      console.error("[VideoProcessor] Erro ao atualizar URLs em MidiaComentario:", err);
    }

    // 2. Atualizar diretamente o registro que originou o processamento.
    if (target?.kind === "inspection-comment") {
      const comment = await prisma.comentarioVistoria.findUnique({ where: { id: target.id } });
      if (!comment) throw new Error(`Comentário de vistoria ${target.id} não encontrado.`);

      const replacement = replacePendingVideoUrl(comment.midias, fileKey, finalPublicUrl);
      if (!replacement.updated) throw new Error(`URL temporária não encontrada no comentário ${target.id}.`);

      await prisma.comentarioVistoria.update({
        where: { id: target.id },
        data: { midias: replacement.media as Prisma.InputJsonValue },
      });
      return;
    }

    if (target?.kind === "contestacao") {
      const contestacao = await prisma.contestacaoVistoria.findUnique({ where: { id: target.id } });
      if (!contestacao) throw new Error(`Contestação ${target.id} não encontrada.`);

      const replacement = replacePendingVideoUrl(contestacao.midias, fileKey, finalPublicUrl);
      if (!replacement.updated) throw new Error(`URL temporária não encontrada na contestação ${target.id}.`);

      await prisma.contestacaoVistoria.update({
        where: { id: target.id },
        data: { midias: replacement.media as Prisma.InputJsonValue },
      });
      return;
    }

    // 3. Compatibilidade para chamadas antigas sem alvo explícito.
    try {
      // Buscamos contestações recentes e não resolvidas que possam ter essa mídia temporária
      const contestations = await prisma.contestacaoVistoria.findMany({
        where: {
          resolvido: false,
        },
      });

      for (const c of contestations) {
        if (c.midias && Array.isArray(c.midias)) {
          const replacement = replacePendingVideoUrl(c.midias, fileKey, finalPublicUrl);

          if (replacement.updated) {
            await prisma.contestacaoVistoria.update({
              where: { id: c.id },
              data: { midias: replacement.media as Prisma.InputJsonValue },
            });
            console.log(`[VideoProcessor] ContestacaoVistoria id ${c.id} atualizado com nova URL de mídia.`);
          }
        }
      }
    } catch (err) {
      console.error("[VideoProcessor] Erro ao atualizar URLs em ContestacaoVistoria:", err);
    }
  }
}

export const videoQueue = new VideoQueue();

export async function enqueueMediaVideos(media: unknown, target: VideoProcessingTarget): Promise<void> {
  if (!Array.isArray(media)) return;

  const keys = Array.from(new Set(
    media
      .map((item) => item && typeof item === "object" && "url" in item ? getPendingVideoFileKey(String(item.url)) : null)
      .filter((key): key is string => Boolean(key))
  ));

  await Promise.all(keys.map((fileKey) => videoQueue.enqueue(fileKey, target)));
}
