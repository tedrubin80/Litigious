/** Demo accounts — must match backend/scripts/seed-demo-data.js */
export const DEMO_PASSWORD = 'DemoShow2026!';

export const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@litigious.online' },
  { role: 'Attorney', email: 'attorney@litigious.online' },
  { role: 'Paralegal', email: 'paralegal@litigious.online' },
  { role: 'Client portal', email: 'client@litigious.online' }
];

export const isDemoMode = () =>
  (import.meta.env.VITE_DEMO_MODE || process.env.REACT_APP_DEMO_MODE || 'true') === 'true';
