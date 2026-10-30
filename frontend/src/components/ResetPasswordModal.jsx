import React, { useState } from 'react';
import { X, Key, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function ResetPasswordModal({ user, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('NewPass@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.resetUserPassword(user.id, newPassword);
      if (res.success) {
        alert(`Password for ${user.phoneNumber} reset successfully!`);
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--gold)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Reset Password</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Resetting credentials for account: <strong style={{ color: '#fff' }}>{user.phoneNumber}</strong>.
          All active device sessions will be revoked.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '13px',
            color: '#fca5a5'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Temporary Password</label>
            <input
              type="text"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset & Invalidate Sessions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
