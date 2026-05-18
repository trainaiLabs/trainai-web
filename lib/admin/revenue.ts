import { supabase } from '@/lib/supabase/client'

export async function getRevenueSummary(
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc(
    'admin_revenue_summary',
    {
      p_start_date: startDate,
      p_end_date: endDate,
    },
  )

  if (error) throw error
  return data
}

export async function getRevenueBreakdown(
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'month',
) {
  const { data, error } = await supabase.rpc(
    'admin_revenue_breakdown',
    {
      p_start_date: startDate,
      p_end_date: endDate,
      p_group_by: groupBy,
    },
  )

  if (error) throw error
  return data ?? []
}

export async function getOnlineUserCount() {
  const { data, error } = await supabase.rpc(
    'admin_get_online_user_count',
  )

  if (error) throw error
  return data ?? 0
}

export async function syncAdmobRevenueRange(
  startDate: string,
  endDate: string,
) {
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const date = current.toISOString().slice(0, 10)

    const { error } = await supabase.functions.invoke(
      'sync-admob-revenue',
      {
        body: { date },
      },
    )

    if (error) throw error

    current.setDate(current.getDate() + 1)
  }
}