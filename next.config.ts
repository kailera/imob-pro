import type { NextConfig } from "next";
import path from "path";
import { execSync } from "child_process";

const getBuildId = () => {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return process.env.NEXT_PUBLIC_BUILD_ID || `build-${Date.now()}`;
  }
};


const nextConfig: NextConfig = {
  output: 'standalone',
  generateBuildId: async () => {
    return getBuildId()
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '600mb'
    }
  }
};

export default nextConfig;
