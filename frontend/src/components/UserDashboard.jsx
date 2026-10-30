import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, LogOut, RefreshCw, AlertTriangle, CheckCircle, Clock, Key } from 'lucide-react';
import { api } from '../api/client';

export default function UserDashboard({ user, subscription, onLogout, onOpenDevices, onOpenChangePassword }) {
  const [predictionData, setPredictionData] = useState({
    period: 'LOADING...',
    prediction: '...',
    oppositeNumbers: [],
    lastConfirmedResult: null,
    isStale: false,
    lastSuccessfulFetch: null
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subDetails, setSubDetails] = useState(subscription);

  // Poll predictions every 3 seconds (preserving original refresh interval)
  const fetchPredictionState = async () => {
    try {
      const [predRes, histRes] = await Promise.all([
        api.getCurrentPrediction(),
        api.getPredictionHistory(15)
      ]);

      if (predRes.success) {
        setPredictionData(predRes.data);
      }
      if (histRes.success) {
        setHistory(histRes.history);
      }
    } catch (err) {
      console.warn('Prediction poll warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionState();
    const interval = setInterval(fetchPredictionState, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px 40px 16px' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            alt="VENKY21"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 65, 0.2))'
            }}
          />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              User: <span style={{ color: '#fff', fontWeight: 600 }}>{user.phoneNumber}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenChangePassword}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px' }}
            title="Change Password"
          >
            <Key size={14} /> Password
          </button>
          <button
            onClick={onOpenDevices}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px' }}
            title="Manage Devices"
          >
            <Smartphone size={14} /> Devices (Max 2)
          </button>
          <button
            onClick={onLogout}
            className="btn btn-danger"
            style={{ padding: '7px 12px', fontSize: '12px' }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Subscription Status Card */}
      {subDetails && (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderLeft: '4px solid var(--gold)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Subscription Tier: <strong style={{ color: 'var(--gold)' }}>₹1,500 / Month</strong>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              Expires on: {new Date(subDetails.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <span className="badge badge-active">
            <CheckCircle size={12} /> Active ({subDetails.daysRemaining || 30} Days Left)
          </span>
        </div>
      )}

      {/* Main Prediction Glass Box (Faithfully redesigning original VENKY21 glass box) */}
      <div className="glass-panel glass-panel-neon" style={{
        padding: '30px 20px',
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        {/* Data Freshness Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: predictionData.isStale ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 255, 65, 0.08)',
          border: predictionData.isStale ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0, 255, 65, 0.2)',
          color: predictionData.isStale ? '#f87171' : 'var(--neon)',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          {predictionData.isStale ? (
            <>
              <AlertTriangle size={12} /> Data Delayed (Retrying Upstream API)
            </>
          ) : (
            <>
              <RefreshCw size={12} className="pulse-glow" /> Live Feed (3s Interval)
            </>
          )}
        </div>

        {/* Current Period */}
        <div style={{
          color: '#9ca3af',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }} id="pID">
          PERIOD: <span style={{ color: '#fff' }}>{predictionData.period}</span>
        </div>

        {/* Prediction Value */}
        <div style={{
          fontSize: '68px',
          fontWeight: 900,
          letterSpacing: '4px',
          margin: '12px 0',
          textShadow: '0 0 25px var(--neon)',
          color: predictionData.prediction === 'BIG' ? '#00ff41' : '#38bdf8'
        }} id="pRes">
          {predictionData.prediction}
        </div>

        {/* Opposite Numbers Box */}
        <div style={{
          display: 'inline-block',
          color: 'var(--gold)',
          fontSize: '14px',
          fontWeight: 700,
          border: '1px dashed var(--gold)',
          background: 'rgba(251, 191, 36, 0.05)',
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '20px'
        }} id="pOpps">
          OPPOSITE NUMS: {predictionData.oppositeNumbers.length > 0 ? predictionData.oppositeNumbers.join(', ') : 'ANALYZING LOGIC...'}
        </div>

        {/* Prediction History Table */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--text-muted)',
            marginBottom: '12px',
            textAlign: 'left'
          }}>
            Audited Draw History
          </h3>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>PRD</th>
                  <th style={{ textAlign: 'center' }}>PRED</th>
                  <th style={{ textAlign: 'center' }}>NUM</th>
                  <th style={{ textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody id="logs">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                      Synchronizing with verified draws...
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {row.shortPeriod}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span style={{ color: row.prediction === 'BIG' ? 'var(--neon)' : '#38bdf8' }}>
                          {row.prediction}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '15px' }}>
                        {row.actualNumber !== null ? row.actualNumber : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.evaluationStatus === 'WIN' ? (
                          <span className={`badge ${row.isJackpot ? 'badge-jackpot' : 'badge-win'}`}>
                            {row.isJackpot ? '★ JACKPOT' : 'WIN 🐯'}
                          </span>
                        ) : (
                          <span className="badge badge-loss">
                            LOSS 🖤
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
