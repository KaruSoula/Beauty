export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { password } = body;
        const correctPassword = env.APP_PASSWORD;

        if (password === correctPassword) {
          
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'karusoula_auth=verified; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7776000'
                }
            });
        }
        return new Response(JSON.stringify({ success: false }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Błąd weryfikacji' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
