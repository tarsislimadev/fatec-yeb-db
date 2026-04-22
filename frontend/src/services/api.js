import axios from 'axios';

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ENDPOINTS ============

export async function signup(email, password, displayName) {
  const response = await api.post('/auth/signup', {
    email,
    password,
    display_name: displayName,
  });
  return response.data.data;
}

export async function signin(email, password) {
  const response = await api.post('/auth/signin', {
    email,
    password,
  });
  return response.data.data;
}

export async function signout() {
  return await api.post('/auth/signout');
}

export async function forgotPassword(email) {
  const response = await api.post('/auth/password/forgot', { email });
  return response.data.data;
}

export async function resetPassword(token, newPassword) {
  const response = await api.post('/auth/password/reset', {
    token,
    new_password: newPassword,
  });
  return response.data.data;
}

// ============ PHONE ENDPOINTS ============

export async function getPhones(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({
    page,
    page_size: pageSize,
    ...filters,
  });
  const response = await api.get(`/phones?${params}`);
  return {
    phones: response.data.data,
    meta: response.data.meta,
  };
}

export async function createPhone(phoneData) {
  const response = await api.post('/phones', phoneData);
  return response.data.data;
}

export async function getPhoneDetail(phoneId) {
  const response = await api.get(`/phones/${phoneId}`);
  return response.data.data;
}

export async function updatePhone(phoneId, updates) {
  const response = await api.patch(`/phones/${phoneId}`, updates);
  return response.data.data;
}

export async function deletePhone(phoneId) {
  return await api.delete(`/phones/${phoneId}`);
}

// ============ OWNER ENDPOINTS ============

export async function addPhoneOwner(phoneId, ownerData) {
  const response = await api.post(`/phones/${phoneId}/owners`, ownerData);
  return response.data.data;
}

export async function removePhoneOwner(phoneId, ownerRelationId) {
  return await api.delete(`/phones/${phoneId}/owners/${ownerRelationId}`);
}

export async function updatePhoneOwner(phoneId, ownerRelationId, updates) {
  const response = await api.patch(`/phones/${phoneId}/owners/${ownerRelationId}`, updates);
  return response.data.data;
}
