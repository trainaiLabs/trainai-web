'use client';

import { useEffect, useState } from 'react';

export default function RecoverPasswordPage() {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // 1) Supabase PKCE 방식: ?code=...
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');

    if (code) {
      const deepLink = `trainai://recover-password?code=${code}`;
      setRedirectUrl(deepLink);
      window.location.href = deepLink;
      return;
    }

    // 2) 예전 토큰 방식: #access_token=...&refresh_token=...
    const hash = window.location.hash;

    if (hash) {
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const deepLink = `trainai://recover-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
        setRedirectUrl(deepLink);
        window.location.href = deepLink;
      }
    }
  }, []);

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
      <p>앱으로 이동하여 비밀번호를 변경하세요.</p>

      {redirectUrl && (
        <a href={redirectUrl}>
          <button style={{
            padding: '12px 20px',
            fontSize: '16px',
            cursor: 'pointer'
          }}>
            앱 열기
          </button>
        </a>
      )}
    </div>
  );
}