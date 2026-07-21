import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma";
import { criarAcordoManualAction } from "./app/actions/interActions";

async function main() {
  try {
    // 1. Fetch a real locatario
    const locatario = await prisma.locatario.findFirst({
      select: {
        id: true,
        nome: true,
        cpfCnpj: true,
        contratoId: true,
        endereco: true
      }
    });

    if (!locatario) {
      console.log("Nenhum locatário encontrado no banco de dados.");
      return;
    }

    console.log("Locatário selecionado para teste:", locatario.nome);
    console.log("CPF/CNPJ:", locatario.cpfCnpj);
    console.log("ID:", locatario.id);
    console.log("Contrato ID:", locatario.contratoId);

    // 2. Call criarAcordoManualAction
    console.log("\n--- TESTANDO criarAcordoManualAction ---");
    const res = await criarAcordoManualAction({
      locatarioId: locatario.id,
      contratoId: locatario.contratoId,
      descricao: "Acordo de Débitos - Teste Inquilino",
      valor: 550.00,
      vencimentoStr: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days in future
      cpfCnpj: locatario.cpfCnpj || "11122233344",
      enderecoJson: locatario.endereco || { logradouro: "Rua Teste", numero: "123", bairro: "Centro", cidade: "Ilha Solteira", uf: "SP", cep: "15385000" }
    });

    console.log("Resultado da execução:", res);

  } catch (error) {
    console.error("Erro no script de teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
