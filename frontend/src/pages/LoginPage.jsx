import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b13] flex items-center justify-center p-4 font-sans select-none overflow-hidden">
      {/* Background Glowing Blobs */}
      <div className="glow-purple -top-20 -left-20 animate-pulse-slow"></div>
      <div className="glow-blue -bottom-40 -right-20 animate-pulse-slow" style={{ animationDelay: '4s' }}></div>

      <div className="w-full max-w-lg z-10">
        <div className="glass-card rounded-2xl p-8 sm:p-10 border border-[rgba(255,255,255,0.08)] relative overflow-hidden">
          {/* Top visual strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-tr from-brand-600 to-purple-500 rounded-2xl p-3 w-fit mx-auto mb-4 shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
              Essay Scorer <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">AI</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Smart automated grading and detailed analysis powered by Gemini AI
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm mb-6 animate-shake">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer mt-8"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Demo Account Indicator */}
          <div className="border-t border-[rgba(255,255,255,0.06)] mt-8 pt-6">
            <div className="bg-brand-900/20 border border-brand-500/20 rounded-xl p-4 text-center">
              <span className="text-xs font-medium text-brand-300 block mb-1">
                Demo Account For Evaluation
              </span>
              <p className="text-xs text-gray-400">
                Email: <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">testuser@gmail.com</code>
                <span className="mx-2">|</span>
                Password: <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">MatKhauChauAu123!</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
