import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'J-Star Projects',
        short_name: 'J-Star Projects',
        description: 'Plan, research and write your final year project.',
        start_url: '/',
        display: 'standalone',
        background_color: '#EDF1ED',
        theme_color: '#193E35',
        icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
    }
}
