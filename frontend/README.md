# Phone List System - Frontend

React + Vite frontend for the Phone List System MVP.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:3000/api`.

## Build

```bash
npm run build
```

## Architecture

- **Pages**: LoginPage, SignupPage, PhonesPage, PhoneDetailPage, LogoutPage, ForgotPasswordPage
- **Components**: Common UI components (Button, Input, Card, Loading, Alert)
- **Services**: API client with Axios and request interceptors
- **Store**: Zustand for authentication and phone state management
- **Styling**: Tailwind CSS

## API Integration

All endpoints from the backend API are available via the `api` service:
- Authentication (signup, signin, signout, password reset)
- Phones (list, create, get, update, delete)
- Owners (add, remove, update)

Token management is automatic via Axios interceptors. 401 responses redirect to login.

## Environment

Assumes backend runs on `http://localhost:3000`. Update `vite.config.js` proxy if needed.
