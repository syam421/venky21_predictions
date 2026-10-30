import React, { useState, useEffect } from 'react';
import { X, Smartphone, Trash2, Check, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function DevicesModal({ user, isAdminView = false, onClose, onDeviceRevoked }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      if (isAdminView) {
        const res = await api.getAdminUserDevices(user.id);
        if (res.success) setDevices(res.devices);
      } else {
        const res = await api.getUserDevices();
        if (res.success) setDevices(res.devices);
      }
    } catch (err) {
      setError(err.message || 'Failed to load registered devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId) => {
    if (!window.confirm('Are you sure you want to revoke access for this device?')) return;

    try {
      if (isAdminView) {
        await api.revokeAdminDevice(deviceId);
      } else {
        await api.revokeOwnDevice(deviceId);
      }
      fetchDevices();
      if (onDeviceRevoked) onDeviceRevoked();
    } catch (err) {
      alert(`Failed to revoke device: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={20} color="var(--neon)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Registered Devices (Max 2)</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Accounts are strictly limited to a maximum of 2 active concurrent devices on the server.
          Revoking a device terminates its active session immediately.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#fca5a5'
          }}>
            {error}
          </div>
        )}

        <div className="table-container" style={{ marginBottom: '20px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Registered</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                    Loading devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                    No active devices found.
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{d.deviceLabel}</div>
                      {d.isCurrent && (
                        <span className="badge badge-active" style={{ fontSize: '9px', marginTop: '2px' }}>
                          This Device
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(d.firstRegisteredAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(d.lastActiveAt).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevoke(d.id)}
                        className="btn btn-danger"
                        style={{ padding: '5px 8px', fontSize: '11px' }}
                        title="Revoke device session"
                      >
                        <Trash2 size={12} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
