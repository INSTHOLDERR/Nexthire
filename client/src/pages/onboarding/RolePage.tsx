import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StepDots from '../../components/common/StepDots';
import { setupProfile } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

interface Field {
  name: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'number';
  required?: boolean;
}

interface RoleOption {
  id: 'jobseeker' | 'recruiter' | 'student';
  icon: string;
  label: string;
  desc: string;
  fields: Field[];
}

// Role options — Recruiter is NOT listed here because role is determined
// in the next step (AppearancePage) based on work status selection.
// This page collects professional/academic context fields only.
const ROLES: RoleOption[] = [
  {
    id: 'jobseeker',
    icon: '💼',
    label: 'Job / Work',
    desc: 'Working professionally or looking for opportunities',
    fields: [
      { name: 'jobTitle', label: 'Current / Desired Job Title', placeholder: 'e.g. Frontend Developer', required: true },
      { name: 'company',  label: 'Current Company',             placeholder: 'e.g. Infosys (leave blank if not employed)' },
    ],
  },
  {
    id: 'student',
    icon: '🎓',
    label: 'Student',
    desc: 'Currently studying at a school, college or university',
    fields: [
      { name: 'school',       label: 'School / College / University', placeholder: 'e.g. NIT Calicut',     required: true },
      { name: 'degree',       label: 'Degree',                        placeholder: 'e.g. B.Tech',           required: true },
      { name: 'fieldOfStudy', label: 'Field of Study',                placeholder: 'e.g. Computer Science', required: true },
      { name: 'startYear',    label: 'Starting Year',                 placeholder: 'e.g. 2022', type: 'number' },
    ],
  },
];

export default function RolePage() {
  const navigate = useNavigate();
  const { user, token, setCredentials, authMethod } = useAuth();

  const isEmail     = authMethod === 'email';
  const stepTotal   = isEmail ? 4 : 3;
  const stepCurrent = isEmail ? 2 : 1;
  const stepLabel   = isEmail ? 'Step 3 of 4' : 'Step 2 of 3';

  const [selected, setSelected] = useState<RoleOption['id'] | ''>('');
  const [fields,   setFields]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);

  const activeRole = ROLES.find(r => r.id === selected);

  const setField = (name: string, value: string) =>
    setFields(prev => ({ ...prev, [name]: value }));

  const handleContinue = async () => {
    if (!selected) return toast.error('Please select what describes you');

    // Validate required fields
    if (activeRole) {
      for (const f of activeRole.fields) {
        if (f.required && !fields[f.name]?.trim()) {
          return toast.error(`Please fill in: ${f.label}`);
        }
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('role', selected);

      // Send every filled field — the server saves each to its own DB column
      Object.entries(fields).forEach(([k, v]) => {
        if (v?.trim()) fd.append(k, v.trim());
      });

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
          role:           updated.role   ?? selected,
          headline:       updated.headline,
          company:        updated.company,
          jobTitle:       updated.jobTitle,
          school:         updated.school,
          degree:         updated.degree,
          fieldOfStudy:   updated.fieldOfStudy,
          startYear:      updated.startYear,
        },
      });

      navigate('/onboarding/appearance');
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
                onClick={() => navigate('/onboarding/appearance')}
                className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors"
              >
                Skip →
              </button>
            </div>
            <h1 className="text-xl font-bold text-slate-900">What describes you?</h1>
            <p className="text-slate-500 text-xs mt-0.5">{stepLabel} — Personalise your experience</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">

            {/* Role selection */}
            <div className="space-y-3">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => { setSelected(role.id); setFields({}); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    selected === role.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{role.icon}</span>
                  <div className="flex-1">
                    <p className="text-slate-800 font-semibold text-sm">{role.label}</p>
                    <p className="text-slate-500 text-xs">{role.desc}</p>
                  </div>
                  {selected === role.id && (
                    <div className="w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Role-specific fields */}
            {activeRole && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {activeRole.fields.map(f => (
                  <div key={f.name}>
                    <label className="nh-label">
                      {f.label}
                      {f.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <input
                      type={f.type ?? 'text'}
                      placeholder={f.placeholder}
                      value={fields[f.name] ?? ''}
                      onChange={e => setField(f.name, e.target.value)}
                      className="nh-input"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={loading || !selected}
              className="nh-btn-primary"
            >
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
