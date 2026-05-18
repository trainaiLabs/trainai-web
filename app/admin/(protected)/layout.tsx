'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import {
  Home,
  FolderKanban,
  BarChart3,
  Megaphone,
  Users,
  UserX,
  Wallet,
  BadgeDollarSign,
  MessageCircle,
  FileText,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'

type AdminMenuItem = {
  name: string
  href: string
  roles?: string[]
  icon: LucideIcon
}

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [adminRole, setAdminRole] = useState<string>('')
  const [adminEmail, setAdminEmail] = useState<string>('')
  const [authError, setAuthError] = useState<string>('')

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setLoading(true)
        setAuthError('')

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!sessionData.session) {
          router.replace('/admin/login')
          return
        }

        setAdminEmail(sessionData.session.user.email ?? '')

        const { data: role, error: roleError } =
          await supabase.rpc('get_my_admin_role')

        if (roleError || !role) {
          await supabase.auth.signOut()
          router.replace('/admin/login')
          return
        }

        setAdminRole(String(role))
      } catch (e) {
        console.error('관리자 권한 확인 실패:', e)
        setAuthError('관리자 권한을 확인하지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  const menu: AdminMenuItem[] = [
    {
      name: '대시보드',
      href: '/admin/dashboard',
      icon: Home,
      roles: ['super_admin', 'finance', 'uploader', 'reviewer', 'support_admin', 'notice_admin'],
    },
    {
      name: '프로젝트',
      href: '/admin/projects',
      icon: FolderKanban,
      roles: ['super_admin', 'uploader'],
    },
    {
      name: '품질관리',
      href: '/admin/quality',
      icon: BarChart3,
      roles: ['super_admin', 'reviewer'],
    },
    {
      name: '공지관리',
      href: '/admin/notices',
      icon: Megaphone,
      roles: ['super_admin', 'notice_admin'],
    },
    {
      name: '유저관리',
      href: '/admin/users',
      icon: Users,
      roles: ['super_admin'], // ✅ 수정
    },
    {
      name: '답변검수',
      href: '/admin/task-answer-moderation',
      icon: ShieldAlert,
      roles: ['super_admin', 'reviewer', 'support_admin'],
    },
    {
      name: '관리자 로그',
      href: '/admin/logs',
      icon: FileText,
      roles: ['super_admin'],
    },
    {
      name: '출금관리',
      href: '/admin/withdrawals',
      icon: Wallet,
      roles: ['super_admin', 'finance'],
    },
    {
      name: '수익집계',
      href: '/admin/revenue',
      icon: BadgeDollarSign,
      roles: ['super_admin'],
    },
    {
      name: '광고관리',
      href: '/admin/monetization',
      icon: BadgeDollarSign,
      roles: ['super_admin'],
    },
    {
      name: '탈퇴요청',
      href: '/admin/account-delete-requests',
      icon: UserX,
      roles: ['super_admin', 'support_admin'],
    },
    {
      name: '고객문의관리',
      href: '/admin/support-tickets',
      icon: MessageCircle,
      roles: ['super_admin', 'support_admin'],
    },
  ]

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      if (!item.roles) return adminRole === 'super_admin'
      return item.roles.includes(adminRole)
    })
  }, [adminRole])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100">
        <p className="text-zinc-600">관리자 권한 확인 중...</p>
      </main>
    )
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold">접근 확인 실패</h1>
          <p className="mt-2 text-sm text-zinc-600">{authError}</p>
          <div className="mt-4">
            <button
              onClick={() => router.replace('/admin/login')}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white p-4">
        <div>
          <h1 className="mb-2 text-xl font-bold">TrainAI Admin</h1>
          <p className="text-xs text-zinc-500">role: {adminRole}</p>
          {adminEmail && (
            <p className="mt-1 break-all text-xs text-zinc-500">{adminEmail}</p>
          )}
        </div>

        <nav className="mt-6 space-y-2">
          {filteredMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-2 text-sm ${
                isActive(item.href)
                  ? 'bg-black text-white'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}