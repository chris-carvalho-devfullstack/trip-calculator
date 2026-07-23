"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MapPin, DollarSign, Key, LocateFixed, Loader2 } from "lucide-react"
import { saveSettings, getAccurateAddress } from "./actions"
import { toast } from "sonner" // <-- Importação do Sonner (muito mais simples)

export interface SettingsData {
  base_address?: string | null;
  price_per_km?: number | null;
  google_maps_key?: string | null;
}

interface SettingsFormProps {
  initialSettings: SettingsData | null;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [address, setAddress] = useState(initialSettings?.base_address || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Erro de Suporte", {
        description: "Geolocalização não suportada pelo seu navegador."
      })
      return
    }

    setIsLoading(true)
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const result = await getAccurateAddress(latitude, longitude)
          
          if (result.address) {
            setAddress(result.address)
            
            if (result.fallback) {
              toast.warning("Aviso de Precisão", {
                description: "Endereço gerado sem a chave do Google Maps. Pode estar impreciso."
              })
            } else {
              toast.success("Localização Encontrada", {
                description: "Endereço atualizado com base no seu GPS."
              })
            }
          } else if (result.error) {
            toast.error("Erro na Busca", {
              description: result.error
            })
          }
        } catch (error) {
          toast.error("Erro Inesperado", {
            description: "Ocorreu um erro ao buscar seu endereço."
          })
        } finally {
          setIsLoading(false)
        }
      },
      (error) => {
        console.error(error)
        toast.error("Acesso Negado", {
          description: "Permita o acesso à localização ou ative o GPS do aparelho."
        })
        setIsLoading(false)
      },
      options
    )
  }

  return (
    <form action={saveSettings} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="base_address" className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Endereço Base Principal
        </Label>
        <div className="flex gap-2">
          <Input 
            id="base_address" 
            name="base_address" 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ex: Rua das Flores, 123, São Paulo - SP" 
            required 
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="secondary" 
            size="icon" 
            onClick={handleGetLocation}
            disabled={isLoading}
            title="Usar minha localização atual"
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <LocateFixed className="w-4 h-4 text-blue-600" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price_per_km" className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Valor por KM (R$)
        </Label>
        <Input 
          id="price_per_km" 
          name="price_per_km" 
          type="number" 
          step="0.01"
          placeholder="2.50" 
          defaultValue={initialSettings?.price_per_km ?? 2.50}
          required 
        />
      </div>

      <div className="space-y-2 pt-4 border-t border-zinc-100">
        <Label htmlFor="google_maps_key" className="flex items-center gap-2">
          <Key className="w-4 h-4 text-orange-500" />
          Chave API Google Maps
        </Label>
        <Input 
          id="google_maps_key" 
          name="google_maps_key" 
          type="password" 
          placeholder="AIzaSy..." 
          defaultValue={initialSettings?.google_maps_key || ""}
          required 
        />
        <p className="text-xs text-zinc-500">
          Armazenada com segurança. Nunca exibida no front-end.
        </p>
      </div>

      <Button type="submit" className="w-full h-11">
        Salvar Configurações
      </Button>
    </form>
  )
}