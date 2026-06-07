import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import { resetPassword } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import type { AxiosError } from 'axios';

interface ResetForm { newPassword: string; confirmPassword: string }

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { pendingEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetForm>();

  const onSubmit = async ({ newPassword }: ResetForm) => {
    setLoading(true);
    try {
      await resetPassword({ email: pendingEmail ?? '', newPassword });
      toast.success('Password set! You can now sign in with your email and password.');
      navigate('/login');
    } catch (err) {
      toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" /></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-6 pb-5 border-b border-slate-100">
            <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back to sign in
            </button>
            <h1 className="text-xl font-bold text-slate-900">Reset password</h1>
            <p className="text-slate-500 text-sm mt-1">Choose a new password</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-4">
            <div>
              <label className="nh-label">New password</label>
              <PasswordInput register={register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} placeholder="New password" error={errors.newPassword?.message} />
            </div>
            <div>
              <label className="nh-label">Confirm new password</label>
              <PasswordInput register={register('confirmPassword', { validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} placeholder="Confirm new password" error={errors.confirmPassword?.message} />
            </div>
            <button type="submit" disabled={loading} className="nh-btn-primary">{loading ? 'Resetting...' : 'Reset password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
