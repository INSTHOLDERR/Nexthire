import NHLogo from '../../components/common/NHLogo';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import StepDots from '../../components/common/StepDots';
import { setupProfile } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

interface ProfileForm {
  firstName: string;
  lastName?: string;
  phone?: string;
  location?: string;
}

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, token, setCredentials, authMethod } = useAuth();

  const isEmail     = authMethod === 'email';
  const stepTotal   = isEmail ? 4 : 3;
  const stepCurrent = isEmail ? 1 : 0;
  const stepLabel   = isEmail ? 'Step 2 of 4' : 'Step 1 of 3';

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(user?.profilePicture ?? null);
  const [locLoading, setLocLoading] = useState(false);
  const [loading, setLoading]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '', phone: '', location: '' },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
          const data = await res.json() as { address?: { city?: string; town?: string; state?: string } };
          setValue('location', data.address?.city || data.address?.town || data.address?.state || '');
          toast.success('Location detected');
        } catch { toast.error('Could not detect location'); }
        setLocLoading(false);
      },
      () => { toast.error('Location access denied'); setLocLoading(false); }
    );
  };

  const onSubmit = async (data: ProfileForm) => {
    setLoading(true);
    try {
      const fd = new FormData();
      (Object.entries(data) as [string, string][]).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (imageFile) {
        // User picked a new photo — upload it
        fd.append('profilePicture', imageFile);
      } else if (user?.profilePicture) {
        // No new file chosen — explicitly keep the existing picture (e.g. from Google)
        fd.append('existingProfilePicture', user.profilePicture);
      }
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
      navigate('/onboarding/role');
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
              <div className="w-12" />
              <StepDots total={stepTotal} current={stepCurrent} />
              <button onClick={() => navigate('/onboarding/role')} className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors">Skip →</button>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Set up your profile</h1>
            <p className="text-slate-500 text-xs mt-0.5">{stepLabel} — Add your details</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-4">
            <div className="flex flex-col items-center py-2">
              <div className="relative">
                <div onClick={() => fileRef.current?.click()} className={`w-20 h-20 rounded-full border-2 cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-slate-50 ${preview ? 'border-slate-300 hover:border-slate-500' : 'border-dashed border-slate-300 hover:border-slate-500'}`}>
                  {preview
                    ? <img src={preview} alt="profile" className="w-full h-full object-cover" />
                    : <div className="text-center"><svg className="w-6 h-6 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg><p className="text-slate-300 text-xs mt-0.5">Photo</p></div>
                  }
                </div>
                {/* Camera overlay on hover */}
                {preview && (
                  <div onClick={() => fileRef.current?.click()} className="absolute inset-0 w-20 h-20 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                )}
                {/* Google badge — shown when picture came from Google and user hasn't replaced it */}
                {user?.profilePicture && !imageFile && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
              <p className="text-slate-400 text-xs mt-2">
                {user?.profilePicture && !imageFile ? 'From Google · click to change' : preview ? 'Click to change' : 'Click to upload'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="nh-label">First name</label>
                <input {...register('firstName', { required: 'Required' })} placeholder="First name" className={`nh-input ${errors.firstName ? 'nh-input-error' : ''}`} />
                {errors.firstName && <p className="nh-error text-xs">⚠ Required</p>}
              </div>
              <div>
                <label className="nh-label">Last name</label>
                <input {...register('lastName')} placeholder="Last name" className="nh-input" />
              </div>
            </div>
            <div>
              <label className="nh-label">Email <span className="text-slate-400 font-normal">(read-only)</span></label>
              <input value={user?.email || ''} readOnly className="nh-input bg-slate-50 cursor-not-allowed text-slate-400" />
            </div>
            <div>
              <label className="nh-label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input {...register('phone')} placeholder="+91 00000 00000" className="nh-input" />
            </div>
            <div>
              <label className="nh-label">Location <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex gap-2">
                <input {...register('location')} placeholder="City, Country" className="nh-input" />
                <button type="button" onClick={detectLocation} disabled={locLoading} className="flex-shrink-0 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {locLoading ? '...' : '📍'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="nh-btn-primary !mt-6">{loading ? 'Saving...' : 'Continue →'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
