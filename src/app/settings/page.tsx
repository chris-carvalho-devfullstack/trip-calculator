import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { SettingsForm } from "./settings-form" // Importando o nosso novo componente

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Configurações</h1>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Voltar
          </Link>
        </div>

        {params.status === 'success' && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-4 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Configurações salvas com sucesso!</span>
          </div>
        )}

        {params.status === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Erro ao salvar configurações.</span>
          </div>
        )}

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Preferências do Simulador</CardTitle>
            <CardDescription>
              Ajuste sua base, valores e credenciais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Renderiza o formulário passando os dados iniciais */}
            <SettingsForm initialSettings={settings} />
          </CardContent>
        </Card>

      </div>
    </main>
  )
}