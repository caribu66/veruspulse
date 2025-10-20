const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  // Performance optimizations
  experimental: {
    // optimizeCss: true, // Temporarily disabled to fix webpack issues
    // instrumentationHook is now default in Next.js 15.5+
  },
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Memory optimization for development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { dev }) => {
      if (dev) {
        // Reduce memory usage in dev mode
        config.optimization = {
          ...config.optimization,
          moduleIds: 'named',
          chunkIds: 'named',
        };
        // Disable source maps in dev if memory is critical
        // config.devtool = false;
      }
      return config;
    },
  }),
};

module.exports = withBundleAnalyzer(nextConfig);
