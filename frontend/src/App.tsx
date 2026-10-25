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
  const [isLogin, setIsLogin] = useState<boolean>(true);
  
  // Form states
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // Messages and user profile states
  const [message, setMessage] = useState<string>('');
  const [messageColor, setMessageColor] = useState<string>('green');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // View states: 'home' for home view, 'profile' for profile view
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');

  // 2FA login related states
  const [requires2FA, setRequires2FA] = useState<boolean>(false); 
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>(''); 
  const [otpCode, setOtpCode] = useState<string>(''); 
  
  // 2FA binding related states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null); 

  // Check URL parameters on page load for 42 OAuth return parameters, token, 2FA status, or error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const requiresTwoFactor = params.get('requiresTwoFactor');
    const userId = params.get('userId');
    const error = params.get('error');

    if (token) {
      // Clear token parameter from URL to keep address bar clean
      window.history.replaceState({}, document.title, window.location.pathname);
      handleLoginSuccess(token);
    } else if (requiresTwoFactor === 'true' && userId) {
      // 🔑 Core addition: If 42 login triggers 2FA, switch to 2FA verification view
      window.history.replaceState({}, document.title, window.location.pathname);
      setRequires2FA(true);
      setTwoFactorUserId(userId);
      setMessageColor('orange');
      setMessage('2FA is enabled. Please enter the 6-digit code from your authenticator app');
    } else if (error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setMessageColor('red');
      setMessage('42 login failed: ' + error);
    }
  }, []);

  // 1. Register
  const handleRegister = async (e: React.FormEvent) => {
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
        setMessage('Registration successful! Please switch to the login page.');
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
  const handleLogin = async (e: React.FormEvent) => {
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

  // 4. Login step 2: Submit 2FA code to complete final login
  const handleVerify2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Verifying 2FA...');
    try {
      const response = await fetch(`${API_BASE}/2fa/authenticate`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: twoFactorUserId, identifier: username, code: otpCode }),
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
  };

  // 5. Fetch profile and route based on 2FA status
  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        const profile = data.user || data;
        setUserProfile(profile);

        if (profile.twoFactorEnabled) {
          setCurrentView('profile'); 
        } else {
          setCurrentView('home');    
        }
      }
    } catch (error) {
      console.error('Error fetching profile', error);
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
  const handleTurnOn2FA = async (e: React.FormEvent) => {
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
    setCurrentView('home');
    setRequires2FA(false);
    setTwoFactorUserId('');
    setOtpCode('');
    setQrCodeUrl(null);
    setUsername('');
    setPassword('');
    if (passwordRef.current) {
      passwordRef.current.value = '';
    }
    setMessage('Logged out successfully');
    setMessageColor('green');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>
          {userProfile 
            ? (currentView === 'home' ? 'Home' : 'Profile & 2FA Settings') 
            : (requires2FA ? 'Two-Factor Authentication (2FA)' : (isLogin ? 'User Login' : 'User Registration'))}
        </h2>

        {/* State A: Logged in */}
        {userProfile ? (
          <div>
            {currentView === 'home' ? (
              <div>
                <h3 style={{ color: 'green' }}>Welcome back, {userProfile.username}!</h3>
                <p>This is the home page. Your two-step verification status is: <strong>Disabled ❌</strong></p>
                
                <button 
                  style={{ ...styles.button, backgroundColor: '#28a745', marginTop: '15px' }} 
                  onClick={() => setCurrentView('profile')}
                >
                  Go to Profile to set up 2FA
                </button>

                <button 
                  style={{ ...styles.button, backgroundColor: '#dc3545', marginTop: '10px' }} 
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ color: 'green' }}>Profile, {userProfile.username}</h3>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Role:</strong> {userProfile.role}</p>
                <p><strong>Two-Step Verification (2FA):</strong> {userProfile.twoFactorEnabled ? 'Enabled ✅' : 'Disabled ❌'}</p>

                {!userProfile.twoFactorEnabled && !qrCodeUrl && (
                  <button style={styles.buttonSecondary} onClick={handleGenerate2FA}>
                    Bind and Enable 2FA
                  </button>
                )}

                {qrCodeUrl && (
                  <div style={{ textAlign: 'center', margin: '15px 0' }}>
                    <p style={{ fontSize: '13px', color: '#555' }}>Please scan the QR code with your authenticator app:</p>
                    <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '150px', height: '150px' }} />
                    <form onSubmit={handleTurnOn2FA} style={{ marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Enter 6-digit code to confirm"
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

                <button 
                  style={{ ...styles.button, backgroundColor: '#6c757d', marginTop: '15px' }} 
                  onClick={() => setCurrentView('home')}
                >
                  Back to Home
                </button>

                <button 
                  style={{ ...styles.button, backgroundColor: '#dc3545', marginTop: '10px' }} 
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : requires2FA ? (
          /* State B: Triggered 2FA during login */
          <form onSubmit={handleVerify2FALogin}>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '15px' }}>
              2FA is enabled. Please enter the 6-digit dynamic code from your authenticator app:
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
          /* State C: Regular login/register form */
          <form onSubmit={isLogin ? handleLogin : handleRegister}>
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

            {!isLogin && (
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
            )}

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
                autoComplete="new-password"
              />
            </div>

            <button type="submit" style={styles.button}>
              {isLogin ? 'Login' : 'Register'}
            </button>

            {/* 42 OAuth login button: only shown in login mode */}
            {isLogin && (
              <button 
                type="button" 
                style={{ ...styles.button, backgroundColor: '#00babc', marginTop: '10px' }} 
                onClick={handle42Login}
              >
                Sign in with 42 Intranet
              </button>
            )}

            <div style={styles.switchText}>
              {isLogin ? "No account?" : "Already have an account?"}
              <span 
                style={styles.link} 
                onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
              >
                {isLogin ? 'Register' : 'Login'}
              </span>
            </div>
          </form>
        )}

        {message && <p style={{ color: messageColor, textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>{message}</p>}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f9' },
  card: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '380px' },
  formGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  buttonSecondary: { width: '100%', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', marginTop: '5px' },
  switchText: { textAlign: 'center', marginTop: '15px', fontSize: '14px' },
  link: { color: '#007bff', cursor: 'pointer', textDecoration: 'underline', marginLeft: '5px' }
};