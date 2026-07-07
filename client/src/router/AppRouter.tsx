import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';
import { UserStatus } from '../types';

// Auth pages
import RegisterPage       from '../pages/auth/RegisterPage';
import LoginPage          from '../pages/auth/LoginPage';
import VerifyOTPPage      from '../pages/auth/VerifyOTPPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from '../pages/auth/ResetPasswordPage';
import SuspendedPage      from '../pages/auth/SuspendedPage';
import BannedPage         from '../pages/auth/BannedPage';

// Onboarding pages
import ProfileSetupPage from '../pages/onboarding/ProfileSetupPage';
import RolePage         from '../pages/onboarding/RolePage';
import AppearancePage   from '../pages/onboarding/AppearancePage';

// Main pages — accessible to all logged-in users
import HomePage           from '../pages/home/HomePage';
import MessagesPage       from '../pages/messages/MessagesPage';
import NotificationsPage  from '../pages/notifications/NotificationsPage';
import AIChatbotPage      from '../pages/ai/AIChatbotPage';
import ConnectionsPage    from '../pages/connections/ConnectionsPage';
import ProfilePage        from '../pages/profile/ProfilePage';
import ReportsPage        from '../pages/reports/ReportsPage';
import WarningsPage       from '../pages/warnings/WarningsPage';
import SearchPage         from '../pages/search/SearchPage';

// Role-gated pages — jobseeker + recruiter only
import JobsPage         from '../pages/jobs/JobsPage';
import AIInterviewPage  from '../pages/ai/AIInterviewPage';

// Admin pages
import AdminLoginPage  from '../pages/admin/AdminLoginPage';
import AdminDashboard  from '../pages/admin/AdminDashboard';

// ─── Route Guards ────────────────────────────────────────────────────────────

/**
 * Private — must be logged in and account must be active.
 * Banned → /banned, Suspended → /suspended, not logged in → /login.
 */
const Private = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.status === UserStatus.BANNED)    return <Navigate to="/banned"    replace />;
  if (user?.status === UserStatus.SUSPENDED) return <Navigate to="/suspended" replace />;
  return <>{children}</>;
};

/**
 * OnboardingRoute — logged in but onboarding not yet complete.
 * Once onboarding is done → redirects to /.
 */
const OnboardingRoute = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.status === UserStatus.BANNED)    return <Navigate to="/banned"    replace />;
  if (user?.status === UserStatus.SUSPENDED) return <Navigate to="/suspended" replace />;
  if (user?.onboardingComplete)              return <Navigate to="/"          replace />;
  return <>{children}</>;
};

/**
 * Public — only accessible when NOT logged in.
 * Redirects to / if already authenticated.
 */
const Public = ({ children }: { children: ReactNode }) => {
  const { token, user, authMethod } = useAuth();
  if (!token) return <>{children}</>;
  if (user?.status === UserStatus.BANNED)    return <Navigate to="/banned"    replace />;
  if (user?.status === UserStatus.SUSPENDED) return <Navigate to="/suspended" replace />;
  if (authMethod === 'google' && !user?.onboardingComplete)
    return <Navigate to="/onboarding/profile" replace />;
  return <Navigate to="/" replace />;
};

/**
 * RoleProtected — logged in AND must have one of the allowed roles.
 *
 * Used for:
 * - /jobs         → jobseeker, recruiter
 * - /ai-interview → jobseeker, recruiter
 *
 * If the user is logged in but has the wrong role (e.g. student tries to
 * access /jobs), they see a clean "Access restricted" page — not a 404,
 * not a blank screen.
 *
 * Why frontend AND backend both enforce this:
 * - Frontend guard: prevents navigation to the page at all, shows a
 *   friendly message, keeps the UI clean.
 * - Backend requireRole middleware: prevents the API from returning data
 *   even if someone bypasses the frontend guard (e.g. curl, Postman).
 * Both are necessary — frontend UX, backend security.
 */
const RoleProtected = ({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: string[];
}) => {
  const { token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.status === UserStatus.BANNED)    return <Navigate to="/banned"    replace />;
  if (user?.status === UserStatus.SUSPENDED) return <Navigate to="/suspended" replace />;

  // User is logged in but their role doesn't grant access
  if (!user?.role || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access restricted</h2>
          <p className="text-slate-500 text-sm mb-1">
            This feature is only available to{' '}
            <strong>{allowedRoles.join(' and ')}</strong> accounts.
          </p>
          {user?.role === 'student' && (
            <p className="text-slate-400 text-xs mt-2">
              You're currently signed in as a <strong>student</strong>. Contact support if you think this is a mistake.
            </p>
          )}
          {!user?.role && (
            <p className="text-slate-400 text-xs mt-2">
              Your account doesn't have a role assigned yet. Please complete onboarding.
            </p>
          )}
          <button
            onClick={() => window.history.back()}
            className="mt-5 px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * AdminPrivate — checks for the admin JWT in localStorage.
 * Separate from user auth — admin tokens use a different secret.
 */
const AdminPrivate = ({ children }: { children: ReactNode }) => {
  const adminToken = localStorage.getItem('nh_admin_token');
  return adminToken ? <>{children}</> : <Navigate to="/admin" replace />;
};

// ─── Router ──────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public auth routes */}
        <Route path="/register"        element={<Public><RegisterPage /></Public>} />
        <Route path="/login"           element={<Public><LoginPage /></Public>} />
        <Route path="/verify-otp"      element={<VerifyOTPPage />} />
        <Route path="/forgot-password" element={<Public><ForgotPasswordPage /></Public>} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Account status pages (accessible regardless of active/banned/suspended) */}
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/banned"    element={<BannedPage />} />

        {/* Onboarding — only before onboarding is complete */}
        <Route path="/onboarding/profile"    element={<OnboardingRoute><ProfileSetupPage /></OnboardingRoute>} />
        <Route path="/onboarding/role"       element={<OnboardingRoute><RolePage /></OnboardingRoute>} />
        <Route path="/onboarding/appearance" element={<OnboardingRoute><AppearancePage /></OnboardingRoute>} />

        {/* Main app — all logged-in users, any role */}
        <Route path="/"              element={<Private><HomePage /></Private>} />
        <Route path="/messages"      element={<Private><MessagesPage /></Private>} />
        <Route path="/notifications" element={<Private><NotificationsPage /></Private>} />
        <Route path="/ai"            element={<Private><AIChatbotPage /></Private>} />
        <Route path="/connections"  element={<Private><ConnectionsPage /></Private>} />
        <Route path="/profile/:userId" element={<Private><ProfilePage /></Private>} />
        <Route path="/profile"         element={<Private><ProfilePage /></Private>} />
        <Route path="/reports"         element={<Private><ReportsPage /></Private>} />
        <Route path="/warnings"        element={<Private><WarningsPage /></Private>} />
        <Route path="/search"       element={<Private><SearchPage /></Private>} />

        {/* Role-gated routes — jobseeker + recruiter ONLY */}
        <Route
          path="/jobs"
          element={
            <RoleProtected allowedRoles={['jobseeker', 'recruiter']}>
              <JobsPage />
            </RoleProtected>
          }
        />
        <Route
          path="/ai-interview"
          element={
            <RoleProtected allowedRoles={['jobseeker', 'recruiter']}>
              <AIInterviewPage />
            </RoleProtected>
          }
        />

        {/* Admin */}
        <Route path="/admin"           element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminPrivate><AdminDashboard /></AdminPrivate>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}
