import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

import RegisterPage       from '../pages/auth/RegisterPage';
import LoginPage          from '../pages/auth/LoginPage';
import VerifyOTPPage      from '../pages/auth/VerifyOTPPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from '../pages/auth/ResetPasswordPage';
import SuspendedPage      from '../pages/auth/SuspendedPage';
import BannedPage         from '../pages/auth/BannedPage';
import ProfileSetupPage   from '../pages/onboarding/ProfileSetupPage';
import RolePage           from '../pages/onboarding/RolePage';
import AppearancePage     from '../pages/onboarding/AppearancePage';
import HomePage           from '../pages/home/HomePage';
import AdminLoginPage     from '../pages/admin/AdminLoginPage';
import AdminDashboard     from '../pages/admin/AdminDashboard';

const Private = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.status === 'banned')    return <Navigate to="/banned"    replace />;
  if (user?.status === 'suspended') return <Navigate to="/suspended" replace />;
  return <>{children}</>;
};

const OnboardingRoute = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.status === 'banned')    return <Navigate to="/banned"    replace />;
  if (user?.status === 'suspended') return <Navigate to="/suspended" replace />;
  if (user?.onboardingComplete)     return <Navigate to="/"          replace />;
  return <>{children}</>;
};

const Public = ({ children }: { children: ReactNode }) => {
  const { token, user, authMethod } = useAuth();
  if (!token) return <>{children}</>;
  if (user?.status === 'banned')    return <Navigate to="/banned"    replace />;
  if (user?.status === 'suspended') return <Navigate to="/suspended" replace />;
  if (authMethod === 'google' && !user?.onboardingComplete)
    return <Navigate to="/onboarding/profile" replace />;
  return <Navigate to="/" replace />;
};

const AdminPrivate = ({ children }: { children: ReactNode }) => {
  const adminToken = localStorage.getItem('nh_admin_token');
  return adminToken ? <>{children}</> : <Navigate to="/admin" replace />;
};

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register"        element={<Public><RegisterPage /></Public>} />
        <Route path="/login"           element={<Public><LoginPage /></Public>} />
        <Route path="/verify-otp"      element={<VerifyOTPPage />} />
        <Route path="/forgot-password" element={<Public><ForgotPasswordPage /></Public>} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/banned"    element={<BannedPage />} />

        <Route path="/onboarding/profile"    element={<OnboardingRoute><ProfileSetupPage /></OnboardingRoute>} />
        <Route path="/onboarding/role"       element={<OnboardingRoute><RolePage /></OnboardingRoute>} />
        <Route path="/onboarding/appearance" element={<OnboardingRoute><AppearancePage /></OnboardingRoute>} />

        <Route path="/" element={<Private><HomePage /></Private>} />

        <Route path="/admin"           element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminPrivate><AdminDashboard /></AdminPrivate>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
