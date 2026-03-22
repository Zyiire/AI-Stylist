/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary (ingested product images)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // eBay image CDN
      { protocol: "https", hostname: "i.ebayimg.com" },
      { protocol: "https", hostname: "ir.ebaystatic.com" },
      // Pinterest image CDN
      { protocol: "https", hostname: "i.pinimg.com" },
      // HuggingFace / dataset placeholder images
      { protocol: "https", hostname: "*.huggingface.co" },
      { protocol: "https", hostname: "placeholder.fashion" },
      // Allow any HTTPS image — Qdrant catalog may contain arbitrary CDN URLs
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
