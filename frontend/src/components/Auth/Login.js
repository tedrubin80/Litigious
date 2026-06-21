import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '../Icons';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const { login, verify2FALogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(formData.email, formData.password, 'admin');
    if (result.requiresTwoFactor) {
      setTwoFactorUserId(result.userId);
      setTwoFactorStep(true);
    } else if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (twoFactorCode.length !== 6) {
      setError('Enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    setError('');
    const result = await verify2FALogin(twoFactorUserId, twoFactorCode);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  if (twoFactorStep) {
    return (
      <div
        className="min-h-screen flex items-center justify-center py-12 px-4"
        style={{ backgroundColor: 'oklch(0.97 0.005 60)' }}
      >
        <div className="max-w-sm w-full">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'oklch(0.55 0.006 60)' }}>
              LegalEstate
            </p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'oklch(0.18 0.008 60)' }}>
              Two-factor authentication
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
              Enter the code from your authenticator app
            </p>
          </div>

          <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded p-3 text-sm"
                style={{
                  backgroundColor: 'oklch(0.95 0.025 25)',
                  border: '1px solid oklch(0.84 0.07 25)',
                  color: 'oklch(0.38 0.12 25)',
                }}
              >
                {error}
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="block w-full px-3 py-2 rounded text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.022_240)]"
              style={{
                border: '1px solid oklch(0.85 0.006 60)',
                backgroundColor: 'oklch(0.99 0.003 60)',
                color: 'oklch(0.18 0.008 60)',
                letterSpacing: '0.3em',
              }}
              placeholder="000000"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
            >
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setTwoFactorStep(false);
                setTwoFactorCode('');
                setTwoFactorUserId(null);
                setError('');
              }}
              className="w-full py-2 text-sm"
              style={{ color: 'oklch(0.55 0.006 60)' }}
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: 'oklch(0.97 0.005 60)' }}
    >
      <div className="max-w-sm w-full">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'oklch(0.55 0.006 60)' }}>
            LegalEstate
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'oklch(0.18 0.008 60)' }}>
            Sign in
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'oklch(0.55 0.006 60)' }}>
            Legal Practice Management
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded p-3 text-sm flex items-start gap-2"
              style={{
                backgroundColor: 'oklch(0.95 0.025 25)',
                border: '1px solid oklch(0.84 0.07 25)',
                color: 'oklch(0.38 0.12 25)',
              }}
            >
              <svg className="h-4 w-4 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'oklch(0.30 0.008 60)' }}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.022_240)] focus:ring-offset-0"
              style={{
                border: '1px solid oklch(0.85 0.006 60)',
                backgroundColor: 'oklch(0.99 0.003 60)',
                color: 'oklch(0.18 0.008 60)',
              }}
              placeholder="you@yourfirm.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'oklch(0.30 0.008 60)' }}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full px-3 py-2 pr-10 rounded text-sm focus:outline-none"
                style={{
                  border: '1px solid oklch(0.85 0.006 60)',
                  backgroundColor: 'oklch(0.99 0.003 60)',
                  color: 'oklch(0.18 0.008 60)',
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: 'oklch(0.62 0.005 60)' }}
              >
                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded text-sm font-medium transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: 'oklch(0.30 0.018 240)', color: 'oklch(0.97 0.005 60)' }}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-xs" style={{ color: 'oklch(0.62 0.005 60)' }}>
            Don't have an account? Contact your administrator.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
