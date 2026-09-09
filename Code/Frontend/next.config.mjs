/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/notification",
        destination: "/notifications",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
