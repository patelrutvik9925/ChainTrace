import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../features/auth/authStore.js';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';

export default function LoginPage() {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd,  setShowPwd]        = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password)        errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    const result = await login(username, password);
    if (result.success) navigate('/dashboard', { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-3 mb-3">
            <span
              style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                color: '#22c55e',
                textShadow: '0 0 22px rgba(34,197,94,0.55), 0 0 8px rgba(34,197,94,0.3)',
                lineHeight: 1,
              }}
            >
              ∞
            </span>
            <div className="text-left">
              <div className="text-base font-bold text-[var(--text-primary)] leading-tight">ChainTrace</div>
              <div className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">SIH26183</div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Blockchain Fraud Investigation Platform</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 opacity-70">
            Cyber Crime Cell — Smart India Hackathon 2026
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-xl p-6 shadow-2xl"
          style={{
            background:           'rgba(13,17,23,0.90)',
            border:               '1px solid rgba(34,197,94,0.20)',
            backdropFilter:       'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow:
              '0 0 0 1px rgba(34,197,94,0.08), ' +
              '0 24px 48px rgba(0,0,0,0.55), '  +
              '0 0 40px rgba(34,197,94,0.06)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#f8514910] border border-[#f8514940] rounded px-3 py-2.5 text-xs text-[var(--accent-red)] flex items-center gap-2">
                <span>⚠</span>{error}
              </div>
            )}

            <Input
              label="Username or Email"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              error={fieldErrors.username}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-3 py-2 pr-9 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-[var(--accent-red)]">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={isLoading}
              className="w-full mt-2"
              style={{
                background: 'linear-gradient(135deg,#15803d 0%,#22c55e 100%)',
                border: 'none',
                color: '#fff',
                boxShadow: '0 0 18px rgba(34,197,94,0.28)',
              }}
            >
              Sign In to Platform
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] text-center mb-2 uppercase tracking-wide">
              Demo Credentials
            </p>
            <div className="space-y-1.5">
              {[
                { label: 'Admin',        u: 'admin',        p: 'SIH183Admin@2026' },
                { label: 'Investigator', u: 'investigator1', p: 'Investigator@123' },
              ].map(cred => (
                <button
                  key={cred.u}
                  type="button"
                  onClick={() => {
                    setUsername(cred.u);
                    setPassword(cred.p);
                    clearError();
                    setFieldErrors({});
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] transition-colors text-[11px] text-[var(--text-secondary)]"
                >
                  <span className="font-medium">{cred.label}</span>
                  <span className="text-[var(--text-muted)] font-mono">{cred.u}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 flex items-center justify-center gap-2 text-[10px] text-[var(--text-muted)]">
          <ShieldCheck size={11} />
          <span>Smart India Hackathon 2026 — SIH26183</span>
        </div>
      </div>
    </div>
  );
}
