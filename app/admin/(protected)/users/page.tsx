'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  AdminAccount,
  AdminRole,
  AdminSearchUser,
  BadUser,
  UserSummary,
  adminBanUser,
  adminGetBadUsers,
  adminListAccounts,
  adminListUsers,
  adminRefreshAllUserQualityStats,
  adminSearchUsers,
  adminSetExpertUser,
  adminSetUserStatus,
  adminUnbanUser,
  adminUpsertAccount,
  getMyAdminRole,
} from '@/lib/admin/users'

type TabKey = 'users' | 'accounts' | 'bad-users'
type AccountRole =
  | 'super_admin'
  | 'uploader'
  | 'reviewer'
  | 'finance'
  | 'support_admin'
  | 'notice_admin'

const ROLE_OPTIONS: AccountRole[] = [
  'super_admin',
  'uploader',
  'reviewer',
  'finance',
  'support_admin',
  'notice_admin',
]

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function statusLabel(status: string) {
  switch (status) {
    case 'warning':
      return '경고'
    case 'restricted':
      return '제한'
    case 'suspended':
      return '정지'
    case 'active':
    default:
      return '정상'
  }
}

function accountStateLabel(user: UserSummary) {
  if (!user.is_active) return '차단됨'
  return statusLabel(user.worker_status)
}

function accountStateBadgeClass(user: UserSummary) {
  if (!user.is_active) {
    return 'border-red-200 bg-red-50 text-red-700'
  }
  return statusBadgeClass(user.worker_status)
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'warning':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'restricted':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'suspended':
      return 'border-zinc-300 bg-zinc-100 text-zinc-800'
    case 'active':
    default:
      return 'border-green-200 bg-green-50 text-green-700'
  }
}

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

function formatNum(value: number | null | undefined) {
  if (value == null) return '0'
  return Number(value).toString()
}

