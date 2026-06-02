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
        window.location.href = '/login';
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
  command: (id, cmd) => api.post(`/olts/${id}/command`, { cmd }),
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

export default api;
