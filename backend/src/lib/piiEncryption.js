const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const getEncryptionKey = () => {
  const rawKey = process.env.PII_ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PII_ENCRYPTION_KEY environment variable is required in production');
    }
    return crypto.createHash('sha256').update('dev-only-pii-key').digest();
  }

  return crypto.createHash('sha256').update(rawKey).digest();
};

const encryptValue = (value) => {
  if (!value) return value;
  if (String(value).startsWith(PREFIX)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptValue = (value) => {
  if (!value || !String(value).startsWith(PREFIX)) return value;

  const payload = String(value).slice(PREFIX.length);
  const [ivHex, authTagHex, encryptedHex] = payload.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return value;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
};

const maskSsn = (value) => {
  if (!value) return value;
  const plain = String(value).startsWith(PREFIX) ? decryptValue(value) : String(value);
  const digits = plain.replace(/\D/g, '');
  if (digits.length !== 9) return '***-**-****';
  return `***-**-${digits.slice(-4)}`;
};

const sanitizeClientPii = (client, { reveal = false } = {}) => {
  if (!client || typeof client !== 'object') return client;

  const copy = { ...client };
  if (copy.ssn) {
    copy.ssn = reveal ? decryptValue(copy.ssn) : maskSsn(copy.ssn);
  }
  return copy;
};

module.exports = {
  encryptValue,
  decryptValue,
  maskSsn,
  sanitizeClientPii
};
