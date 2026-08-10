"use server";

import fs from "fs";
import path from "path";
import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, bucketName } from "@/lib/storage";

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  const extension = fileName.split(".").pop() || "";
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  const isVideo = contentType.startsWith("video/");
  const fileKey = isVideo 
    ? `comments/temp/${uniqueId}.${extension}` 
    : `comments/${uniqueId}.${extension}`;

  const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";
  const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
  const publicUrl = `${endpoint}/${bucketName}/${fileKey}`;

  if (isDevMock) {
    console.log("Modo de demonstração local ativo. Gerando mock de uploadUrl.");
    return {
      uploadUrl: `/api/mock-upload?key=${fileKey}`,
      fileKey,
      publicUrl
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrlRaw = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    
    let uploadUrl = uploadUrlRaw;
    if (process.env.RUSTFS_PUBLIC_URL) {
      try {
        const rawUrlObj = new URL(uploadUrlRaw);
        const publicUrlObj = new URL(process.env.RUSTFS_PUBLIC_URL);
        rawUrlObj.protocol = publicUrlObj.protocol;
        rawUrlObj.host = publicUrlObj.host;
        uploadUrl = rawUrlObj.toString();
      } catch (err) {
        console.error("Erro ao converter URL pública:", err);
      }
    }

    return { uploadUrl, fileKey, publicUrl };
  } catch (error: any) {
    console.error("Erro ao gerar URL pré-assinada:", error);
    throw new Error("Não foi possível gerar a URL de upload.");
  }
}

export async function uploadMediaToRustFS(formData: FormData): Promise<{ url: string; type: "image" | "video" }> {
  const file = formData.get("file") as File;
  
  if (!file) {
    throw new Error("Nenhum arquivo fornecido para upload");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const extension = file.name.split(".").pop() || "";
  const key = `comments/${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
  
  const isVideo = file.type.startsWith("video/");
  const type = isVideo ? "video" as const : "image" as const;

  // Se não houver credenciais definidas no ambiente, ativa o modo de demonstração off-line (Salva localmente)
  const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";

  const saveFileLocally = () => {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${extension}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  };

  if (isDevMock) {
    console.log("Modo de demonstração local ativado (Sem credenciais RustFS). Salvando arquivo na pasta public/uploads.");
    const url = saveFileLocally();
    return { url, type };
  }

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  };

  try {
    // Tenta fazer o upload do objeto
    await s3Client.send(new PutObjectCommand(uploadParams));

    const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
    const url = `${endpoint}/${bucketName}/${key}`;

    return { url, type };
  } catch (error: any) {
    // Se o erro for de bucket inexistente (NoSuchBucket), tenta criar e reenviar
    if (error.name === "NoSuchBucket") {
      console.log(`Bucket '${bucketName}' não encontrado no RustFS. Tentando criá-lo automaticamente...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        // Tenta enviar o objeto novamente
        await s3Client.send(new PutObjectCommand(uploadParams));
        
        const endpoint = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
        const url = `${endpoint}/${bucketName}/${key}`;
        
        return { url, type };
      } catch (createError) {
        console.error("Falha ao criar o bucket automaticamente no RustFS:", createError);
      }
    }

    console.error("Erro no upload para o RustFS:", error);
    // Caso ocorra um erro de rede/conexão na demo, fazemos o fallback resiliente para arquivo local
    console.warn("Fallback automático para gravação local para manter a demo funcionando.");
    const url = saveFileLocally();
    return { url, type };
  }
}

