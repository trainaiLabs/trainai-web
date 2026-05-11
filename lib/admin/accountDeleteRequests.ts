import { supabase } from '@/lib/supabase/client'

export async function adminListAccountDeleteRequests(
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'pending',
) {
  const { data, error } = await supabase.rpc(
    'admin_list_account_delete_requests',
    {
      p_status: status,
    },
  )

  if (error) throw error
  return data ?? []
}

export async function adminProcessAccountDeleteRequest({
  requestId,
  action,
  adminNote,
}: {
  requestId: string
  action: 'approve' | 'reject'
  adminNote?: string
}) {
  const { data, error } = await supabase.rpc(
    'admin_process_account_delete_request',
    {
      p_request_id: requestId,
      p_action: action,
      p_admin_note: adminNote ?? null,
    },
  )

  if (error) throw error
  return data
}