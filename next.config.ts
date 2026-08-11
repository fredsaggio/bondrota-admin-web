import type { NextConfig } from "next";

// Nao adicione `output: 'standalone'`: o deploy oficial e na Vercel, que faz o
// proprio empacotamento e falha com essa opcao. O Dockerfile self-hosted usa
// `next start` com a saida padrao.
const nextConfig: NextConfig = {
    agentRules: false,
    turbopack: {
        root: process.cwd(),
    },
};

export default nextConfig;