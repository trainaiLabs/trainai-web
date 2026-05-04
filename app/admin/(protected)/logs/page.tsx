'use client'

import { Fragment, useEffect, useState } from 'react'
import AdminGuard from '@/lib/admin/admin_guard'
import {
  AdminActionLog,
  adminListActionLogs,
} from '@/lib/admin/logs'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function actionLabel(type: string) {
  switch (type) {
    case 'withdrawal_approved':
      return '출금 승인'
    case 'withdrawal_rejected':
      return '출금 거절'
    default:
      return type
  }
}

export default function AdminLogsPage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AdminActionLog[]>([])
  const [error, setError] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [dateFilter, setDateFilter] = useState('all')

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await adminListActionLogs(100)
      setLogs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  const filteredLogs = logs.filter((log) => {
    const matchesAction =
      actionFilter === 'all' || log.action_type === actionFilter

    const keyword = searchText.trim().toLowerCase()

    const matchesSearch =
      keyword === '' ||
      String(log.admin_email ?? '').toLowerCase().includes(keyword) ||
      String(log.target_user_email ?? '').toLowerCase().includes(keyword) ||
      String(log.description ?? '').toLowerCase().includes(keyword) ||
      String(log.action_type ?? '').toLowerCase().includes(keyword)

    const createdAt = new Date(log.created_at)
    const now = new Date()

    let matchesDate = true

    if (dateFilter === 'today') {
      matchesDate =
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getDate() === now.getDate()
    }

    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 7)
      matchesDate = createdAt >= sevenDaysAgo
    }

    if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      matchesDate = createdAt >= thirtyDaysAgo
    }

    return matchesAction && matchesSearch && matchesDate
  })

  function downloadCsv() {
    const rows = filteredLogs.map((log) => ({
      일시: formatDateTime(log.created_at),
      관리자: log.admin_email ?? '',
      작업: actionLabel(log.action_type),
      작업코드: log.action_type,
      대상테이블: log.target_table ?? '',
      대상ID: log.target_id ?? '',
      대상유저: log.target_user_email ?? '',
      대상유저ID: log.target_user_id ?? '',
      설명: log.description ?? '',
      상세: JSON.stringify(log.metadata ?? {}),
    }))

    const headers = Object.keys(rows[0] ?? {
      일시: '',
      관리자: '',
      작업: '',
      작업코드: '',
      대상테이블: '',
      대상ID: '',
      대상유저: '',
      대상유저ID: '',
      설명: '',
      상세: '',
    })

    const escapeCsv = (value: unknown) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => escapeCsv(row[header as keyof typeof row])).join(',')
      ),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <AdminGuard allow={['super_admin']}>
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">관리자 행동 로그</h1>
            <p className="mt-2 text-sm text-zinc-500">
              출금 승인, 거절 등 주요 관리자 작업 기록을 확인합니다.
            </p>
          </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? '불러오는 중...' : '새로고침'}
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={loading || filteredLogs.length === 0}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            CSV 다운로드
          </button>
        </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
                작업 유형
            </label>
            <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
                <option value="all">전체</option>
                <option value="withdrawal_approved">출금 승인</option>
                <option value="withdrawal_rejected">출금 거절</option>
                <option value="admin_account_upserted">관리자 권한 변경</option>
                <option value="project_status_updated">프로젝트 상태 변경</option>
                <option value="project_priority_updated">프로젝트 우선순위 변경</option>
                <option value="project_assignment_order_updated">프로젝트 배정순서 변경</option>
                <option value="notice_created">공지 등록</option>
                <option value="notice_updated">공지 수정</option>
                <option value="notice_deleted">공지 삭제</option>
                <option value="worker_status_updated">작업자 상태 변경</option>
                <option value="worker_banned">작업자 차단</option>
                <option value="worker_unbanned">작업자 차단 해제</option>
            </select>
        </div>

        <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
                기간
            </label>
            <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
                <option value="all">전체</option>
                <option value="today">오늘</option>
                <option value="7days">최근 7일</option>
                <option value="30days">최근 30일</option>
            </select>
        </div>


        <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-zinc-700">
                검색
            </label>
        <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="관리자 이메일, 대상 유저, 설명, 작업명 검색"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-zinc-500">불러오는 중...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500">조건에 맞는 로그가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-600">
                    <th className="py-3 pr-4">일시</th>
                    <th className="py-3 pr-4">관리자</th>
                    <th className="py-3 pr-4">작업</th>
                    <th className="py-3 pr-4">대상 유저</th>
                    <th className="py-3 pr-4">설명</th>
                    <th className="py-3 pr-4">상세</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log) => {
                    const isOpen = openId === log.id

                    return (
                      <Fragment key={log.id}>
                        <tr key={log.id} className="border-b border-zinc-100">
                          <td className="whitespace-nowrap py-3 pr-4 text-zinc-700">
                            {formatDateTime(log.created_at)}
                          </td>

                          <td className="py-3 pr-4 text-zinc-700">
                            <div>{log.admin_email ?? '-'}</div>
                          </td>

                          <td className="whitespace-nowrap py-3 pr-4">
                            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                                {actionLabel(log.action_type)}
                            </span>
                          </td>

                          <td className="py-3 pr-4 text-zinc-700">
                            {log.target_user_email ?? '-'}
                          </td>

                          <td className="py-3 pr-4 text-zinc-700">
                            {log.description ?? '-'}
                          </td>

                          <td className="py-3 pr-4">
                            <button
                                onClick={() => setOpenId(isOpen ? null : log.id)}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {isOpen ? '닫기' : '상세보기'}
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bg-zinc-50">
                            <td colSpan={6} className="p-4">
                              <pre className="overflow-auto rounded-lg bg-white p-3 text-xs text-zinc-700 border">
                                {JSON.stringify(log.metadata ?? {}, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminGuard>
  )
}