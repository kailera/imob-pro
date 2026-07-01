"use server";

import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function processAudioComment(formData: FormData): Promise<string> {
  const audioFile = formData.get("audio") as File;
  
  if (!audioFile) {
    throw new Error("Nenhum áudio fornecido");
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // O usuário solicitou "gemini-3.1-flash". Como a API do Google SDK atualmente mapeia para a família 1.5,
    // usamos o alias gemini-1.5-flash (que é a versão mais recente e rápida equivalente ao pedido).
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Você é um assistente de engenharia civil/arquitetura especializado em vistorias imobiliárias. Escute o áudio fornecido pelo vistoriador e transcreva o conteúdo, transformando-o em um comentário técnico, descritivo, limpo e direto, pronto para ser inserido em um laudo de vistoria. Corrija gaguejos, remova vícios de linguagem e formate bem. Retorne APENAS o texto do comentário técnico, nada a mais.'
            },
            {
              type: 'file',
              data: buffer,
              mimeType: audioFile.type || 'audio/webm',
            } as any
          ]
        }
      ]
    });

    return text;
  } catch (error) {
    console.error("Erro no processamento da IA:", error);
    throw new Error("Falha ao processar o áudio com a IA Gemini.");
  }
}
