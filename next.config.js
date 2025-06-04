/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude from linting and only include our actual source directories
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'utils', 'services', 'api'],
  },
  // Exclude the reference directory from webpack compilation
  webpack: (config, { dev, isServer }) => {
    // Ignore the mobile-responsive-reference directory
    if (config.watchOptions) {
      config.watchOptions.ignored = config.watchOptions.ignored || [];
      if (Array.isArray(config.watchOptions.ignored)) {
        config.watchOptions.ignored.push('**/mobile-responsive-reference/**');
      } else {
        config.watchOptions.ignored = [
          config.watchOptions.ignored,
          '**/mobile-responsive-reference/**'
        ];
      }
    } else {
      config.watchOptions = {
        ignored: '**/mobile-responsive-reference/**',
      };
    }
    
    // Also exclude from resolve
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['mobile-responsive-reference'] = false;
    
    return config;
  },
};

module.exports = nextConfig; 