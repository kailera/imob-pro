import { GET } from "../app/api/financeiro/transacoes/route";
import { NextRequest } from "next/server";
import dotenv from "dotenv";

dotenv.config();
console.log("DATABASE_URL FROM ENV:", process.env.DATABASE_URL);

async function main() {
  try {
    const req = new NextRequest("http://localhost:3000/api/financeiro/transacoes?categoria=ALUGUEL&page=1&limit=10");
    const response = await GET(req);
    const json = await response.json();
    console.log("API RESPONSE TOTALS:", json.totals);
    console.log("API RESPONSE DATA LENGTH:", json.data?.length);
    console.log("API RESPONSE TOTAL COUNT:", json.total);
  } catch (error) {
    console.error("Error testing API:", error);
  }
}

main();
