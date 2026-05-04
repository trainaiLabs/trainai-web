import { supabase } from '@/lib/supabase/client'

export type AdminActionLog = {
  id: string
  created_at: string
  admin_user_id: string
  admin_email: string | null
  action_type: string
  target_table: string | null
  target_id: string | null
  target_user_id: string | null
  target_user_email: string | null
  description: string | null
  metadata: Record<string, unknown> | null
}

export async function adminListActionLogs(limit = 100) {
  const { data, error } = await supabase.rpc('admin_list_action_logs', {
    p_limit: limit,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AdminActionLog[]
}