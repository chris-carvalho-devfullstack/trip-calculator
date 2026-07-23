"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Car, DollarSign, LocateFixed, Loader2, CheckCircle2, XCircle, Clock, Wallet, Flame, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { getAccurateAddress } from "@/app/settings/actions"
import { calculateRideAction, acceptRideAction, RideCalculation } from "@/app/actions"
import { RouteMap } from "@/components/route-map"

interface SimulatorSettings {
  base_address?: string | null;
  price_per_km?: number | null;
  google_maps_key?: string | null;
}

export function SimulatorForm({ initialSettings }: { initialSettings: SimulatorSettings | null }) {
  // Estados do Formulário
  const [originType, setOriginType] = useState("base")
  const [customAddress, setCustomAddress] = useState("")
  const [pickupAddress, setPickupAddress] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")
  const [pricePerKm, setPricePerKm] = useState<number>(initialSettings?.price_per_km ?? 2.50)
  
  // Estados de Controle
  const [isLocating, setIsLocating] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<RideCalculation | null>(null)

  // Botão de GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocalização não suportada.")
    setIsLocating(true)
    
    let bestPosition: GeolocationPosition | null = null;
    let isDone = false;
    const timers: { watch?: number; timeout?: ReturnType<typeof setTimeout> } = {};

    const finalizeLocation = async (position: GeolocationPosition | null) => {
      if (isDone) return;
      isDone = true;
      if (timers.timeout) clearTimeout(timers.timeout);
      if (timers.watch !== undefined) navigator.geolocation.clearWatch(timers.watch);

      if (!position) {
        toast.error("Sinal Fraco", { description: "Não foi possível obter a localização exata." });
        setIsLocating(false);
        return;
      }

      try {
        const res = await getAccurateAddress(position.coords.latitude, position.coords.longitude);
        if (res.address) {
          setCustomAddress(res.address);
          toast.success("Localização Encontrada", { description: `Precisão do GPS: ~${Math.round(position.coords.accuracy)} metros.` });
        }
      } finally {
        setIsLocating(false);
      }
    };

    timers.watch = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) bestPosition = position;
        if (bestPosition.coords.accuracy <= 20) finalizeLocation(bestPosition);
      },
      () => { if (!bestPosition) finalizeLocation(null); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    timers.timeout = setTimeout(() => finalizeLocation(bestPosition), 5000);
  }

  // Botão: CALCULAR SIMULAÇÃO
  const handleCalculate = async () => {
    const origin = originType === "base" ? initialSettings?.base_address : customAddress
    if (!origin || !pickupAddress || !destinationAddress) {
      return toast.warning("Campos incompletos", { description: "Preencha origem, embarque e destino." })
    }
    setIsCalculating(true)
    const response = await calculateRideAction(origin, pickupAddress, destinationAddress, pricePerKm)
    setIsCalculating(false)

    if (response.error) toast.error("Erro no Cálculo", { description: response.error })
    else if (response.data) setResult(response.data)
  }

  // Botão: ACEITAR CORRIDA
  const handleAcceptRide = async () => {
    if (!result) return
    setIsSaving(true)
    const response = await acceptRideAction(result, originType)
    setIsSaving(false)

    if (response.error) {
      toast.error("Erro ao salvar", { description: response.error })
    } else {
      toast.success("Corrida Aceita!", { description: "Registrada no seu histórico." })
      setPickupAddress("")
      setDestinationAddress("")
      setResult(null) 
    }
  }

  const fmtCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`

  // --- RENDERIZAÇÃO DA TELA DE RESULTADO ---
  if (result) {
    return (
      <main className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center pb-24">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2 py-4">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Resultado da Simulação</h1>
            <p className="text-sm text-zinc-500">Relatório financeiro e logístico da rota.</p>
          </div>

          <Card className="border-zinc-200 shadow-lg overflow-hidden">
            {/* 1. RESUMO DA ROTA (TOPO) */}
            <CardHeader className="bg-zinc-100/50 border-b border-zinc-100 pb-4">
              <div className="flex justify-between items-center text-sm font-medium text-zinc-800 mb-3">
                <span className="flex items-center gap-1"><Navigation className="w-4 h-4 text-zinc-500"/> Trechos</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-zinc-500"/> {result.durations.formattedText}</span>
              </div>
              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-800"/>Base ao Embarque</span>
                  <span>{result.distances.toPickup.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/>Viagem com Segurado</span>
                  <span>{result.distances.toDestination.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"/>Retorno à Base</span>
                  <span>{result.distances.returnToOrigin.toFixed(1)} km</span>
                </div>
              </div>
            </CardHeader>
            
            {/* 2. MAPA E LEGENDA (MEIO) */}
            <div className="px-5 py-4 border-b border-zinc-100 bg-white">
              <RouteMap 
                apiKey={initialSettings?.google_maps_key} 
                origin={result.addresses.origin} 
                pickup={result.addresses.pickup} 
                destination={result.addresses.destination}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5"><div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-white">A</div><span>Base</span></div>
                <div className="flex items-center gap-1.5"><div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white">E</div><span>Embarque</span></div>
                <div className="flex items-center gap-1.5"><div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white">D</div><span>Destino</span></div>
              </div>
            </div>

            {/* 3. RELATÓRIO FINANCEIRO (EMBAIXO) */}
            <CardContent className="p-0 bg-white">
              <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 text-center">
                <div className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total KM</p>
                  <p className="text-lg font-bold text-zinc-800">{result.distances.total.toFixed(1)} <span className="text-sm font-normal text-zinc-500">km</span></p>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Combustível</p>
                  <p className="text-lg font-bold text-red-500 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4"/> {result.financials.fuelCost > 0 ? fmtCurrency(result.financials.fuelCost) : "--"}
                  </p>
                </div>
                
                <div className="p-4 space-y-1 bg-zinc-50/50">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bruto / Hora</p>
                  <p className="text-lg font-bold text-zinc-700">{fmtCurrency(result.financials.grossPerHour)}</p>
                </div>
                <div className="p-4 space-y-1 bg-zinc-50/50">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Líquido / Hora</p>
                  <p className="text-lg font-bold text-emerald-600 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4"/> {fmtCurrency(result.financials.netPerHour)}
                  </p>
                </div>
              </div>

              {/* GRANDE TOTAL LÍQUIDO */}
              <div className="p-6 bg-emerald-50 border-t border-emerald-100 flex flex-col items-center justify-center">
                <span className="text-emerald-700 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Wallet className="w-4 h-4"/> Lucro Líquido Previsto
                </span>
                <span className="text-5xl font-black text-emerald-600 tracking-tight">
                  {fmtCurrency(result.financials.netValue)}
                </span>
                <span className="text-xs text-emerald-600/70 mt-2 font-medium">
                  (Bruto cobrado: {fmtCurrency(result.financials.grossValue)})
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex gap-3 bg-white p-5 border-t border-zinc-100">
              <Button variant="outline" className="flex-1 h-12 text-zinc-600 hover:text-zinc-900 border-zinc-200" onClick={() => setResult(null)} disabled={isSaving}>
                <XCircle className="w-4 h-4 mr-2" /> Recalcular
              </Button>
              <Button className="flex-[2] h-12 bg-zinc-900 hover:bg-zinc-800 text-white shadow-md text-md" onClick={handleAcceptRide} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                Aceitar Corrida
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  // --- RENDERIZAÇÃO DO FORMULÁRIO INICIAL ---
  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center pb-24">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Nova Simulação</h1>
          <p className="text-sm text-zinc-500">Calcule rotas, custos e lucros de forma inteligente.</p>
        </div>

        <Card className="border-zinc-200 shadow-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-zinc-800">
                <Navigation className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold">Ponto de Partida</h2>
              </div>
              <RadioGroup defaultValue="base" value={originType} onValueChange={setOriginType} className="flex flex-col space-y-2">
                <div className="flex flex-col space-y-1 bg-zinc-100/50 p-3 rounded-lg border border-zinc-200 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="base" id="base" />
                    <Label htmlFor="base" className="cursor-pointer font-medium">Minha base cadastrada</Label>
                  </div>
                  <span className="text-xs text-zinc-500 pl-6">{initialSettings?.base_address || "Não configurado"}</span>
                </div>
                <div className="flex items-center space-x-2 bg-zinc-100/50 p-3 rounded-lg border border-zinc-200 cursor-pointer">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer flex-1 font-medium">Estou em outro local</Label>
                </div>
              </RadioGroup>
              {originType === "other" && (
                <div className="pl-2 border-l-2 border-blue-200 ml-2 mt-2 space-y-3 animate-in slide-in-from-top-2">
                  <Button variant="outline" className="w-full flex items-center gap-2" onClick={handleGetLocation} disabled={isLocating}>
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <LocateFixed className="w-4 h-4 text-blue-600" />}
                    {isLocating ? "Buscando localização..." : "Usar localização atual"}
                  </Button>
                  <div className="space-y-2">
                    <Input id="custom-origin" placeholder="Ou digite o endereço..." value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />Embarque do segurado
                </Label>
                <Input id="pickup" placeholder="Ex: Rua A, 100, Centro" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-orange-500" />Destino final
                </Label>
                <Input id="destination" placeholder="Ex: Hospital Municipal" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-zinc-600" />Valor cobrado por KM (R$)
              </Label>
              <Input id="price" type="number" step="0.10" value={pricePerKm} onChange={(e) => setPricePerKm(parseFloat(e.target.value))} className="bg-zinc-50 font-medium text-lg"/>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-14 text-lg font-bold shadow-md bg-zinc-900 text-white hover:bg-zinc-800 tracking-wide" onClick={handleCalculate} disabled={isCalculating}>
          {isCalculating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {isCalculating ? "GERANDO RELATÓRIO..." : "CALCULAR VIAGEM"}
        </Button>
      </div>
    </main>
  )
}