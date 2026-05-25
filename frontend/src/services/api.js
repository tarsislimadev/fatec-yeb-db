import axios from 'axios';

// const API_BASE = 'https://zany-space-dollop-466475gv9v7f7g56-3000.app.github.dev/api/v1';

const API_BASE = '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Handle 401 errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.data?.error) {
      console.error('API error:', error.response.data.error);
    }
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

export async function updatePhoneConsent(phoneId, updates) {
  const response = await api.patch(`/phones/${phoneId}/consent`, updates);
  return response.data.data;
}

export async function createContactAttempt(phoneId, attemptData) {
  const response = await api.post(`/phones/${phoneId}/contact-attempts`, attemptData);
  return response.data.data;
}

export async function getPhoneTimeline(phoneId) {
  const response = await api.get(`/phones/${phoneId}/timeline`);
  return response.data.data;
}

export async function getOutreachReport(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/reports/outreach?${params}`, {
    responseType: filters.format === 'csv' ? 'text' : 'json',
  });
  return response.data;
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
  return response.data;
}

export async function createPerson(personData) {
  const response = await api.post('/people', personData);
  return response.data.data;
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

// ============ CNPJ ENDPOINTS ============

export async function lookupCnpj(cnpj, options = {}) {
  const response = await api.post('/cnpj/lookup', {
    cnpj,
    provider_order: options.provider_order || null,
    force_refresh: options.force_refresh || false,
  });
  return response.data.data;
}

export async function importCnpjs(cnpjs, providerOrder = null) {
  const response = await api.post('/cnpj/import', {
    cnpjs,
    provider_order: providerOrder,
  });
  return response.data.data;
}

export async function getCnpjImportJob(jobId) {
  const response = await api.get(`/cnpj/import/${jobId}`);
  return response.data.data;
}

export async function runCnpjReprocess(priority = 'P2', payload = {}) {
  const response = await api.post('/cnpj/reprocess', {
    priority,
    ...payload,
  });
  return response.data.data;
}

export async function getCnpjReprocessJob(jobId) {
  const response = await api.get(`/cnpj/reprocess/${jobId}`);
  return response.data.data;
}

// ============ REVIEW QUEUE ENDPOINTS ============

export async function getReviewQueue(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/reviews?${params}`);
  return response.data;
}

export async function getReviewDetail(reviewId) {
  const response = await api.get(`/reviews/${reviewId}`);
  return response.data.data;
}

export async function createReviewItem(payload) {
  const response = await api.post('/reviews', payload);
  return response.data.data;
}

export async function updateReviewItem(reviewId, payload) {
  const response = await api.patch(`/reviews/${reviewId}`, payload);
  return response.data.data;
}

// ============ PRIMARY RESEARCH ENDPOINTS ============

export async function listPrimaryResearchTasks(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/primary-research/tasks?${params}`);
  return response.data;
}

export async function getPrimaryResearchTask(taskId) {
  const response = await api.get(`/primary-research/tasks/${taskId}`);
  return response.data.data;
}

export async function createPrimaryResearchTask(payload) {
  const response = await api.post('/primary-research/tasks', payload);
  return response.data.data;
}

export async function updatePrimaryResearchTask(taskId, payload) {
  const response = await api.patch(`/primary-research/tasks/${taskId}`, payload);
  return response.data.data;
}

export async function createPrimaryResearchAttempt(taskId, payload) {
  const response = await api.post(`/primary-research/tasks/${taskId}/attempts`, payload);
  return response.data.data;
}

export async function scanPrimaryResearchTasks(payload = {}) {
  const response = await api.post('/primary-research/tasks/scan', payload);
  return response.data.data;
}

// ============ QUALITY ENDPOINTS ============

export async function getQualityMetrics() {
  const response = await api.get('/quality/metrics');
  return response.data.data;
}

export async function getQualityAlerts() {
  const response = await api.get('/quality/alerts');
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
