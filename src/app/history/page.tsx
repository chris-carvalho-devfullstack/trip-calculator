"use client"

import { useEffect, useState, useMemo } from "react"
import Image from "next/image"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  MapPin, Calendar, CheckCircle2, Clock, Navigation, DollarSign, 
  Receipt, Loader2, Trash2, Edit2, AlertCircle, TrendingUp, 
  ChevronLeft, ChevronRight, Map, FileText, Flame
} from "lucide-react"
import { toast } from "sonner"
import { getRideHistory, closeRideFinancials, deleteRideRecord } from "./actions"
import { RouteMap } from "@/components/route-map"

interface Ride {
  id: string
  created_at: string
  pickup_address: string
  destination_address: string
  total_distance: number
  expected_value: number
  is_closed: boolean
  actual_value: number
  tolls_amount: number
  waiting_time: number
  parking: number
  other_expenses: number
  map_image_url: string | null
  route_data: Record<string, unknown> | null 
  odometer: number | null
  company_km: number | null
  expected_hp: string | null
  validated_hp: string | null
  service_order: string | null
  full_address_origin: string | null
  full_address_destination: string | null
  
  estimated_time?: string
  distance_to_pickup?: number
  distance_pickup_to_dest?: number 
  distance_return?: number
  fuel_cost_estimated?: number
  gross_per_hour?: number
  net_per_hour?: number
  estimated_net_profit?: number
}

const hideArrows = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
const customScrollbar = "overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300/50 active:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-thumb]:rounded-full transition-all"

type ViewMode = 'day' | 'week' | 'month'

