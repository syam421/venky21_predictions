import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import CreateUserModal from './components/CreateUserModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import ExtendSubscriptionModal from './components/ExtendSubscriptionModal';
import DevicesModal from './components/DevicesModal';
import ChangePasswordModal from './components/ChangePasswordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [selectedUserForExtend, setSelectedUserForExtend] = useState(null);
  const [devicesModalUser, setDevicesModalUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const checkSession = async () => {
    try {
      const res = await api.getMe();
      if (res.success) {
        setCurrentUser(res.user);
        setSubscription(res.subscription);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    checkSession();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    } finally {
      setCurrentUser(null);
      setSubscription(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--neon)',
        fontFamily: 'var(--font-sans)',
        gap: '12px'
      }}>
        <img
          src="/logo.png"
          alt="VENKY21"
          style={{
            maxWidth: '220px',
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 15px rgba(0, 255, 65, 0.3))'
          }}
        />
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(0, 255, 65, 0.2)',
          borderTopColor: 'var(--neon)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ letterSpacing: '2px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
          INITIALIZING VENKY21...
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged in with temporary password -> Force Password Change
  if (currentUser.mustChangePassword) {
    return (
      <ChangePasswordModal
        isForced={true}
        onClose={() => {}}
        onSuccess={() => {
          handleLogout();
        }}
      />
    );
  }

  return (
    <div>
      {/* Route according to role */}
      {currentUser.role === 'ADMIN' ? (
        <AdminDashboard
          user={currentUser}
          onLogout={handleLogout}
          onOpenCreateUser={() => setShowCreateUser(true)}
          onOpenResetPassword={(u) => setSelectedUserForReset(u)}
          onOpenExtendSub={(u) => setSelectedUserForExtend(u)}
          onOpenDevicesModal={(u) => setDevicesModalUser(u)}
        />
      ) : (
        <UserDashboard
          user={currentUser}
          subscription={subscription}
          onLogout={handleLogout}
          onOpenDevices={() => setDevicesModalUser(currentUser)}
          onOpenChangePassword={() => setShowChangePassword(true)}
        />
      )}

      {/* Admin Modals */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => {
            setShowCreateUser(false);
          }}
        />
      )}

      {selectedUserForReset && (
        <ResetPasswordModal
          user={selectedUserForReset}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={() => setSelectedUserForReset(null)}
        />
      )}

      {selectedUserForExtend && (
        <ExtendSubscriptionModal
          user={selectedUserForExtend}
          onClose={() => setSelectedUserForExtend(null)}
          onSuccess={() => setSelectedUserForExtend(null)}
        />
      )}

      {/* Shared Devices Modal */}
      {devicesModalUser && (
        <DevicesModal
          user={devicesModalUser}
          isAdminView={currentUser.role === 'ADMIN' && devicesModalUser.id !== currentUser.id}
          onClose={() => setDevicesModalUser(null)}
          onDeviceRevoked={() => {}}
        />
      )}

      {/* Shared Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          isForced={false}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            handleLogout();
          }}
        />
      )}
    </div>
  );
}
