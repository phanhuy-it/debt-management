import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const PASSWORD = 'abcd@@1234ABCD';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setIsLoading(true);

    // Simulate small delay for better UX
    setTimeout(() => {
      if (password === PASSWORD) {
        // Save login state
        localStorage.setItem('debt_app_auth', 'true');
        localStorage.setItem('debt_app_auth_time', new Date().toISOString());
        onLogin();
      } else {
        setError('Mật khẩu không đúng');
        setPassword('');
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-blue-600 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Quản lý</h1>
            <p className="text-emerald-100 text-sm">Vui lòng đăng nhập để tiếp tục</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 animate-shake">
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-4 py-3 pl-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                  disabled={isLoading}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all transform active:scale-95 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-slate-500">
              Ứng dụng quản lý cá nhân
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

