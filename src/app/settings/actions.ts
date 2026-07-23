'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveSettings(formData: FormData) {
  const supabase = await createClient()
  
  // Pega o usuário logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Usuário não autenticado")

  // Pega os dados do formulário
  const base_address = formData.get('base_address') as string
  const price_per_km = parseFloat(formData.get('price_per_km') as string)
  const google_maps_key = formData.get('google_maps_key') as string

  // Faz o Upsert
  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: user.id,
      base_address,
      price_per_km,
      google_maps_key,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id' 
    })

  if (error) {
    console.error("Erro ao salvar:", error)
    redirect('/settings?status=error')
  }

  // Atualiza o cache
  revalidatePath('/settings')
  revalidatePath('/')
  
  redirect('/settings?status=success')
}

// Interfaces para tipar os retornos das APIs
interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
}

interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
  }>;
}

export async function getAccurateAddress(lat: number, lon: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { data: settings } = await supabase
    .from('settings')
    .select('google_maps_key')
    .eq('user_id', user.id)
    .single()

  // Se a pessoa ainda não salvou a chave do Google, usamos a BigDataCloud (Gratuita e sem bloqueios)
  if (!settings?.google_maps_key) {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`)
      
      if (!res.ok) throw new Error("Erro na resposta da API Gratuita")
      
      const data = (await res.json()) as BigDataCloudResponse
      
      // Monta um endereço básico: "Bairro/Localidade, Cidade, Estado"
      const addressParts = [data.locality, data.city, data.principalSubdivision].filter(Boolean)
      const formattedFallback = addressParts.join(', ')

      return { address: formattedFallback || "Endereço aproximado", fallback: true }
    } catch (error) {
      return { error: "Falha na API de mapas. Tente configurar a chave do Google." }
    }
  }

  // Se tem a chave do Google, usa a API oficial de forma segura no servidor
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${settings.google_maps_key}&language=pt-BR`
    const res = await fetch(url)
    
    if (!res.ok) throw new Error("Erro de comunicação com Google Maps")
    
    const data = (await res.json()) as GoogleGeocodeResponse

    if (data.status === "OK" && data.results.length > 0) {
      return { address: data.results[0].formatted_address }
    }
    
    return { error: "Google Maps não conseguiu encontrar o endereço para estas coordenadas." }
  } catch (error) {
    return { error: "Erro ao consultar a API do Google Maps." }
  }
}