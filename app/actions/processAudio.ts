"use server";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export async function processAudioComment(formData: FormData): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("[Gemini Action] Erro: A variável GOOGLE_GENERATIVE_AI_API_KEY não foi encontrada no process.env em tempo de execução.");
  }

  const googleProvider = createGoogleGenerativeAI({
    apiKey,
  });

  const audioFile = formData.get("audio") as File;
  const roomName = formData.get("roomName") as string | null;
  const roomType = formData.get("roomType") as string | null;

  if (!audioFile) {
    throw new Error("Nenhum áudio fornecido");
  }

  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const roomContextText = roomName && roomType
      ? `O áudio descreve o cômodo: "${roomName}" (Tipo: ${roomType}).`
      : "O áudio descreve um cômodo ou área geral do imóvel.";

    const systemPrompt = `Você é um assistente de engenharia civil/arquitetura altamente qualificado, especializado em vistorias imobiliárias de locação e venda.
Sua tarefa é ouvir o áudio fornecido pelo vistoriador e gerar uma descrição/comentário profissional, técnico, limpo e direto para constar no laudo de vistoria.

Contexto:
${roomContextText}

Instruções fundamentais:
1. Remova todos os vícios de linguagem, termos coloquiais, hesitações e repetições (ex: "né", "tipo assim", "aí", "tá", "então", "éee", "hum", gagueiras, etc.).
2. Traduza termos coloquiais comuns em vistorias para a terminologia técnica adequada. Por exemplo:
   - "tá meio sujo / manchado" -> "Apresenta sujidade/manchas na superfície."
   - "tá riscado / tem uns risquinhos" -> "Riscos superficiais na pintura/acabamento."
   - "não liga / queimado" -> "Ponto de iluminação/tomada inoperante."
   - "tá meio solta / chacoalhando" -> "Instabilidade na fixação / apresenta folga."
   - "porta tá pegando / ruim de abrir / raspando" -> "Atrito ou resistência na folha da esquadria durante a abertura/fechamento."
   - "parece infiltração / mancha de água" -> "Indícios de infiltração ou umidade ascendente."
   - "está tudo certo / perfeito" -> "Em perfeito estado de conservação, limpeza e funcionamento."
3. Foque estritamente em relatar o estado físico do ambiente, paredes, piso, teto, janelas, portas, tomadas e interruptores mencionados no áudio.
4. Mantenha a descrição concisa, profissional e direta ao ponto. Se o usuário apontar múltiplos problemas, organize-os em tópicos claros ou frases bem pontuadas.
5. Retorne APENAS o texto limpo e final da descrição do cômodo. Não adicione saudações, introduções ou explicações (ex: não comece com "Transcrição:", "Aqui está o texto:", etc.).`;

    // O usuário solicitou "gemini-3.1-flash-lite".
    const { text } = await generateText({
      model: googleProvider('gemini-3.1-flash-lite'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: systemPrompt
            },
            {
              type: 'file',
              data: buffer,
              mediaType: audioFile.type || 'audio/webm',
            } as any
          ]
        }
      ]
    });

    return text.trim();
  } catch (error) {
    console.error("Erro no processamento da IA:", error);
    throw new Error("Falha ao processar o áudio com a IA Gemini.");
  }
}
