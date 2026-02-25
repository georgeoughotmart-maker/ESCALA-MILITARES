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
      let errorMessage = 'Erro na requisição';
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = `Erro ao processar resposta JSON (${response.status})`;
        }
      } else {
        const text = await response.text();
        console.error('Resposta não-JSON do servidor:', text.slice(0, 200));
        errorMessage = `Erro do servidor (${response.status}): Resposta inesperada`;
      }
      throw new Error(errorMessage);
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
    get: (month?: string) => api.request(`/api/stats${month ? `?month=${month}` : ''}`),
  },

  user: {
    updateProfile: (data: { name: string; coat_of_arms?: string }) => api.request('/api/user/profile', { method: 'PUT', body: JSON.stringify(data) }),
  }
};
