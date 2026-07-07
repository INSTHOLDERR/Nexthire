import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StepDots from '../../components/common/StepDots';
import { setupProfile } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

type WorkStatus = 'none' | 'open_to_work' | 'currently_hiring';

interface Option {
  value: Exclude<WorkStatus, 'none'>;
  icon: string;
  label: string;
  desc: string;
  color: string;         // active ring color
  bg: string;            // active background
}

const OPTIONS: Option[] = [
  {
    value: 'open_to_work',
    icon: '🟢',
    label: 'Open to Work',
    desc: 'Let recruiters know you are actively looking for opportunities',
    color: 'border-emerald-500',
    bg:    'bg-emerald-50',
  },
  {
    value: 'currently_hiring',
    icon: '💼',
    label: 'Currently Hiring',
    desc: 'Let candidates know your company is actively recruiting',
    color: 'border-purple-500',
    bg:    'bg-purple-50',
  },
];

export default function AppearancePage() {
  const navigate = useNavigate();
  const { user, token, setCredentials, authMethod, setAuthMethod } = useAuth();

  const isEmail     = authMethod === 'email';
  const stepTotal   = isEmail ? 4 : 3;
  const stepCurrent = isEmail ? 3 : 2;
  const stepLabel   = isEmail ? 'Step 4 of 4' : 'Step 3 of 3';

  // Single selection — only one can be active at a time
  const [selected,      setSelected]      = useState<WorkStatus>('none');
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [loading,       setLoading]       = useState(false);

  const toggle = (val: Exclude<WorkStatus, 'none'>) => {
    // Tap same option again → deselect (back to 'none')
    setSelected(prev => (prev === val ? 'none' : val));
  };

  const finish = async (skip = false) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('onboardingComplete', 'true');

      const ws = skip ? 'none' : selected;
      fd.append('workStatus', ws);

      // Role is determined here — not on the previous page.
      // open_to_work  → jobseeker
      // currently_hiring → recruiter
      // neither (none / skip) → user role stays as whatever RolePage set,
      //   or 'user' if they skipped the role page too.
      if (ws === 'open_to_work') {
        fd.append('role', 'jobseeker');
      } else if (ws === 'currently_hiring') {
        fd.append('role', 'recruiter');
      } else if (!user?.role) {
        // Skipped both pages — assign a base 'user' role
        fd.append('role', 'user');
      }

      if (user?.profilePicture) {
        fd.append('existingProfilePicture', user.profilePicture);
      }

      const res     = await setupProfile(fd);
      const updated = res.data.data;

      setCredentials({
        token: token!,
        user: {
          ...user!,
          ...updated,
          id:             updated._id ?? updated.id ?? user!.id,
          profilePicture: updated.profilePicture ?? user!.profilePicture,
          role:           updated.role      ?? user!.role,
          workStatus:     updated.workStatus ?? 'none',
          headline:       updated.headline  ?? user!.headline,
        },
      });

      setAuthMethod(null);
      navigate('/');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-6 pb-5 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
              <StepDots total={stepTotal} current={stepCurrent} />
              <button
                onClick={() => setShowSkipModal(true)}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                Skip →
              </button>
            </div>
            <h1 className="text-xl font-bold text-slate-900">How do you appear?</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {stepLabel} — You can change this anytime from your profile
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">

            <p className="text-sm text-slate-500 leading-relaxed">
              Select one that best describes your current situation, or skip and update later.
              If you don't select anything, you'll appear as a <strong>regular member</strong>.
            </p>

            {OPTIONS.map(({ value, icon, label, desc, color, bg }) => {
              const active = selected === value;
              return (
                <button
                  key={value}
                  onClick={() => toggle(value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    active ? `${color} ${bg}` : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{icon}</span>
                  <div className="flex-1">
                    <p className="text-slate-800 font-semibold text-sm">{label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                  {/* Toggle switch */}
                  <div className={`w-12 h-6 rounded-full flex-shrink-0 relative transition-colors ${active ? 'bg-slate-900' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              );
            })}

            {/* Status summary */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs text-slate-500">
              {selected === 'none' && (
                <span>You'll appear as a <strong>regular member</strong> — no badge on your posts or profile.</span>
              )}
              {selected === 'open_to_work' && (
                <span>A <strong className="text-emerald-700">🟢 Open to work</strong> badge will show on your posts and profile.</span>
              )}
              {selected === 'currently_hiring' && (
                <span>A <strong className="text-purple-700">💼 Currently hiring</strong> badge will show on your posts and profile.</span>
              )}
            </div>

            <button
              onClick={() => finish(false)}
              disabled={loading}
              className="nh-btn-primary !mt-6"
            >
              {loading ? 'Saving…' : '🚀 Get Started'}
            </button>
          </div>
        </div>
      </div>

      {/* Skip confirmation modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-sm">
            <h3 className="text-slate-900 font-bold text-lg mb-2">Skip for now?</h3>
            <p className="text-slate-500 text-sm mb-6">
              You'll appear as a regular member. You can always update this from your profile later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSkipModal(false); finish(true); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Skip
              </button>
              <button
                onClick={() => setShowSkipModal(false)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
