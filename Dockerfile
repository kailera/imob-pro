# ============================================
# Stage 1: Install dependencies & Generate Prisma
# ============================================
ARG NODE_VERSION=20-slim
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Copia apenas os arquivos de dependência primeiro
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm ci

# Copia os arquivos necessários para gerar o Prisma Client
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Variável dummy para o prisma.config.ts não quebrar no build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# ============================================
# Stage 2: Build Next.js application
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Copia os node_modules e o Prisma Client gerado do stage 1
COPY --from=deps /app/node_modules ./node_modules
# Copia o resto do código da aplicação
COPY . .
COPY --from=deps /app/generated ./generated

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Faz o build da aplicação (Standalone)
RUN npm run build

# ============================================
# Stage 3: Run Next.js application
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Instala o openssl, necessário para o Prisma rodar no Linux
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --create-home nextjs

# Cria e ajusta permissões da pasta .next
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copia os arquivos públicos e os estáticos gerados no build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia os arquivos do Prisma para o Runner
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

# Copia os node_modules para garantir o CLI do prisma no entrypoint
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Configura o script de inicialização
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
