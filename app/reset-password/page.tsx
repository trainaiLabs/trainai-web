'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    if (loading || sent) return;

    if (!email) {
      setMessage('이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://trainai.co.kr/recover-password',
    });

    if (error) {
      setMessage(`오류: ${error.message}`);
    } else {
      setSent(true);
      setMessage('비밀번호 재설정 메일을 보냈습니다.');
    }

    setLoading(false);
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>TrainAI</div>

        <h1 style={styles.title}>비밀번호 찾기</h1>
        <p style={styles.description}>
          가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
        </p>

        <input
          type="email"
          placeholder="이메일 입력"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <button
          type="button"
          onClick={handleReset}
          disabled={loading || sent}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            fontWeight: 'bold',
            border: 'none',
            backgroundColor:
              loading || sent ? '#d1d5db' : '#7c3aed', // 회색으로 변경
            color: loading || sent ? '#6b7280' : '#fff',
            cursor: loading || sent ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? '전송 중...'
            : sent
              ? '재설정 메일 발송 완료'
              : '재설정 메일 보내기'}
        </button>

        {message && (
          <p style={{
            ...styles.message,
            color: message.includes('보냈습니다') ? '#15803d' : '#dc2626',
          }}>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8f7fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
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
    fontSize: 26,
    fontWeight: 900,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '0 16px',
    fontSize: 15,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    border: 'none',
    background: '#9333ea',
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
  },
};