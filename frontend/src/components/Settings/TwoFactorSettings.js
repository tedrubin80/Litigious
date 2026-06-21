import React, { useState } from 'react';
import { apiMethods } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Common/Toast';

const TwoFactorSettings = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState(null);
  const [token, setToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await apiMethods.post('/auth/account/2fa/generate');
      setSetup(response.data || response);
      toast.success('Scan the QR code with your authenticator app');
    } catch (error) {
      toast.error(error.message || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const enable2FA = async () => {
    if (!token || token.length !== 6) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }

    setLoading(true);
    try {
      await apiMethods.post('/auth/account/2fa/enable', { token });
      updateUser({ twoFactorEnabled: true });
      setSetup(null);
      setToken('');
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!disablePassword || !disableToken) {
      toast.error('Password and authenticator code are required');
      return;
    }

    setLoading(true);
    try {
      await apiMethods.post('/auth/account/2fa/disable', {
        password: disablePassword,
        token: disableToken
      });
      updateUser({ twoFactorEnabled: false });
      setDisablePassword('');
      setDisableToken('');
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  if (user?.twoFactorEnabled) {
    return (
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-green-700">Enabled on your account</p>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">Active</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="password"
            placeholder="Current password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-3 text-sm"
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={disableToken}
            onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ''))}
            className="border border-gray-300 rounded-md py-2 px-3 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={disable2FA}
          disabled={loading}
          className="py-2 px-4 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          Disable 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h4 className="text-md font-medium text-gray-900">Two-Factor Authentication</h4>
        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
      </div>

      {!setup ? (
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          className="py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          Set up authenticator app
        </button>
      ) : (
        <div className="space-y-4">
          {setup.qrCode && (
            <img src={setup.qrCode} alt="2FA QR code" className="h-40 w-40 border rounded" />
          )}
          {setup.manualEntryKey && (
            <p className="text-xs text-gray-600 break-all">
              Manual key: <code>{setup.manualEntryKey}</code>
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit code"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            className="block w-full max-w-xs border border-gray-300 rounded-md py-2 px-3 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={enable2FA}
              disabled={loading}
              className="py-2 px-4 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Confirm and enable
            </button>
            <button
              type="button"
              onClick={() => { setSetup(null); setToken(''); }}
              className="py-2 px-4 text-sm font-medium rounded-md border border-gray-300 text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSettings;
