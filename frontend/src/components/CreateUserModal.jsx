import React, { useState } from 'react';
import { X, UserPlus, Shield, Phone, Lock, Calendar, IndianRupee, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function CreateUserModal({ onClose, onSuccess }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('VenkySub@2026');
  const [durationDays, setDurationDays] = useState(30);
  const [amount, setAmount] = useState(1500);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createUser({
        phoneNumber: phone,
        initialPassword: password,
        durationDays: parseInt(durationDays, 10),
        amount: parseInt(amount, 10),
        notes
      });

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create user account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="var(--neon)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Create New Subscriber</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

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
            <label className="form-label">Subscriber Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="10-digit phone number (e.g. 9876543210)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Temporary Password</label>
            <input
              type="text"
              className="form-input"
              placeholder="Initial password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              User will be prompted to change this password upon initial login.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Duration (Days)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹ INR)</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Administrative Notes (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Paid via UPI / Telegram reference"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create & Activate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
