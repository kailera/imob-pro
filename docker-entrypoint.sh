#!/bin/sh
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║          Imob Pro — Production Entrypoint    ║"
echo "╚══════════════════════════════════════════════╝"

echo "[INFO] Verificando se o schema do Prisma existe no container:"
ls -la prisma/schema.prisma || echo "[ERRO] ❌ O schema.prisma não foi encontrado no container!"

echo "[INFO] Executando migrations do Prisma no banco de dados..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[INFO] 🚀 Iniciando aplicação: $@"
exec "$@"
