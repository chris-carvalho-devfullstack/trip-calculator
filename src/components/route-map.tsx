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
      <div className="w-full h-[250px] rounded-lg overflow-hidden border border-zinc-200 shadow-inner">
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
  const [customMarkers, setCustomMarkers] = useState<google.maps.Marker[]>([])

  useEffect(() => {
    if (!routesLibrary || !map) return

    const directionsService = new routesLibrary.DirectionsService()
    
    // 1. Criamos a "Caixa de Informação" (Tooltip) que será usada pelos pinos
    const infoWindow = new google.maps.InfoWindow()
    
    // Limpa as rotas, marcadores e eventos antigos
    renderers.forEach(r => r.setMap(null))
    customMarkers.forEach(m => {
      google.maps.event.clearInstanceListeners(m)
      m.setMap(null)
    })

    const legs = [
      { origin, destination: pickup, color: "#3b82f6" }, 
      { origin: pickup, destination, color: "#f97316" }, 
      { origin: destination, destination: origin, color: "#22c55e" } 
    ]

    const bounds = new google.maps.LatLngBounds()
    const newRenderers: google.maps.DirectionsRenderer[] = []
    const fetchedResponses: google.maps.DirectionsResult[] = []
    const newCustomMarkers: google.maps.Marker[] = []

    const fetchRoutes = async () => {
      for (let i = 0; i < legs.length; i++) {
        try {
          const response = await directionsService.route({
            origin: legs[i].origin,
            destination: legs[i].destination,
            travelMode: google.maps.TravelMode.DRIVING
          });

          if (response && response.routes && response.routes.length > 0) {
            fetchedResponses.push(response)
            bounds.union(response.routes[0].bounds)
            
            const renderer = new google.maps.DirectionsRenderer({
              map,
              directions: response,
              preserveViewport: true,
              suppressMarkers: true, 
              polylineOptions: {
                strokeColor: legs[i].color,
                strokeWeight: 5,
                strokeOpacity: 0.9
              }
            })
            newRenderers.push(renderer)
          }
        } catch (error) {
          console.error(`Erro ao traçar a rota ${i + 1}:`, error)
        }

        await new Promise(resolve => setTimeout(resolve, 400))
      }

      if (fetchedResponses.length >= 2) {
        const locA = fetchedResponses[0]?.routes[0]?.legs[0]?.start_location
        const locE = fetchedResponses[0]?.routes[0]?.legs[0]?.end_location
        const locD = fetchedResponses[1]?.routes[0]?.legs[0]?.end_location

        // 2. Atualizamos a função do pino para receber o Endereço e o Título
        const createPremiumMarker = (position: google.maps.LatLng, label: string, bgColor: string, addressText: string, title: string) => {
          const marker = new google.maps.Marker({
            position,
            map,
            label: { text: label, color: 'white', fontWeight: 'bold', fontSize: '11px' },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: bgColor,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff',
              scale: 12,
            },
            zIndex: 999
          })

          // 3. Adicionamos a ação de Clique no pino
          marker.addListener("click", () => {
            // Injetamos um HTML bonitinho dentro do tooltip
            infoWindow.setContent(`
              <div style="padding: 2px 4px; font-family: sans-serif; color: #3f3f46; max-width: 220px;">
                <strong style="display: block; margin-bottom: 4px; font-size: 13px; color: ${bgColor};">${title}</strong>
                <span style="font-size: 11px; line-height: 1.4;">${addressText}</span>
              </div>
            `)
            // Abrimos o tooltip em cima do pino clicado
            infoWindow.open({
              anchor: marker,
              map,
              shouldFocus: false,
            })
          })

          return marker
        }

        // 4. Passamos a origin, pickup e destination reais como texto para o Tooltip
        if (locA) newCustomMarkers.push(createPremiumMarker(locA, 'A', '#27272a', origin, 'Ponto de Partida'))
        if (locE) newCustomMarkers.push(createPremiumMarker(locE, 'E', '#3b82f6', pickup, 'Embarque do Segurado'))
        if (locD) newCustomMarkers.push(createPremiumMarker(locD, 'D', '#f97316', destination, 'Destino Final'))
      }

      if (newRenderers.length > 0) {
        map.fitBounds(bounds)
      }
      
      setRenderers(newRenderers)
      setCustomMarkers(newCustomMarkers)
    }

    fetchRoutes()

    return () => {
      infoWindow.close() // Fecha o tooltip ao desmontar
      newRenderers.forEach(r => r.setMap(null))
      newCustomMarkers.forEach((m: google.maps.Marker) => {
        google.maps.event.clearInstanceListeners(m) // Limpa os cliques da memória
        m.setMap(null)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesLibrary, map, origin, pickup, destination])

  return null
}