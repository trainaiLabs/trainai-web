'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

export default function Home() {
  const [message, setMessage] = useState('연결 확인 중...')
  const [settingsCount, setSettingsCount] = useState<number | null>(null)
  const [errorText, setErrorText] = useState<string>('')

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase.from('app_settings').select('*')

      if (error) {
        console.error('Supabase 연결 오류:', error)
        setMessage('Supabase 연결 실패')
        setErrorText(error.message)
        return
      }

      console.log('Supabase 연결 성공:', data)
      setMessage('Supabase 연결 성공')
      setSettingsCount(data?.length ?? 0)
    }

    testConnection()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-zinc-200">
        <h1 className="text-3xl font-bold text-zinc-900 mb-4">TrainAI Web</h1>
        <p className="text-zinc-700 mb-2">{message}</p>

        {settingsCount !== null && (
          <p className="text-zinc-600">
            app_settings 테이블 행 개수: <span className="font-semibold">{settingsCount}</span>
          </p>
        )}

        {errorText && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            오류 내용: {errorText}
          </div>
        )}
      </div>
    </main>
  )
}