import { supabase } from '@/lib/supabase/client'

export type WithdrawalRequest = {
  id: string
  user_id: string
  amount: number
  status: 'requested' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  reject_reason?: string | null
  approved_at?: string | null
  rejected_at?: string | null
  phone_number?: string | null
  bank_name?: string | null
  account_number?: string | null
  account_holder?: string | null
  nickname?: string | null
  user_rank?: string | null
  available_points?: number | null
  pending_points?: number | null
}

export async function fetchWithdrawals(status?: string) {
  const { data, error } = await supabase.rpc(
    'admin_get_withdrawal_requests',
    { p_status: status ?? null }
  )

  if (error) throw error
  return data as WithdrawalRequest[]
}

export async function approveWithdrawal(id: string) {
  const { error } = await supabase.rpc(
    'admin_approve_withdrawal',
    { p_withdrawal_request_id: id }
  )

  if (error) throw error
}

export async function rejectWithdrawal(id: string, reason?: string) {
  const { error } = await supabase.rpc(
    'admin_reject_withdrawal',
    {
      p_withdrawal_request_id: id,
      p_reason: reason ?? null,
    }
  )

  if (error) throw error
}