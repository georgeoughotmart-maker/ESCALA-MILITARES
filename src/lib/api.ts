const API_URL = '';

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro na requisição');
    }
    return response.json();
  },

  auth: {
    login: (credentials: any) => api.request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => api.request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  },

  services: {
    getAll: () => api.request('/api/services'),
    create: (data: any) => api.request('/api/services', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => api.request(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => api.request(`/api/services/${id}`, { method: 'DELETE' }),
  },

  serviceTypes: {
    getAll: () => api.request('/api/service-types'),
    create: (data: any) => api.request('/api/service-types', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => api.request(`/api/service-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => api.request(`/api/service-types/${id}`, { method: 'DELETE' }),
  },

  stats: {
    get: () => api.request('/api/stats'),
  }
};
