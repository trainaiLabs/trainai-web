'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecoverPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) {
        setMessage('잘못된 접근입니다.');
        setLoading(false);
        return;
      }

      try {
        await supabase.auth.exchangeCodeForSession(code);
        setLoading(false);
      } catch (e) {
        setMessage('링크가 만료되었거나 잘못되었습니다.');
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleChangePassword = async () => {
    if (!password) return;

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage('비밀번호 변경 실패');
    } else {
      setMessage('비밀번호가 성공적으로 변경되었습니다.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '200px' }}>로딩중...</div>;
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px'
    }}>
      <h1>비밀번호 재설정</h1>

      <input
        type="password"
        placeholder="새 비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          padding: '12px',
          fontSize: '16px',
          width: '250px'
        }}
      />

      <button
        onClick={handleChangePassword}
        style={{
          padding: '12px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        비밀번호 변경
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}