export const fetchWithAuth = (url, options = {}) =>
  fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
    },
  });

export const clearLegacyAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('loginType');
};
