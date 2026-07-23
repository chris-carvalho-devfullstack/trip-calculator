/// <reference types="google.maps" />
"use client"

import { useEffect, useState } from "react"
import { APIProvider, Map, useMap, useMapsLibrary } from "@vis.gl/react-google-maps"

interface RouteMapProps {
  apiKey?: string | null;
  origin: string;
  pickup: string;
  destination: string;
}

export function RouteMap({ apiKey, origin, pickup, destination }: RouteMapProps) {
  if (!apiKey) {
    return (
      <div className="h-[250px] bg-zinc-100 flex items-center justify-center text-sm text-zinc-500 rounded-lg border border-zinc-200">
        Chave do mapa não configurada.
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="w-full h-[250px] rounded-lg overflow-hidden border border-zinc-200">
        <Map 
          defaultZoom={10} 
          defaultCenter={{ lat: -23.55, lng: -46.63 }} 
          disableDefaultUI 
          gestureHandling="cooperative" 
        />
        <DirectionsRendererComponent origin={origin} pickup={pickup} destination={destination} />
      </div>
    </APIProvider>
  )
}

function DirectionsRendererComponent({ origin, pickup, destination }: Omit<RouteMapProps, 'apiKey'>) {
  const map = useMap()
  const routesLibrary = useMapsLibrary("routes")
  
  const [renderers, setRenderers] = useState<google.maps.DirectionsRenderer[]>([])

  useEffect(() => {
    if (!routesLibrary || !map) return

    const directionsService = new routesLibrary.DirectionsService()
    
    // Limpa as rotas antigas
    renderers.forEach(r => r.setMap(null))

    const legs = [
      { origin, destination: pickup, color: "#3b82f6" }, 
      { origin: pickup, destination, color: "#f97316" }, 
      { origin: destination, destination: origin, color: "#22c55e" } 
    ]

    const bounds = new google.maps.LatLngBounds()
    const newRenderers: google.maps.DirectionsRenderer[] = []

    Promise.all(
      legs.map(leg => 
        directionsService.route({
          origin: leg.origin,
          destination: leg.destination,
          travelMode: google.maps.TravelMode.DRIVING
        }).catch(() => null)
      )
    ).then((responses) => {
      // Substituímos o 'any' pela tipagem correta aceitando o null
      responses.forEach((response: google.maps.DirectionsResult | null, index: number) => {
        if (!response || !response.routes || response.routes.length === 0) return;

        bounds.union(response.routes[0].bounds) 
        
        const renderer = new google.maps.DirectionsRenderer({
          map,
          directions: response,
          preserveViewport: true, 
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: legs[index].color,
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        })
        newRenderers.push(renderer)
      })
      
      if (newRenderers.length > 0) {
        map.fitBounds(bounds) 
      }
      setRenderers(newRenderers)
    }).catch((e: unknown) => console.error("Erro ao desenhar rotas", e))

    return () => {
      newRenderers.forEach(r => r.setMap(null))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesLibrary, map, origin, pickup, destination])

  return null
}