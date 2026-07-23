"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, CheckCircle2, Clock, Navigation, DollarSign, Receipt, ChevronDown, ChevronUp, Loader2, Trash2, Edit2, AlertCircle, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { getRideHistory, closeRideFinancials, deleteRideRecord } from "./actions"

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

const hideArrows = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

type ViewMode = 'day' | 'week' | 'month'

export default function HistoryPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Controles de estado da nova UI Premium (Navegação Temporal)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Controles de estado da UI original dos Cards
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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
  
  const fmtDate = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo' 
  })

  // =========================================================================
  // LÓGICA TEMPORAL PREMIUM (Navegação Uber / 99)
  // =========================================================================
  
  // Troca de aba reseta a data para hoje
  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setCurrentDate(new Date())
  }

  // Navegar para trás no tempo
  const handlePrev = () => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      if (viewMode === 'day') next.setDate(next.getDate() - 1)
      if (viewMode === 'week') next.setDate(next.getDate() - 7)
      if (viewMode === 'month') next.setMonth(next.getMonth() - 1)
      return next
    })
  }

  // Navegar para frente no tempo
  const handleNext = () => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      if (viewMode === 'day') next.setDate(next.getDate() + 1)
      if (viewMode === 'week') next.setDate(next.getDate() + 7)
      if (viewMode === 'month') next.setMonth(next.getMonth() + 1)
      return next
    })
  }

  // Define as fronteiras (início e fim) do período selecionado
  const getPeriodBoundaries = (date: Date, mode: ViewMode) => {
    const start = new Date(date)
    const end = new Date(date)
    
    if (mode === 'day') {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    } else if (mode === 'week') {
      const day = start.getDay()
      start.setDate(start.getDate() - day)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    }
    return { start, end }
  }

  // Gera o texto bonito para o cabeçalho ("Hoje", "12 - 18 Jul", "Julho 2026")
  const getPeriodLabel = () => {
    if (viewMode === 'day') {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (currentDate.toDateString() === today.toDateString()) return "Hoje"
      if (currentDate.toDateString() === yesterday.toDateString()) return "Ontem"
      return currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
    }
    if (viewMode === 'week') {
      const { start, end } = getPeriodBoundaries(currentDate, 'week')
      const startDay = start.toLocaleDateString('pt-BR', { day: '2-digit' })
      const startMonth = start.toLocaleDateString('pt-BR', { month: 'short' })
      const endDay = end.toLocaleDateString('pt-BR', { day: '2-digit' })
      const endMonth = end.toLocaleDateString('pt-BR', { month: 'short' })
      
      if (startMonth === endMonth) return `${startDay} - ${endDay} de ${startMonth}`
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
    }
    if (viewMode === 'month') {
      const str = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return str.charAt(0).toUpperCase() + str.slice(1)
    }
  }

  // Aplica o filtro de data e agrupa por dia em uma lista perfeitamente ordenada
  const groupedRides = useMemo(() => {
    const { start, end } = getPeriodBoundaries(currentDate, viewMode)
    
    const filtered = rides.filter(ride => {
      const d = new Date(ride.created_at)
      return d >= start && d <= end
    })

    const groups: { title: string, dateStr: string, items: Ride[] }[] = []
    
    filtered.forEach(ride => {
      const d = new Date(ride.created_at)
      const dateKey = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      const titleStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })
      const capitalizedTitle = titleStr.charAt(0).toUpperCase() + titleStr.slice(1)

      let existingGroup = groups.find(g => g.dateStr === dateKey)
      if (!existingGroup) {
        existingGroup = { title: capitalizedTitle, dateStr: dateKey, items: [] }
        groups.push(existingGroup)
      }
      existingGroup.items.push(ride)
    })

    return groups
  }, [rides, viewMode, currentDate])

  // Calcula os totais apenas das corridas visíveis (do período selecionado)
  const totals = useMemo(() => {
    let amount = 0
    let count = 0
    groupedRides.forEach(group => {
      group.items.forEach(ride => {
        amount += ride.is_closed ? (ride.actual_value + ride.tolls + ride.waiting_time + ride.parking + ride.other_expenses) : ride.expected_value
        count++
      })
    })
    return { amount, count }
  }, [groupedRides])

  // =========================================================================

  const handleCloseRide = async (e: React.FormEvent<HTMLFormElement>, rideId: string) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const formData = new FormData(e.currentTarget)
    const response = await closeRideFinancials(rideId, formData)
    
    setIsSubmitting(false)

    if (response.error) {
      toast.error("Falha de segurança", { description: response.error })
    } else {
      toast.success(editingId ? "Corrida Atualizada!" : "Corrida Fechada!", { 
        description: "Valores sincronizados com o banco de dados." 
      })
      
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
      setEditingId(null)
    }
  }

  const handleDelete = async (rideId: string) => {
    setIsSubmitting(true)
    const response = await deleteRideRecord(rideId)
    setIsSubmitting(false)

    if (response.error) {
      toast.error("Acesso Negado", { description: response.error })
    } else {
      toast.success("Registro Excluído", { description: "A corrida foi permanentemente apagada do seu histórico." })
      setRides(rides.filter(r => r.id !== rideId))
    }
    setConfirmDeleteId(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-24 flex justify-center md:p-8">
      <div className="w-full max-w-2xl">
        
        {/* =========================================================================
            CABEÇALHO PREMIUM COM NAVEGAÇÃO DE PERÍODO (Estilo Uber)
            ========================================================================= */}
        <div className="bg-white px-5 pt-8 pb-8 md:rounded-b-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border-b border-zinc-100 sticky top-0 z-20">
          
          {/* TABS DE MODO DE VISÃO */}
          <div className="flex p-1 bg-zinc-100/80 rounded-xl mb-6">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${
                  viewMode === mode 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {mode === 'day' ? 'Diário' : mode === 'week' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>

          {/* NAVEGADOR DO PERÍODO */}
          <div className="flex items-center justify-between mb-8 px-2">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-900 rounded-full transition-colors border border-zinc-100">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-base font-bold text-zinc-800 tracking-tight">
              {getPeriodLabel()}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-900 rounded-full transition-colors border border-zinc-100">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* TOTALIZADORES DO PERÍODO SELECIONADO */}
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">Total no Período</h1>
            <h2 className="text-[40px] leading-none font-black text-zinc-900 tracking-tighter">
              {fmtCurrency(totals.amount)}
            </h2>
            <div className="mt-3 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              {totals.count} corridas
            </div>
          </div>
        </div>

        {/* =========================================================================
            LISTAGEM AGRUPADA COM OS SEUS CARDS INTACTOS
            ========================================================================= */}
        <div className="px-4 md:px-0 mt-6 space-y-6">
          {groupedRides.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 font-medium bg-white rounded-2xl border border-dashed border-zinc-200">
              Nenhum ganho registrado neste período.
            </div>
          ) : (
            groupedRides.map((group) => (
              <div key={group.dateStr} className="relative">
                
                {/* Título Fixo do Dia (Aparece ao rolar em visão semanal/mensal) */}
                <div className="sticky top-[310px] z-10 bg-zinc-50/95 backdrop-blur-md py-2.5 mb-2 -mx-2 px-2">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{group.title}</h3>
                </div>

                <div className="space-y-4">
                  {group.items.map((ride) => (
                    
                    /* =========================================================================
                       INÍCIO DO SEU CÓDIGO ORIGINAL DO CARD (NÃO ALTERADO)
                       ========================================================================= */
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
                          
                          <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-2">
                              {ride.is_closed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" /> Recebida
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                  <Clock className="w-3 h-3" /> Pendente
                                </span>
                              )}
                              
                              {/* AÇÕES CRUD: Editar e Deletar */}
                              <div className="flex items-center border-l pl-2 ml-1">
                                {ride.is_closed && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => {
                                      setEditingId(editingId === ride.id ? null : ride.id)
                                      setExpandedId(null)
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setConfirmDeleteId(confirmDeleteId === ride.id ? null : ride.id)
                                    setEditingId(null)
                                    setExpandedId(null)
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <p className="mt-2 text-lg font-bold text-zinc-900">
                              {fmtCurrency(ride.is_closed ? (ride.actual_value + ride.tolls + ride.waiting_time + ride.parking + ride.other_expenses) : ride.expected_value)}
                            </p>
                            <p className="text-xs text-zinc-500">{ride.total_distance.toFixed(1)} km</p>
                          </div>
                        </div>
                      </CardHeader>

                      {/* PAINEL DE SEGURANÇA: Confirmação de Exclusão */}
                      {confirmDeleteId === ride.id && (
                        <div className="bg-red-50 border-t border-red-100 p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                          <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Apagar este registro?
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-8 hover:bg-red-100 text-red-700" onClick={() => setConfirmDeleteId(null)}>
                              Cancelar
                            </Button>
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => handleDelete(ride.id)} disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, apagar"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* BOTÃO DE EXPANDIR (Apenas para corridas pendentes) */}
                      {!ride.is_closed && !confirmDeleteId && (
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

                      {/* PAINEL DE FECHAMENTO / EDIÇÃO (EXPANSÍVEL) */}
                      {(expandedId === ride.id || editingId === ride.id) && !confirmDeleteId && (
                        <CardContent className="bg-white pt-4 pb-5 border-t border-zinc-100 animate-in fade-in slide-in-from-top-2">
                          <form onSubmit={(e) => handleCloseRide(e, ride.id)} className="space-y-5">
                            
                            <div className="space-y-2">
                              <Label className="text-emerald-700 font-semibold text-sm">Valor da Corrida Pago pela Empresa</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 font-semibold">R$</span>
                                <Input 
                                  name="actual_value" 
                                  type="number" 
                                  step="0.01" 
                                  defaultValue={editingId === ride.id ? ride.actual_value.toFixed(2) : Number(ride.expected_value).toFixed(2)} 
                                  required 
                                  className={`pl-9 font-semibold text-lg bg-emerald-50/50 border-emerald-200 focus-visible:ring-emerald-500 shadow-sm ${hideArrows}`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-600">Pedágios</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                                  <Input name="tolls" type="number" step="0.01" defaultValue={editingId === ride.id ? ride.tolls.toFixed(2) : ""} placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-600">Hora Parada (HP)</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                                  <Input name="waiting_time" type="number" step="0.01" defaultValue={editingId === ride.id ? ride.waiting_time.toFixed(2) : ""} placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-600">Estacionamento</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                                  <Input name="parking" type="number" step="0.01" defaultValue={editingId === ride.id ? ride.parking.toFixed(2) : ""} placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-zinc-600">Outros</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                                  <Input name="other_expenses" type="number" step="0.01" defaultValue={editingId === ride.id ? ride.other_expenses.toFixed(2) : ""} placeholder="0.00" className={`pl-8 bg-zinc-50/50 text-sm border-zinc-200 ${hideArrows}`} />
                                </div>
                              </div>
                            </div>

                            <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold text-sm tracking-wide mt-2" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                              {editingId === ride.id ? "Atualizar Valores" : "Confirmar Fechamento"}
                            </Button>
                          </form>
                        </CardContent>
                      )}

                      {/* EXIBIÇÃO DE DETALHES (Se a corrida já estiver fechada e não estiver em edição) */}
                      {ride.is_closed && editingId !== ride.id && !confirmDeleteId && (
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
                    /* =========================================================================
                       FIM DO SEU CÓDIGO ORIGINAL
                       ========================================================================= */
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}