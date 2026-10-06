import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FIFA World Cup 2026 Archive',
        short_name: 'FIFA World Cup',
        description: 'Final tournament results and the original prediction workflow',
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