export default function HistoryPage() {
  const [rides, setRides] = useState<Ride[]>([])
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Estados locais para controlar os cálculos automáticos do formulário
  const [formTolls, setFormTolls] = useState<string>("")
  const [formActualValue, setFormActualValue] = useState<string>("")

  useEffect(() => {
    async function fetchRides() {
      const response = await getRideHistory()
      if (response.data) {
        setRides(response.data)
        if (response.apiKey) setApiKey(response.apiKey)
      } else {
        toast.error("Erro ao carregar histórico", { description: response.error })
      }
      setIsLoading(false)
    }
    fetchRides()
  }, [])

  const selectedRide = useMemo(() => rides.find(r => r.id === expandedId), [rides, expandedId])

  // Sincroniza os valores iniciais do formulário ao abrir o modal ou entrar em edição
  useEffect(() => {
    if (selectedRide) {
      if (editingId === selectedRide.id) {
        setFormTolls(selectedRide.tolls_amount ? selectedRide.tolls_amount.toString() : "")
        setFormActualValue(selectedRide.actual_value ? selectedRide.actual_value.toFixed(2) : selectedRide.expected_value.toFixed(2))
      } else {
        setFormTolls(selectedRide.tolls_amount ? selectedRide.tolls_amount.toString() : "")
        setFormActualValue(selectedRide.expected_value.toFixed(2))
      }
    }
  }, [selectedRide, editingId])

  // Calcula automaticamente o Valor Pago ao alterar os Pedágios
  const handleTollsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setFormTolls(val)
    const tollsNum = parseFloat(val) || 0
    if (selectedRide) {
      // O valor recebido será o valor simulado da corrida + o pedágio informado
      const newValue = selectedRide.expected_value + tollsNum
      setFormActualValue(newValue.toFixed(2))
    }
  }

  const fmtCurrency = (val: number) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`
  
  const fmtDate = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' 
  })

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setCurrentDate(new Date())
  }

  const handlePrev = () => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      if (viewMode === 'day') next.setDate(next.getDate() - 1)
      if (viewMode === 'week') next.setDate(next.getDate() - 7)
      if (viewMode === 'month') next.setMonth(next.getMonth() - 1)
      return next
    })
  }

  const handleNext = () => {
    setCurrentDate(prev => {
      const next = new Date(prev)
      if (viewMode === 'day') next.setDate(next.getDate() + 1)
      if (viewMode === 'week') next.setDate(next.getDate() + 7)
      if (viewMode === 'month') next.setMonth(next.getMonth() + 1)
      return next
    })
  }

  const getPeriodBoundaries = (date: Date, mode: ViewMode) => {
    const start = new Date(date)
    const end = new Date(date)
    if (mode === 'day') {
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)
    } else if (mode === 'week') {
      const day = start.getDay(); start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    } else {
      start.setDate(1); start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999)
    }
    return { start, end }
  }

  const getPeriodLabel = () => {
    if (viewMode === 'day') {
      const today = new Date(); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
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

  const totals = useMemo(() => {
    let amount = 0; let count = 0
    groupedRides.forEach(group => {
      group.items.forEach(ride => {
        amount += ride.is_closed ? (ride.actual_value + ride.tolls_amount + ride.waiting_time + ride.parking + ride.other_expenses) : ride.expected_value
        count++
      })
    })
    return { amount, count }
  }, [groupedRides])

  const handleCloseRide = async (e: React.FormEvent<HTMLFormElement>, rideId: string) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const response = await closeRideFinancials(rideId, formData)
    setIsSubmitting(false)

    if (response.error) {
      toast.error("Falha ao salvar", { description: response.error })
    } else {
      toast.success(editingId ? "Corrida Atualizada!" : "Corrida Fechada!", { description: "Valores sincronizados com o sistema." })
      setRides(rides.map(r => {
        if (r.id === rideId) {
          return {
            ...r, is_closed: true,
            service_order: (formData.get('service_order') as string) || r.service_order,
            odometer: parseFloat(formData.get('odometer') as string) || r.odometer,
            company_km: parseFloat(formData.get('company_km') as string) || r.company_km,
            expected_hp: (formData.get('expected_hp') as string) || r.expected_hp,
            validated_hp: (formData.get('validated_hp') as string) || r.validated_hp,
            actual_value: parseFloat(formData.get('actual_value') as string) || 0,
            tolls_amount: parseFloat(formData.get('tolls_amount') as string) || 0,
          }
        }
        return r
      }))
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
      toast.success("Registro Excluído", { description: "Corrida apagada permanentemente do seu histórico." })
      setRides(rides.filter(r => r.id !== rideId))
    }
    setConfirmDeleteId(null); setExpandedId(null)
  }

  if (isLoading) return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>

  return (
    <main className={`h-screen bg-zinc-50 flex justify-center md:p-8 ${customScrollbar}`}>
      <div className="w-full max-w-2xl relative pb-24">
        
        {/* CABEÇALHO GERAL */}
        <div className="bg-white px-5 pt-8 pb-8 md:rounded-3xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 shrink-0 mb-6">
          <div className="flex p-1 bg-zinc-100/80 rounded-xl mb-6">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => handleModeChange(mode)} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${viewMode === mode ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {mode === 'day' ? 'Diário' : mode === 'week' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mb-8 px-2">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-900 rounded-full transition-colors border border-zinc-100"><ChevronLeft className="h-5 w-5" /></Button>
            <span className="text-base font-bold text-zinc-800 tracking-tight">{getPeriodLabel()}</span>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 text-zinc-600 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-900 rounded-full transition-colors border border-zinc-100"><ChevronRight className="h-5 w-5" /></Button>
          </div>
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">Total no Período</h1>
            <h2 className="text-[40px] leading-none font-black text-zinc-900 tracking-tighter">{fmtCurrency(totals.amount)}</h2>
            <div className="mt-3 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> {totals.count} corridas
            </div>
          </div>
        </div>

        {/* LISTAGEM DE CORRIDAS (CARDS) */}
        <div className="px-4 md:px-0 mt-2 space-y-6">
          {groupedRides.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 font-medium bg-white rounded-2xl border border-dashed border-zinc-200">Nenhum ganho registrado neste período.</div>
          ) : (
            groupedRides.map((group) => (
              <div key={group.dateStr} className="relative">
                <div className="bg-zinc-50 py-2.5 mb-2 -mx-2 px-2"><h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{group.title}</h3></div>
                <div className="space-y-4">
                  {group.items.map((ride) => (
                    <Card key={ride.id} onClick={() => { setExpandedId(ride.id); setEditingId(null); setConfirmDeleteId(null) }} className={`overflow-hidden transition-all shadow-sm cursor-pointer hover:shadow-md hover:border-zinc-300 ${ride.is_closed ? 'border-emerald-200' : 'border-zinc-200'}`}>
                      <CardHeader className={`pb-4 ${ride.is_closed ? 'bg-emerald-50/50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 pr-4">
                            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mb-2"><Calendar className="w-3 h-3" /> {fmtDate(ride.created_at)}</span>
                            <div className="flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-500 shrink-0" /><span className="text-sm font-medium text-zinc-800 line-clamp-1">{ride.pickup_address.split(',')[0]}</span></div>
                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500 shrink-0" /><span className="text-sm font-medium text-zinc-800 line-clamp-1">{ride.destination_address.split(',')[0]}</span></div>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0">
                            {ride.is_closed ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Recebida</span> : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Pendente</span>}
                            <p className="mt-3 text-lg font-bold text-zinc-900">{fmtCurrency(ride.is_closed ? (ride.actual_value + ride.tolls_amount + ride.waiting_time + ride.parking + ride.other_expenses) : ride.expected_value)}</p>
                            <p className="text-xs text-zinc-500">{ride.total_distance.toFixed(1)} km</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =======================================================================
          MODAL FULL-SCREEN NATIVO DE DETALHES
          ======================================================================= */}
      {selectedRide && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 h-[100dvh] bg-zinc-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-8 md:p-8 md:bg-zinc-900/40 md:backdrop-blur-sm">
          <div className="flex-1 bg-zinc-50 w-full h-full md:max-w-2xl md:mx-auto md:rounded-3xl flex flex-col overflow-hidden md:shadow-2xl">
            
            <div className="bg-white px-4 py-4 border-b flex items-center justify-between shadow-sm shrink-0 z-20">
              <Button variant="ghost" size="icon" onClick={() => setExpandedId(null)} className="h-10 w-10 text-zinc-600 hover:bg-zinc-100 rounded-full"><ChevronLeft className="w-6 h-6" /></Button>
              <h2 className="font-bold text-lg text-zinc-800">OS {selectedRide.service_order ? `#${selectedRide.service_order}` : 'Detalhes da Corrida'}</h2>
              <div className="w-10" />
            </div>

            <div className={`flex-1 overflow-y-auto p-4 space-y-6 pb-32 ${customScrollbar}`}>
              
              {/* Alerta de Exclusão */}
              {confirmDeleteId === selectedRide.id && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-red-700 font-bold"><AlertCircle className="w-5 h-5" /> Tem certeza que deseja apagar?</div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1 bg-white text-zinc-700" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleDelete(selectedRide.id)} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apagar Definitivo"}</Button>
                  </div>
                </div>
              )}

              {/* Bloco de Resumo Superior (Opcional, com Mapa e Tempos Estimados) */}
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-zinc-100">
                  <div className="flex justify-between items-center text-zinc-500 mb-4">
                    <span className="flex items-center gap-1.5 font-bold text-[13px] uppercase tracking-wider text-zinc-600"><Navigation className="w-4 h-4"/> Trechos</span>
                    <span className="flex items-center gap-1.5 font-bold text-sm text-zinc-700"><Clock className="w-4 h-4"/> {selectedRide.estimated_time || '--'}</span>
                  </div>
                  
                  <div className="space-y-3 text-[14px] text-zinc-700">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-800 mr-3"/> Base ao Embarque</span> 
                      <span className="font-semibold">{selectedRide.distance_to_pickup != null ? selectedRide.distance_to_pickup.toFixed(1) : '--'} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-3"/> Viagem com Segurado</span> 
                      <span className="font-semibold">{selectedRide.distance_pickup_to_dest != null ? selectedRide.distance_pickup_to_dest.toFixed(1) : '--'} km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center font-medium"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 mr-3"/> Retorno à Base</span> 
                      <span className="font-semibold">{selectedRide.distance_return != null ? selectedRide.distance_return.toFixed(1) : '--'} km</span>
                    </div>
                  </div>
                </div>

                <div className="w-full relative bg-zinc-100 p-2 pb-0">
                  <div className="w-full h-56 bg-zinc-200 rounded-xl overflow-hidden pointer-events-none relative shadow-inner border border-zinc-200">
                    {(selectedRide.full_address_origin && selectedRide.pickup_address && selectedRide.destination_address && apiKey) ? (
                      <RouteMap 
                        /* @ts-expect-error */
                        apiKey={apiKey} origin={selectedRide.full_address_origin} pickup={selectedRide.pickup_address} destination={selectedRide.destination_address}
                      />
                    ) : selectedRide.map_image_url ? (
                      <Image src={selectedRide.map_image_url} alt="Rota capturada" fill className="object-cover bg-zinc-200" unoptimized />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400"><Map className="w-6 h-6 mb-2 opacity-50" /><span className="text-xs font-medium">Mapa não disponível</span></div>
                    )}
                  </div>
                  <div className="flex justify-center items-center gap-6 py-4 text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px]">A</div> Base</div>
                    <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px]">E</div> Embarque</div>
                    <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">D</div> Destino</div>
                  </div>
                </div>
              </div>

              {/* TIMELINE DE 4 PONTOS */}
              <div className="p-6 bg-white rounded-xl shadow-sm border border-zinc-200">
                <div className="relative">
                  <div className="absolute top-2 bottom-2 left-1.75 w-0.5 bg-zinc-200" />
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-4 flex justify-center pt-1 bg-white"><div className="w-3 h-3 rounded-full bg-zinc-800 ring-4 ring-white" /></div>
                      <div className="-mt-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 block mb-0.5 tracking-wider">1. Início (Base/Saída)</span>
                        <p className="text-sm font-medium text-zinc-800 leading-snug">{selectedRide.full_address_origin || "Endereço da Base"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-4 flex justify-center pt-1 bg-white"><div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" /></div>
                      <div className="-mt-1">
                        <span className="text-[10px] font-bold uppercase text-blue-600 block mb-0.5 tracking-wider">2. Local do Segurado</span>
                        <p className="text-sm font-medium text-zinc-800 leading-snug">{selectedRide.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-4 flex justify-center bg-white py-0.5"><MapPin className="w-4 h-4 text-orange-500 bg-white" /></div>
                      <div className="-mt-1">
                        <span className="text-[10px] font-bold uppercase text-orange-600 block mb-0.5 tracking-wider">3. Destino do Segurado</span>
                        <p className="text-sm font-medium text-zinc-800 leading-snug">{selectedRide.destination_address || selectedRide.full_address_destination}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="w-4 flex justify-center pt-1 bg-white"><div className="w-3 h-3 rounded-full border-[2.5px] border-emerald-500 bg-white ring-4 ring-white" /></div>
                      <div className="-mt-1">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-0.5 tracking-wider">4. Retorno (Base)</span>
                        <p className="text-sm font-medium text-zinc-800 leading-snug">{selectedRide.full_address_origin || "Endereço da Base / Retorno"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FORMULÁRIO DE FECHAMENTO (EDIÇÃO / PENDENTE) */}
              {(!selectedRide.is_closed || editingId === selectedRide.id) ? (
                <form 
                  key={`form-${selectedRide.id}-${editingId || 'new'}`} // O key força a recriação correta do form ao abrir
                  onSubmit={(e) => handleCloseRide(e, selectedRide.id)} 
                  className="space-y-5 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100">
                    <Receipt className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-zinc-800 text-lg">Informar Recebimento</h4>
                  </div>

                  {/* Mostra a base calculada fixa no topo do formulário */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Distância Simulada</span>
                      <span className="text-lg font-black text-blue-900">{selectedRide.total_distance.toFixed(1)} km</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-1">Valor Simulado</span>
                      <span className="text-lg font-black text-blue-900">{fmtCurrency(selectedRide.expected_value)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <Label className="text-xs font-bold text-zinc-600">Ordem de Serviço (OS)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input name="service_order" type="text" defaultValue={selectedRide.service_order || ""} placeholder="Ex: OS-12345" className="pl-9 bg-zinc-50 text-sm h-11" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-zinc-600">Odômetro (KM)</Label><Input name="odometer" type="number" step="0.1" defaultValue={selectedRide.odometer || ""} placeholder="Ex: 12500.5" className={`bg-zinc-50 text-sm h-11 ${hideArrows}`} /></div>
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-zinc-600">KM Empresa</Label><Input name="company_km" type="number" step="0.1" defaultValue={selectedRide.company_km || ""} placeholder="Ex: 15.5" className={`bg-zinc-50 text-sm h-11 ${hideArrows}`} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-zinc-600">HP Esperada</Label><Input name="expected_hp" type="text" defaultValue={selectedRide.expected_hp || ""} placeholder="Ex: 01:30" className="bg-zinc-50 text-sm h-11" /></div>
                    <div className="space-y-1.5"><Label className="text-xs font-bold text-zinc-600">HP Validada</Label><Input name="validated_hp" type="text" defaultValue={selectedRide.validated_hp || ""} placeholder="Ex: 01:45" className="bg-zinc-50 text-sm h-11" /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-600">Pedágios</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-medium">R$</span>
                        <Input 
                          name="tolls_amount" 
                          type="number" 
                          step="0.01" 
                          value={formTolls} 
                          onChange={handleTollsChange} 
                          placeholder="0.00" 
                          className={`pl-8 bg-zinc-50 text-sm h-11 ${hideArrows}`} 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-emerald-700">Valor Pago</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70 font-semibold">R$</span>
                        <Input 
                          name="actual_value" 
                          type="number" 
                          step="0.01" 
                          value={formActualValue} 
                          onChange={(e) => setFormActualValue(e.target.value)} 
                          required 
                          className={`pl-8 font-semibold bg-emerald-50 border-emerald-200 focus-visible:ring-emerald-500 h-11 ${hideArrows}`} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold text-base mt-4 rounded-xl" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <DollarSign className="w-5 h-5 mr-2" />} {editingId === selectedRide.id ? "Atualizar Valores" : "Salvar e Fechar Corrida"}
                  </Button>
                  {editingId === selectedRide.id && <Button type="button" variant="ghost" className="w-full h-10 mt-2 text-zinc-500" onClick={() => setEditingId(null)}>Cancelar Edição</Button>}
                </form>
              ) : (
                
                /* MODO VISUALIZAÇÃO (CORRIDA JÁ FECHADA) */
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-5 relative">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <h4 className="font-bold text-emerald-700 flex items-center gap-2 text-lg"><CheckCircle2 className="w-5 h-5" /> Resumo do Recebimento</h4>
                    <div className="flex gap-1">
                      {/* BOTOES EDITAR E EXCLUIR FUNCIONANDO PERFEITAMENTE AQUI */}
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-full" onClick={() => setEditingId(selectedRide.id)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => setConfirmDeleteId(selectedRide.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                    {selectedRide.service_order && <div className="col-span-2 border-b border-zinc-100 pb-4"><span className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">Ordem de Serviço (OS)</span><span className="font-medium text-zinc-900 text-base">{selectedRide.service_order}</span></div>}
                    <div><span className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">Odômetro / KM Empresa</span><span className="font-medium text-zinc-900 text-base">{selectedRide.odometer || '-'} / {selectedRide.company_km || '-'}</span></div>
                    <div><span className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">HP (Esp / Val)</span><span className="font-medium text-zinc-900 text-base">{selectedRide.expected_hp || '-'} / {selectedRide.validated_hp || '-'}</span></div>
                    <div><span className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">Pedágios</span><span className="font-medium text-zinc-900 text-base">{fmtCurrency(selectedRide.tolls_amount)}</span></div>
                    <div><span className="text-[11px] font-bold uppercase text-emerald-600 block mb-1">Valor Recebido</span><span className="font-bold text-emerald-700 text-xl">{fmtCurrency(selectedRide.actual_value)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}