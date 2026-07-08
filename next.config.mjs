/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignorer les fichiers de test Deno de yahoo-finance2 qui ne peuvent pas être bundlés
    config.resolve.alias = {
      ...config.resolve.alias,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
      '@gadicc/fetch-mock-cache/stores/fs.ts': false,
    };

    // Sur le serveur, externaliser les modules qui ne doivent pas être bundlés
    if (isServer) {
      config.externals = [...(config.externals ?? [])];
    }

    return config;
  },
};

export default nextConfig;
