import { supabase } from "@/lib/supabase/client";

export type SupportTicketStatus = "open" | "answered" | "closed";

export type AdminSupportTicket = {
  id: string;
  user_id: string | null;
  email: string | null;
  nickname: string | null;
  category: string;
  subject: string | null;
  message: string;
  status: SupportTicketStatus;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
};

export async function getSupportTickets(status: string = "open") {
  const { data, error } = await supabase.rpc(
    "admin_list_support_tickets",
    {
      p_status: status,
    }
  );

  if (error) throw error;
  return (data ?? []) as AdminSupportTicket[];
}

export async function replySupportTicket(ticketId: string, reply: string) {
  const { data, error } = await supabase.rpc(
    "admin_reply_support_ticket",
    {
      p_ticket_id: ticketId,
      p_reply: reply,
    }
  );

  if (error) throw error;
  return data;
}

export async function closeSupportTicket(ticketId: string) {
  const { data, error } = await supabase.rpc(
    "admin_close_support_ticket",
    {
      p_ticket_id: ticketId,
    }
  );

  if (error) throw error;
  return data;
}