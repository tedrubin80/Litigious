import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../config/demo';

const DemoCredentialsHint = ({ compact = false }) => (
  <div
    className={`rounded-lg border text-sm ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}
    style={{ borderColor: 'oklch(0.88 0.005 60)', backgroundColor: 'oklch(0.98 0.01 240)' }}
  >
    <p className="font-medium" style={{ color: 'oklch(0.18 0.008 60)' }}>
      Demo credentials
    </p>
    <p style={{ color: 'oklch(0.45 0.006 60)' }}>
      Password for all accounts:{' '}
      <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border">{DEMO_PASSWORD}</code>
    </p>
    {!compact && (
      <ul className="space-y-1" style={{ color: 'oklch(0.45 0.006 60)' }}>
        {DEMO_ACCOUNTS.map(({ role, email }) => (
          <li key={email}>
            <span className="font-medium">{role}:</span>{' '}
            <code className="font-mono text-xs">{email}</code>
          </li>
        ))}
      </ul>
    )}
    {compact && (
      <p style={{ color: 'oklch(0.45 0.006 60)' }}>
        Try <code className="font-mono text-xs">admin@litigious.online</code> or{' '}
        <code className="font-mono text-xs">client@litigious.online</code>
      </p>
    )}
  </div>
);

export default DemoCredentialsHint;
