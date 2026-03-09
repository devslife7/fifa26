import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FIFA World Cup 2026 Predictor',
        short_name: 'FIFA 26 Predictor',
        description: 'Predict every match of the FIFA World Cup 2026',
        start_url: '/',
        display: 'standalone',
        background_color: '#f8f8f5',
        theme_color: '#f9d406',
        icons: [
            {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
