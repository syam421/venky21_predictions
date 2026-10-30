import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function ExtendSubscriptionModal({ user, onClose, onSuccess }) {
  const [durationDays, setDurationDays] = useState(30);
  const [amount, setAmount] = useState(1500);
  const [notes, setNotes] = useState('Subscription renewal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.extendSubscription(user.id, {
        durationDays: parseInt(durationDays, 10),
        amount: parseInt(amount, 10),
        notes
      });

      if (res.success) {
        alert(`Subscription for ${user.phoneNumber} extended by ${durationDays} days!`);
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to extend subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--gold)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Extend Subscription</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Extending access for subscriber: <strong style={{ color: '#fff' }}>{user.phoneNumber}</strong>.
          Remaining days will be compounded if currently active.
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
            <label className="form-label">Renewal Notes</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={loading}>
              {loading ? 'Processing...' : 'Extend Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
