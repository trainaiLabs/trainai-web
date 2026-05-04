import { supabase } from '@/lib/supabase/client'

export type QualityProjectSummary = {
  id: string
  title: string
  description: string | null
  priority: number | null
  assignment_order: number | null
  is_priority: boolean
  is_active: boolean
  due_at: string | null
  created_at: string | null
  updated_at: string | null

  total_tasks: number
  pending_tasks: number
  agreed_tasks: number
  disputed_tasks: number
  review_required_tasks: number
  expert_review_tasks: number
  admin_review_required_tasks: number
  complete_tasks: number
  admin_confirmed_tasks: number

  total_evaluations: number
  total_completed_assignments: number
  total_target_assignments: number
  estimated_reward_points: number
}

export type QualityTask = {
  id?: string
  task_id?: string
  project_id: string
  priority?: number | null
  is_priority?: boolean
  reward_points?: number | null
  completed_assignments?: number | null
  target_assignments?: number | null
  max_assignments?: number | null
  expert_review_target?: number | null
  expert_review_completed?: number | null
  consensus_status?: string | null
  final_choice?: string | null
  status?: string | null
  created_at?: string | null

  question?: string | null
  input_text?: string | null
  answer_a?: string | null
  answer_b?: string | null

  a_count?: number
  b_count?: number
  tie_count?: number
  skip_count?: number
  total_count?: number
  confidence?: number | null

  decision_source?: string | null
  decision_stage?: string | null

  admin_reviewer_user_id?: string | null
  admin_final_choice?: string | null
  admin_review_note?: string | null
  admin_reviewed_at?: string | null
}

export type QualityProjectDetail = {
  project: Record<string, unknown>
  tasks: QualityTask[]
}

export type ReviewRequiredTask = {
  task_id: string
  project_id: string
  status: string
  payload: Record<string, unknown>
  task_type: string
  task_category: string | null
  max_assignments: number
  target_assignments: number
  completed_assignments: number
  assigned_count: number
  submitted_count: number
  consensus_status: string
  expert_review_completed: number
  expert_review_target: number
  priority: number | null
  is_priority: boolean
  created_at: string
  updated_at: string
}

export async function getQualityProjectSummaries(): Promise<QualityProjectSummary[]> {
  const { data, error } = await supabase.rpc('admin_project_quality_summary')

  if (error) throw error

  return ((data ?? []) as unknown[]).map((item) => item as QualityProjectSummary)
}

export async function getQualityProjectDetail(
  projectId: string,
): Promise<QualityProjectDetail> {
  const { data, error } = await supabase.rpc('admin_project_quality_detail', {
    p_project_id: projectId,
  })

  if (error) throw error

  const raw = (data ?? {}) as QualityProjectDetail

  return {
    project: raw.project ?? {},
    tasks: raw.tasks ?? [],
  }
}

export async function getReviewRequiredTasks(): Promise<ReviewRequiredTask[]> {
  const { data, error } = await supabase.rpc('admin_get_review_required_tasks')

  if (error) throw error

  return (data ?? []) as ReviewRequiredTask[]
}

export async function finalizeTaskReview(params: {
  taskId: string
  finalChoice: 'a' | 'b'
  reviewNote?: string | null
}) {
  const { data, error } = await supabase.rpc('admin_finalize_task_review', {
    p_task_id: params.taskId,
    p_final_choice: params.finalChoice,
    p_review_note: params.reviewNote?.trim() || null,
  })

  if (error) throw error

  return data
}

export async function updateProjectAssignmentOrders(
  updates: { project_id: string; assignment_order: number }[],
) {
  const { data, error } = await supabase.rpc(
    'admin_bulk_update_project_assignment_orders',
    {
      p_updates: updates,
    },
  )

  if (error) throw error

  return data
}