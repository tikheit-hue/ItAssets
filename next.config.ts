
import type {NextConfig} from 'next';
const { version } = require('./package.json');

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {},
  env: {
    APP_VERSION: version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress the 'require.extensions' warning from Handlebars
    config.module.exprContextCritical = false;
    config.module.rules.push({
      test: /handlebars\/lib\/index\.js$/,
      loader: 'string-replace-loader',
      options: {
        search: 'require.extensions',
        replace: 'null',
      },
    });

    return config;
  },
};

export default nextConfig;
