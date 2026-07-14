/** @type {import('next').NextConfig} */
const nextConfig = {
  // Compile the raw-TS shared workspace package (types + formatINR helpers).
  transpilePackages: ['@prime/shared'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
