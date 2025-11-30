/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: '.next',
  images: {
    unoptimized: true,
  },
  // 确保在 Electron 环境中正常工作 - 使用自定义协议
  assetPrefix: process.env.NODE_ENV === 'production' ? 'app://.' : '',
  trailingSlash: true,
  // 禁用 SWC，使用 Babel 作为 fallback
  swcMinify: false,
  experimental: {
    forceSwcTransforms: false,
  },
}

module.exports = nextConfig
