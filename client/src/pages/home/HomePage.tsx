import NHLogo from '../../components/common/NHLogo';
import { useAuth } from '../../hooks/useAuth';

export default function HomePage() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-4"><NHLogo size={64} radius={16} /></div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to NextHire 🎉</h1>
        <p className="text-slate-500 mb-8">Hi {user?.firstName || user?.email}! Your dashboard is coming soon.</p>
        <button onClick={logout} className="text-blue-600 hover:text-blue-700 font-medium text-sm border border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
          Sign out
        </button>
      </div>
    </div>
  );
}
