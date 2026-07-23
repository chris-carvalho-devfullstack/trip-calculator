'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getRideHistory() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: "Erro ao buscar histórico." }
  return { data }
}

export async function closeRideFinancials(rideId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const actual_value = parseFloat(formData.get('actual_value') as string) || 0
  const tolls = parseFloat(formData.get('tolls') as string) || 0
  const waiting_time = parseFloat(formData.get('waiting_time') as string) || 0
  const parking = parseFloat(formData.get('parking') as string) || 0
  const other_expenses = parseFloat(formData.get('other_expenses') as string) || 0

  const { error } = await supabase
    .from('rides')
    .update({
      actual_value,
      tolls,
      waiting_time,
      parking,
      other_expenses,
      is_closed: true, // Marca como recebida/fechada
    })
    .eq('id', rideId)
    .eq('user_id', user.id)

  if (error) return { error: "Erro ao atualizar fechamento da corrida." }

  revalidatePath('/history')
  return { success: true }
}