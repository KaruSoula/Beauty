export async function onRequestGet({ request }) {
    const url = new URL(request.url).searchParams.get('url');

    if (!url) {
        return new Response(JSON.stringify({ error: 'Brak parametru URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const imageResponse = await fetch(url);

        if (!imageResponse.ok) {
            throw new Error(`Błąd zewnętrznego serwera: ${imageResponse.status}`);
        }

        const newHeaders = new Headers(imageResponse.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(imageResponse.body, {
            status: imageResponse.status,
            headers: newHeaders
        });

    } catch (error) {
        console.error('Błąd proxy Cloudflare:', error);
        return new Response(JSON.stringify({ error: 'Nie udało się pobrać obrazu przez bezpieczne proxy.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
