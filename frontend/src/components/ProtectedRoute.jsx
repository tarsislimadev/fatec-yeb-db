import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';

export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/sessions/new" replace />;
  }

  return children;
}
