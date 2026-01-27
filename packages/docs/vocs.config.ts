import { defineConfig } from 'vocs';

export default defineConfig({
  title: 'Tuna',
  description: 'Cloudflare Tunnels for humans',
  logoUrl: {
    light: '/logo.svg',
    dark: '/logo.svg',
  },
  iconUrl: '/favicon.svg',
  topNav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'API', link: '/api/config' },
    { text: 'GitHub', link: 'https://github.com/zeroexcore/tuna' },
  ],
  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'What is Tuna?', link: '/' },
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Why Tuna?', link: '/guide/why-tuna' },
      ],
    },
    {
      text: 'Guide',
      items: [
        { text: 'Installation', link: '/guide/installation' },
        { text: 'Configuration', link: '/guide/configuration' },
        { text: 'Team Collaboration', link: '/guide/team-collaboration' },
        { text: 'Access Control', link: '/guide/access-control' },
      ],
    },
    {
      text: 'Commands',
      items: [
        { text: 'tuna <command>', link: '/commands/run' },
        { text: 'tuna --init', link: '/commands/init' },
        { text: 'tuna --login', link: '/commands/login' },
        { text: 'tuna --list', link: '/commands/list' },
        { text: 'tuna --stop', link: '/commands/stop' },
        { text: 'tuna --delete', link: '/commands/delete' },
      ],
    },
    {
      text: 'API Reference',
      items: [
        { text: 'Configuration', link: '/api/config' },
        { text: 'Environment Variables', link: '/api/env-vars' },
      ],
    },
  ],
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/zeroexcore/tuna',
    },
  ],
  theme: {
    accentColor: '#3b82f6',
  },
});
