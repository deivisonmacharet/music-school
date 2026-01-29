import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Payments from './pages/Payments';
import Events from './pages/Events';
import Attendance from './pages/Attendance';

function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route 
            path="students" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Students />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="teachers" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Teachers />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="classes" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Classes />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="payments" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Payments />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="events" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Events />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="attendance" 
            element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Attendance />
              </PrivateRoute>
            } 
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
