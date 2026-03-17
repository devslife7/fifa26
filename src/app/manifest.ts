import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FIFA World Cup 2026 Predictor',
        short_name: 'FIFA World Cup',
        description: 'Predict every match of the FIFA World Cup 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8f8f5',
        theme_color: '#f9d406',
        icons: [
            {
                src: '/icon-192x192.webp',
                sizes: '192x192',
                type: 'image/webp',
            },
            {
                src: '/icon-512x512.webp',
                sizes: '512x512',
                type: 'image/webp',
            },
        ],
    };
}
