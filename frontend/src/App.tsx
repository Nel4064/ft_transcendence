import React, { useState, useRef, useEffect } from 'react';
import './App.css';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const API_BASE = 'http://localhost:3000/api/auth';

export default function App() {
  // Determine initial view based on current browser pathname
  const getInitialView = (): 'home' | 'login' | 'register' | 'profile' => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/register') return 'register';
    if (path === '/profile') return 'profile';
    return 'home';
  };

  const [currentView, setCurrentView] = useState<'home' | 'login' | 'register' | 'profile'>(getInitialView());

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
  // 在 App 组件内添加这两个状态
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [language, setLanguage] = useState<string>('');

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
      const response = await fetch(`${API_BASE}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const profile = data.user || data;
        setUserProfile(profile);
        // 🔑 初始化输入框的值
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
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PATCH', // 或者 PUT，取决于后端定义
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
          <div style={{ textAlign: 'center' }}>
            <h2>Welcome to ft_transcendence</h2>
            <p style={{ color: '#555', marginTop: '10px' }}>
              This is a functional demo page showcasing Authentication, 42 OAuth, and 2FA features.
            </p>
            {userProfile ? (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: 'green' }}>Logged in as: <strong>{userProfile.username}</strong></p>
                <button style={styles.button} onClick={() => navigateTo('profile')}>Go to Profile & 2FA Settings</button>
              </div>
            ) : (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button style={styles.button} onClick={() => navigateTo('login')}>Login (/login)</button>
                <button style={{ ...styles.button, backgroundColor: '#6c757d' }} onClick={() => navigateTo('register')}>Register (/register)</button>
              </div>
            )}
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

            {/* 资料修改表单（包含语言选择） */}
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

              {/* 🌐 新增：语言选择下拉菜单 */}
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

            {/* 2FA 模块保持不变 */}
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