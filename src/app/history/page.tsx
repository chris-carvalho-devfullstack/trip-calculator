"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, CheckCircle2, Clock, Navigation, DollarSign, Receipt, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getRideHistory, closeRideFinancials } from "./actions"

// Tipagem baseada no banco de dados
interface Ride {
  id: string
  created_at: string
  pickup_address: string
  destination_address: string
  total_distance: number
  expected_value: number
  is_closed: boolean
  actual_value: number
  tolls: number
  waiting_time: number
  parking: number
  other_expenses: number
}

// Classe CSS mágica para esconder as setinhas dos inputs tipo number
const hideArrows = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

export default function HistoryPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Busca as corridas ao carregar a página
  useEffect(() => {
    async function fetchRides() {
      const response = await getRideHistory()
      if (response.data) {
        setRides(response.data)
      } else {
        toast.error("Erro ao carregar histórico", { description: response.error })
      }
      setIsLoading(false)
    }
    fetchRides()
  }, [])

  const fmtCurrency = (val: number) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`
  const fmtDate = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const handleCloseRide = async (e: React.FormEvent<HTMLFormElement>, rideId: string) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const response = await closeRideFinancials(rideId, formData)
    
    setIsSubmitting(false)

    if (response.error) {
      toast.error("Erro ao fechar corrida", { description: response.error })
    } else {
      toast.success("Corrida Fechada!", { description: "Valores atualizados no seu caixa." })
      setRides(rides.map(r => {
        if (r.id === rideId) {
          return {
            ...r,
            is_closed: true,
            actual_value: parseFloat(formData.get('actual_value') as string) || 0,
            tolls: parseFloat(formData.get('tolls') as string) || 0,
            waiting_time: parseFloat(formData.get('waiting_time') as string) || 0,
            parking: parseFloat(formData.get('parking') as string) || 0,
            other_expenses: parseFloat(formData.get('other_expenses') as string) || 0,
          }
        }
        return r
      }))
      setExpandedId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 pb-24 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Histórico de Corridas</h1>
            <p className="text-sm text-zinc-500">Gerencie seus recebimentos e reembolsos.</p>
          </div>
          <Receipt className="w-8 h-8 text-zinc-300" />
        </div>

        {rides.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-white rounded-xl border border-dashed border-zinc-300">
            Nenhuma corrida registrada ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <Card key={ride.id} className={`overflow-hidden transition-all shadow-sm ${ride.is_closed ? 'border-emerald-200' : 'border-zinc-200'}`}>
                {/* CABEÇALHO DO CARD */}
                <CardHeader className={`pb-3 ${ride.is_closed ? 'bg-emerald-50/50' : 'bg-zinc-50'}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {fmtDate(ride.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-zinc-800 line-clamp-1">{ride.pickup_address.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-zinc-800 line-clamp-1">{ride.destination_address.split(',')[0]}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {ride.is_closed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Recebida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      )}
                      <p className="mt-2 text-lg font-bold text-zinc-900">
                        {fmtCurrency(ride.is_closed ? (ride.actual_value + ride.tolls + ride.waiting_time + ride.parking + ride.other_expenses) : ride.expected_value)}
                      </p>
                      <p className="text-xs text-zinc-500">{ride.total_distance.toFixed(1)} km</p>
                    </div>
                  </div>
                </CardHeader>

                {/* BOTÃO DE EXPANDIR (Apenas para corridas pendentes) */}
                {!ride.is_closed && (
                  <div 
                    className="bg-white border-t border-zinc-100 p-3 text-center cursor-pointer hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-blue-600"
                    onClick={() => setExpandedId(expandedId === ride.id ? null : ride.id)}
                  >
                    {expandedId === ride.id ? (
                      <><ChevronUp className="w-4 h-4" /> Fechar Painel</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Informar Recebimento</>
                    )}
                  </div>
                )}

                {/* PAINEL DE FECHAMENTO (EXPANSÍVEL) - COM VISUAL PREMIUM */}
                {expandedId === ride.id && !ride.is_closed && (
                  <CardContent className="bg-white pt-4 pb-5 border-t border-zinc-100">
                    <form onSubmit={(e) => handleCloseRide(e, ride.id)} className="space-y-5">
                      
                      {/* Valor Principal Pago */}
                      <div className="space-y-2">
                        <Label className="text-emerald-700 font-semibold text-sm">Valor da Corrida Pago pela Empresa</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 font-semibold">R$</span>
                          <Input 
                            name="actual_value" 
                            type="number" 
                            step="0.01" 
                            defaultValue={Number(ride.expected_value).toFixed(2)} 
                            required 
                            className={`pl-9 font-semibold text-lg bg-emerald-50/50 border-emerald-200 focus-visible:ring-emerald-500 shadow-sm ${hideArrows}`}
                          />
                        </div>
                      </div>

                      {/* Grade de Extras/Reembolsos */}
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-600">Pedágios</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                            <Input name="tolls" type="number" step="0.01" placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-600">Hora Parada (HP)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                            <Input name="waiting_time" type="number" step="0.01" placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-600">Estacionamento</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                            <Input name="parking" type="number" step="0.01" placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-zinc-600">Outros</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                            <Input name="other_expenses" type="number" step="0.01" placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold text-sm tracking-wide mt-2" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                        Confirmar Fechamento
                      </Button>
                    </form>
                  </CardContent>
                )}

                {/* EXIBIÇÃO DE DETALHES (Se a corrida já estiver fechada) */}
                {ride.is_closed && (
                  <CardContent className="bg-emerald-50/40 pt-4 pb-4 border-t border-emerald-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex flex-col"><span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 mb-0.5">Corrida</span><span className="font-bold text-zinc-800">{fmtCurrency(ride.actual_value)}</span></div>
                      <div className="flex flex-col"><span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 mb-0.5">Pedágios</span><span className="font-bold text-zinc-800">{fmtCurrency(ride.tolls)}</span></div>
                      <div className="flex flex-col"><span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 mb-0.5">Hora Parada</span><span className="font-bold text-zinc-800">{fmtCurrency(ride.waiting_time)}</span></div>
                      <div className="flex flex-col"><span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 mb-0.5">Estac / Outros</span><span className="font-bold text-zinc-800">{fmtCurrency(ride.parking + ride.other_expenses)}</span></div>
                    </div>
                  </CardContent>
                )}

              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}