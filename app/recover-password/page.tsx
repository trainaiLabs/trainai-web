'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecoverPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage(`인증 실패: ${error.message}`);
          setLoading(false);
          return;
        }

        setSessionReady(true);
        setLoading(false);
        return;
      }

      const hashParams = new URLSearchParams(
        window.location.hash.replace('#', '')
      );

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(`인증 실패: ${error.message}`);
          setLoading(false);
          return;
        }

        setSessionReady(true);
        setLoading(false);
        return;
      }

      setMessage('비밀번호 재설정 링크가 올바르지 않습니다.');
      setLoading(false);
    };

    init();
  }, []);

  const handleChangePassword = async () => {
    if (changing || success) return;

    if (!sessionReady) {
      setMessage('인증이 완료되지 않았습니다. 재설정 메일을 다시 요청해주세요.');
      return;
    }

    if (password.length < 6) {
      setMessage('비밀번호는 6자 이상 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    setChanging(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(getResetPasswordErrorMessage(error.message));
      setChanging(false);
      return;
    }

    await supabase.auth.signOut();

    setSuccess(true);
    setMessage('비밀번호가 변경되었습니다. 앱에서 새 비밀번호로 로그인해주세요.');
    setChanging(false);
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.logo}>TrainAI</div>
          <h1 style={styles.title}>비밀번호 재설정</h1>
          <p style={styles.description}>인증 정보를 확인하고 있습니다...</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>TrainAI</div>

        <h1 style={styles.title}>새 비밀번호 설정</h1>
        <p style={styles.description}>
          앞으로 사용할 새 비밀번호를 입력해주세요.
        </p>

        <div style={styles.form}>
          <input
            type="password"
            placeholder="새 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />

          <button
            onClick={handleChangePassword}
            disabled={changing || !sessionReady || success}
            style={{
              ...styles.button,
              opacity: changing || !sessionReady ? 0.6 : 1,
              cursor: changing || !sessionReady || success ? 'not-allowed' : 'pointer',
            }}
          >
            {changing
              ? '변경 중...'
              : success
                ? '비밀번호 변경 완료'
                : '비밀번호 변경'}
          </button>
        </div>

        {message && (
          <p
            style={{
              ...styles.message,
              color: message.includes('변경되었습니다') ? '#15803d' : '#dc2626',
            }}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

function getResetPasswordErrorMessage(errorMessage?: string) {
  const message = errorMessage?.toLowerCase() ?? '';

  if (message.includes('different from the old password')) {
    return '기존 비밀번호와 다른 새 비밀번호를 입력해주세요.';
  }

  if (message.includes('password should be at least')) {
    return '비밀번호는 최소 6자 이상 입력해주세요.';
  }

  if (message.includes('weak password')) {
    return '보안이 약한 비밀번호입니다. 다른 비밀번호를 입력해주세요.';
  }

  if (message.includes('expired')) {
    return '비밀번호 재설정 링크가 만료되었습니다. 다시 요청해주세요.';
  }

  if (message.includes('invalid')) {
    return '비밀번호 재설정 링크가 올바르지 않습니다. 다시 요청해주세요.';
  }

  if (message.includes('session')) {
    return '인증 세션이 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.';
  }

  return '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.';
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8f7fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#ffffff',
    borderRadius: 28,
    padding: 32,
    boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 900,
    color: '#7e22ce',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    height: 52,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '0 16px',
    fontSize: 15,
    outline: 'none',
  },
  button: {
    height: 52,
    borderRadius: 16,
    border: 'none',
    background: '#9333ea',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 4,
  },
  message: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 1.5,
  },
};