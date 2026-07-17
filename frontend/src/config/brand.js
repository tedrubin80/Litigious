const env = import.meta.env;

const brand = {
  appName: env.VITE_APP_NAME || process.env.REACT_APP_NAME || 'Litigious',
  tagline: env.VITE_APP_TAGLINE || 'Legal Practice Management',
  marketingUrl: env.VITE_MARKETING_URL || 'https://litigiousweb.vercel.app',
  docsUrl:
    env.VITE_DOCS_URL ||
    'https://github.com/tedrubin80/Litigious/blob/main/docs/INSTALL.md',
  productionDocsUrl:
    env.VITE_PRODUCTION_DOCS_URL ||
    'https://github.com/tedrubin80/Litigious/blob/main/docs/GOING_TO_PRODUCTION.md',
  demoMode: (env.VITE_DEMO_MODE || process.env.REACT_APP_DEMO_MODE || 'true') === 'true'
};

export default brand;
