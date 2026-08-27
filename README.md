This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Sincronização dos índices de reajuste

Configure `CRON_SECRET` no ambiente e faça uma chamada diária:

```bash
curl -X POST https://SEU_DOMINIO/api/indices/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

O endpoint atualiza os últimos 18 meses de IGP-M, IGP-DI, INPC, IPC-Fipe,
IPC-DI e IPCA usando as séries mensais do SGS/BCB. Ao calcular um reajuste,
o sistema usa o histórico salvo e tenta buscar somente competências ausentes.
O reajuste é bloqueado se o intervalo mensal estiver incompleto.

## Sincronização diária dos boletos do Banco Inter

Configure `CRON_SECRET` no ambiente do Docker/Portainer. O serviço
`inter-status-cron` chama a cada 15 minutos a rota:

```bash
curl -X POST https://SEU_DOMINIO/api/inter/cobrancas/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

A rotina seleciona apenas transações pendentes com `interCodigoSolicitacao`,
consulta `GET /cobranca/v3/cobrancas/{codigoSolicitacao}` e atualiza status,
data, valor e origem do recebimento. Por padrão, processa 50 cobranças por
execução, com intervalo de 6,5 segundos para respeitar também o limite do
sandbox. Os valores podem ser ajustados com `INTER_STATUS_SYNC_BATCH_SIZE` e
`INTER_STATUS_SYNC_INTERVAL_MS`.

Depois de alterar `CRON_SECRET` ou este agendamento, recrie o serviço
`inter-status-cron` para que o Portainer/Docker carregue a configuração nova.

O webhook do Inter permanece como atualização principal em tempo real; o cron
serve como reconciliação para callbacks atrasados ou perdidos. A tela de
cobranças recarrega silenciosamente a cada cinco minutos e ao voltar ao foco.
