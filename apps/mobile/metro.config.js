const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro can resolve shared packages
config.watchFolders = [monorepoRoot];

// Tell Metro where to look for node_modules, app first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Disable hierarchical lookup so Metro doesn't crawl up past the app root
// and find a different React version in the monorepo root's node_modules.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
