# ============================================
# Stage 1: Install dependencies
# ============================================
ARG NODE_VERSION=22-slim
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Instalar dependências necessárias para o Prisma (openssl)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Build Next.js application
# ============================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Instalar openssl no builder também
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variável dummy para o prisma.config.ts não quebrar no build
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

# Gerar o Prisma Client diretamente no builder para garantir OpenSSL e binários corretos
RUN npx prisma generate

# Garantir a existência do index.ts para que os imports '@/generated/prisma' funcionem perfeitamente
RUN echo 'export * from "./client";' > generated/prisma/index.ts

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Compilar a aplicação Next.js
RUN npm run build

# ============================================
# Stage 3: Run Next.js application
# ============================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Instala o openssl e ffmpeg, necessários para o Prisma e compressão de vídeo no Linux
RUN apt-get update && apt-get install -y openssl ffmpeg && rm -rf /var/lib/apt/lists/*

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
