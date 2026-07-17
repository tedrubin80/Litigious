import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { transformWithEsbuild } from 'vite';

const treatJsFilesAsJsx = () => ({
  name: 'treat-js-files-as-jsx',
  enforce: 'pre',
  async transform(code, id) {
    if (!/\/src\/.*\.js$/.test(id)) {
      return null;
    }

    return transformWithEsbuild(code, id, {
      loader: 'jsx',
      jsx: 'automatic',
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_API_PROXY_TARGET
    || env.REACT_APP_API_PROXY_TARGET
    || 'http://localhost:3001';

  const defineEnv = (viteName, craName, fallback) =>
    JSON.stringify(env[viteName] || env[craName] || fallback);

  return {
    plugins: [
      treatJsFilesAsJsx(),
      react({
        include: '**/*.{jsx,js,tsx,ts}',
      }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
        },
      },
    },
    build: {
      outDir: 'build',
      sourcemap: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.REACT_APP_API_URL': defineEnv('VITE_API_URL', 'REACT_APP_API_URL', '/api'),
      'process.env.REACT_APP_API_TIMEOUT': defineEnv('VITE_API_TIMEOUT', 'REACT_APP_API_TIMEOUT', '10000'),
      'process.env.REACT_APP_DEMO_MODE': defineEnv('VITE_DEMO_MODE', 'REACT_APP_DEMO_MODE', 'true'),
      'process.env.REACT_APP_PACKAGE_TYPE': defineEnv('VITE_PACKAGE_TYPE', 'REACT_APP_PACKAGE_TYPE', ''),
      'process.env.REACT_APP_SOCKET_URL': defineEnv('VITE_SOCKET_URL', 'REACT_APP_SOCKET_URL', 'http://localhost:3001'),
      'process.env.REACT_APP_NAME': defineEnv('VITE_APP_NAME', 'REACT_APP_NAME', 'Litigious'),
      'process.env.REACT_APP_VERSION': defineEnv('VITE_APP_VERSION', 'REACT_APP_VERSION', '1.0.0'),
      'process.env.REACT_APP_MARKETING_URL': defineEnv('VITE_MARKETING_URL', 'REACT_APP_MARKETING_URL', ''),
      'process.env.REACT_APP_DOCS_URL': defineEnv('VITE_DOCS_URL', 'REACT_APP_DOCS_URL', ''),
    },
  };
});
