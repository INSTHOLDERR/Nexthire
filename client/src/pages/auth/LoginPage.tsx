import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import GoogleButton from '../../components/auth/GoogleButton';
import { login, googleAuth } from '../../services/authService';
import { signInWithGoogle } from '../../services/firebaseService';
import { useAuth } from '../../hooks/useAuth';
import type { AxiosError } from 'axios';

interface LoginForm { email: string; password: string }
interface ApiErrorData { code?: string; message?: string; data?: unknown }
type BannerType = '' | 'not_found' | 'google_only';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCredentials, setPendingEmail, setAuthMethod } = useAuth();
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [noAccountBanner, setNoAccountBanner] = useState<BannerType>('');
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async ({ email, password }: LoginForm) => {
    setLoading(true);
    setNoAccountBanner('');
    try {
      await login({ email, password });
      setPendingEmail(email);
      toast.success('OTP sent to your email!');
      navigate('/verify-otp?type=login_verify');
    } catch (err) {
      const res = (err as AxiosError<ApiErrorData>).response?.data;
      if (res?.code === 'EMAIL_NOT_FOUND') return setNoAccountBanner('not_found');
      if (res?.code === 'GOOGLE_ONLY')     return setNoAccountBanner('google_only');
      if (res?.code === 'BANNED')    return navigate('/banned',    { state: res.data });
      if (res?.code === 'SUSPENDED') return navigate('/suspended', { state: res.data });
      toast.error(res?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const res = await googleAuth(idToken);
      const { token: gToken, user: gUser } = res.data.data;
      setCredentials({ token: gToken, user: { ...gUser, id: gUser.id ?? gUser._id } });
      const { onboardingComplete } = res.data.data.user;
      if (!onboardingComplete) setAuthMethod('google');
      navigate(onboardingComplete ? '/' : '/onboarding/profile');
    } catch (err) {
      const res = (err as AxiosError<ApiErrorData>).response?.data;
      if (res?.code === 'BANNED')    return navigate('/banned',    { state: res.data });
      if (res?.code === 'SUSPENDED') return navigate('/suspended', { state: res.data });
      toast.error('Google sign-in failed');
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your NextHire account</p>
          </div>
          <div className="px-8 py-7">
            {noAccountBanner && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-5 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                {noAccountBanner === 'not_found' && <span>No account found with this email.{' '}<Link to="/register" className="font-semibold underline">Create a new account?</Link></span>}
                {noAccountBanner === 'google_only' && <span>This account was created with Google and has no password yet.{' '}<Link to="/forgot-password" className="font-semibold underline">Set a password first</Link>, then sign in here.</span>}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="nh-label">Email address</label>
                <input {...register('email', { required: 'Email is required' })} placeholder="you@example.com" className={`nh-input ${errors.email ? 'nh-input-error' : ''}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">⚠ {errors.email.message}</p>}
              </div>
              <div>
                <label className="nh-label">Password</label>
                <PasswordInput register={register('password', { required: 'Password is required' })} placeholder="Enter your password" error={errors.password?.message} />
              </div>
              <button type="submit" disabled={loading} className="nh-btn-primary !mt-6">
                {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending OTP...</span> : 'Continue'}
              </button>
              <p className="text-center"><Link to="/forgot-password" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">Forgot password?</Link></p>
            </form>
            <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-slate-200" /><span className="text-slate-400 text-xs font-medium">or</span><div className="flex-1 h-px bg-slate-200" /></div>
            <GoogleButton onClick={handleGoogle} loading={googleLoading} />
            <p className="text-center text-slate-500 text-sm mt-6">Don't have an account?{' '}<Link to="/register" className="text-slate-900 hover:underline font-semibold">Register</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
