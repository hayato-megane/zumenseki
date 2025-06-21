/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    // react-pdf用の設定
    config.module.rules.push({
      test: /\.pdf$/,
      use: 'file-loader',
    });

    return config;
  },
  // react-pdfのworker設定
  experimental: {
    esmExternals: 'loose',
  },
};

module.exports = nextConfig;

