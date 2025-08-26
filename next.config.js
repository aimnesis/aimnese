/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { domains: ['avatars.githubusercontent.com'] },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
      config.infrastructureLogging = { level: 'error' }
    }
    return config
  },
}

module.exports = nextConfig