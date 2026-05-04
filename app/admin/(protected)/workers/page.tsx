'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminWorker,
  adminListWorkers,
  adminSetExpertWorker,
  adminSetWorkerStatus,
} from '@/lib/admin/workers'

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

function formatScore(value: number | null | undefined) {
  if (value == null) return '0'
  return Number(value).toString()
}

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<AdminWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoadingUserId, setActionLoadingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'warning' | 'restricted' | 'suspended'
  >('all')

  async function fetchWorkers(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)
      const data = await adminListWorkers()
      setWorkers(data)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '작업자 목록을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
  }, [])

  async function handleStatusAction(
    worker: AdminWorker,
    action: 'warning' | 'restrict' | 'suspend' | 'activate',
    days?: number,
  ) {
    const displayName = worker.nickname?.trim() || worker.email || worker.user_id

    let message = '상태를 변경할까요?'
    if (action === 'warning') {
      message = `${displayName}에게 경고 처리할까요?`
    } else if (action === 'restrict') {
      message = `${displayName}의 작업을 ${days ?? 3}일 제한할까요?`
    } else if (action === 'suspend') {
      message = `${displayName}의 작업을 ${days ?? 7}일 정지할까요?`
    } else if (action === 'activate') {
      message = `${displayName}의 작업 제한을 해제할까요?`
    }

    const confirmed = window.confirm(message)
    if (!confirmed) return

    try {
      setActionLoadingUserId(worker.user_id)
      setError(null)

      await adminSetWorkerStatus({
        userId: worker.user_id,
        action,
        days: days ?? null,
      })

      await fetchWorkers(true)
      window.alert('작업자 상태가 변경되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '작업자 상태를 변경하지 못했습니다.'
      setError(message)
    } finally {
      setActionLoadingUserId(null)
    }
  }

  async function handleExpertAction(
    worker: AdminWorker,
    isExpertReviewer: boolean,
  ) {
    const displayName = worker.nickname?.trim() || worker.email || worker.user_id

    const message = isExpertReviewer
      ? `${displayName}을 전문가 작업자로 지정할까요?`
      : `${displayName}의 전문가 작업자 지정을 해제할까요?`

    const confirmed = window.confirm(message)
    if (!confirmed) return

    try {
      setActionLoadingUserId(worker.user_id)
      setError(null)

      const result = await adminSetExpertWorker({
        userId: worker.user_id,
        isExpertReviewer,
      })

      if (result.success === false) {
        throw new Error(result.message || '전문가 작업자 설정에 실패했습니다.')
      }

      await fetchWorkers(true)
      window.alert(
        isExpertReviewer
          ? '전문가 작업자로 지정되었습니다.'
          : '전문가 작업자 지정이 해제되었습니다.',
      )
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '전문가 작업자 설정을 변경하지 못했습니다.'
      setError(message)
    } finally {
      setActionLoadingUserId(null)
    }
  }

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return workers.filter((worker) => {
      const matchesStatus =
        statusFilter === 'all' ? true : worker.worker_status === statusFilter

      const haystack = [
        worker.nickname ?? '',
        worker.email ?? '',
        worker.user_id,
        worker.rank_tier ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = q ? haystack.includes(q) : true

      return matchesStatus && matchesSearch
    })
  }, [workers, search, statusFilter])

  return (
    <div className="p-6">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">작업자 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">
            작업자 상태와 전문가 작업자 지정 여부를 관리합니다.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
            <div>
              <label className="mb-1 block text-sm font-medium">검색</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이메일, 닉네임, user_id, 티어 검색"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">상태</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
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
                onClick={() => fetchWorkers(true)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                {refreshing ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">작업자 목록</h2>
            <span className="text-sm text-zinc-500">총 {filteredWorkers.length}명</span>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-500">불러오는 중...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-sm text-zinc-500">조건에 맞는 작업자가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {filteredWorkers.map((worker) => {
                const displayName =
                  worker.nickname?.trim() || worker.email || worker.user_id
                const isBusy = actionLoadingUserId === worker.user_id

                return (
                  <div
                    key={worker.user_id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{displayName}</h3>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass(
                              worker.worker_status,
                            )}`}
                          >
                            {statusLabel(worker.worker_status)}
                          </span>

                          {worker.is_expert_reviewer && (
                            <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-700">
                              전문가 작업자
                            </span>
                          )}

                          {worker.is_flagged && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                              플래그됨
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                          <div>이메일: {worker.email ?? '-'}</div>
                          <div>user_id: {worker.user_id}</div>
                          <div>
                            티어: {worker.rank_tier ?? '-'} / 레벨: {worker.level ?? '-'} / XP:{' '}
                            {worker.xp ?? 0}
                          </div>
                          <div>
                            정확도: {formatScore(worker.accuracy_score)} / 품질:{' '}
                            {formatScore(worker.quality_score)} / 작업수:{' '}
                            {worker.total_tasks_completed ?? 0}
                          </div>
                          <div>계정 활성: {worker.is_active ? '예' : '아니오'}</div>
                          <div>
                            작업 차단 해제 시점: {formatDateTime(worker.assignment_blocked_until)}
                          </div>
                          <div>최근 경고: {formatDateTime(worker.last_warning_at)}</div>
                          <div>최근 정지: {formatDateTime(worker.last_suspension_at)}</div>
                          <div>관리자 메모: {worker.admin_note ?? '-'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:w-[320px] lg:justify-end">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusAction(worker, 'warning')}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          경고
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusAction(worker, 'restrict', 3)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          3일 제한
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusAction(worker, 'suspend', 7)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          7일 정지
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusAction(worker, 'activate')}
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                          제한 해제
                        </button>

                        {worker.is_expert_reviewer ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleExpertAction(worker, false)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            전문가 해제
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleExpertAction(worker, true)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            전문가 지정
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