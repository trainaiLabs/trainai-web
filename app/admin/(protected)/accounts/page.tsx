'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  AdminAccount,
  AdminSearchUser,
  adminListAccounts,
  adminSearchUsers,
  adminUpsertAccount,
} from '@/lib/admin/accounts'

const ROLE_OPTIONS = [
  'super_admin',
  'uploader',
  'reviewer',
  'finance',
  'support_admin',
  'notice_admin',
] as const

type RoleType = (typeof ROLE_OPTIONS)[number]

function getRoleLabel(role: string) {
  switch (role) {
    case 'super_admin':
      return '최고 관리자'
    case 'uploader':
      return '업로드 관리자'
    case 'reviewer':
      return '검수 관리자'
    case 'finance':
      return '정산 관리자'
    case 'support_admin':
      return '문의 관리자'
    case 'notice_admin':
      return '공지 관리자'
    default:
      return role
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

export default function AdminAccountsPage() {
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [searchResults, setSearchResults] = useState<AdminSearchUser[]>([])

  const [query, setQuery] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleType>('uploader')
  const [isActive, setIsActive] = useState(true)

  const [error, setError] = useState<string | null>(null)

  async function loadAccounts(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) throw sessionError

      setCurrentUserId(sessionData.session?.user?.id ?? null)

      const data = await adminListAccounts()
      setAccounts(data)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '관리자 계정 목록을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  function resetForm() {
    setSelectedUserId(null)
    setSelectedUserEmail(null)
    setSelectedRole('uploader')
    setIsActive(true)
    setSearchResults([])
    setQuery('')
  }

  async function handleSearch() {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      window.alert('이메일 또는 닉네임을 2글자 이상 입력해주세요.')
      return
    }

    try {
      setSearching(true)
      setError(null)

      const results = await adminSearchUsers(trimmed)
      setSearchResults(results)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 검색에 실패했습니다.'
      setError(message)
    } finally {
      setSearching(false)
    }
  }

  function handleSelectUser(user: AdminSearchUser) {
    setSelectedUserId(user.user_id)
    setSelectedUserEmail(user.email)
    setSelectedRole((user.admin_role as RoleType | null) ?? 'uploader')
    setIsActive(user.admin_is_active === true || user.is_admin !== true)
  }

  function handleLoadAccount(account: AdminAccount) {
    setSelectedUserId(account.user_id)
    setSelectedUserEmail(account.email)
    setSelectedRole((account.role as RoleType) ?? 'uploader')
    setIsActive(account.is_active)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    if (!selectedUserId) {
      window.alert('먼저 유저를 검색해서 선택해주세요.')
      return
    }

    if (selectedUserId === currentUserId && !isActive) {
      window.alert('자기 자신의 계정은 이 화면에서 비활성화할 수 없습니다.')
      return
    }

    if (selectedRole === 'super_admin') {
      const confirmed = window.confirm(
        `${selectedUserEmail ?? selectedUserId}\n이 계정에 최고 관리자 권한을 부여할까요?`,
      )
      if (!confirmed) return
    }

    try {
      setSaving(true)
      setError(null)

      await adminUpsertAccount({
        userId: selectedUserId,
        role: selectedRole,
        isActive,
      })

      await loadAccounts(true)
      window.alert('관리자 계정이 저장되었습니다.')
      resetForm()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '관리자 계정을 저장하지 못했습니다.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.role === 'super_admin' && b.role !== 'super_admin') return -1
      if (a.role !== 'super_admin' && b.role === 'super_admin') return 1

      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return aTime - bTime
    })
  }, [accounts])

  return (
    <div className="p-6">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">관리자 계정 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">
            유저를 검색해 관리자 권한을 부여하고, 역할 및 활성 상태를 관리합니다.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">유저 검색 후 관리자 지정</h2>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              placeholder="이메일 또는 닉네임 검색"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
            />

            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {searching ? '검색 중...' : '검색'}
            </button>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            예: trainai_test, gmail.com, 닉네임 일부
          </p>

          <div className="mt-4 space-y-3">
            {searchResults.length === 0 ? (
              <div className="text-sm text-zinc-500">
                검색 결과가 없습니다. 검색어를 입력하고 검색해주세요.
              </div>
            ) : (
              searchResults.map((user) => {
                const email = user.email ?? user.user_id
                const nickname = user.nickname ?? '-'

                return (
                  <div
                    key={user.user_id}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{email}</div>
                        <div className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                          {`닉네임: ${nickname}
user_id: ${user.user_id}
현재 관리자 여부: ${user.is_admin ? '예' : '아니오'}${
                            user.admin_role
                              ? `\n현재 권한: ${getRoleLabel(user.admin_role)}`
                              : ''
                          }${
                            user.is_admin
                              ? `\n현재 상태: ${
                                  user.admin_is_active ? '활성' : '비활성'
                                }`
                              : ''
                          }`}
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90"
                        >
                          선택
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">관리자 권한 설정</h2>

          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              {selectedUserEmail ? (
                <>
                  <div>선택 유저: {selectedUserEmail}</div>
                  <div className="mt-1">user_id: {selectedUserId ?? '-'}</div>
                </>
              ) : (
                '선택된 유저가 없습니다.'
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">권한</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as RoleType)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              활성화
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                초기화
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">현재 관리자 계정</h2>

            <button
              type="button"
              onClick={() => loadAccounts(true)}
              disabled={refreshing}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {refreshing ? '새로고침 중...' : '새로고침'}
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-500">불러오는 중...</div>
          ) : sortedAccounts.length === 0 ? (
            <div className="text-sm text-zinc-500">
              등록된 관리자 계정이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAccounts.map((account) => {
                const isMe = account.user_id === currentUserId
                const displayEmail = account.email ?? account.user_id

                return (
                  <div
                    key={account.user_id}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{displayEmail}</div>
                        <div className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                          {`권한: ${getRoleLabel(account.role)}
user_id: ${account.user_id}
상태: ${account.is_active ? '활성' : '비활성'}
생성일: ${formatDateTime(account.created_at)}
수정일: ${formatDateTime(account.updated_at)}${
                            isMe ? '\n(현재 로그인 계정)' : ''
                          }`}
                        </div>
                      </div>

                      <div>
                        {isMe ? (
                          <span className="text-sm font-semibold text-zinc-600">
                            보호됨
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLoadAccount(account)}
                            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                          >
                            불러오기
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}