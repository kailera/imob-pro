"use server";

import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/storage";

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

  // Se não houver credenciais definidas no ambiente, ativa o modo de demonstração off-line (Data URL)
  const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";

  if (isDevMock) {
    console.log("Modo de demonstração local ativado (Sem credenciais RustFS). Gerando Data URL temporária.");
    const base64 = buffer.toString("base64");
    const url = `data:${file.type};base64,${base64}`;
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

    const endpoint = process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
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
        
        const endpoint = process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
        const url = `${endpoint}/${bucketName}/${key}`;
        
        return { url, type };
      } catch (createError) {
        console.error("Falha ao criar o bucket automaticamente no RustFS:", createError);
      }
    }

    console.error("Erro no upload para o RustFS:", error);
    // Caso ocorra um erro de rede/conexão na demo, fazemos o fallback resiliente para Data URL
    console.warn("Fallback automático para Data URL para manter a demo funcionando.");
    const base64 = buffer.toString("base64");
    const url = `data:${file.type};base64,${base64}`;
    return { url, type };
  }
}

