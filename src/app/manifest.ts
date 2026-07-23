import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Trip Calculator',
    short_name: 'TripCalc',
    description: 'Gestão financeira e cálculo de rotas para motoristas.',
    start_url: '/',
    display: 'standalone', // Tira a barra do navegador e faz parecer um App Nativo
    background_color: '#ffffff',
    theme_color: '#059669', // Cor da barra de status do Android (Verde Emerald)
    icons: [
      {
        src: '/logo.png', // Aponta para a sua logo que está na pasta public
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable', // Corrigido para agradar o TypeScript
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', // Corrigido para agradar o TypeScript
      },
    ],
  }
}