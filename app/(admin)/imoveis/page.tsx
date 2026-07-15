import React from "react";
import { getImoveis, getLoteamentos } from "@/app/actions/imoveisActions";
import ImoveisClient from "./components/ImoveisClient";

export const dynamic = "force-dynamic";

export default async function ImoveisPage() {
  const imoveisRes = await getImoveis();
  const loteamentosRes = await getLoteamentos();

  const initialImoveis = imoveisRes.success && imoveisRes.data ? imoveisRes.data : [];
  const initialLoteamentos = loteamentosRes.success && loteamentosRes.data ? loteamentosRes.data : [];

  return (
    <ImoveisClient 
      initialImoveis={initialImoveis} 
      initialLoteamentos={initialLoteamentos} 
    />
  );
}
