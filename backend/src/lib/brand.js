const DEFAULT_APP_NAME = 'Litigious';
const DEFAULT_FROM_ADDRESS = 'noreply@litigious.online';

const getAppName = () =>
  (process.env.APP_NAME || DEFAULT_APP_NAME).trim() || DEFAULT_APP_NAME;

const getFromEmail = () => {
  if (process.env.SMTP_FROM?.trim()) {
    return process.env.SMTP_FROM.trim();
  }
  if (process.env.FROM_EMAIL?.trim()) {
    return process.env.FROM_EMAIL.trim();
  }
  const address = (process.env.MAIL_FROM_ADDRESS || DEFAULT_FROM_ADDRESS).trim();
  return `${getAppName()} <${address}>`;
};

const getProductLabel = () => `${getAppName()} Management System`;

module.exports = {
  getAppName,
  getFromEmail,
  getProductLabel,
  DEFAULT_APP_NAME,
  DEFAULT_FROM_ADDRESS
};
