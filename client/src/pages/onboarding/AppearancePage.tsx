import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StepDots from '../../components/common/StepDots';
import { setupProfile } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

interface ToggleOption { key: 'openToWork' | 'isHiring'; icon: string; label: string; desc: string }
const OPTIONS: ToggleOption[] = [
  { key: 'openToWork', icon: '✅', label: 'Open to Work',       desc: 'Let recruiters know you are available' },
  { key: 'isHiring',   icon: '🔍', label: 'Currently Hiring',   desc: 'Let candidates know your company is recruiting' },
];

export default function AppearancePage() {
  const navigate = useNavigate();
  const { user, token, setCredentials, authMethod, setAuthMethod } = useAuth();

  const isEmail     = authMethod === 'email';
  const stepTotal   = isEmail ? 4 : 3;
  const stepCurrent = isEmail ? 3 : 2;
  const stepLabel   = isEmail ? 'Step 4 of 4' : 'Step 3 of 3';

  const [toggles, setToggles]         = useState({ openToWork: false, isHiring: false });
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [loading, setLoading]             = useState(false);

  const toggle = (key: 'openToWork' | 'isHiring') => setToggles(p => ({ ...p, [key]: !p[key] }));

  const finishOnboarding = async (skipToggles = false) => {
    setLoading(true);
    try {
      const fd = new FormData();
      if (!skipToggles) {
        fd.append('openToWork', String(toggles.openToWork));
        fd.append('isHiring',   String(toggles.isHiring));
      }
      if (user?.profilePicture) fd.append('existingProfilePicture', user.profilePicture);
      fd.append('onboardingComplete', 'true');
      const res = await setupProfile(fd);
      const updated = res.data.data;
      setCredentials({
        token: token!,
        user: {
          ...user!,
          ...updated,
          id: updated._id ?? updated.id ?? user!.id,
          profilePicture: updated.profilePicture ?? user!.profilePicture,
        },
      });
      setAuthMethod(null);
      navigate('/');
    } catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" /></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-6 pb-5 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg> Back
              </button>
              <StepDots total={stepTotal} current={stepCurrent} />
              <button onClick={() => setShowSkipModal(true)} className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">Skip →</button>
            </div>
            <h1 className="text-xl font-bold text-slate-900">How do you appear?</h1>
            <p className="text-slate-500 text-xs mt-0.5">{stepLabel} — You can change this anytime</p>
          </div>
          <div className="px-8 py-6 space-y-4">
            {OPTIONS.map(({ key, icon, label, desc }) => (
              <button key={key} onClick={() => toggle(key)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${toggles[key] ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className="text-2xl">{icon}</span>
                <div className="flex-1"><p className="text-slate-800 font-semibold text-sm">{label}</p><p className="text-slate-500 text-xs">{desc}</p></div>
                <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${toggles[key] ? 'bg-slate-900' : 'bg-slate-200'} relative`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${toggles[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </button>
            ))}
            <button onClick={() => finishOnboarding(false)} disabled={loading} className="nh-btn-primary !mt-6">{loading ? 'Saving...' : '🚀 Get Started'}</button>
          </div>
        </div>
      </div>
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-sm">
            <h3 className="text-slate-900 font-bold text-lg mb-2">Skip setup?</h3>
            <p className="text-slate-500 text-sm mb-6">Are you sure you want to skip? You can complete it later from settings.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowSkipModal(false); finishOnboarding(true); }} className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm">Skip</button>
              <button onClick={() => setShowSkipModal(false)} className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-sm">Get Started</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
