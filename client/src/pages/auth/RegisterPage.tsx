import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import GoogleButton from '../../components/auth/GoogleButton';
import { register as registerAPI, googleAuth } from '../../services/authService';
import { signInWithGoogle } from '../../services/firebaseService';
import { useAuth } from '../../hooks/useAuth';
import type { AxiosError } from 'axios';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ApiErrorData { code?: string; message?: string; data?: unknown }

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setCredentials, setPendingEmail, setAuthMethod } = useAuth();
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailBanner, setEmailBanner]     = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>();

  const onSubmit = async ({ email, password }: RegisterForm) => {
    setLoading(true);
    setEmailBanner(false);
    try {
      await registerAPI({ email, password });
      setPendingEmail(email);
      setAuthMethod('email');
      toast.success('OTP sent — check your email!');
      navigate('/verify-otp?type=email_verify');
    } catch (err) {
      const res = (err as AxiosError<ApiErrorData>).response?.data;
      if (res?.code === 'EMAIL_EXISTS') return setEmailBanner(true);
      if (res?.code === 'BANNED')    return navigate('/banned',    { state: res.data });
      if (res?.code === 'SUSPENDED') return navigate('/suspended', { state: res.data });
      toast.error(res?.message || 'Something went wrong');
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
            <h1 className="text-2xl font-bold text-slate-900">Create a new account</h1>
            <p className="text-slate-500 text-sm mt-1">Join thousands of professionals on NextHire</p>
          </div>
          <div className="px-8 py-7">
            {emailBanner && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                <span>Email already exists. <Link to="/login" className="font-semibold underline">Sign in instead?</Link></span>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="nh-label">Email address</label>
                <input {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' } })} placeholder="you@example.com" className={`nh-input ${errors.email ? 'nh-input-error' : ''}`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">⚠ {errors.email.message}</p>}
              </div>
              <div>
                <label className="nh-label">Password</label>
                <PasswordInput register={register('password', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })} placeholder="Create a password (min 8 characters)" error={errors.password?.message} />
              </div>
              <div>
                <label className="nh-label">Confirm password</label>
                <PasswordInput register={register('confirmPassword', { validate: (v) => v === watch('password') || 'Passwords do not match' })} placeholder="Re-enter your password" error={errors.confirmPassword?.message} />
              </div>
              <button type="submit" disabled={loading} className="nh-btn-primary !mt-6">
                {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Creating account...</span> : 'Create account'}
              </button>
            </form>
            <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-slate-200" /><span className="text-slate-400 text-xs font-medium">or</span><div className="flex-1 h-px bg-slate-200" /></div>
            <GoogleButton onClick={handleGoogle} loading={googleLoading} />
            <p className="text-center text-slate-500 text-sm mt-6">Already have an account?{' '}<Link to="/login" className="text-slate-900 hover:underline font-semibold">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
