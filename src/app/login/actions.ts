'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Redireciona de volta com erro via URL (simples e eficaz)
    redirect('/login?error=Credenciais inválidas')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

// ==========================================
// AÇÃO DE LOGOUT
// ==========================================
export async function logout() {
  const supabase = await createClient()
  
  // Encerra a sessão ativa no Supabase e limpa os cookies de autenticação
  await supabase.auth.signOut()
  
  // Redireciona o usuário de volta para a tela de login
  redirect('/login')
}