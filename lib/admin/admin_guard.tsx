'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Props = {
  allow: string[]
  children: React.ReactNode
}

export default function AdminGuard({ allow, children }: Props) {
  const [loading, setLoading] = useState(true)

  const allowKey = useMemo(() => allow.join('|'), [allow])

  useEffect(() => {
    const check = async () => {
      const allowedRoles = allowKey.split('|').filter(Boolean)

      const { data: role, error } = await supabase.rpc('get_my_admin_role')

      if (error || !role || !allowedRoles.includes(String(role))) {
        window.location.replace('/admin/dashboard')
        return
      }

      setLoading(false)
    }

    check()
  }, [allowKey])

  if (loading) {
    return <div className="p-8">권한 확인 중...</div>
  }

  return <>{children}</>
}