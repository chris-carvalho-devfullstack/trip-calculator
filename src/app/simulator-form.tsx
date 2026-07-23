"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, Car, DollarSign, LocateFixed, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { getAccurateAddress } from "@/app/settings/actions"
import { calculateRideAction, acceptRideAction, RideCalculation } from "@/app/actions"
import { RouteMap } from "@/components/route-map" // <-- Importação do Mapa

interface SimulatorSettings {
  base_address?: string | null;
  price_per_km?: number | null;
  google_maps_key?: string | null; // <-- Chave adicionada na interface
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

  // Botão de GPS (Com Aquecimento de Alta Precisão e sem erros do ESLint)
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
        const { latitude, longitude } = position.coords;
        const res = await getAccurateAddress(latitude, longitude);
        
        if (res.address) {
          setCustomAddress(res.address);
          toast.success("Localização Encontrada", { 
            description: `Precisão do GPS: ~${Math.round(position.coords.accuracy)} metros.` 
          });
        } else if (res.error) {
          toast.error("Erro na Busca", { description: res.error });
        }
      } catch {
        toast.error("Erro Inesperado");
      } finally {
        setIsLocating(false);
      }
    };

    timers.watch = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        if (bestPosition.coords.accuracy <= 20) {
          finalizeLocation(bestPosition);
        }
      },
      () => {
        if (!bestPosition) finalizeLocation(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    timers.timeout = setTimeout(() => {
      finalizeLocation(bestPosition);
    }, 5000);
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

    if (response.error) {
      toast.error("Erro no Cálculo", { description: response.error })
    } else if (response.data) {
      setResult(response.data)
      toast.success("Cálculo Concluído!")
    }
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

  // --- RENDERIZAÇÃO DA TELA DE RESULTADO ---
  if (result) {
    return (
      <main className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2 py-4">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Resultado da Simulação</h1>
            <p className="text-sm text-zinc-500">Confira as distâncias e o ganho previsto.</p>
          </div>

          <Card className="border-zinc-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-100/50 border-b border-zinc-100 pb-4">
              <div className="flex items-center justify-between text-sm text-zinc-600 mb-2">
                <span className="font-medium flex items-center gap-1"><Navigation className="w-4 h-4"/> Origem</span>
                <span className="truncate max-w-[200px]">{originType === 'base' ? 'Minha Base' : 'Outro Local'}</span>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">→ Até o Embarque</span>
                  <span className="font-medium">{result.distances.toPickup.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">→ Até o Destino</span>
                  <span className="font-medium">{result.distances.toDestination.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">→ Retorno à Origem</span>
                  <span className="font-medium">{result.distances.returnToOrigin.toFixed(1)} km</span>
                </div>
              </div>
            </CardHeader>
            
            {/* COMPONENTE DO MAPA INSERIDO AQUI */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-white">
              <RouteMap 
                apiKey={initialSettings?.google_maps_key} 
                origin={result.addresses.origin}
                pickup={result.addresses.pickup}
                destination={result.addresses.destination}
              />
            </div>

            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-zinc-700">TOTAL PERCORRIDO:</span>
                <span className="text-lg font-bold text-zinc-900">{result.distances.total.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-6 pb-6 border-b border-zinc-100">
                <span className="text-zinc-500">Valor por KM</span>
                <span className="font-medium">R$ {result.pricePerKm.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 text-sm font-semibold uppercase tracking-wider mb-1">Ganho Previsto</span>
                <span className="text-4xl font-bold text-emerald-600">
                  R$ {result.expectedValue.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 bg-zinc-50/50 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setResult(null)}
                disabled={isSaving}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Fechar
              </Button>
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleAcceptRide}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aceitar Corrida
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    )
  }

  // --- RENDERIZAÇÃO DO FORMULÁRIO ---
  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2 py-4">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Nova Simulação</h1>
          <p className="text-sm text-zinc-500">Calcule a rota e o ganho previsto da sua corrida.</p>
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
                  <span className="text-xs text-zinc-500 pl-6">
                    {initialSettings?.base_address || "Nenhum endereço base configurado"}
                  </span>
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
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-500">Ou</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-origin">Informar endereço de partida</Label>
                    <Input id="custom-origin" placeholder="Rua, Número, Cidade" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Embarque do segurado
                </Label>
                <Input id="pickup" placeholder="Ex: Rua A, 100, Centro" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-orange-500" />
                  Destino final
                </Label>
                <Input id="destination" placeholder="Ex: Hospital Municipal" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-100">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-zinc-600" />
                Valor por KM (R$)
              </Label>
              <Input 
                id="price" 
                type="number" 
                step="0.10"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(parseFloat(e.target.value))}
                className="bg-zinc-50 font-medium text-lg"
              />
              <p className="text-xs text-zinc-500">Você pode ajustar este valor para uma corrida específica.</p>
            </div>

          </CardContent>
        </Card>

        <Button 
          className="w-full h-12 text-lg font-medium shadow-md" 
          size="lg"
          onClick={handleCalculate}
          disabled={isCalculating}
        >
          {isCalculating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {isCalculating ? "CALCULANDO..." : "CALCULAR SIMULAÇÃO"}
        </Button>

      </div>
    </main>
  )
}