import { supabase } from '@/lib/supabase/client'

export type AdminWorker = {
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

export async function adminListWorkers(): Promise<AdminWorker[]> {
  const { data, error } = await supabase.rpc('admin_list_workers')

  if (error) throw error
  return (data ?? []) as AdminWorker[]
}

export async function adminSetWorkerStatus(params: {
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

export async function adminSetExpertWorker(params: {
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