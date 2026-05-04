'use client'

import { useEffect, useState } from 'react'
import {
  fetchWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  WithdrawalRequest,
} from '@/lib/admin/withdrawals'

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchWithdrawals(status ?? undefined)
      setItems(data)
    } catch {
      alert('출금 목록 불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  const handleApprove = async (item: WithdrawalRequest) => {
    if (!confirm(`${item.nickname} ${item.amount}P 승인할까요?`)) return

    setActionLoading(true)
    try {
      await approveWithdrawal(item.id)
      alert('승인 완료')
      load()
    } catch {
      alert('승인 실패')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (item: WithdrawalRequest) => {
    const reason = prompt('거절 사유 입력 (선택)')
    if (reason === null) return

    setActionLoading(true)
    try {
      await rejectWithdrawal(item.id, reason)
      alert('거절 완료')
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
      {/* 제목 */}
      <h1 className="text-xl font-bold">출금 관리</h1>

      {/* 필터 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {[
          { key: null, label: '전체' },
          { key: 'requested', label: '대기중' },
          { key: 'approved', label: '승인' },
          { key: 'rejected', label: '거절' },
        ].map((s) => (
          <button
            key={String(s.key)}
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

      {/* 리스트 */}
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="text-sm text-zinc-500">
            출금 요청이 없습니다.
          </div>
        )}

        {items.map((item) => {
          const isRequested = item.status === 'requested'

          return (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-5"
            >
              {/* 상단 */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-base">
                    {item.nickname ?? item.user_id}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {item.user_rank}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-2 py-1 text-xs ${
                    item.status === 'requested'
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : item.status === 'approved'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {item.status === 'requested'
                    ? '대기중'
                    : item.status === 'approved'
                    ? '승인'
                    : '거절'}
                </span>
              </div>

              {/* 내용 */}
              <div className="mt-3 text-sm space-y-1 text-zinc-700">
                <div>요청 포인트: {item.amount} P</div>
                <div>출금 가능: {item.available_points ?? 0} P</div>
                <div>대기 포인트: {item.pending_points ?? 0} P</div>

                <div className="pt-2">
                  <div>은행: {item.bank_name || '-'}</div>
                  <div>계좌: {item.account_number || '-'}</div>
                  <div>예금주: {item.account_holder || '-'}</div>
                </div>

                {item.reject_reason && (
                  <div className="pt-2 text-red-600">
                    거절 사유: {item.reject_reason}
                  </div>
                )}
              </div>

              {/* 버튼 */}
              {isRequested && (
                <div className="mt-4 flex gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprove(item)}
                    className="flex-1 rounded-lg bg-black py-2 text-white text-sm disabled:opacity-50"
                  >
                    승인
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