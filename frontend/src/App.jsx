import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { PeoplePage } from './pages/PeoplePage';
import { PersonPage } from './pages/PersonPage';
import { MyPage } from './pages/MyPage';
import { CreatePersonPage } from './pages/CreatePersonPage';
import { UpdatePersonPage } from './pages/UpdatePersonPage';
import { DeletePersonPage } from './pages/DeletePersonPage';
import { SessionsNewPage } from './pages/SessionsNewPage';
import { UsersNewPage } from './pages/UsersNewPage';
import { UsersPasswordPage } from './pages/UsersPasswordPage';
import { PhonesPage } from './pages/PhonesPage';
import { CreatePhonePage } from './pages/CreatePhonePage';
import { PhoneDetailPage } from './pages/PhoneDetailPage';
import { SessionsDestroyPage } from './pages/SessionsDestroyPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* <Route path="/users" element={<UsersPage />} /> */}
        <Route path="/users/new" element={<UsersNewPage />} />
        <Route path="/users/password" element={<UsersPasswordPage />} />

        {/* <Route path="/sessions" element={<SessionsPage />} /> */}
        <Route path="/sessions/new" element={<SessionsNewPage />} />
        <Route path="/sessions/destroy" element={<SessionsDestroyPage />} />

        <Route path="/dashboard" element={<ProtectedRoute> <DashboardPage /> </ProtectedRoute>} />

        <Route path="/phones" element={<ProtectedRoute> <PhonesPage /> </ProtectedRoute>} />
        <Route path="/phones/new" element={<ProtectedRoute> <CreatePhonePage /> </ProtectedRoute>} exact />
        <Route path="/phones/detail" element={<ProtectedRoute> <PhoneDetailPage /> </ProtectedRoute>} />

        <Route path="/people" element={<ProtectedRoute> <PeoplePage /> </ProtectedRoute>} />
        <Route path="/people/me" element={<ProtectedRoute> <MyPage /> </ProtectedRoute>} exact />
        <Route path="/people/new" element={<ProtectedRoute> <CreatePersonPage /> </ProtectedRoute>} exact />
        <Route path="/people/detail" element={<ProtectedRoute> <PersonPage /> </ProtectedRoute>} />
        <Route path="/people/update" element={<ProtectedRoute> <UpdatePersonPage /> </ProtectedRoute>} />
        <Route path="/people/delete" element={<ProtectedRoute> <DeletePersonPage /> </ProtectedRoute>} />

        <Route path="/profile" element={<Navigate to="/people/me" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