export default function AdminUsersPage() {
  const [loadingPage, setLoadingPage] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [adminRole, setAdminRole] = useState<AdminRole>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('users')

  // users tab
  const [users, setUsers] = useState<UserSummary[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(
    null,
  )
  const [userSearch, setUserSearch] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'active' | 'warning' | 'restricted' | 'suspended'
  >('all')

  // accounts tab
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountSearchLoading, setAccountSearchLoading] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountQuery, setAccountQuery] = useState('')
  const [accountSearchResults, setAccountSearchResults] = useState<
    AdminSearchUser[]
  >([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null,
  )
  const [selectedRole, setSelectedRole] = useState<AccountRole>('uploader')
  const [selectedActive, setSelectedActive] = useState(true)

  // bad users tab
  const [badUsers, setBadUsers] = useState<BadUser[]>([])
  const [badUsersLoading, setBadUsersLoading] = useState(false)
  const [badUsersFilter, setBadUsersFilter] = useState<
    'all' | 'flagged' | 'blocked'
  >('all')
  const [badUserActionLoadingId, setBadUserActionLoadingId] = useState<
    string | null
  >(null)
  const [refreshingQualityStats, setRefreshingQualityStats] = useState(false)

  async function initialize() {
    try {
      setLoadingPage(true)
      setError(null)

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()
      if (sessionError) throw sessionError

      setCurrentUserId(sessionData.session?.user?.id ?? null)

      const role = await getMyAdminRole()
      setAdminRole(role)

      if (role === 'reviewer' || role === 'super_admin') {
        await loadUsers()
      }

      if (role === 'super_admin') {
        await Promise.all([loadAccounts(), loadBadUsers('all')])
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 관리 화면을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    initialize()
  }, [])

  async function loadUsers() {
    try {
      setUsersLoading(true)
      const data = await adminListUsers()
      setUsers(data)
    } finally {
      setUsersLoading(false)
    }
  }

  async function loadAccounts() {
    try {
      setAccountsLoading(true)
      const data = await adminListAccounts()
      setAccounts(data)
    } finally {
      setAccountsLoading(false)
    }
  }

  async function loadBadUsers(filter: 'all' | 'flagged' | 'blocked') {
    try {
      setBadUsersLoading(true)
      const data = await adminGetBadUsers(filter)
      setBadUsers(data)
      setBadUsersFilter(filter)
    } finally {
      setBadUsersLoading(false)
    }
  }

  async function handleUserStatusAction(
    user: UserSummary,
    action: 'warning' | 'restrict' | 'suspend' | 'activate',
    days?: number,
  ) {
    const displayName = user.nickname?.trim() || user.email || user.user_id

    let message = '상태를 변경할까요?'
    if (action === 'warning') {
      message = `${displayName}에게 경고 처리할까요?`
    } else if (action === 'restrict') {
      message = `${displayName}의 활동을 ${days ?? 3}일 제한할까요?`
    } else if (action === 'suspend') {
      message = `${displayName}의 활동을 ${days ?? 7}일 정지할까요?`
    } else if (action === 'activate') {
      message = `${displayName}의 제한을 해제할까요?`
    }

    if (!window.confirm(message)) return

    try {
      setUserActionLoadingId(user.user_id)
      setError(null)
      await adminSetUserStatus({
        userId: user.user_id,
        action,
        days: days ?? null,
      })
      await loadUsers()
      window.alert('유저 상태가 변경되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 상태를 변경하지 못했습니다.'
      setError(message)
    } finally {
      setUserActionLoadingId(null)
    }
  }

  async function handleExpertAction(
    user: UserSummary,
    isExpertReviewer: boolean,
  ) {
    const displayName = user.nickname?.trim() || user.email || user.user_id
    const message = isExpertReviewer
      ? `${displayName}을 전문가 유저로 지정할까요?`
      : `${displayName}의 전문가 유저 지정을 해제할까요?`

    if (!window.confirm(message)) return

    try {
      setUserActionLoadingId(user.user_id)
      setError(null)
      const result = await adminSetExpertUser({
        userId: user.user_id,
        isExpertReviewer,
      })

      if (result.success === false) {
        throw new Error(result.message || '전문가 유저 설정에 실패했습니다.')
      }

      await loadUsers()
      window.alert(
        isExpertReviewer
          ? '전문가 유저로 지정되었습니다.'
          : '전문가 유저 지정이 해제되었습니다.',
      )
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '전문가 유저 설정을 변경하지 못했습니다.'
      setError(message)
    } finally {
      setUserActionLoadingId(null)
    }
  }

  function resetAccountForm() {
    setSelectedUserId(null)
    setSelectedUserEmail(null)
    setSelectedRole('uploader')
    setSelectedActive(true)
    setAccountSearchResults([])
    setAccountQuery('')
  }

  async function handleAccountSearch() {
    const trimmed = accountQuery.trim()
    if (trimmed.length < 2) {
      window.alert('이메일 또는 닉네임을 2글자 이상 입력해주세요.')
      return
    }

    try {
      setAccountSearchLoading(true)
      setError(null)
      const results = await adminSearchUsers(trimmed)
      setAccountSearchResults(results)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 검색에 실패했습니다.'
      setError(message)
    } finally {
      setAccountSearchLoading(false)
    }
  }

  function handleSelectAccountUser(user: AdminSearchUser) {
    setSelectedUserId(user.user_id)
    setSelectedUserEmail(user.email)
    setSelectedRole((user.admin_role as AccountRole | null) ?? 'uploader')
    setSelectedActive(user.admin_is_active === true || user.is_admin !== true)
  }

  function handleLoadAccount(account: AdminAccount) {
    setSelectedUserId(account.user_id)
    setSelectedUserEmail(account.email)
    setSelectedRole((account.role as AccountRole) ?? 'uploader')
    setSelectedActive(account.is_active)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSaveAccount() {
    if (!selectedUserId) {
      window.alert('먼저 유저를 검색해서 선택해주세요.')
      return
    }

    if (selectedUserId === currentUserId && !selectedActive) {
      window.alert('자기 자신의 계정은 비활성화할 수 없습니다.')
      return
    }

    if (selectedRole === 'super_admin') {
      const confirmed = window.confirm(
        `${selectedUserEmail ?? selectedUserId}\n이 계정에 최고 관리자 권한을 부여할까요?`,
      )
      if (!confirmed) return
    }

    try {
      setAccountSaving(true)
      setError(null)

      await adminUpsertAccount({
        userId: selectedUserId,
        role: selectedRole,
        isActive: selectedActive,
      })

      await loadAccounts()
      window.alert('관리자 계정이 저장되었습니다.')
      resetAccountForm()
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '관리자 계정을 저장하지 못했습니다.'
      setError(message)
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleBanUser(user: BadUser) {
    const displayName = user.nickname?.trim() || user.email || user.user_id
    const reason = window.prompt(
      `${displayName} 차단 사유를 입력해주세요.`,
      '품질 문제',
    )
    if (reason === null) return

    try {
      setBadUserActionLoadingId(user.user_id)
      setError(null)
      await adminBanUser({ userId: user.user_id, reason })
      await loadBadUsers(badUsersFilter)
      await loadUsers()
      window.alert('유저가 차단되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 차단에 실패했습니다.'
      setError(message)
    } finally {
      setBadUserActionLoadingId(null)
    }
  }

  async function handleUnbanUser(user: BadUser) {
    const displayName = user.nickname?.trim() || user.email || user.user_id
    const reason = window.prompt(
      `${displayName} 차단 해제 사유를 입력해주세요.`,
      '수동 검토 완료',
    )
    if (reason === null) return

    try {
      setBadUserActionLoadingId(user.user_id)
      setError(null)
      await adminUnbanUser({ userId: user.user_id, reason })
      await loadBadUsers(badUsersFilter)
      await loadUsers()
      window.alert('유저 차단이 해제되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '유저 차단 해제에 실패했습니다.'
      setError(message)
    } finally {
      setBadUserActionLoadingId(null)
    }
  }

  async function handleRefreshQualityStats() {
    if (!window.confirm('전체 유저의 품질 통계를 다시 계산할까요?')) return

    try {
      setRefreshingQualityStats(true)
      setError(null)
      await adminRefreshAllUserQualityStats()
      await loadBadUsers(badUsersFilter)
      window.alert('품질 통계가 갱신되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '품질 통계 갱신에 실패했습니다.'
      setError(message)
    } finally {
      setRefreshingQualityStats(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()

    return users.filter((user) => {
      const matchesStatus =
        userStatusFilter === 'all' ? true : user.worker_status === userStatusFilter

      const haystack = [
        user.nickname ?? '',
        user.email ?? '',
        user.user_id,
        user.rank_tier ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = q ? haystack.includes(q) : true
      return matchesStatus && matchesSearch
    })
  }, [users, userSearch, userStatusFilter])

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.role === 'super_admin' && b.role !== 'super_admin') return -1
      if (a.role !== 'super_admin' && b.role === 'super_admin') return 1
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return aTime - bTime
    })
  }, [accounts])

  const tabs = [
    { key: 'users' as const, label: '전체 유저', visible: adminRole === 'reviewer' || adminRole === 'super_admin' },
    { key: 'accounts' as const, label: '관리자 계정', visible: adminRole === 'super_admin' },
    { key: 'bad-users' as const, label: '악성 유저', visible: adminRole === 'super_admin' },
  ].filter((tab) => tab.visible)

  if (loadingPage) {
    return <div className="p-6 text-sm text-zinc-500">불러오는 중...</div>
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">유저 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">
            전체 유저 상태, 전문가 지정, 관리자 계정, 악성 유저를 관리합니다.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  activeTab === tab.key
                    ? 'bg-black text-white'
                    : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'users' && (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
                <div>
                  <label className="mb-1 block text-sm font-medium">검색</label>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="이메일, 닉네임, user_id, 티어 검색"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">상태</label>
                  <select
                    value={userStatusFilter}
                    onChange={(e) =>
                      setUserStatusFilter(
                        e.target.value as
                          | 'all'
                          | 'active'
                          | 'warning'
                          | 'restricted'
                          | 'suspended',
                      )
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  >
                    <option value="all">전체</option>
                    <option value="active">정상</option>
                    <option value="warning">경고</option>
                    <option value="restricted">제한</option>
                    <option value="suspended">정지</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadUsers}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                  >
                    {usersLoading ? '새로고침 중...' : '새로고침'}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">전체 유저</h2>
                <span className="text-sm text-zinc-500">총 {filteredUsers.length}명</span>
              </div>

              {usersLoading ? (
                <div className="text-sm text-zinc-500">불러오는 중...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-sm text-zinc-500">조건에 맞는 유저가 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => {
                    const displayName =
                      user.nickname?.trim() || user.email || user.user_id
                    const isBusy = userActionLoadingId === user.user_id

                    return (
                      <div
                        key={user.user_id}
                        className="rounded-xl border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold">{displayName}</h3>

                              <span
                                className={`rounded-full border px-2 py-1 text-xs ${accountStateBadgeClass(
                                    user,
                                )}`}
                              >
                                {accountStateLabel(user)}
                              </span>

                              {user.is_expert_reviewer && (
                                <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-700">
                                  전문가 유저
                                </span>
                              )}

                              {user.is_flagged && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                                  플래그됨
                                </span>
                              )}
                            </div>

                            <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                              <div>이메일: {user.email ?? '-'}</div>
                              <div>user_id: {user.user_id}</div>
                              <div>
                                티어: {user.rank_tier ?? '-'} / 레벨: {user.level ?? '-'} / XP:{' '}
                                {user.xp ?? 0}
                              </div>
                              <div>
                                정확도: {formatNum(user.accuracy_score)} / 품질:{' '}
                                {formatNum(user.quality_score)} / 작업수:{' '}
                                {user.total_tasks_completed ?? 0}
                              </div>
                              <div>계정 활성: {user.is_active ? '예' : '아니오'}</div>
                              <div>
                                현재 상태 설명:{' '}
                                {!user.is_active
                                  ? '악성 유저 차단 상태'
                                  : user.worker_status === 'restricted'
                                    ? '일시 제한 상태'
                                    : user.worker_status === 'suspended'
                                      ? '일시 정지 상태'
                                      : user.worker_status === 'warning'
                                        ? '경고 상태'
                                        : '정상'}
                              </div>
                              <div>
                                활동 차단 해제 시점: {formatDateTime(user.assignment_blocked_until)}
                              </div>
                              <div>최근 경고: {formatDateTime(user.last_warning_at)}</div>
                              <div>최근 정지: {formatDateTime(user.last_suspension_at)}</div>
                              <div>관리자 메모: {user.admin_note ?? '-'}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:w-[320px] lg:justify-end">
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUserStatusAction(user, 'warning')}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                            >
                                경고
                            </button>

                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUserStatusAction(user, 'restrict', 3)}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                            >
                                3일 제한
                            </button>

                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUserStatusAction(user, 'suspend', 7)}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                            >
                                7일 정지
                            </button>

                            {user.is_active &&
                                (user.worker_status === 'restricted' ||
                                user.worker_status === 'suspended') && (
                                <button
                                    type="button"   
                                    disabled={isBusy}
                                    onClick={() => handleUserStatusAction(user, 'activate')}
                                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                                >
                                    제한 해제
                                </button>
                            )}

                            {user.is_expert_reviewer ? (
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleExpertAction(user, false)}
                                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                                >
                                    전문가 해제
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleExpertAction(user, true)}
                                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                                >
                                    전문가 지정
                                </button>
                            )}

                            {!user.is_active && (
                                <div className="w-full text-right text-xs text-red-600">
                                    차단 해제는 악성 유저 탭에서 처리하세요.
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'accounts' && adminRole === 'super_admin' && (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">유저 검색 후 관리자 지정</h2>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={accountQuery}
                  onChange={(e) => setAccountQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAccountSearch()
                    }
                  }}
                  placeholder="이메일 또는 닉네임 검색"
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
                />

                <button
                  type="button"
                  onClick={handleAccountSearch}
                  disabled={accountSearchLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  {accountSearchLoading ? '검색 중...' : '검색'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {accountSearchResults.length === 0 ? (
                  <div className="text-sm text-zinc-500">
                    검색 결과가 없습니다. 검색어를 입력하고 검색해주세요.
                  </div>
                ) : (
                  accountSearchResults.map((user) => {
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

                          <button
                            type="button"
                            onClick={() => handleSelectAccountUser(user)}
                            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90"
                          >
                            선택
                          </button>
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
                    onChange={(e) =>
                      setSelectedRole(e.target.value as AccountRole)
                    }
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
                    checked={selectedActive}
                    onChange={(e) => setSelectedActive(e.target.checked)}
                  />
                  활성화
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetAccountForm}
                    disabled={accountSaving}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  >
                    초기화
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    disabled={accountSaving}
                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 disabled:opacity-50"
                  >
                    {accountSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">현재 관리자 계정</h2>

                <button
                  type="button"
                  onClick={loadAccounts}
                  disabled={accountsLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  {accountsLoading ? '새로고침 중...' : '새로고침'}
                </button>
              </div>

              {accountsLoading ? (
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
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'bad-users' && adminRole === 'super_admin' && (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => loadBadUsers('all')}
                    className={`rounded-lg px-4 py-2 text-sm ${
                      badUsersFilter === 'all'
                        ? 'bg-black text-white'
                        : 'border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => loadBadUsers('flagged')}
                    className={`rounded-lg px-4 py-2 text-sm ${
                      badUsersFilter === 'flagged'
                        ? 'bg-black text-white'
                        : 'border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    플래그
                  </button>
                  <button
                    type="button"
                    onClick={() => loadBadUsers('blocked')}
                    className={`rounded-lg px-4 py-2 text-sm ${
                      badUsersFilter === 'blocked'
                        ? 'bg-black text-white'
                        : 'border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    차단됨
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshQualityStats}
                  disabled={refreshingQualityStats}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  {refreshingQualityStats ? '갱신 중...' : '품질 통계 갱신'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">악성 유저</h2>
                <span className="text-sm text-zinc-500">총 {badUsers.length}명</span>
              </div>

              {badUsersLoading ? (
                <div className="text-sm text-zinc-500">불러오는 중...</div>
              ) : badUsers.length === 0 ? (
                <div className="text-sm text-zinc-500">대상 유저가 없습니다.</div>
              ) : (
                <div className="space-y-4">
                  {badUsers.map((user) => {
                    const displayName =
                      user.nickname?.trim() || user.email || user.user_id
                    const isBusy = badUserActionLoadingId === user.user_id

                    return (
                      <div
                        key={user.user_id}
                        className="rounded-xl border border-zinc-200 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold">{displayName}</div>
                              <span className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-700">
                                bad_status: {user.bad_status}
                              </span>
                              {user.is_blocked && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                                  차단됨
                                </span>
                              )}
                            </div>

                            <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                              <div>이메일: {user.email ?? '-'}</div>
                              <div>상태: {statusLabel(user.worker_status)}</div>
                              <div>총 작업수: {user.total_tasks}</div>
                              <div>bad_score: {formatNum(user.bad_score)}</div>
                              <div>tie_ratio: {formatNum(user.tie_ratio)}</div>
                              <div>skip_ratio: {formatNum(user.skip_ratio)}</div>
                              <div>mismatch_ratio: {formatNum(user.mismatch_ratio)}</div>
                              <div>
                                gold_mismatch_ratio: {formatNum(user.gold_mismatch_ratio)}
                              </div>
                              <div>fast_ratio: {formatNum(user.fast_ratio)}</div>
                              <div>관리자 메모: {user.admin_note || '-'}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {user.is_blocked ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleUnbanUser(user)}
                                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                              >
                                차단 해제
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleBanUser(user)}
                                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                차단
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
          </>
        )}
      </div>
    </div>
  )
}