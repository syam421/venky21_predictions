import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Phone, AlertCircle, Smartphone, Send, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function Login({ onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? 'Mobile Browser' : 'Desktop Browser';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceLimitData, setDeviceLimitData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDeviceLimitData(null);
    setLoading(true);

    try {
      const res = await api.login(phone, password, deviceLabel);
      if (res.success) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      if (err.code === 'DEVICE_LIMIT_REACHED') {
        setDeviceLimitData(err.data);
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel glass-panel-neon" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 30px',
        textAlign: 'center'
      }}>
        {/* Branding */}
        <div style={{ marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="VENKY21"
            style={{
              maxWidth: '260px',
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 16px rgba(0, 255, 65, 0.25))',
              marginBottom: '10px'
            }}
          />
          <p style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>
            SECURE SUBSCRIPTION PLATFORM
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={18} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: '#fca5a5' }}>
              {error}
            </div>
          </div>
        )}

        {/* Device Limit Notice */}
        {deviceLimitData && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)', fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>
              <Smartphone size={16} /> MAXIMUM 2 DEVICES ACTIVE
            </div>
            <p style={{ fontSize: '12px', color: '#e5e7eb', marginBottom: '8px' }}>
              Your account has already reached the maximum limit of 2 active registered devices:
            </p>
            <ul style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '18px', marginBottom: '10px' }}>
              {deviceLimitData.devices?.map((d) => (
                <li key={d.id}>{d.deviceLabel} (Registered: {new Date(d.firstRegisteredAt).toLocaleDateString()})</li>
              ))}
            </ul>
            <p style={{ fontSize: '11px', color: 'var(--gold)' }}>
              Log out or revoke one of your devices from an existing session, or contact the administrator.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone-input">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                id="phone-input"
                type="tel"
                className="form-input"
                style={{ paddingLeft: '40px' }}
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '40px', paddingRight: '42px' }}
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '13px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="device-label-input">Device Session Name</label>
            <input
              id="device-label-input"
              type="text"
              className="form-input"
              placeholder="e.g. My iPhone, Work PC"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'AUTHENTICATING...' : (
              <>
                AUTHENTICATE & ACCESS <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Telegram Link (Preserved from original code) */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <a
            href="https://t.me/+NVbbbQ6Up31jZmI1"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '12px' }}
          >
            <Send size={14} color="#38bdf8" /> OFFICIAL TELEGRAM CHANNEL
          </a>
          <p style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-dim)' }}>
            Subscription Rate: ₹1,500 / month. Accounts are created exclusively by the Administrator. Public registration is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
