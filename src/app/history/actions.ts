'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// 1. LEITURA (Listagem Cronológica)
// ==========================================
export async function getRideHistory() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', user.id)
    // A ordenação pelo timestamp completo garante precisão na hora do lançamento
    .order('created_at', { ascending: false })

  if (error) return { error: "Erro ao buscar histórico." }
  return { data }
}

// ==========================================
// 2. ATUALIZAÇÃO (Fechamento Financeiro Seguro)
// ==========================================
export async function closeRideFinancials(rideId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  // Sanitização estrita: Fallback para 0 e uso do Math.abs para impedir injeção de valores negativos
  const actual_value = Math.abs(parseFloat(formData.get('actual_value') as string) || 0) // Valor Bruto
  const tolls = Math.abs(parseFloat(formData.get('tolls') as string) || 0)
  const waiting_time = Math.abs(parseFloat(formData.get('waiting_time') as string) || 0)
  const parking = Math.abs(parseFloat(formData.get('parking') as string) || 0)
  const other_expenses = Math.abs(parseFloat(formData.get('other_expenses') as string) || 0)

  // Cálculo da liquidez: Subtrai despesas e soma ganhos extras sobre o valor bruto
  const net_value = (actual_value + waiting_time) - (tolls + parking + other_expenses);

  const { error } = await supabase
    .from('rides')
    .update({
      actual_value, // Persiste o valor bruto
      net_value,    // Persiste o valor líquido calculado no servidor
      tolls,
      waiting_time,
      parking,
      other_expenses,
      is_closed: true, // Marca como recebida/fechada
    })
    .eq('id', rideId)
    .eq('user_id', user.id) // Cibersegurança: Bloqueia ataques IDOR

  if (error) return { error: "Erro ao atualizar fechamento da corrida." }

  revalidatePath('/history')
  return { success: true }
}

// ==========================================
// 3. EXCLUSÃO (Deleção Blindada)
// ==========================================
export async function deleteRideRecord(rideId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { error } = await supabase
    .from('rides')
    .delete()
    .eq('id', rideId)
    .eq('user_id', user.id) // Cibersegurança: Dupla checagem obrigatória

  if (error) {
    console.error("Erro ao deletar registro:", error);
    return { error: "Não foi possível excluir o registro." };
  }

  revalidatePath('/history')
  return { success: true }
}