# ============================================
# Stage 1: Install dependencies
# ============================================
ARG NODE_VERSION=22-slim
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Instalar dependências necessárias para o Prisma (openssl)
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Build Next.js application
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Instalar openssl no builder também
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variável dummy para o prisma.config.ts não quebrar no build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dummy"
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_CPUS=1
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Gerar o Prisma Client diretamente no builder para garantir OpenSSL e binários corretos
RUN npx prisma generate

# Garantir a existência do index.ts para que os imports '@/generated/prisma' funcionem perfeitamente
# 1. Verificação explícita de tipos TypeScript (se falhar, o Portainer mostra o erro exato nesta etapa)
RUN npx tsc --noEmit

# 2. Compilar a aplicação Next.js
RUN npm run build
RUN touch /tmp/build-complete

# Target usado somente pelo serviço manual de migração de dados legados.
# Não inicia a aplicação e não executa o build do Next.js.
FROM node:${NODE_VERSION} AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# ============================================
# Stage 3: Run Next.js application
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Aguarda o build terminar antes de instalar os pacotes do runner.
# Sem esta dependência o BuildKit executa ffmpeg e Next.js em paralelo,
# podendo esgotar a memória de hosts menores.
COPY --from=builder /tmp/build-complete /tmp/build-complete

# Instala somente os pacotes necessários para o Prisma e compressão de vídeo.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ffmpeg && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --create-home nextjs

RUN mkdir .next && chown nextjs:nodejs .next

# Copia os arquivos públicos e os estáticos gerados no build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copia os arquivos do Prisma para o Runner
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Configura o script de inicialização
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
