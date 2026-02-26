/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Image optimization ───────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600, // Cache images for 1 hour
  },

  // ─── Compiler optimizations ───────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // strip logs in prod
  },

  // ─── HTTP response caching headers ───────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
