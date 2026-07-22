import React from 'react';
import { getContratosLocacao, getCobrancas, getAgendaVencimentosLocacao } from './actions';
import { getImoveis } from '@/app/actions/imoveisActions';
import LocacaoClientContainer from './components/LocacaoClientContainer';
export const dynamic = 'force-dynamic';


// 1. O componente agora é uma função assíncrona pura no servidor
export default async function LocacaoPage() {

  // 2. Buscamos todos os dados paralelamente para carregar a página mais rápido
  // Usar Promise.all evita que uma requisição espere a outra terminar
  const agora = new Date();
  const agendaAno = agora.getFullYear();
  const agendaMes = agora.getMonth() + 1;
  const [contratosRes, cobrancasRes, imoveisRes, agendaRes] = await Promise.all([
    getContratosLocacao(),
    getCobrancas(),
    getImoveis(), // Pre-carregamos os imóveis aqui no servidor para já entregar pronto
    getAgendaVencimentosLocacao(agendaAno, agendaMes),
  ]);

  // 3. Tratamento defensivo: garantimos que sempre teremos um array, mesmo se a API falhar
  const contratos = contratosRes?.data || [];
  const cobrancas = cobrancasRes?.data || [];
  const imoveis = imoveisRes?.data || [];

  // 4. Passamos os dados limpos via propriedades (props) para o Client Component
  return (
    <div className="min-h-screen bg-gray-50">
      <LocacaoClientContainer
        initialContratos={contratos}
        initialCobrancas={cobrancas}
        initialImoveis={imoveis}
        initialAgenda={agendaRes.data}
        agendaAno={agendaAno}
        agendaMes={agendaMes}
      />

    </div>

  );
}
