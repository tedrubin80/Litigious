import React from 'react';
import { Link } from 'react-router-dom';

const modules = [
  {
    name: 'Core',
    description: 'Authentication, roles, firm setup, and the base dashboard',
  },
  {
    name: 'Case Management',
    description: 'Full case lifecycle: intake, status tracking, timelines, and case types',
  },
  {
    name: 'Document & AI',
    description: 'AI-powered document generation with multi-provider support',
  },
  {
    name: 'Billing & Time',
    description: 'Time tracking, invoicing, and payment processing (Stripe, Square, PayPal + BNPL)',
  },
  {
    name: 'Medical Records',
    description: 'Medical tracking for personal injury and workers’ compensation cases',
  },
  {
    name: 'Communications',
    description: 'Internal messaging, client notifications, and team coordination',
  },
  {
    name: 'Video Conferencing',
    description: 'WebRTC native meetings with Zoom integration',
  },
  {
    name: 'Legal Research',
    description: 'Lex Machina analytics, judge insights, and case outcome intelligence',
  },
  {
    name: 'Reports & Analytics',
    description: 'Practice performance dashboards and custom financial reporting',
  },
];

const Homepage = () => {
  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: 'oklch(0.97 0.005 60)', color: 'oklch(0.18 0.008 60)' }}
    >
      {/* Nav */}
      <nav
        className="border-b"
        style={{ borderColor: 'oklch(0.88 0.005 60)', backgroundColor: 'oklch(0.97 0.005 60)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight" style={{ color: 'oklch(0.18 0.008 60)' }}>
            LegalEstate
          </span>
          <div className="flex items-center gap-6">
            <Link
              to="/admin/login"
              className="text-sm"
              style={{ color: 'oklch(0.45 0.006 60)' }}
            >
              Admin Login
            </Link>
            <a
              href="#contact"
              className="text-sm font-medium px-4 py-1.5 rounded"
              style={{
                backgroundColor: 'oklch(0.30 0.018 240)',
                color: 'oklch(0.97 0.005 60)',
              }}
            >
              Request a Demo &rarr;
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-6"
            style={{ color: 'oklch(0.45 0.006 60)' }}
          >
            Legal Practice Management Platform
          </p>
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6"
            style={{ color: 'oklch(0.18 0.008 60)' }}
          >
            Built for firms that bill.
            <br />
            Designed for resellers who scale.
          </h1>
          <p
            className="text-lg leading-relaxed mb-10"
            style={{ color: 'oklch(0.45 0.006 60)' }}
          >
            LegalEstate is a modular legal practice management platform. License the modules your
            clients need. White-label and resell under your own brand.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#contact"
              className="inline-block text-sm font-medium px-6 py-2.5 rounded"
              style={{
                backgroundColor: 'oklch(0.30 0.018 240)',
                color: 'oklch(0.97 0.005 60)',
              }}
            >
              Request a Demo
            </a>
            <a
              href="#contact"
              className="inline-block text-sm font-medium px-6 py-2.5 rounded border"
              style={{
                borderColor: 'oklch(0.30 0.018 240)',
                color: 'oklch(0.30 0.018 240)',
                backgroundColor: 'transparent',
              }}
            >
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Module Stack */}
      <section
        className="border-t border-b py-16"
        style={{ borderColor: 'oklch(0.88 0.005 60)' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <h2
              className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'oklch(0.45 0.006 60)' }}
            >
              Modular by design
            </h2>
            <p
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'oklch(0.18 0.008 60)' }}
            >
              What&rsquo;s included
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {modules.map((mod, index) => (
              <div
                key={mod.name}
                className="py-4 pr-6 border-b"
                style={{ borderColor: 'oklch(0.88 0.005 60)' }}
              >
                <div
                  className="text-sm font-semibold mb-0.5"
                  style={{ color: 'oklch(0.18 0.008 60)' }}
                >
                  {mod.name}
                </div>
                <div
                  className="text-sm leading-snug"
                  style={{ color: 'oklch(0.45 0.006 60)' }}
                >
                  {mod.description}
                </div>
              </div>
            ))}
          </div>

          <p
            className="mt-8 text-sm"
            style={{ color: 'oklch(0.45 0.006 60)' }}
          >
            Every deployment starts with Core. Add modules as your clients&rsquo; needs grow.
          </p>
        </div>
      </section>

      {/* Two Buyer Lanes */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* For Law Firms */}
          <div
            className="pr-0 md:pr-12 pb-12 md:pb-0 md:border-r border-b md:border-b-0"
            style={{ borderColor: 'oklch(0.88 0.005 60)' }}
          >
            <h2
              className="text-lg font-bold mb-6"
              style={{ color: 'oklch(0.18 0.008 60)' }}
            >
              For law firms
            </h2>
            <ul className="space-y-3">
              {[
                'Manage cases from intake through close with structured timelines and status tracking',
                'Track billable time and send itemized invoices with integrated payment processing',
                'Give clients a secure portal for document sharing and case updates',
                'Generate agreements, pleadings, and correspondence with AI-assisted templates',
                'Stay organized across practice areas with role-based access and audit trails',
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-relaxed"
                  style={{ color: 'oklch(0.45 0.006 60)' }}
                >
                  <span
                    className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'oklch(0.30 0.018 240)' }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <a
                href="#contact"
                className="text-sm font-medium"
                style={{ color: 'oklch(0.30 0.018 240)' }}
              >
                See firm pricing &rarr;
              </a>
            </div>
          </div>

          {/* For Resellers */}
          <div className="pt-12 md:pt-0 md:pl-12">
            <h2
              className="text-lg font-bold mb-6"
              style={{ color: 'oklch(0.18 0.008 60)' }}
            >
              For resellers
            </h2>
            <ul className="space-y-3">
              {[
                'White-label the platform under your own brand—logo, domain, and color scheme',
                'Select exactly which modules each client gets; license only what they need',
                'Operate a multi-tenant environment with full client isolation and independent billing',
                'Configure per-client settings without touching shared infrastructure',
                'Participate in a revenue-share model designed for legal tech resellers and consultants',
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-relaxed"
                  style={{ color: 'oklch(0.45 0.006 60)' }}
                >
                  <span
                    className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: 'oklch(0.30 0.018 240)' }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <a
                href="#contact"
                className="text-sm font-medium"
                style={{ color: 'oklch(0.30 0.018 240)' }}
              >
                Partner with us &rarr;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section
        id="contact"
        className="border-t"
        style={{ borderColor: 'oklch(0.88 0.005 60)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="max-w-xl">
            <h2
              className="text-2xl font-bold tracking-tight mb-3"
              style={{ color: 'oklch(0.18 0.008 60)' }}
            >
              Ready to see it in action?
            </h2>
            <p
              className="text-sm leading-relaxed mb-8"
              style={{ color: 'oklch(0.45 0.006 60)' }}
            >
              Request a demo or talk to our team about licensing.
            </p>
            <a
              href="mailto:ted@theorubin.com"
              className="inline-block text-sm font-medium px-6 py-2.5 rounded"
              style={{
                backgroundColor: 'oklch(0.30 0.018 240)',
                color: 'oklch(0.97 0.005 60)',
              }}
            >
              Request a Demo
            </a>
          </div>

          {/* Trust signals */}
          <div
            className="mt-12 pt-10 border-t grid grid-cols-2 sm:grid-cols-4 gap-6"
            style={{ borderColor: 'oklch(0.88 0.005 60)' }}
          >
            {[
              'Built with SOC 2 controls',
              'PostgreSQL with encrypted storage',
              'Self-hosted or managed deployment',
              'White-label ready out of the box',
            ].map((signal) => (
              <p
                key={signal}
                className="text-xs font-medium leading-snug"
                style={{ color: 'oklch(0.45 0.006 60)' }}
              >
                {signal}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t"
        style={{ borderColor: 'oklch(0.88 0.005 60)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs" style={{ color: 'oklch(0.45 0.006 60)' }}>
            &copy; 2025 LegalEstate
          </p>
          <div className="flex gap-6">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Documentation', href: '/docs' },
              { label: 'Contact', href: 'mailto:ted@theorubin.com' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs"
                style={{ color: 'oklch(0.45 0.006 60)' }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
