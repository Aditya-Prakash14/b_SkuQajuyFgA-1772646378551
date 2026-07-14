/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@prime/shared'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
