import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const API_BASE = 'http://localhost:3000/api/auth';
const USERS_API = 'http://localhost:3000/api/users';

export default function App() {
  // Determine initial view based on current browser pathname
  const getInitialView = (): 'home' | 'login' | 'register' | 'profile' => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/profile') return 'profile';
    return 'home';
  };

  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'profile' | 'other-profile'>('home');

  // Form states
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const passwordRef = useRef<HTMLInputElement>(null);

  // Messages and user profile states
  const [message, setMessage] = useState<string>('');
  const [messageColor, setMessageColor] = useState<string>('green');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 2FA login related states
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');

  // 2FA binding related states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  const [otherUserProfile, setOtherUserProfile] = useState<any | null>(null);
  const [userList, setUserList] = useState<any[]>([]);

  // Helper function to change view and update browser URL without page reload
  const navigateTo = (view: 'home' | 'login' | 'register' | 'profile') => {
    setCurrentView(view);
    setMessage('');
    const path = view === 'home' ? '/' : `/${view}`;
    window.history.pushState({}, '', path);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 🔑 Robust handling on page load: 42 OAuth return parameters, 2FA status, or token storage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const requiresTwoFactor = params.get('requiresTwoFactor');
    const userId = params.get('userId');
    const error = params.get('error');
    const tokenFromStorage = localStorage.getItem('jwt_token');

    const path = window.location.pathname;
    if (path.startsWith('/profile/') && path !== '/profile') {
      const userId = path.split('/')[2];
      setCurrentView('other-profile');
      fetchOtherProfile(userId);
      return;
    }

    fetchUserList();

    if (tokenFromUrl) {
      // Clear token from URL and login successfully
      window.history.replaceState({}, document.title, '/');
      handleLoginSuccess(tokenFromUrl);
    } else if (requiresTwoFactor === 'true' && userId) {
      // 42 OAuth login triggered 2FA verification
      window.history.replaceState({}, document.title, '/login');
      setRequires2FA(true);
      setTwoFactorUserId(userId);
      setCurrentView('login');
      setMessageColor('orange');
      setMessage('2FA is enabled. Please enter the 6-digit code from your authenticator app');
    } else if (error) {
      window.history.replaceState({}, document.title, '/login');
      setMessageColor('red');
      setMessage('42 login failed: ' + error);
    } else if (tokenFromStorage && currentView === 'home') {
      // Auto restore session if token exists
      fetchProfile(tokenFromStorage);
    }
  }, []);
  // 1. Register
  const handleRegister = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('Registering...');
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessageColor('green');
        setMessage('Registration successful! Please login.');
        navigateTo('login');
      } else {
        setMessageColor('red');
        setMessage('Registration failed: ' + (data.message || JSON.stringify(data)));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('Network error, please check the backend service.');
    }
  };

  // 2. Login step 1 (verify credentials)
  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('Logging in...');
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        if (data.requiresTwoFactor) {
          setRequires2FA(true);
          setTwoFactorUserId(data.userId || '');
          setMessageColor('orange');
          setMessage(data.message || 'Please enter the 2FA code');
          return;
        }

        handleLoginSuccess(data.access_token || data.token);
      } else {
        setMessageColor('red');
        setMessage('Login failed: ' + (data.message || JSON.stringify(data)));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('Network error, please check the backend service.');
    }
  };

  // 3. 42 OAuth login redirection
  const handle42Login = () => {
    window.location.href = `${API_BASE}/oauth/42`;
  };

  // 4. Login step 2: Submit 2FA code to complete final login (Supports both standard & 42 OAuth)
  const handleVerify2FALogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('Verifying 2FA...');
    try {
      const response = await fetch(`${API_BASE}/2fa/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: twoFactorUserId,
          identifier: username || undefined, // Safe fallback for 42 OAuth users where username state might be empty
          code: otpCode
        }),
      });
      const data = await response.json();

      if (response.ok) {
        handleLoginSuccess(data.access_token || data.token);
      } else {
        setMessageColor('red');
        setMessage('2FA code incorrect: ' + (data.message || 'Verification failed'));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('Network error');
    }
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('jwt_token', token);
    setMessageColor('green');
    setMessage('Login successful!');
    setRequires2FA(false);
    setPassword('');
    setOtpCode('');
    fetchProfile(token);
    navigateTo('home');
  };

  // 5. Fetch profile
  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch(`${USERS_API}/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const profile = data.user || data;
        setUserProfile(profile);
        setDisplayName(profile.displayName || '');
        setBio(profile.bio || '');
        setLanguage(profile.language || '');
      } else {
        localStorage.removeItem('jwt_token');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    setMessage('Updating profile...');
    try {
      const response = await fetch(`${USERS_API}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, bio, language }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Profile updated successfully!');
        setMessageColor('green');
        const updated = data.user || data;
        setUserProfile(updated);
      } else {
        setMessage('Failed to update: ' + (data.message || 'Error'));
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('Network error');
      setMessageColor('red');
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('jwt_token');
    setMessage('Uploading avatar...');
    try {
      const response = await fetch(`${USERS_API}/me/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Avatar updated successfully!');
        setMessageColor('green');
        const updated = data.user || data;
        setUserProfile(updated);
      } else {
        setMessage('Failed to upload avatar: ' + (data.message || 'Error'));
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('Network error during upload');
      setMessageColor('red');
    }
  };

  const viewOtherProfile = (userId: string) => {
    setCurrentView('other-profile');
    window.history.pushState({}, '', `/profile/${userId}`);
    fetchOtherProfile(userId);
  };

  const fetchUserList = async () => {
    try {
      const response = await fetch(USERS_API);
      const data = await response.json();
      if (response.ok) {
        setUserList(data);
      }
    } catch (error) {
      console.error('Failed to fetch user list', error);
    }
  };

  const fetchOtherProfile = async (userId: string) => {
    try {
      const response = await fetch(`${USERS_API}/${userId}`);
      const data = await response.json();
      if (response.ok) {
        setOtherUserProfile(data);
      } else {
        setMessage('User not found');
        setMessageColor('red');
        setOtherUserProfile(null);
      }
    } catch (error) {
      setMessage('Failed to load user profile');
      setMessageColor('red');
    }
  };

  // 6. Generate/Enable 2FA (get QR code)
  const handleGenerate2FA = async () => {
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`${API_BASE}/2fa/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setQrCodeUrl(data.qrCodeUrl);
        setMessage('Please scan the QR code below using Google Authenticator');
        setMessageColor('green');
      } else {
        setMessage('Failed to get 2FA QR code');
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('Failed to get 2FA QR code');
      setMessageColor('red');
    }
  };

  // 7. Confirm enabling 2FA
  const handleTurnOn2FA = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem('jwt_token');
    try {
      const response = await fetch(`${API_BASE}/2fa/turn-on`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: otpCode }),
      });
      if (response.ok) {
        setMessage('2FA enabled successfully!');
        setMessageColor('green');
        setQrCodeUrl(null);
        setOtpCode('');
        if (token) fetchProfile(token);
      } else {
        setMessage('Incorrect code, failed to enable');
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('Request failed');
      setMessageColor('red');
    }
  };

  // 8. Logout
  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setUserProfile(null);
    navigateTo('home');
    setRequires2FA(false);
    setTwoFactorUserId('');
    setOtpCode('');
    setQrCodeUrl(null);
    setUsername('');
    setPassword('');
    setMessage('Logged out successfully');
    setMessageColor('green');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Navigation Bar */}
        <div style={styles.navBar}>
          <button style={styles.navLink} onClick={() => navigateTo('home')}>Home</button>
          {userProfile ? (
            <div>
              <button style={styles.navLink} onClick={() => navigateTo('profile')}>Profile</button>
              <button style={{ ...styles.navLink, color: '#dc3545' }} onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div>
              <button style={styles.navLink} onClick={() => { setRequires2FA(false); navigateTo('login'); }}>Login</button>
              <button style={styles.navLink} onClick={() => navigateTo('register')}>Register</button>
            </div>
          )}
        </div>

        <hr style={styles.divider} />

        {/* View Renderer */}
        {currentView === 'home' && (
          <div>
            <h2>Welcome to Home Page</h2>
            <p>Click on any user's avatar below to view their public profile:</p>

            {/* 👥 users avatar list */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
              {userList.map((user) => (
                <div
                  key={user.id}
                  onClick={() => viewOtherProfile(user.id)}
                  style={{ textAlign: 'center', cursor: 'pointer', width: '80px' }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={`http://localhost:3000${user.avatarUrl}`}
                      alt={user.username}
                      style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #007bff', marginBottom: '5px' }}
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px auto', color: '#6c757d', fontWeight: 'bold' }}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#333' }}>
                    {user.displayName || user.username}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'login' && (
          <div>
            <h2>{requires2FA ? 'Two-Factor Authentication (2FA)' : 'User Login (/login)'}</h2>

            {requires2FA ? (
              <form onSubmit={handleVerify2FALogin}>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '15px' }}>
                  Please enter the 6-digit dynamic code from your authenticator app:
                </p>
                <div style={styles.formGroup}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    required
                    style={{ ...styles.input, textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
                  />
                </div>
                <button type="submit" style={styles.button}>Verify and Login</button>
                <button
                  type="button"
                  style={{ ...styles.buttonSecondary, marginTop: '10px' }}
                  onClick={() => { setRequires2FA(false); setOtpCode(''); }}
                >
                  Back to Login
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin}>
                <div style={styles.formGroup}>
                  <label>Username / Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Enter username"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label>Password</label>
                  <input
                    type="password"
                    ref={passwordRef}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                    placeholder="Enter password"
                  />
                </div>

                <button type="submit" style={styles.button}>Login</button>

                <button
                  type="button"
                  style={{ ...styles.button, backgroundColor: '#00babc', marginTop: '10px' }}
                  onClick={handle42Login}
                >
                  Sign in with 42 Intranet
                </button>
              </form>
            )}
          </div>
        )}

        {currentView === 'register' && (
          <div>
            <h2>User Registration (/register)</h2>
            <form onSubmit={handleRegister}>
              <div style={styles.formGroup}>
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Enter username"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Enter email"
                />
              </div>

              <div style={styles.formGroup}>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Enter password"
                />
              </div>

              <button type="submit" style={styles.button}>Register</button>
            </form>
          </div>
        )}

        {currentView === 'profile' && userProfile && (
          <div>
            <h2>Profile & 2FA Settings</h2>

            {/* avatar upload area*/}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              {userProfile.avatarUrl ? (
                <img
                  src={`http://localhost:3000${userProfile.avatarUrl}`}
                  alt="User Avatar"
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', border: '2px solid #007bff' }}
                />
              ) : (
                <div
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: '#e9ecef',
                    margin: '0 auto 15px auto'
                  }}
                />
              )}
              <div>
                <label style={{ ...styles.buttonSecondary, display: 'inline-block', cursor: 'pointer', padding: '6px 12px', fontSize: '13px' }}>
                  Change Avatar
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* edit profile */}
            <form onSubmit={handleUpdateProfile} style={{ marginBottom: '20px' }}>
              <div style={styles.formGroup}>
                <label>Username (Read-only)</label>
                <input type="text" value={userProfile.username} disabled style={{ ...styles.input, backgroundColor: '#e9ecef' }} />
              </div>

              <div style={styles.formGroup}>
                <label>Email (Read-only)</label>
                <input type="email" value={userProfile.email} disabled style={{ ...styles.input, backgroundColor: '#e9ecef' }} />
              </div>

              <div style={styles.formGroup}>
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  style={{ ...styles.input, height: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={styles.input}
                >
                  <option value="EN">English (EN)</option>
                  <option value="FR">Français (FR)</option>
                  <option value="ES">Español (ES)</option>
                </select>
              </div>

              <button type="submit" style={styles.button}>Save Profile Changes</button>
            </form>

            <hr style={styles.divider} />

            {/* 2FA unchanged */}
            <p><strong>Two-Step Verification (2FA):</strong> {userProfile.twoFactorEnabled ? 'Enabled ✅' : 'Disabled ❌'}</p>

            {!userProfile.twoFactorEnabled && !qrCodeUrl && (
              <button style={styles.buttonSecondary} onClick={handleGenerate2FA}>
                Bind and Enable 2FA
              </button>
            )}

            {qrCodeUrl && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <p style={{ fontSize: '13px', color: '#555' }}>Scan this QR code with your authenticator app:</p>
                <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '150px', height: '150px' }} />
                <form onSubmit={handleTurnOn2FA} style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    style={styles.input}
                    required
                  />
                  <button type="submit" style={styles.button}>Confirm Enable</button>
                </form>
              </div>
            )}
          </div>
        )}

        {currentView === 'other-profile' && (
          <div style={{ textAlign: 'center' }}>
            <h2>User Public Profile</h2>
            {otherUserProfile ? (
              <div>
                {/* avatar*/}
                {otherUserProfile.avatarUrl ? (
                  <img
                    src={`http://localhost:3000${otherUserProfile.avatarUrl}`}
                    alt="Avatar"
                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '2px solid #007bff' }}
                  />
                ) : (
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#e9ecef', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: '#6c757d' }}>
                    No Image
                  </div>
                )}

                <p><strong>Username:</strong> {otherUserProfile.username}</p>
                <p><strong>Display Name:</strong> {otherUserProfile.displayName || 'None'}</p>
                <p><strong>Bio:</strong> {otherUserProfile.bio || 'This user has no bio yet.'}</p>
                <p><strong>Language:</strong> {otherUserProfile.language}</p>
                <p><strong>Role:</strong> {otherUserProfile.role}</p>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '15px' }}>
                  Joined: {new Date(otherUserProfile.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p style={{ color: '#666' }}>Loading user profile...</p>
            )}

            <button
              style={{ ...styles.buttonSecondary, marginTop: '20px' }}
              onClick={() => {
                setCurrentView('home');
                window.history.pushState({}, '', '/');
              }}
            >
              Back to Home
            </button>
          </div>
        )}
        {message && <p style={{ color: messageColor, textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>{message}</p>}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f9' },
  card: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '420px' },
  navBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  navLink: { background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  divider: { border: '0', height: '1px', backgroundColor: '#eee', marginBottom: '20px' },
  formGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { width: '100%', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', marginTop: '5px' }
};