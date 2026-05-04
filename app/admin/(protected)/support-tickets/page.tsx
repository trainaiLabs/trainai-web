'use client'

import { useEffect, useState } from 'react'
import {
  AdminSupportTicket,
  closeSupportTicket,
  getSupportTickets,
  replySupportTicket,
} from '@/lib/admin/supportTickets'

type TicketStatus = 'open' | 'answered' | 'closed'

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function statusLabel(status: string) {
  switch (status) {
    case 'open':
      return '미답변'
    case 'answered':
      return '답변완료'
    case 'closed':
      return '종료'
    default:
      return status
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'open':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'answered':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'closed':
      return 'border-zinc-300 bg-zinc-100 text-zinc-700'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700'
  }
}

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([])
  const [status, setStatus] = useState<TicketStatus>('open')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyMap, setReplyMap] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  async function loadTickets(nextStatus: TicketStatus = status) {
    try {
      setLoading(true)
      setError(null)

      const data = await getSupportTickets(nextStatus)
      setTickets(data)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '고객 문의 목록을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets(status)
  }, [status])

  async function handleReply(ticketId: string) {
    const reply = replyMap[ticketId]?.trim()

    if (!reply) {
      window.alert('답변 내용을 입력해주세요.')
      return
    }

    if (!window.confirm('이 답변을 등록할까요?')) return

    try {
      setSavingId(ticketId)
      setError(null)

      await replySupportTicket(ticketId, reply)
      setReplyMap((prev) => ({ ...prev, [ticketId]: '' }))
      await loadTickets(status)

      window.alert('답변이 등록되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '답변 등록에 실패했습니다.'
      setError(message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleClose(ticketId: string) {
    if (!window.confirm('이 문의를 종료할까요?')) return

    try {
      setSavingId(ticketId)
      setError(null)

      await closeSupportTicket(ticketId)
      await loadTickets(status)

      window.alert('문의가 종료되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '문의 종료에 실패했습니다.'
      setError(message)
    } finally {
      setSavingId(null)
    }
  }

  async function copyEmail(email?: string | null) {
    if (!email) {
      window.alert('복사할 이메일이 없습니다.')
      return
    }

    await navigator.clipboard.writeText(email)
    window.alert('이메일을 복사했습니다.')
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">고객 문의 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">
            사용자가 등록한 문의를 확인하고 관리자 답변을 등록합니다.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStatus('open')}
              className={`rounded-lg px-4 py-2 text-sm ${
                status === 'open'
                  ? 'bg-black text-white'
                  : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              미답변
            </button>

            <button
              type="button"
              onClick={() => setStatus('answered')}
              className={`rounded-lg px-4 py-2 text-sm ${
                status === 'answered'
                  ? 'bg-black text-white'
                  : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              답변완료
            </button>

            <button
              type="button"
              onClick={() => setStatus('closed')}
              className={`rounded-lg px-4 py-2 text-sm ${
                status === 'closed'
                  ? 'bg-black text-white'
                  : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              종료
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {statusLabel(status)} 문의
            </h2>

            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">
                총 {tickets.length}건
              </span>

              <button
                type="button"
                onClick={() => loadTickets(status)}
                disabled={loading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                {loading ? '새로고침 중...' : '새로고침'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-500">불러오는 중...</div>
          ) : tickets.length === 0 ? (
            <div className="text-sm text-zinc-500">
              해당 상태의 고객 문의가 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const isBusy = savingId === ticket.id
                const isGuestTicket = !ticket.user_id

                return (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">
                            {ticket.subject ?? "(제목 없음)"}
                          </h3>

                          <span
                            className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass(
                              ticket.status,
                            )}`}
                          >
                            {statusLabel(ticket.status)}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                          <div>구분: {ticket.category}</div>
                          <div>문의유형: {ticket.user_id ? '회원 문의' : '비회원 문의'}</div>
                          <div>이메일: {ticket.email ?? '-'}</div>
                          <div>닉네임: {ticket.nickname ?? '-'}</div>
                          <div>user_id: {ticket.user_id ?? '-'}</div>
                          <div>문의일: {formatDateTime(ticket.created_at)}</div>
                          <div>답변일: {formatDateTime(ticket.replied_at)}</div>
                        </div>

                        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 whitespace-pre-wrap">
                          {ticket.message}
                        </div>

                        {ticket.admin_reply && (
                          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                            <div className="mb-1 font-semibold">관리자 답변</div>
                            <div className="whitespace-pre-wrap">
                              {ticket.admin_reply}
                            </div>
                          </div>
                        )}

                        {ticket.status !== 'closed' && (
                          <div className="mt-4 space-y-3">
                            {isGuestTicket ? (
                              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                                <div className="font-semibold">비회원 문의 처리 안내</div>
                                <div className="mt-1">
                                  비회원 문의는 앱 알림으로 답변을 받을 수 없습니다. 이메일을 복사해 직접 답변을 보낸 뒤 문의를 종료해주세요.
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => copyEmail(ticket.email)}
                                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
                                  >
                                    이메일 복사
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleClose(ticket.id)}
                                    disabled={isBusy}
                                    className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm hover:bg-orange-100 disabled:opacity-50"
                                  >
                                    {isBusy ? '처리 중...' : '메일 발송 완료 후 종료'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <textarea
                                  value={replyMap[ticket.id] ?? ''}
                                  onChange={(e) =>
                                    setReplyMap((prev) => ({
                                      ...prev,
                                      [ticket.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="답변 내용을 입력하세요."
                                  className="min-h-[120px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                                />

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleReply(ticket.id)}
                                    disabled={isBusy}
                                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-black/90 disabled:opacity-50"
                                  >
                                    {isBusy ? '처리 중...' : '답변 등록'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleClose(ticket.id)}
                                    disabled={isBusy}
                                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                                  >
                                    문의 종료
                                  </button>
                                </div>
                              </>
                            )}
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
      </div>
    </div>
  )
}