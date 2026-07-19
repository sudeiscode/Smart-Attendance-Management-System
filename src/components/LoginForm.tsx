import React, { useState } from 'react';
import { ApiService } from '../lib/api';
import { AuthResponse } from '../types';
import { GraduationCap, ShieldAlert, KeyRound, Mail, UserCheck, UserPlus, Clipboard, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (auth: AuthResponse) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'Student' | 'Lecturer'>('Student');
  const [regMatricNo, setRegMatricNo] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await ApiService.login({ email, password });
      localStorage.setItem('attendx_token', data.token);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        role: regRole,
        matricNo: regRole === 'Student' ? regMatricNo : undefined,
        employeeId: regRole === 'Lecturer' ? regEmployeeId : undefined
      };
      const data = await ApiService.register(payload);
      localStorage.setItem('attendx_token', data.token);
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill shortcuts for easy sandbox testing!
  const quickFills = [
    { label: 'System Admin', email: 'admin@attendx.edu', password: 'admin123', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Dr. Jenkins (Lecturer)', email: 'dr.jenkins@attendx.edu', password: 'password', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Alice Cooper (Student)', email: 'alice@attendx.edu', password: 'password', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-2xl" />

          <div className="inline-flex bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/30 mb-3">
            <GraduationCap size={28} />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">AttendX Portal</h2>
          <p className="text-slate-400 text-xs mt-1">Smart Attendance Management System</p>
        </div>

        {/* Form Body */}
        <div className="px-8 py-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border-l-4 border-rose-500 rounded text-rose-800 text-xs flex items-start space-x-2">
              <ShieldAlert className="shrink-0 mt-0.5" size={14} />
              <span>{error}</span>
            </div>
          )}

          {!isRegistering ? (
            /* --- LOGIN FORM --- */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@attendx.edu"
                    className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <KeyRound size={14} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck size={16} />
                    <span>Authenticate Session</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">New to AttendX? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError('');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Create an Account
                </button>
              </div>
            </form>
          ) : (
            /* --- SELF-REGISTRATION FORM --- */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                <button
                  type="button"
                  onClick={() => setRegRole('Student')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    regRole === 'Student' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Student Registration
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('Lecturer')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    regRole === 'Lecturer' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Lecturer Registration
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Sudeis Alhassan"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@attendx.edu"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {regRole === 'Student' ? (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Index Number
                  </label>
                  <input
                    type="text"
                    required
                    value={regMatricNo}
                    onChange={(e) => setRegMatricNo(e.target.value)}
                    placeholder="e.g. SRI.41.008.001.23"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Employee / Lecturer ID
                  </label>
                  <input
                    type="text"
                    required
                    value={regEmployeeId}
                    onChange={(e) => setRegEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-9051"
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-600/10 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Register New Account</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Sign In Instead
                </button>
              </div>
            </form>
          )}

          {/* Quick Fills */}
          {!isRegistering && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
                Developer Quick Login Keys:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {quickFills.map((fill, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setEmail(fill.email);
                      setPassword(fill.password);
                    }}
                    className={`w-full text-left text-[11px] px-3 py-2 border rounded-lg font-medium transition-all hover:brightness-95 flex items-center justify-between ${fill.color}`}
                  >
                    <span>{fill.label}</span>
                    <span className="text-[9px] opacity-70">Fill Data</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
