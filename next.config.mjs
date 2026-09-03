/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Success-story photos are served from Supabase Storage.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
};

export default nextConfig;
