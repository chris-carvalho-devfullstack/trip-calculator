'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
  durations: {
    totalSeconds: number;
    formattedText: string;
  };
  financials: {
    pricePerKm: number;
    grossValue: number;
    fuelCost: number;
    netValue: number;
    grossPerHour: number;
    netPerHour: number;
  };
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const { data: settings } = await supabase
    .from('settings')
    .select('google_maps_key, fuel_price, car_consumption')
    .eq('user_id', user.id)
    .single()

  if (!settings?.google_maps_key) {
    return { error: "Chave do Google Maps não configurada. Acesse Configurações." }
  }

  const origins = [originAddress, pickupAddress, destinationAddress].map(encodeURIComponent).join('|')
  const destinations = [pickupAddress, destinationAddress, originAddress].map(encodeURIComponent).join('|')
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${settings.google_maps_key}&language=pt-BR`

  try {
    const response = await fetch(url)
    const data = (await response.json()) as DistanceMatrixResponse

    if (data.status !== 'OK') {
      return { error: `Erro na API do Google Maps: ${data.status}` }
    }

    const getElement = (rowIdx: number, colIdx: number, stepName: string) => {
      const element = data.rows[rowIdx]?.elements[colIdx]
      if (element?.status !== 'OK') {
        throw new Error(`Não foi possível traçar a rota para o trecho: ${stepName}`)
      }
      return element
    }

    const elToPickup = getElement(0, 0, "Até o Embarque")
    const elToDest = getElement(1, 1, "Até o Destino")
    const elToOrigin = getElement(2, 2, "Retorno")

    const toPickup = elToPickup.distance.value / 1000
    const toDestination = elToDest.distance.value / 1000
    const returnToOrigin = elToOrigin.distance.value / 1000
    const totalDistance = toPickup + toDestination + returnToOrigin

    const totalSeconds = elToPickup.duration.value + elToDest.duration.value + elToOrigin.duration.value
    const totalHours = totalSeconds / 3600

    const hrs = Math.floor(totalHours)
    const mins = Math.round((totalHours - hrs) * 60)
    const formattedTime = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`

    const grossValue = totalDistance * pricePerKm
    
    let fuelCost = 0
    if (settings.fuel_price && settings.car_consumption && settings.car_consumption > 0) {
      fuelCost = (totalDistance / settings.car_consumption) * settings.fuel_price
    }

    const netValue = grossValue - fuelCost
    const grossPerHour = totalHours > 0 ? grossValue / totalHours : 0
    const netPerHour = totalHours > 0 ? netValue / totalHours : 0

    return {
      success: true,
      data: {
        distances: { toPickup, toDestination, returnToOrigin, total: totalDistance },
        durations: { totalSeconds, formattedText: formattedTime },
        financials: {
          pricePerKm,
          grossValue,
          fuelCost,
          netValue,
          grossPerHour,
          netPerHour
        },
        addresses: {
          origin: data.origin_addresses[0] || originAddress,
          pickup: data.origin_addresses[1] || pickupAddress,
          destination: data.origin_addresses[2] || destinationAddress,
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) return { error: error.message }
    return { error: "Erro desconhecido ao calcular rotas." }
  }
}

export async function acceptRideAction(rideData: RideCalculation, originType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  const now = new Date()

  // Inserção completa mapeando todos os dados da simulação para a tabela 'rides'
  const { error } = await supabase.from('rides').insert({
    user_id: user.id,
    origin_type: originType,
    full_address_origin: rideData.addresses.origin,
    pickup_address: rideData.addresses.pickup,
    destination_address: rideData.addresses.destination,
    full_address_destination: rideData.addresses.destination,
    
    distance_to_pickup: rideData.distances.toPickup,
    distance_pickup_to_dest: rideData.distances.toDestination,
    distance_return: rideData.distances.returnToOrigin,
    total_distance: rideData.distances.total,
    
    price_per_km: rideData.financials.pricePerKm,
    expected_value: rideData.financials.grossValue,
    
    // Novos campos analíticos da simulação exibidos no modal
    fuel_cost_estimated: rideData.financials.fuelCost,
    gross_per_hour: rideData.financials.grossPerHour,
    net_per_hour: rideData.financials.netPerHour,
    estimated_net_profit: rideData.financials.netValue,
    estimated_time: rideData.durations.formattedText,
    
    status: 'aceita',
    is_closed: false,
    created_at: now.toISOString(),
    date: now.toISOString().split('T')[0]
  })

  if (error) {
    console.error("Erro ao salvar corrida:", error)
    return { error: "Erro ao salvar corrida no histórico." }
  }

  revalidatePath('/history')
  return { success: true }
}