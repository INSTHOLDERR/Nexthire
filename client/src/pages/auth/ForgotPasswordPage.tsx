import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import type { AxiosError } from 'axios';

interface ForgotForm { email: string }

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { setPendingEmail } = useAuth();
  const [loading, setLoading]               = useState(false);
  const [noAccountBanner, setNoAccountBanner] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>();

  const onSubmit = async ({ email }: ForgotForm) => {
    setLoading(true);
    setNoAccountBanner(false);
    try {
      await forgotPassword({ email });
      setPendingEmail(email);
      toast.success('OTP sent!');
      navigate('/verify-otp?type=forgot_password');
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) setNoAccountBanner(true);
      else toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Failed to send OTP');
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
            <h1 className="text-xl font-bold text-slate-900">Forgot password?</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your email to receive a reset code</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-4">
            {noAccountBanner && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span>No account found with this email.{' '}<Link to="/register" className="font-semibold underline">Create a new account?</Link></span>
              </div>
            )}
            <div>
              <label className="nh-label">Email address</label>
              <input {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })} placeholder="you@example.com" className={`nh-input ${errors.email ? 'nh-input-error' : ''}`} />
              {errors.email && <p className="nh-error">⚠ {errors.email.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="nh-btn-primary">{loading ? 'Sending OTP...' : 'Send OTP code'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
