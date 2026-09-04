'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// 1. LEITURA (Listagem Cronológica e API Key)
// ==========================================
export async function getRideHistory() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  // Busca o histórico de corridas
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Busca a chave do Google Maps do usuário para carregar o mapa
  const { data: settings } = await supabase
    .from('settings')
    .select('google_maps_key')
    .eq('user_id', user.id)
    .single()

  if (error) return { error: "Erro ao buscar histórico." }
  
  return { 
    data, 
    apiKey: settings?.google_maps_key || null // Retornamos a chave aqui!
  }
}

// ==========================================
// 2. ATUALIZAÇÃO (Fechamento Financeiro Seguro)
// ==========================================
export async function closeRideFinancials(rideId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const actual_value = Math.abs(parseFloat(formData.get('actual_value') as string) || 0)
  const tolls_amount = Math.abs(parseFloat(formData.get('tolls_amount') as string) || 0)
  const odometer = Math.abs(parseFloat(formData.get('odometer') as string) || 0)
  const company_km = Math.abs(parseFloat(formData.get('company_km') as string) || 0)
  
  const expected_hp = (formData.get('expected_hp') as string) || null
  const validated_hp = (formData.get('validated_hp') as string) || null
  const service_order = (formData.get('service_order') as string) || null

  const waiting_time = Math.abs(parseFloat(formData.get('waiting_time') as string) || 0)
  const parking = Math.abs(parseFloat(formData.get('parking') as string) || 0)
  const other_expenses = Math.abs(parseFloat(formData.get('other_expenses') as string) || 0)

  const net_value = (actual_value + waiting_time) - (tolls_amount + parking + other_expenses);

  const { error } = await supabase
    .from('rides')
    .update({
      actual_value,
      net_value,
      tolls_amount,
      odometer,
      company_km,
      expected_hp,
      validated_hp,
      service_order,
      waiting_time,
      parking,
      other_expenses,
      is_closed: true,
    })
    .eq('id', rideId)
    .eq('user_id', user.id)

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
    .eq('user_id', user.id) 

  if (error) {
    console.error("Erro ao deletar registro:", error);
    return { error: "Não foi possível excluir o registro." };
  }

  revalidatePath('/history')
  return { success: true }
}