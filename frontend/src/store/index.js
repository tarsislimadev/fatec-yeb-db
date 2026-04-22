import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  setUser: (user) => {
    set({ user });
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  signupSuccess: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  signinSuccess: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
}));

export const usePhoneStore = create((set) => ({
  phones: [],
  currentPhone: null,
  isLoading: false,
  error: null,

  setPhones: (phones) => set({ phones }),
  setCurrentPhone: (phone) => set({ currentPhone: phone }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
