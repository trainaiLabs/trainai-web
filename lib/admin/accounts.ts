import { supabase } from '@/lib/supabase/client'

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