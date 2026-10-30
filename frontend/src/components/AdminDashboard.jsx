import React, { useState, useEffect } from 'react';
import {
  Users, CheckCircle2, XCircle, AlertOctagon, IndianRupee,
  Search, UserPlus, Shield, LogOut, Key, Smartphone, Clock, RefreshCw,
  Calendar, Lock, Unlock, FileText
} from 'lucide-react';
import { api } from '../api/client';

export default function AdminDashboard({
  user,
  onLogout,
  onOpenCreateUser,
  onOpenResetPassword,
  onOpenExtendSub,
  onOpenDevicesModal
}) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'audit'

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await api.getAdminStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error('Failed to load stats:', err.message);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await api.listUsers(params);
      if (res.success) {
        setUsers(res.users);
        setTotalUsers(res.total);
      }
    } catch (err) {
      console.error('Failed to load users:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.getAuditLogs({ limit: 40 });
      if (res.success) {
        setAuditLogs(res.logs);
        setAuditTotal(res.total);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleSuspend = async (targetUser) => {
    const isSuspended = targetUser.accountStatus === 'SUSPENDED';
    const confirmMsg = isSuspended
      ? `Reactivate account for ${targetUser.phoneNumber}?`
      : `Are you sure you want to suspend ${targetUser.phoneNumber}? All active sessions will be terminated immediately.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isSuspended) {
        await api.activateUser(targetUser.id);
      } else {
        await api.suspendUser(targetUser.id, 'Administrative suspension');
      }
      fetchUsers();
      fetchStats();
      fetchAuditLogs();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px 60px 16px' }}>
      {/* Top Navbar */}
      <header className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '24px',
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
              height: '42px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.25))'
            }}
          />
          <div>
            <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '1px' }}>
              ADMIN CONSOLE
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Master Admin: <span style={{ color: '#fff', fontWeight: 600 }}>{user.phoneNumber}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => { fetchStats(); fetchUsers(); fetchAuditLogs(); }}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '12px' }}
          >
            <RefreshCw size={14} /> Refresh
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

      {/* KPI Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Users</span>
              <Users size={16} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>{stats.totalUsers}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Registered Subscribers</div>
          </div>

          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--neon)', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Active Subs</span>
              <CheckCircle2 size={16} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--neon)' }}>{stats.activeSubscriptions}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Unexpired Access</div>
          </div>

          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Expired Subs</span>
              <XCircle size={16} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f87171' }}>{stats.expiredSubscriptions}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Renewal Required</div>
          </div>

          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb923c', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Suspended</span>
              <AlertOctagon size={16} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#fb923c' }}>{stats.suspendedUsers}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Access Revoked</div>
          </div>

          <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold)', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Revenue Recorded</span>
              <IndianRupee size={16} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gold)' }}>
              ₹{stats.totalRevenueINR.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>₹1,500 / month / sub</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('users')}
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Users size={16} /> Subscribers Management ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`btn ${activeTab === 'audit' ? 'btn-gold' : 'btn-secondary'}`}
        >
          <FileText size={16} /> Security Audit Trail ({auditTotal})
        </button>
      </div>

      {/* Tab: Users Management */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '260px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="Search phone number..."
                  className="form-input"
                  style={{ paddingLeft: '36px', paddingBottom: '9px', paddingTop: '9px' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary">Search</button>
            </form>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="form-input"
                style={{ padding: '8px 12px', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setTimeout(fetchUsers, 50); }}
              >
                <option value="">All Account Statuses</option>
                <option value="ACTIVE">Active Accounts</option>
                <option value="SUSPENDED">Suspended Accounts</option>
              </select>

              <button onClick={onOpenCreateUser} className="btn btn-primary">
                <UserPlus size={16} /> Create Subscriber
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phone Number</th>
                  <th>Account Status</th>
                  <th>Subscription</th>
                  <th>Active Devices</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                      Loading subscriber accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                      No subscriber accounts found. Click "Create Subscriber" to add one.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSubActive = u.subscription && u.subscription.status === 'ACTIVE';
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {u.phoneNumber}
                          {u.mustChangePassword && (
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--gold)' }}>
                              * Temporary Password
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${u.accountStatus === 'ACTIVE' ? 'badge-active' : 'badge-loss'}`}>
                            {u.accountStatus}
                          </span>
                        </td>
                        <td>
                          {u.subscription ? (
                            <div>
                              <span className={`badge ${isSubActive ? 'badge-active' : 'badge-expired'}`}>
                                {isSubActive ? 'ACTIVE' : 'EXPIRED'}
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Exp: {new Date(u.subscription.expiresAt).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <span className="badge badge-expired">NONE</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => onOpenDevicesModal(u)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            <Smartphone size={12} /> {u.activeDeviceCount} / 2 Devices
                          </button>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => onOpenExtendSub(u)}
                              className="btn btn-gold"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              title="Extend 30 Days (₹1,500)"
                            >
                              <Calendar size={12} /> Extend
                            </button>
                            <button
                              onClick={() => onOpenResetPassword(u)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              title="Reset Password"
                            >
                              <Key size={12} /> Reset Pwd
                            </button>
                            <button
                              onClick={() => handleToggleSuspend(u)}
                              className={u.accountStatus === 'SUSPENDED' ? 'btn btn-primary' : 'btn btn-danger'}
                              style={{ padding: '6px 10px', fontSize: '11px' }}
                              title={u.accountStatus === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                            >
                              {u.accountStatus === 'SUSPENDED' ? <Unlock size={12} /> : <Lock size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Security & Administrative Audit Logs</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Immutable Server Log</span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Actor</th>
                  <th>Target User</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                          {log.eventType}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {log.actor ? log.actor.phoneNumber : 'System'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {log.targetUser ? log.targetUser.phoneNumber : '-'}
                      </td>
                      <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {log.ipAddress || '-'}
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
