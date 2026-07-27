import type { NextConfig } from "next";
import { existsSync } from "fs";
import path from "path";
import { execSync } from "child_process";

const getBuildId = () => {
  if (process.env.NEXT_PUBLIC_BUILD_ID) {
    return process.env.NEXT_PUBLIC_BUILD_ID;
  }

  try {
    // O diretório .git não faz parte do contexto Docker.
    // Evita tentar executar um binário git inexistente na imagem de build.
    if (!existsSync(path.join(__dirname, ".git"))) {
      throw new Error("Git metadata is not available");
    }

    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return `build-${Date.now()}`;
  }
};

const buildCpus = Number(process.env.NEXT_BUILD_CPUS ?? 2);

const nextConfig: NextConfig = {
  output: 'standalone',
  generateBuildId: async () => {
    return getBuildId()
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    // Evita que o build use todos os núcleos e estoure a memória
    // em hosts menores, como instalações comuns do Portainer.
    cpus: Number.isFinite(buildCpus) && buildCpus > 0 ? buildCpus : 2,
    // Os anexos aceitam até 15 MB; 20 MB cobre o multipart da Server Action.
    serverActions: {
      bodySizeLimit: '20mb',
    },
    // O proxy interno do Next também clona o corpo da requisição e tem
    // limite próprio de 10 MB por padrão.
    proxyClientMaxBodySize: '20mb',
  }
};

export default nextConfig;
