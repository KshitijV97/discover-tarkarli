/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Room photos may come from any storage host (Supabase Storage, S3, R2…).
  // We render them with plain <img>, so no remotePatterns lock-in is needed.
};

export default nextConfig;
