/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
    // Ensure proper server components handling
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs'],
  },
  // Improve build performance
  swcMinify: true,
  // Ensure proper handling of client components
  transpilePackages: ['@mui/material', '@mui/icons-material'],
  webpack: (config, { isServer, webpack }) => {
    // Add polyfill for 'self' global to prevent build errors
    if (isServer) {
      // Add a banner to the top of server bundles to polyfill 'self'
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: 'if (typeof self === "undefined") { global.self = global; }',
          raw: true,
          entryOnly: false,
        })
      );
    }

    // Optimize build performance and fix route group issues
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              enforce: true,
              minChunks: 1,
              maxSize: 244000,
            },
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              chunks: 'all',
              enforce: true,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
        runtimeChunk: {
          name: 'webpack-runtime',
        },
      };
    }


    // Ignore Node.js modules that are not needed in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        util: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
