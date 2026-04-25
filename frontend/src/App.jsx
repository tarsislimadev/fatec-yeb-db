import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { PeoplePage } from './pages/PeoplePage.jsx';
import { PersonPage } from './pages/PersonPage.jsx';
import { UpdatePersonPage } from './pages/UpdatePersonPage.jsx';
import { DeletePersonPage } from './pages/DeletePersonPage.jsx';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PhonesPage } from './pages/PhonesPage';
import { PhoneDetailPage } from './pages/PhoneDetailPage';
import { LogoutPage } from './pages/LogoutPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/logout" element={<LogoutPage />} />

        <Route path="/dashboard" element={ <ProtectedRoute> <DashboardPage /> </ProtectedRoute> } />

        <Route path="/phones" element={ <ProtectedRoute> <PhonesPage /> </ProtectedRoute> } />
        <Route path="/phones/:id" element={ <ProtectedRoute> <PhoneDetailPage /> </ProtectedRoute> } />

        <Route path="/people" element={ <ProtectedRoute> <PeoplePage /> </ProtectedRoute> } />
        <Route path="/people/:id" element={ <ProtectedRoute> <PersonPage /> </ProtectedRoute> } />
        <Route path="/people/:id/update" element={ <ProtectedRoute> <UpdatePersonPage /> </ProtectedRoute> } />
        <Route path="/people/:id/delete" element={ <ProtectedRoute> <DeletePersonPage /> </ProtectedRoute> } />

        <Route path="/profile" element={<Navigate to="/people/me" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
