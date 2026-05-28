/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@delegate/shared",
    "@delegate/x402",
    "@delegate/delegation",
    "@delegate/agents",
  ],
  experimental: {
    optimizePackageImports: ["viem", "wagmi", "@rainbow-me/rainbowkit"],
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false }
    return config
  },
}

export default nextConfig
