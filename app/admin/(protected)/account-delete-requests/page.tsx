'use client'

import { useEffect, useState } from 'react'
import {
  adminListAccountDeleteRequests,
  adminProcessAccountDeleteRequest,
} from '@/lib/admin/accountDeleteRequests'

type DeleteRequestStatus = 'all' | 'pending' | 'approved' | 'rejected'

type DeleteRequest = {
  id: string
  user_id: string
  email: string | null
  nickname: string | null
  reason: string | null
  status: string
  admin_note: string | null
  requested_at: string
  processed_at: string | null
  available_points: number | null
  pending_points: number | null
  withdrawn_points: number | null
  worker_status: string | null
  is_active: boolean | null
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return '대기중'
    case 'approved':
      return '승인'
    case 'rejected':
      return '거절'
    default:
      return status
  }
}

export default function AccountDeleteRequestsPage() {
  const [items, setItems] = useState<DeleteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<DeleteRequestStatus>('pending')
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminListAccountDeleteRequests(status)
      setItems(data)
    } catch {
      alert('탈퇴 요청 목록 불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  const handleApprove = async (item: DeleteRequest) => {
    const note = prompt(
      `${item.email ?? item.user_id} 탈퇴 요청을 승인할까요?\n관리자 메모 입력 가능`,
      '',
    )
    if (note === null) return

    if (
      !confirm(
        '승인 시 개인정보가 익명화되고 계정 상태가 deleted로 변경됩니다. 계속할까요?',
      )
    ) {
      return
    }

    setActionLoading(true)
    try {
      const result = await adminProcessAccountDeleteRequest({
        requestId: item.id,
        action: 'approve',
        adminNote: note,
      })

      alert(result?.message ?? '승인 완료')
      load()
    } catch {
      alert('승인 실패')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (item: DeleteRequest) => {
    const note = prompt(
      `${item.email ?? item.user_id} 탈퇴 요청을 거절할까요?\n관리자 메모 입력 가능`,
      '',
    )
    if (note === null) return

    if (!confirm('거절 시 계정이 다시 활성화됩니다. 계속할까요?')) return

    setActionLoading(true)
    try {
      const result = await adminProcessAccountDeleteRequest({
        requestId: item.id,
        action: 'reject',
        adminNote: note,
      })

      alert(result?.message ?? '거절 완료')
      load()
    } catch {
      alert('거절 실패')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-6">로딩중...</div>

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold">회원탈퇴 요청</h1>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'pending' as const, label: '대기중' },
            { key: 'approved' as const, label: '승인' },
            { key: 'rejected' as const, label: '거절' },
            { key: 'all' as const, label: '전체' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`rounded-lg px-4 py-2 text-sm ${
                status === s.key
                  ? 'bg-black text-white'
                  : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="text-sm text-zinc-500">
            탈퇴 요청이 없습니다.
          </div>
        )}

        {items.map((item) => {
          const isPending = item.status === 'pending'

          return (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">
                    {item.email ?? item.user_id}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {item.nickname ?? '닉네임 없음'}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-2 py-1 text-xs ${
                    item.status === 'pending'
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : item.status === 'approved'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {statusLabel(item.status)}
                </span>
              </div>

              <div className="mt-3 text-sm space-y-1 text-zinc-700">
                <div>user_id: {item.user_id}</div>
                <div>요청일: {formatDateTime(item.requested_at)}</div>
                <div>처리일: {formatDateTime(item.processed_at)}</div>
                <div>사유: {item.reason || '-'}</div>
                <div>관리자 메모: {item.admin_note || '-'}</div>

                <div className="pt-2">
                  <div>
                    포인트: 보유 {formatNumber(item.available_points)} P
                  </div>
                  <div>
                    출금 대기: {formatNumber(item.pending_points)} P
                  </div>
                  <div>
                    출금 완료: {formatNumber(item.withdrawn_points)} P
                  </div>
                </div>

                <div className="pt-2">
                  <div>작업자 상태: {item.worker_status ?? '-'}</div>
                  <div>계정 활성: {item.is_active ? '예' : '아니오'}</div>
                </div>
              </div>

              {isPending && (
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprove(item)}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-white text-sm disabled:opacity-50"
                  >
                    탈퇴 승인
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleReject(item)}
                    className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}