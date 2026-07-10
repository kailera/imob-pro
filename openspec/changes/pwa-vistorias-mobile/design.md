## Context

A aplicação `imob-pro` possui um módulo de vistorias técnicas. Atualmente, os componentes de listagem e de ficha de vistoria detalhada foram concebidos sob uma premissa de uso Desktop, com múltiplos painéis laterais fixos e formulários extensos.
Embora haja suporte parcial a PWA (manifesto e registro de Service Worker ativado), o fluxo de dados depende inteiramente da conectividade em tempo real para disparar Server Actions de persistência no Postgres e de upload de fotos. Em áreas sem sinal de internet, a aplicação gera falhas de requisição.

---

## Goals / Non-Goals

**Goals:**
- Proporcionar uma interface responsiva móvel nativa (estilo app) para telas menores que 1024px.
- Adicionar armazenamento local resiliente via IndexedDB para cachear a lista de vistorias e guardar edições/comentários e mídias capturadas em offline.
- Criar um processador de sincronização em segundo plano que execute as alterações na ordem cronológica correta assim que a internet for restabelecida.
- Implementar integração com a câmera nativa do celular.

**Non-Goals:**
- Tornar todo o painel de administração (CRM, cobranças, jurídico) otimizado para celulares; o foco é estritamente no fluxo de vistorias (lista, criação básica e preenchimento da ficha técnica).
- Geração de PDF oficial offline. O download do PDF continuará dependendo de conexão de rede, mas cachearemos o PDF caso o vistoriador já o tenha gerado previamente enquanto estava online.

---

## Decisions

### 1. Utilização do Dexie.js para gerenciamento de IndexedDB
- **Escolha**: Dexie.js.
- **Motivação**: O IndexedDB nativo possui uma API baseada em eventos muito complexa e verbosa. Dexie fornece uma interface baseada em Promises limpa, suporte nativo a transações e tipagem forte em TypeScript.
- **Alternativas consideradas**:
  - *LocalStorage*: Descartado devido ao limite rígido de 5MB e impossibilidade de armazenar múltiplos Blobs de imagens.
  - *RxDB*: Descartado por ser excessivamente robusto e pesado para a necessidade atual de cache pontual de vistorias.

### 2. Layout Móvel com Viewport Bloqueado e Bottom Navigation
- **Escolha**: Adaptar a interface de `ficha-vistoria` para alternar entre painéis via Bottom Navigation em telas `< 1024px`.
- **Motivação**: Em dispositivos móveis, rolar uma página muito longa que contém a Planta 2D, a listagem de ambientes e a timeline de fotos em sequência vertical é ineficiente. Uma barra de navegação inferior permite alternância rápida entre os contextos de trabalho com um toque.

### 3. Fila de Upload de Imagens Offline via Blobs locais
- **Escolha**: Armazenar os arquivos de imagem capturados offline como objetos `Blob` no IndexedDB e renderizá-los na timeline usando `URL.createObjectURL(blob)`.
- **Motivação**: Converter imagens para Base64 consome muita memória RAM e processamento no dispositivo móvel, podendo travar o navegador. Os Blobs locais são eficientes e podem ser lidos diretamente no momento do upload.

---

## Risks / Trade-offs

- **[Risk] Sincronização Concorrente**: Se o mesmo vistoriador ou outro usuário alterar os dados da vistoria via desktop simultaneamente a uma edição offline.
  - *Mitigação*: A sincronização será baseada em comandos incrementais na fila (`syncQueue`). Em vez de sobrescrever todo o JSON da vistoria, as Server Actions aplicam apenas as alterações específicas (ex: adiciona comentário, altera status do cômodo).
- **[Risk] Falha de Upload de Mídias Volumosas**: O upload de múltiplos vídeos ou fotos offline pode falhar na reconexão por oscilação de rede.
  - *Mitigação*: A fila de sincronização MUST processar itens um por um de forma transacional. Se o upload de uma foto falhar, a fila pausa e tenta novamente depois, garantindo que nenhum dado seja removido do IndexedDB antes da confirmação de sucesso do servidor.
