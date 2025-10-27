// Conditionally load bundle analyzer only when needed
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : config => config;

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

      // Fix for Node.js modules in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      return config;
    },
  }),
};

module.exports = withBundleAnalyzer(nextConfig);
