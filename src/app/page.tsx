import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SimulatorForm } from "./simulator-form"

export default async function HomePage() {
  const supabase = await createClient()

  // 1. Verifica se o usuário está logado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Busca as configurações (Agora incluindo a chave do Google Maps para desenhar o trajeto)
  const { data: settings } = await supabase
    .from('settings')
    .select('base_address, price_per_km, google_maps_key')
    .eq('user_id', user.id)
    .single()

  // 3. Renderiza o formulário passando os dados iniciais
  return <SimulatorForm initialSettings={settings} />
}