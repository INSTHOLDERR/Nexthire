import NHLogo from '../../components/common/NHLogo';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import OTPInput from '../../components/common/OTPInput';
import { verifyOTP, forgotPassword, resendEmailVerifyOTP, resendLoginOTP } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { useOtpTimer } from '../../hooks/useOtpTimer';
import type { AxiosError } from 'axios';
import { OTPType } from '../../types';

interface PageMeta { title: string; subtitle: string }
const PAGE_META: Record<OTPType, PageMeta> = {
  email_verify:    { title: 'Verify your email',   subtitle: "Enter the 6-digit code we sent to confirm your account." },
  login_verify:    { title: 'Check your email',    subtitle: "Enter the 6-digit login code we sent to verify it's you." },
  forgot_password: { title: 'Password reset code', subtitle: 'Enter the 6-digit code to reset your password.' },
};

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const type = (searchParams.get('type') || 'email_verify') as OTPType;
  const { pendingEmail, setCredentials } = useAuth();
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const { secondsLeft, formatted, expired, reset: resetTimer } = useOtpTimer();

  // Only present for login_verify, passed in-memory from LoginPage — never persisted
  // to localStorage/sessionStorage, so it disappears on refresh (by design).
  const loginPassword = (location.state as { password?: string } | null)?.password;

  useEffect(() => {
    const stored = localStorage.getItem('nh_pending_email');
    if (!pendingEmail && !stored) {
      toast.error('Session expired. Please try again.');
      navigate(type === 'forgot_password' ? '/forgot-password' : '/login');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const email = pendingEmail || localStorage.getItem('nh_pending_email') || '';
  const meta  = PAGE_META[type] ?? PAGE_META.email_verify;

  const handleVerify = async () => {
    if (otp.length !== 6) return toast.error('Enter all 6 digits');
    setLoading(true);
    try {
      const res = await verifyOTP({ email, otp, type });
      if (type === 'email_verify') {
        const { token, user } = res.data.data;
        setCredentials({ token, user: { ...user, id: user.id ?? user._id } });
        toast.success('Email verified!');
        navigate('/onboarding/profile');
      } else if (type === 'login_verify') {
        const { token, user } = res.data.data;
        setCredentials({ token, user: { ...user, id: user.id ?? user._id } });
        toast.success('Signed in successfully!');
        navigate('/');
      } else {
        toast.success('OTP verified!');
        navigate('/reset-password');
      }
    } catch (err) {
      toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Invalid or expired OTP');
      setOtp('');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      if (type === 'forgot_password') {
        await forgotPassword({ email });
        toast.success('New code sent!');
      } else if (type === 'login_verify') {
        if (!loginPassword) {
          toast.error('Your session expired. Please sign in again.');
          navigate('/login');
          return;
        }
        await resendLoginOTP({ email, password: loginPassword });
        toast.success('New code sent!');
      } else {
        await resendEmailVerifyOTP(email);
        toast.success('New code sent!');
      }
      setOtp('');
      resetTimer();
    } catch (err) {
      const res = (err as AxiosError<{ message?: string; code?: string }>).response?.data;
      if (res?.code === 'REGISTRATION_EXPIRED') {
        toast.error('Your registration session expired. Please register again.');
        navigate('/register');
        return;
      }
      toast.error(res?.message || 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-6 pb-5 border-b border-slate-100">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-slate-900">{meta.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{meta.subtitle}{' '}<span className="font-semibold text-slate-700">{email || 'your email'}</span></p>
          </div>
          <div className="px-8 py-7 space-y-6">
            <OTPInput value={otp} onChange={setOtp} />
            <button onClick={handleVerify} disabled={loading || otp.length !== 6} className="nh-btn-primary">
              {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Verifying...</span> : 'Verify & Continue'}
            </button>

            <div className="text-center space-y-2">
              {!expired ? (
                <p className="text-sm text-slate-500">
                  Code expires in{' '}
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">{formatted}</span>
                </p>
              ) : (
                <p className="text-sm font-medium text-red-600">Your code has expired.</p>
              )}

              <p className="text-sm text-slate-500">
                Didn't receive it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resending || !expired}
                  className="text-slate-800 hover:underline font-semibold disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
