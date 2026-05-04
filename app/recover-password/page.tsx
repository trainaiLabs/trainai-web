'use client';

import { useEffect, useState } from 'react';

export default function RecoverPasswordPage() {
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // 현재 URL에서 토큰(hash) 가져오기
    const hash = window.location.hash;
    
    if (hash) {
      // 예: #access_token=... 형태
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        const deepLink = `trainai://recover-password?access_token=${accessToken}&refresh_token=${refreshToken}`;
        setRedirectUrl(deepLink);

        // 자동 이동 시도
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