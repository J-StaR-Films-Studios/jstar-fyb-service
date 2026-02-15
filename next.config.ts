import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Webpack for production builds (Turbopack has issues with micromark/react-markdown)
  // In package.json, the build command uses turbopack by default, but this config
  // ensures proper module resolution for micromark packages
  webpack: (config) => {
    return config;
  },
  // Silence Turbopack error in Next.js 16 when webpack config is present
  turbopack: {},
  // Transpile micromark packages to resolve ESM issues with react-markdown
  transpilePackages: [
    'react-markdown',
    'micromark',
    'micromark-util-decode-numeric-character-reference',
    'micromark-util-decode-string',
    'micromark-util-symbol',
    'micromark-util-character',
    'micromark-util-encode',
    'micromark-core-commonmark',
  ],

  // Security: Disable the X-Powered-By header to prevent information leakage
  poweredByHeader: false,

  // Security: Add HTTP headers to improve security posture
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
