function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  // When running in browser on a port other than 5000 or 5173 (e.g. Live Server 5500)
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port && port !== '5000' && port !== '5173') {
      return 'http://localhost:5000/api';
    }
  }
  return envUrl || '/api';
}

const BASE_URL = resolveBaseUrl();

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include' // Sends HTTP-only session cookies automatically
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    let data = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    }

    if (!data) {
      data = {
        success: false,
        message: response.status === 404
          ? `Backend API endpoint '${endpoint}' was not found (404). Please ensure the backend server is running on http://localhost:5000.`
          : `Server returned non-JSON response (Status ${response.status}).`
      };
    }

    if (!response.ok) {
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data.code || 'HTTP_ERROR';
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('Cannot connect to backend server. Please verify backend is running on http://localhost:5000.');
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (phoneNumber, password, deviceLabel) =>
    request('/auth/login', { method: 'POST', body: { phoneNumber, password, deviceLabel } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me', { method: 'GET' }),
  changePassword: (oldPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } }),

  // User
  getProfile: () => request('/user/profile', { method: 'GET' }),
  getUserDevices: () => request('/user/devices', { method: 'GET' }),
  revokeOwnDevice: (deviceId) => request(`/user/devices/${deviceId}`, { method: 'DELETE' }),

  // Predictions
  getCurrentPrediction: () => request('/predictions/current', { method: 'GET' }),
  getPredictionHistory: (limit = 20) => request(`/predictions/history?limit=${limit}`, { method: 'GET' }),

  // Admin
  getAdminStats: () => request('/admin/stats', { method: 'GET' }),
  listUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users?${query}`, { method: 'GET' });
  },
  createUser: (userData) => request('/admin/users', { method: 'POST', body: userData }),
  suspendUser: (userId, reason) => request(`/admin/users/${userId}/suspend`, { method: 'POST', body: { reason } }),
  activateUser: (userId) => request(`/admin/users/${userId}/activate`, { method: 'POST' }),
  resetUserPassword: (userId, newPassword) =>
    request(`/admin/users/${userId}/reset-password`, { method: 'POST', body: { newPassword } }),
  extendSubscription: (userId, data) =>
    request(`/admin/users/${userId}/subscription`, { method: 'POST', body: data }),
  getAdminUserDevices: (userId) => request(`/admin/users/${userId}/devices`, { method: 'GET' }),
  revokeAdminDevice: (deviceId) => request(`/admin/devices/${deviceId}`, { method: 'DELETE' }),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs?${query}`, { method: 'GET' });
  }
};
