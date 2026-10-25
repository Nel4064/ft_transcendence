import React, { useState, useRef } from 'react';
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

  // 表单状态
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // 提示与用户信息
  const [message, setMessage] = useState<string>('');
  const [messageColor, setMessageColor] = useState<string>('green');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 2FA 登录相关状态
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string>(''); // 对应后端返回的 userId
  const [otpCode, setOtpCode] = useState<string>(''); // 6位动态验证码

  // 2FA 绑定相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement>(null);

  // 1. 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('正在注册...');
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessageColor('green');
        setMessage('注册成功！请切换到登录页面。');
      } else {
        setMessageColor('red');
        setMessage('注册失败: ' + (data.message || JSON.stringify(data)));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('网络错误，请检查后端服务。');
    }
  };

  // 2. 登录第一步（验证账号密码）
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('正在登录...');
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        // 匹配后端实际返回的 requiresTwoFactor 字段
        if (data.requiresTwoFactor) {
          setRequires2FA(true);
          setTwoFactorUserId(data.userId || '');
          setMessageColor('orange');
          setMessage(data.message || '请输入 2FA 验证码');
          return;
        }

        // 未开启 2FA，直接登录成功
        handleLoginSuccess(data.access_token || data.token);
      } else {
        setMessageColor('red');
        setMessage('登录失败: ' + (data.message || JSON.stringify(data)));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('网络错误，请检查后端服务。');
    }
  };

  // 3. 登录第二步：提交 2FA 验证码完成最终登录
  const handleVerify2FALogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('正在验证 2FA...');
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
        setMessage('2FA 验证码错误: ' + (data.message || '验证失败'));
      }
    } catch (error) {
      setMessageColor('red');
      setMessage('网络错误');
    }
  };

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('jwt_token', token);
    setMessageColor('green');
    setMessage('登录成功！');
    setRequires2FA(false);
    setPassword(''); // 登录成功后也顺便清空密码
    setOtpCode('');
    fetchProfile(token);
  };

  // 4. 获取个人资料
  const fetchProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setUserProfile(data.user || data);
      }
    } catch (error) {
      console.error('获取 Profile 出错', error);
    }
  };

  // 5. 生成/开启 2FA (获取二维码)
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
        setMessage('请使用 Google Authenticator 扫描下方二维码');
        setMessageColor('green');
      } else {
        setMessage('获取 2FA 二维码失败');
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('获取 2FA 二维码失败');
      setMessageColor('red');
    }
  };

  // 6. 确认开启 2FA
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
        setMessage('2FA 已成功开启！');
        setMessageColor('green');
        setQrCodeUrl(null);
        setOtpCode('');
        if (token) fetchProfile(token);
      } else {
        setMessage('验证码错误，开启失败');
        setMessageColor('red');
      }
    } catch (error) {
      setMessage('请求失败');
      setMessageColor('red');
    }
  };

  // 7. 退出登录（彻底清空密码及所有状态）
  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setUserProfile(null);
    setRequires2FA(false);
    setTwoFactorUserId('');
    setOtpCode('');
    setQrCodeUrl(null);
    setUsername('');
    setPassword(''); // 👈 退出时清空密码输入
    // 👈 强行把密码输入框的 DOM 值清空，彻底对抗浏览器的自动填充
    if (passwordRef.current) {
      passwordRef.current.value = '';
    }
    setMessage('已成功退出登录');
    setMessageColor('green');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{userProfile ? '个人中心' : (requires2FA ? '二次验证 (2FA)' : (isLogin ? '用户登录' : '用户注册'))}</h2>

        {/* 状态 A：已登录进入个人中心 */}
        {userProfile ? (
          <div>
            <h3 style={{ color: 'green' }}>欢迎，{userProfile.username}！</h3>
            <p><strong>邮箱：</strong> {userProfile.email}</p>
            <p><strong>角色：</strong> {userProfile.role}</p>
            <p><strong>两步验证 (2FA)：</strong> {userProfile.twoFactorEnabled ? '已开启 ✅' : '未开启 ❌'}</p>

            {/* 如果未开启 2FA，显示开启按钮 */}
            {!userProfile.twoFactorEnabled && !qrCodeUrl && (
              <button style={styles.buttonSecondary} onClick={handleGenerate2FA}>
                绑定并开启 2FA
              </button>
            )}

            {/* 显示二维码供扫描 */}
            {qrCodeUrl && (
              <div style={{ textAlign: 'center', margin: '15px 0' }}>
                <p style={{ fontSize: '13px', color: '#555' }}>请用身份验证器扫描二维码：</p>
                <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '150px', height: '150px' }} />
                <form onSubmit={handleTurnOn2FA} style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    placeholder="输入6位验证码确认"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    style={styles.input}
                    required
                  />
                  <button type="submit" style={styles.button}>确认开启</button>
                </form>
              </div>
            )}

            <button
              style={{ ...styles.button, backgroundColor: '#dc3545', marginTop: '15px' }}
              onClick={handleLogout}
            >
              退出登录
            </button>
          </div>
        ) : requires2FA ? (
          /* 状态 B：登录时触发了 2FA，要求输入 6 位验证码 */
          <form onSubmit={handleVerify2FALogin}>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '15px' }}>
              检测到您已开启 2FA，请输入身份验证器中的 6 位动态码：
            </p>
            <div style={styles.formGroup}>
              <input
                type="text"
                placeholder="请输入 6 位码"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                required
                style={{ ...styles.input, textAlign: 'center', fontSize: '20px', letterSpacing: '8px' }}
              />
            </div>
            <button type="submit" style={styles.button}>验证并登录</button>
            <button
              type="button"
              style={{ ...styles.buttonSecondary, marginTop: '10px' }}
              onClick={() => { setRequires2FA(false); setOtpCode(''); }}
            >
              返回登录
            </button>
          </form>
        ) : (
          /* 状态 C：普通的登录/注册表单 */
          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <div style={styles.formGroup}>
              <label>用户名 / 邮箱</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={styles.input}
                placeholder="请输入用户名"
              />
            </div>

            {!isLogin && (
              <div style={styles.formGroup}>
                <label>邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="请输入邮箱"
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label>密码</label>
              <input
                type="password"
                ref={passwordRef} // 👈 绑定引用
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="请输入密码"
                autoComplete="new-password" // 👈 用新密码属性来迷惑浏览器的自动填充
              />
            </div>

            <button type="submit" style={styles.button}>
              {isLogin ? '登录' : '注册'}
            </button>

            <div style={styles.switchText}>
              {isLogin ? '没有账号？' : '已有账号？'}
              <span
                style={styles.link}
                onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
              >
                {isLogin ? '去注册' : '去登录'}
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