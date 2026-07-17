import React from 'react';
import { Link } from 'react-router-dom';

const MARKETING_URL = import.meta.env.VITE_MARKETING_URL || 'https://litigiousweb.vercel.app';
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://github.com/tedrubin80/Litigious#installation';

const AppLanding = () => (
  <div
    className="min-h-screen font-sans flex flex-col"
    style={{ backgroundColor: 'oklch(0.97 0.005 60)', color: 'oklch(0.18 0.008 60)' }}
  >
    <nav
      className="border-b"
      style={{ borderColor: 'oklch(0.88 0.005 60)', backgroundColor: 'oklch(0.97 0.005 60)' }}
    >
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight">Litigious</span>
        <a
          href={MARKETING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm"
          style={{ color: 'oklch(0.45 0.006 60)' }}
        >
          About Litigious
        </a>
      </div>
    </nav>

    <main className="flex-1 flex items-center">
      <div className="max-w-4xl mx-auto px-6 py-20 w-full">
        <p
          className="text-xs font-semibold tracking-widest uppercase mb-4"
          style={{ color: 'oklch(0.45 0.006 60)' }}
        >
          Legal Practice Management
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Sign in to your workspace
        </h1>
        <p className="text-base mb-10 max-w-lg" style={{ color: 'oklch(0.45 0.006 60)' }}>
          This is the application entry point for a Litigious deployment. Staff and clients use
          separate portals.
        </p>

        <div className="flex flex-wrap gap-3 mb-12">
          <Link
            to="/admin/login"
            className="inline-block text-sm font-medium px-6 py-2.5 rounded"
            style={{
              backgroundColor: 'oklch(0.30 0.018 240)',
              color: 'oklch(0.97 0.005 60)'
            }}
          >
            Staff login
          </Link>
          <Link
            to="/client/login"
            className="inline-block text-sm font-medium px-6 py-2.5 rounded border"
            style={{
              borderColor: 'oklch(0.30 0.018 240)',
              color: 'oklch(0.30 0.018 240)'
            }}
          >
            Client portal
          </Link>
        </div>

        <div
          className="rounded-lg border p-6 space-y-3 text-sm"
          style={{ borderColor: 'oklch(0.88 0.005 60)', backgroundColor: 'white' }}
        >
          <p className="font-medium">Self-hosting?</p>
          <ul className="space-y-2" style={{ color: 'oklch(0.45 0.006 60)' }}>
            <li>
              <a href={DOCS_URL} className="underline" target="_blank" rel="noopener noreferrer">
                Installation guide
              </a>
              {' '}— Docker, local dev, Railway, and Vercel
            </li>
            <li>
              <a href={MARKETING_URL} className="underline" target="_blank" rel="noopener noreferrer">
                Product overview
              </a>
              {' '}— features, modules, and demo
            </li>
          </ul>
        </div>
      </div>
    </main>

    <footer
      className="border-t py-6 text-center text-xs"
      style={{ borderColor: 'oklch(0.88 0.005 60)', color: 'oklch(0.45 0.006 60)' }}
    >
      &copy; {new Date().getFullYear()} Litigious — MIT licensed open source
    </footer>
  </div>
);

export default AppLanding;
