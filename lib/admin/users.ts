import { supabase } from '@/lib/supabase/client'

export type AdminRole =
  | 'super_admin'
  | 'uploader'
  | 'reviewer'
  | 'finance'
  | 'support_admin'
  | 'notice_admin'
  | ''

export type UserSummary = {
  user_id: string
  email: string | null
  nickname: string | null
  worker_status: string
  rank_tier: string | null
  level: number | null
  xp: number | null
  accuracy_score: number | null
  quality_score: number | null
  total_tasks_completed: number | null
  is_active: boolean
  is_expert_reviewer: boolean
  assignment_blocked_until: string | null
  admin_note: string | null
  last_warning_at: string | null
  last_suspension_at: string | null
  is_flagged: boolean
  created_at: string | null
  updated_at: string | null
}

export type AdminAccount = {
  user_id: string
  email: string | null
  role: string
  is_active: boolean
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

export type AdminSearchUser = {
  user_id: string
  email: string | null
  nickname: string | null
  is_admin: boolean
  admin_role: string | null
  admin_is_active: boolean | null
}

export type BadUser = {
  user_id: string
  email: string | null
  nickname: string | null
  is_active: boolean
  worker_status: string
  admin_note: string
  total_tasks: number
  tie_ratio: number
  skip_ratio: number
  mismatch_ratio: number
  gold_mismatch_ratio: number
  fast_ratio: number
  bad_score: number
  bad_status: string
  is_blocked: boolean
}

export async function getMyAdminRole(): Promise<AdminRole> {
  const { data, error } = await supabase.rpc('get_my_admin_role')
  if (error) throw error
  return (data ?? '') as AdminRole
}

export async function adminListUsers(): Promise<UserSummary[]> {
  const { data, error } = await supabase.rpc('admin_list_workers')
  if (error) throw error
  return (data ?? []) as UserSummary[]
}

export async function adminSetUserStatus(params: {
  userId: string
  action: 'warning' | 'restrict' | 'suspend' | 'activate'
  days?: number | null
}) {
  const { data, error } = await supabase.rpc('admin_set_worker_status', {
    p_user_id: params.userId,
    p_action: params.action,
    p_days: params.days ?? null,
  })
  if (error) throw error
  return data as {
    success: boolean
    user_id: string
    previous_status: string
    action: string
    blocked_until: string | null
  }
}

export async function adminSetExpertUser(params: {
  userId: string
  isExpertReviewer: boolean
}) {
  const { data, error } = await supabase.rpc('admin_set_expert_worker', {
    p_user_id: params.userId,
    p_is_expert_reviewer: params.isExpertReviewer,
  })
  if (error) throw error
  return data as {
    success: boolean
    user_id: string
    is_expert_reviewer: boolean
    message?: string
  }
}

export async function adminListAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase.rpc('admin_list_accounts')
  if (error) throw error
  return (data ?? []) as AdminAccount[]
}

export async function adminSearchUsers(
  query: string,
): Promise<AdminSearchUser[]> {
  const { data, error } = await supabase.rpc('admin_search_users', {
    p_query: query,
  })
  if (error) throw error
  return (data ?? []) as AdminSearchUser[]
}

export async function adminUpsertAccount(params: {
  userId: string
  role:
    | 'super_admin'
    | 'uploader'
    | 'reviewer'
    | 'finance'
    | 'support_admin'
    | 'notice_admin'
  isActive: boolean
}) {
  const { data, error } = await supabase.rpc('admin_upsert_account', {
    p_user_id: params.userId,
    p_role: params.role,
    p_is_active: params.isActive,
  })
  if (error) throw error
  return data as {
    success: boolean
    user_id: string
    role: string
    is_active: boolean
  }
}

export async function adminGetBadUsers(
  status: 'all' | 'flagged' | 'blocked' = 'all',
): Promise<BadUser[]> {
  const { data, error } = await supabase.rpc('admin_get_bad_users', {
    p_status: status,
  })
  if (error) throw error
  return (data ?? []) as BadUser[]
}

export async function adminBanUser(params: {
  userId: string
  reason?: string | null
}) {
  const { data, error } = await supabase.rpc('admin_ban_user', {
    p_user_id: params.userId,
    p_reason: params.reason ?? null,
  })
  if (error) throw error
  return data as { success: boolean; user_id: string; action: 'ban' }
}

export async function adminUnbanUser(params: {
  userId: string
  reason?: string | null
}) {
  const { data, error } = await supabase.rpc('admin_unban_user', {
    p_user_id: params.userId,
    p_reason: params.reason ?? null,
  })
  if (error) throw error
  return data as { success: boolean; user_id: string; action: 'unban' }
}

export async function adminRefreshAllUserQualityStats() {
  const { data, error } = await supabase.rpc(
    'admin_refresh_all_worker_quality_stats',
  )
  if (error) throw error
  return data as { success: boolean }
}