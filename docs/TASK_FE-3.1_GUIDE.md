# FE-3.1: Frontend Project Setup — Implementation Guide

**Task:** Initialize React 18 + Vite project, set up Tailwind, state management, build  
**Estimated:** 0.5 days  
**Owner:** Frontend Engineer  
**Status:** Ready to Start

---

## Checklist

- [ ] **1. Project Initialization (15 min)**
  - [ ] Verify Node.js 18+ (`node --version`)
  - [ ] Create `.env.local` from `.env.example` (if exists)
  - [ ] Run: `npm install`

- [ ] **2. Vite & React Setup (Optional: already done, verify) (15 min)**
  - [ ] Verify `vite.config.js` exists and has React plugin:
    ```js
    import react from '@vitejs/plugin-react'
    export default {
      plugins: [react()],
      server: { port: 5173 }
    }
    ```
  - [ ] Verify `frontend/src/main.jsx` is entry point
  - [ ] Verify `frontend/src/App.jsx` exists

- [ ] **3. Tailwind CSS Setup (15 min)**
  - [ ] Verify Tailwind installed in `package.json`
  - [ ] Check `tailwind.config.js` exists:
    ```js
    export default {
      content: ['./src/**/*.{jsx,js}'],
      theme: { extend: {} },
      plugins: [],
    }
    ```
  - [ ] Check `postcss.config.js` exists:
    ```js
    export default {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    }
    ```
  - [ ] Import in `src/index.css`:
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

- [ ] **4. State Management: Zustand (10 min)**
  - [ ] Create `frontend/src/store/auth.js`:
    ```js
    import { create } from 'zustand';
    
    const useAuthStore = create((set) => ({
      user: null,
      token: localStorage.getItem('token') || null,
      isAuthenticated: !!localStorage.getItem('token'),
      
      login: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }));
    
    export default useAuthStore;
    ```

- [ ] **5. Router Setup: React Router (10 min)**
  - [ ] Create `frontend/src/App.jsx` with basic routing:
    ```jsx
    import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
    import Layout from './components/Layout';
    import LoginPage from './pages/LoginPage';
    import SignupPage from './pages/SignupPage';
    import PhonesPage from './pages/PhonesPage';
    import ProtectedRoute from './components/ProtectedRoute';
    
    export default function App() {
      return (
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/phones" element={<PhonesPage />} />
                      <Route path="/" element={<Navigate to="/phones" />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      );
    }
    ```

- [ ] **6. API Client: Axios (10 min)**
  - [ ] Create `frontend/src/services/api.js`:
    ```js
    import axios from 'axios';
    import useAuthStore from '../store/auth';
    
    const api = axios.create({
      baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    });
    
    // Inject JWT token
    api.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
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
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    
    export default api;
    ```

- [ ] **7. Environment Configuration (5 min)**
  - [ ] Create `frontend/.env.example`:
    ```
    VITE_API_BASE_URL=http://localhost:3000/api/v1
    ```
  - [ ] Create `frontend/.env.local` (copy from .example):
    ```
    VITE_API_BASE_URL=http://localhost:3000/api/v1
    ```

- [ ] **8. Dev Server Test (10 min)**
  - [ ] Run: `npm run dev`
  - [ ] Browser opens automatically to `http://localhost:5173`
  - [ ] Check console for errors (should be clean)
  - [ ] Verify Tailwind styles load (check CSS in DevTools)

---

## Key Files & Folder Structure

```
frontend/
├── src/
│   ├── App.jsx                    # Main app router
│   ├── main.jsx                   # Entry point
│   ├── index.css                  # Tailwind imports
│   ├── components/
│   │   ├── Layout.jsx             # Page wrapper (header, footer)
│   │   ├── ProtectedRoute.jsx     # Auth guard
│   │   ├── Header.jsx             # Navigation
│   │   └── common.jsx             # Reusable components
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── PhonesPage.jsx
│   │   └── PhoneDetailPage.jsx
│   ├── services/
│   │   └── api.js                 # Axios client
│   └── store/
│       └── auth.js                # Zustand auth store
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── .env.local
```

---

## `package.json` Dependencies

```json
{
  "name": "phone-list-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0",
    "zustand": "^4.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16",
    "@testing-library/react": "^14.0.0",
    "vitest": "^0.34.0"
  }
}
```

---

## Component Templates

### `frontend/src/components/Layout.jsx`
```jsx
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto p-4">
        {children}
      </main>
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-600">
        Phone List System v1.0.0
      </footer>
    </div>
  );
}
```

### `frontend/src/components/ProtectedRoute.jsx`
```jsx
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/auth';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
```

### `frontend/src/pages/LoginPage.jsx` (Placeholder)
```jsx
export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
        <p className="text-center text-gray-600">Login page (FE-3.4) coming soon...</p>
      </div>
    </div>
  );
}
```

---

## Testing the Setup

### 1. Dev Server
```bash
cd frontend
npm run dev
# Browser opens to http://localhost:5173
# Check console (F12) for errors
```

### 2. Build
```bash
npm run build
# Creates dist/ folder with optimized files
# Verify no build errors in console
```

### 3. Tailwind Verification
```bash
# In browser DevTools:
# - Right-click element
# - "Inspect"
# - Check "Styles" tab
# - Should see Tailwind classes (e.g., "flex", "justify-center")
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Module not found: 'zustand'` | Not installed | Run: `npm install zustand` |
| Tailwind styles not applying | CSS not imported | Add to `src/index.css`: `@tailwind base; @tailwind components; @tailwind utilities;` |
| `VITE_API_BASE_URL` undefined | .env.local missing | Create `.env.local` with VITE_API_BASE_URL value |
| React Router not working | Provider missing | Wrap App in `<BrowserRouter>` |
| Port 5173 already in use | Another process using port | Find: `lsof -i :5173`, kill process or use different port |

---

## Acceptance Criteria

✅ Dev server starts on port 5173 (no errors)  
✅ Tailwind CSS loads correctly (check browser DevTools)  
✅ React Router configured with /login, /signup, /phones routes  
✅ Zustand store initialized with auth state  
✅ Axios client created with JWT injection  
✅ `.env.local` configured with API_BASE_URL  
✅ Build completes without errors: `npm run build`  
✅ All imports are ES modules (no CommonJS mixing)

---

## Next Task

After completing FE-3.1:
- **FE-3.2:** HTTP Client & API Integration (enhance Axios, error handling)
- **FE-3.3:** Auth Layout Components (reusable form elements)
- **FE-3.4:** Login Page (email/password form + OAuth)

