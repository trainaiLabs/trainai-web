'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

import {
  getOnlineUserCount,
  getRevenueBreakdown,
  getRevenueSummary,
  syncAdmobRevenueRange,
} from '@/lib/admin/revenue'

function formatNumber(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function getProfitTextClass(value: number) {
  if (value > 0) {
    return 'text-green-600'
  }

  if (value < 0) {
    return 'text-red-600'
  }

  return 'text-zinc-500'
}

type BreakdownRow = {
  period: string
  paid_points: number
  earned_points: number
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

  const totals = rows.reduce(
    (acc, row) => {
      acc.earned_points += Number(
        row.earned_points ?? 0,
      )

      acc.ad_count += Number(row.ad_count ?? 0)

      acc.estimated_revenue += Number(
        row.estimated_revenue ?? 0,
      )

      acc.profit += Number(row.profit ?? 0)

      return acc
    },
    {
      earned_points: 0,
      ad_count: 0,
      estimated_revenue: 0,
      profit: 0,
    },
  )

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

  async function syncAdmobRevenue() {
    try {
      setLoading(true)

      await syncAdmobRevenueRange(
        startDate,
        endDate,
      )

      alert('AdMob 수익 동기화 완료')
    } catch (e) {
      console.error('sync error:', e)
      alert(`AdMob 수익 동기화 실패\n${JSON.stringify(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    await syncAdmobRevenue()
    await loadData()
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
          광고 예상 수익 및 포인트 적립 현황
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              조회
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            총 보유 포인트
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.total_user_points)} P
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            총 지급 포인트
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.total_paid_points)} P
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            예상 광고 수익
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.total_estimated_revenue)} 원
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            예상 차익
          </div>

          <div
            className={`mt-2 text-3xl font-black ${getProfitTextClass(
              Number(summary?.total_profit ?? 0),
            )}`}
          >
            {formatNumber(summary?.total_profit)} 원
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            광고 시청 수
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.total_ad_count)} 회
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            광고 1회당 평균 수익
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.revenue_per_ad)} 원
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            예상 차익률
          </div>

          <div className="mt-2 text-3xl font-black">
            {formatNumber(summary?.profit_margin)}%
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-zinc-500">
            포인트 부채 부담률
          </div>

          <div className="mt-2 text-3xl font-black text-red-600">
            {formatNumber(summary?.point_liability_ratio)}%
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-4 py-3">기간</th>
                <th className="px-4 py-3">적립 포인트</th>
                <th className="px-4 py-3">광고 수</th>
                <th className="px-4 py-3">예상 광고 수익</th>
                <th className="px-4 py-3">차익</th>
                <th className="px-4 py-3 text-left">광고 1회당 수익</th>
                <th className="px-4 py-3 text-left">차익률</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length > 0 && (
                <tr className="border-b border-zinc-200 bg-zinc-50 font-bold">
                  <td className="px-4 py-3">
                    합계
                  </td>

                  <td className="px-4 py-3">
                    {formatNumber(totals.earned_points)} P
                  </td>

                  <td className="px-4 py-3">
                    {formatNumber(totals.ad_count)}
                  </td>

                  <td className="px-4 py-3">
                    {formatNumber(totals.estimated_revenue)} 원
                  </td>

                  <td
                    className={`px-4 py-3 ${getProfitTextClass(
                      totals.profit,
                    )}`}
                  >
                    {formatNumber(totals.profit)} 원
                  </td>

                  <td className="px-4 py-3">
                    {totals.ad_count > 0
                      ? `${formatNumber(totals.estimated_revenue / totals.ad_count)} 원`
                      : '0 원'}
                  </td>

                  <td className="px-4 py-3">
                    {totals.estimated_revenue > 0
                      ? `${formatNumber((totals.profit / totals.estimated_revenue) * 100)}%`
                      : '0%'}
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                      {formatNumber(row.earned_points)} P
                    </td>

                    <td className="px-4 py-3">
                      {row.ad_count}
                    </td>

                    <td className="px-4 py-3">
                      {formatNumber(row.estimated_revenue)} 원
                    </td>

                    <td
                      className={`px-4 py-3 font-bold ${getProfitTextClass(
                        Number(row.profit ?? 0),
                      )}`}
                    >
                      {formatNumber(row.profit)} 원
                    </td>

                    <td className="px-4 py-3">
                      {row.ad_count > 0
                        ? `${formatNumber(row.estimated_revenue / row.ad_count)} 원`
                        : '0 원'}
                    </td>

                    <td className="px-4 py-3">
                      {row.estimated_revenue > 0
                        ? `${formatNumber((row.profit / row.estimated_revenue) * 100)}%`
                        : '0%'}
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