import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        accessToken = data.accessToken;
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch (e) {
        accessToken = null;
        // Clear auth store and let React Router handle the redirect
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  }
);

export const oltAPI = {
  list: (params) => api.get('/olts', { params }),
  get: (id) => api.get(`/olts/${id}`),
  create: (data) => api.post('/olts', data),
  update: (id, data) => api.put(`/olts/${id}`, data),
  delete: (id) => api.delete(`/olts/${id}`),
  status: (id) => api.get(`/olts/${id}/status`),
  ports: (id) => api.get(`/olts/${id}/ports`),
  portONTs: (id, port) => api.get(`/olts/${id}/ports/${port}/onts`),
  scan: (id) => api.post(`/olts/${id}/scan`),
  testConnection: (id) => api.get(`/olts/${id}/test-connection`),
  command: (id, cmd) => api.post(`/olts/${id}/command`, { cmd }),
  config: (id, section) => api.get(`/olts/${id}/config`, { params: { section } }),
  configWrite: (id, section, action, params) => api.post(`/olts/${id}/config`, { section, action, params }),
};

export const ontAPI = {
  list: (params) => api.get('/onts', { params }),
  get: (id) => api.get(`/onts/${id}`),
  create: (data) => api.post('/onts', data),
  update: (id, data) => api.put(`/onts/${id}`, data),
  delete: (id) => api.delete(`/onts/${id}`),
  signal: (id) => api.get(`/onts/${id}/signal`),
  signalHistory: (id, range) => api.get(`/onts/${id}/signal/history`, { params: { range } }),
  reboot: (id) => api.post(`/onts/${id}/reboot`),
  updateLocation: (id, lat, lng) => api.put(`/onts/${id}/location`, { latitude: lat, longitude: lng }),
  dhcpLeases: (id) => api.get(`/onts/${id}/dhcp-leases`),
};

export const alertAPI = {
  list: (params) => api.get('/alerts', { params }),
  acknowledge: (id) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id) => api.post(`/alerts/${id}/resolve`),
  delete: (id) => api.delete(`/alerts/${id}`),
};

export const clientAPI = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
};

export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  networkHealth: () => api.get('/dashboard/network-health'),
};

export const tr069API = {
  devices: (params) => api.get('/tr069/devices', { params }),
  device: (id) => api.get(`/tr069/devices/${id}`),
};

export const ztpAPI = {
  pending: () => api.get('/ztp/pending'),
  authorize: (id, profileId) => api.post(`/ztp/authorize/${id}`, { profileId }),
  profiles: () => api.get('/ztp/profiles'),
};

export const zoneAPI = {
  list: () => api.get('/zones'),
  create: (data) => api.post('/zones', data),
  delete: (id) => api.delete(`/zones/${id}`),
};

export const odbAPI = {
  list: () => api.get('/odbs'),
  create: (data) => api.post('/odbs', data),
  delete: (id) => api.delete(`/odbs/${id}`),
};

export const onuTypeAPI = {
  list: () => api.get('/onu-types'),
  create: (data) => api.post('/onu-types', data),
  delete: (id) => api.delete(`/onu-types/${id}`),
};

export const authPresetAPI = {
  list: () => api.get('/auth-presets'),
  create: (data) => api.post('/auth-presets', data),
  delete: (id) => api.delete(`/auth-presets/${id}`),
};

export const graphsAPI = {
  oltStats:  (params) => api.get('/graphs/olt-stats', { params }),
  ponSignal: (params) => api.get('/graphs/pon-signal', { params }),
  signal:    (params) => api.get('/graphs/signal', { params }),
  signalOnt: (ontId)  => api.get(`/graphs/signal/${ontId}`),
};

export default api;
