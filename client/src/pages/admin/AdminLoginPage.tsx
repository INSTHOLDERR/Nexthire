import NHLogo from '../../components/common/NHLogo';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PasswordInput from '../../components/common/PasswordInput';
import { adminLogin } from '../../services/adminService';
import type { AxiosError } from 'axios';

interface AdminLoginForm { email: string; password: string }

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>();

  const onSubmit = async ({ email, password }: AdminLoginForm) => {
    setLoading(true);
    try {
      const res = await adminLogin({ email, password });
      localStorage.setItem('nh_admin_token', res.data.token as string);
      toast.success('Welcome, Admin!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error((err as AxiosError<{ message?: string }>).response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <NHLogo size={36} showWordmark wordmarkClass="text-xl font-bold text-slate-800" />
          <span className="text-xs text-slate-400 ml-1 font-medium">Admin</span>
          <p className="text-slate-500 text-sm mt-2">Admin access only</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-slate-900">Admin Sign In</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your admin credentials to continue</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 space-y-4">
            <div>
              <label className="nh-label">Email</label>
              <input {...register('email', { required: 'Required' })} placeholder="admin@gmail.com" className="nh-input" />
              {errors.email && <p className="nh-error">⚠ {errors.email.message}</p>}
            </div>
            <div>
              <label className="nh-label">Password</label>
              <PasswordInput register={register('password', { required: 'Required' })} placeholder="Admin password" error={errors.password?.message} />
            </div>
            <button type="submit" disabled={loading} className="nh-btn-primary !mt-6">
              {loading ? 'Signing in...' : 'Sign in to Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
