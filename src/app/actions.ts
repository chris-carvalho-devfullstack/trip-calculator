'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Tipagens para a API do Google e para a nossa resposta
interface DistanceMatrixElement {
  status: string;
  distance: { value: number; text: string };
  duration: { value: number; text: string };
}

interface DistanceMatrixResponse {
  status: string;
  origin_addresses: string[];
  destination_addresses: string[];
  rows: { elements: DistanceMatrixElement[] }[];
}

export interface RideCalculation {
  distances: {
    toPickup: number;
    toDestination: number;
    returnToOrigin: number;
    total: number;
  };
  pricePerKm: number;
  expectedValue: number;
  addresses: {
    origin: string;
    pickup: string;
    destination: string;
  };
}

export async function calculateRideAction(
  originAddress: string,
  pickupAddress: string,
  destinationAddress: string,
  pricePerKm: number
): Promise<{ success?: boolean; data?: RideCalculation; error?: string }> {
  const supabase = await createClient()

  // 1. Valida o usuário e pega a chave do Google
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { data: settings } = await supabase
    .from('settings')
    .select('google_maps_key')
    .eq('user_id', user.id)
    .single()

  if (!settings?.google_maps_key) {
    return { error: "Chave do Google Maps não configurada. Acesse Configurações." }
  }

  // 2. Monta a requisição otimizada (Pega os 3 trechos em 1 única chamada)
  const origins = [originAddress, pickupAddress, destinationAddress].map(encodeURIComponent).join('|')
  const destinations = [pickupAddress, destinationAddress, originAddress].map(encodeURIComponent).join('|')
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${settings.google_maps_key}&language=pt-BR`

  try {
    const response = await fetch(url)
    const data = (await response.json()) as DistanceMatrixResponse

    if (data.status !== 'OK') {
      return { error: `Erro na API do Google Maps: ${data.status}` }
    }

    // Função auxiliar para extrair a distância e lidar com erros de rota
    const getDistance = (rowIdx: number, colIdx: number, stepName: string) => {
      const element = data.rows[rowIdx]?.elements[colIdx]
      if (element?.status !== 'OK') {
        throw new Error(`Não foi possível traçar a rota para o trecho: ${stepName}`)
      }
      return element.distance.value / 1000 // Converte metros para KM
    }

    // Extrai exatamente a diagonal da matriz de distâncias
    const toPickup = getDistance(0, 0, "Até o Embarque")
    const toDestination = getDistance(1, 1, "Até o Destino")
    const returnToOrigin = getDistance(2, 2, "Retorno")

    const total = toPickup + toDestination + returnToOrigin
    const expectedValue = total * pricePerKm

    return {
      success: true,
      data: {
        distances: { toPickup, toDestination, returnToOrigin, total },
        pricePerKm,
        expectedValue,
        addresses: {
          origin: data.origin_addresses[0] || originAddress,
          pickup: data.origin_addresses[1] || pickupAddress,
          destination: data.origin_addresses[2] || destinationAddress,
        }
      }
    }
  } catch (error: unknown) {
    // Tratamento seguro de erro sem usar 'any'
    if (error instanceof Error) {
      return { error: error.message || "Erro ao calcular rotas. Verifique os endereços." }
    }
    return { error: "Erro desconhecido ao calcular rotas. Verifique os endereços." }
  }
}

// Action para salvar a corrida no histórico quando você clicar em "Aceitar"
export async function acceptRideAction(rideData: RideCalculation, originType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { error } = await supabase.from('rides').insert({
    user_id: user.id,
    origin_type: originType,
    pickup_address: rideData.addresses.pickup,
    destination_address: rideData.addresses.destination,
    distance_to_pickup: rideData.distances.toPickup,
    distance_pickup_to_dest: rideData.distances.toDestination,
    distance_return: rideData.distances.returnToOrigin,
    total_distance: rideData.distances.total,
    price_per_km: rideData.pricePerKm,
    expected_value: rideData.expectedValue,
    status: 'aceita',
    date: new Date().toISOString().split('T')[0] // Data de hoje YYYY-MM-DD
  })

  if (error) return { error: "Erro ao salvar corrida no histórico." }

  revalidatePath('/history') // Vai atualizar a lista de histórico futuramente
  return { success: true }
}