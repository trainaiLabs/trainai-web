'use client'

import { useEffect, useState } from 'react'

import {
  getOnlineUserCount,
  getRevenueBreakdown,
  getRevenueSummary,
} from '@/lib/admin/revenue'

type BreakdownRow = {
  period: string
  paid_points: number
  ad_count: number
  estimated_revenue: number
  profit: number
}

export default function AdminRevenuePage() {
  const today = new Date().toISOString().slice(0, 10)

  const [loading, setLoading] = useState(true)

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const [groupBy, setGroupBy] = useState<'day' | 'month'>(
    'day',
  )

  const [summary, setSummary] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState(0)

  const [rows, setRows] = useState<BreakdownRow[]>([])

  async function loadData() {
    try {
      setLoading(true)

      const [
        summaryData,
        onlineCount,
        breakdownData,
      ] = await Promise.all([
        getRevenueSummary(startDate, endDate),
        getOnlineUserCount(),
        getRevenueBreakdown(
          startDate,
          endDate,
          groupBy,
        ),
      ])

      setSummary(summaryData)
      setOnlineUsers(onlineCount)
      setRows(breakdownData)
    } catch (e) {
      console.error(e)
      alert('수익 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">
          수익 집계
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          광고 예상 수익 및 포인트 지급 현황
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />

          <select
            value={groupBy}
            onChange={(e) =>
              setGroupBy(
                e.target.value as 'day' | 'month',
              )
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="day">일별</option>
            <option value="month">월별</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            조회
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            현재 접속 유저
          </div>

          <div className="mt-2 text-3xl font-black">
            {onlineUsers}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            총 지급 포인트
          </div>

          <div className="mt-2 text-3xl font-black">
            {summary?.total_paid_points ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            예상 광고 수익
          </div>

          <div className="mt-2 text-3xl font-black">
            {summary?.total_estimated_revenue ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            예상 차익
          </div>

          <div className="mt-2 text-3xl font-black">
            {summary?.total_profit ?? 0}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-4 py-3">기간</th>
                <th className="px-4 py-3">
                  지급 포인트
                </th>
                <th className="px-4 py-3">
                  광고 수
                </th>
                <th className="px-4 py-3">
                  예상 광고 수익
                </th>
                <th className="px-4 py-3">
                  차익
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    데이터 없음
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.period}
                    className="border-b border-zinc-100"
                  >
                    <td className="px-4 py-3">
                      {row.period}
                    </td>

                    <td className="px-4 py-3">
                      {row.paid_points}
                    </td>

                    <td className="px-4 py-3">
                      {row.ad_count}
                    </td>

                    <td className="px-4 py-3">
                      {row.estimated_revenue}
                    </td>

                    <td className="px-4 py-3 font-bold">
                      {row.profit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}