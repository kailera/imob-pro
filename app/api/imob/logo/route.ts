import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const { orgId, orgRole } = await auth();
    
    // Exige ser administrador para alterar o logo
    if (orgRole && orgRole !== "org:admin") {
      return NextResponse.json({ error: "Apenas administradores podem atualizar o logotipo." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido para upload." }, { status: 400 });
    }

    // Identificar qual imobiliária (Imob) atualizar
    let imobId = "";
    if (orgId) {
      const imob = await prisma.imob.findUnique({ where: { orgId } });
      imobId = imob ? imob.id : "";
    } else {
      const firstImob = await prisma.imob.findFirst();
      imobId = firstImob ? firstImob.id : "";
    }

    if (!imobId) {
      return NextResponse.json({ error: "Imobiliária não encontrada no sistema." }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extension = file.name.split(".").pop() || "";
    const key = `logos/${imobId}-${Date.now()}.${extension}`;

    // Modo de demonstração local ativado (Sem credenciais RustFS)
    const isDevMock = !process.env.RUSTFS_ENDPOINT || process.env.RUSTFS_MOCK === "true";
    let finalUrl = "";

    if (isDevMock) {
      console.log("Mock local de upload de logo.");
      const base64 = buffer.toString("base64");
      finalUrl = `data:${file.type};base64,${base64}`;
    } else {
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        const publicUrl = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
        finalUrl = `${publicUrl}/${bucketName}/${key}`;
      } catch (uploadError: any) {
        if (uploadError.name === "NoSuchBucket") {
          await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
          await s3Client.send(new PutObjectCommand(uploadParams));
          const publicUrl = process.env.RUSTFS_PUBLIC_URL || process.env.RUSTFS_ENDPOINT || "http://localhost:9000";
          finalUrl = `${publicUrl}/${bucketName}/${key}`;
        } else {
          throw uploadError;
        }
      }
    }

    // Atualizar logoUrl no banco local
    await prisma.imob.update({
      where: { id: imobId },
      data: {
        logoUrl: finalUrl,
      },
    });

    return NextResponse.json({ success: true, url: finalUrl });
  } catch (error: any) {
    console.error("Erro no upload de logo da imobiliária:", error);
    return NextResponse.json({ error: error.message || "Erro interno ao processar upload do logotipo." }, { status: 500 });
  }
}
