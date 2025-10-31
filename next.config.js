// Conditionally load bundle analyzer only when needed
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : config => config;

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15 Performance Optimizations
  reactStrictMode: true,

  // Use standalone output to avoid static generation errors
  output: 'standalone',

  // Disable ESLint during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable static page generation completely
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  // Skip static optimization - force all pages to be server-rendered
  experimental: {
    isrMemoryCacheSize: 0,
    // Optimize CSS
    optimizeCss: process.env.NODE_ENV === 'production',
    // Enable optimistic client cache
    optimisticClientCache: true,
    // Server actions config
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Disable static worker threads during build
    workerThreads: false,
    cpus: 1,
    // Disable static page generation
    ppr: false,
  },

  // Force all pages to be dynamic
  output: undefined, // Don't export static HTML

  // Disable Turbopack to avoid self.webpackChunk issues
  // ...(process.env.NODE_ENV === 'development' && {
  //   turbo: {
  //     rules: {
  //       '*.svg': {
  //         loaders: ['@svgr/webpack'],
  //         as: '*.js',
  //       },
  //     },
  //   },
  // }),

  // Optimize package imports for faster builds and smaller bundles
  // NOTE: optimizePackageImports is not supported in this Next.js version, keeping for future compatibility
  // optimizePackageImports: [
  //   '@phosphor-icons/react',
  //   'lucide-react',
  //   'date-fns',
  //   'echarts',
  //   'echarts-for-react',
  // ],

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
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Performance optimizations
  experimental: {
    // Optimize CSS in production
    optimizeCss: process.env.NODE_ENV === 'production',
    // Enable optimistic client cache
    optimisticClientCache: true,
    // Allow access from network IPs in development
    ...(process.env.NODE_ENV === 'development' && {
      allowedOrigins: ['*'],
    }),
    // Next.js 15: Optimize React Server Components
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Compress responses in production
  compress: true,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    // Add image optimization settings
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Production source maps for better debugging
  productionBrowserSourceMaps: false,

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Memory optimization: reduce cache and limit parallelism
    config.infrastructureLogging = { level: 'error' };
    config.stats = 'errors-only';

    // Optimize for development
    if (dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
        // Reduce memory by not keeping module references
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
      };

      // Limit webpack's memory usage
      config.cache = {
        type: 'filesystem',
        maxMemoryGenerations: 1, // Aggressive memory management
        cacheDirectory: '.next/cache/webpack',
      };
    }

    // Production optimizations - disabled vendor chunking to avoid self.webpackChunk issues
    // if (!dev) {
    //   config.optimization = {
    //     ...config.optimization,
    //     splitChunks: {
    //       chunks: 'all',
    //       cacheGroups: {
    //         default: false,
    //         vendors: false,
    //         // Vendor chunk for node_modules
    //         vendor: {
    //           name: 'vendor',
    //           chunks: 'all',
    //           test: /node_modules/,
    //           priority: 20,
    //         },
    //         // Common chunk for shared code
    //         common: {
    //           name: 'common',
    //           minChunks: 2,
    //           chunks: 'all',
    //           priority: 10,
    //           reuseExistingChunk: true,
    //           enforce: true,
    //         },
    //       },
    //     },
    //   };
    // }

    // Fix for Node.js modules in client-side code
    if (!isServer) {
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
    }

    // Fix for 'self is not defined' error in server-side code
    if (isServer) {
      // Replace self with globalThis in generated code
      config.plugins = config.plugins || [];
      config.plugins.push({
        apply: compiler => {
          compiler.hooks.compilation.tap('FixSelfUndefined', compilation => {
            compilation.hooks.processAssets.tap(
              {
                name: 'FixSelfUndefined',
                stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
              },
              assets => {
                Object.keys(assets).forEach(filename => {
                  if (filename.endsWith('.js')) {
                    const asset = assets[filename];
                    let source = asset.source();
                    if (
                      typeof source === 'string' &&
                      source.includes('self.webpackChunk')
                    ) {
                      source = source.replace(
                        /\bself\.webpackChunk/g,
                        '(typeof self !== "undefined" ? self : globalThis).webpackChunk'
                      );
                      compilation.updateAsset(
                        filename,
                        new (require('webpack-sources').RawSource)(source)
                      );
                    }
                  }
                });
              }
            );
          });
        },
      });
    }

    return config;
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Enable detailed error traces - optimized for lower memory usage
  onDemandEntries: {
    maxInactiveAge: 15 * 1000, // Reduced from 25s to free up memory faster
    pagesBufferLength: 2, // Keep only 2 pages in memory
  },

  // PoweredByHeader configuration
  poweredByHeader: false,

  // Generate ETags for better caching
  generateEtags: true,

  // Static page generation optimization
  // On-demand revalidation can be triggered via API routes
};

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
