/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    config.snapshot = {
      managedPaths: [],
      immutablePaths: [],
      buildDependencies: { hash: true },
      module: { hash: true },
      resolve: { hash: true },
      resolveBuildDependencies: { hash: true },
    };
    return config;
  },
}

module.exports = nextConfig
