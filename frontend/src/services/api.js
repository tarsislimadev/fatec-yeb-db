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

// ============ PERSON ENDPOINTS ============

export async function getPeople(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({
    page,
    page_size: pageSize,
    ...filters,
  });
  const response = await api.get(`/people?${params}`);
  return {
    people: response.data.data,
    meta: response.data.meta,
  };
}

export async function getPersonDetail(personId) {
  const response = await api.get(`/people/${personId}`);
  return response.data.data;
}

export async function updatePerson(personId, updates) {
  const response = await api.patch(`/people/${personId}`, updates);
  return response.data.data;
}

export async function deletePerson(personId) {
  return await api.delete(`/people/${personId}`);
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

// ============ BUSINESS ENDPOINTS ============

export async function getBusinesses(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({
    page,
    page_size: pageSize,
    ...filters,
  });
  const response = await api.get(`/businesses?${params}`);
  return {
    businesses: response.data.data,
    meta: response.data.meta,
  };
}

export async function getBusinessDetail(businessId) {
  const response = await api.get(`/businesses/${businessId}`);
  return response.data.data;
}

export async function updateBusiness(businessId, updates) {
  const response = await api.patch(`/businesses/${businessId}`, updates);
  return response.data.data;
}

export async function deleteBusiness(businessId) {
  return await api.delete(`/businesses/${businessId}`);
}

// ============ DEPARTMENT ENDPOINTS ============

export async function getDepartments(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({
    page,
    page_size: pageSize,
    ...filters,
  });
  const response = await api.get(`/departments?${params}`);
  return {
    departments: response.data.data,
    meta: response.data.meta,
  };
}

export async function getDepartmentDetail(departmentId) {
  const response = await api.get(`/departments/${departmentId}`);
  return response.data.data;
}

export async function updateDepartment(departmentId, updates) {
  const response = await api.patch(`/departments/${departmentId}`, updates);
  return response.data.data;
}

export async function deleteDepartment(departmentId) {
  return await api.delete(`/departments/${departmentId}`);
}
