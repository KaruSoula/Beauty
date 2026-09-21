function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function onRequestPost({ request, env }) {
    try {
        const secFetchSite = request.headers.get('Sec-Fetch-Site');
        if (secFetchSite && secFetchSite !== 'same-origin') {
            return jsonResponse({ error: 'GO AWAY!' }, 403);
        }

        // --- BLOKADA BEZPIECZEŃSTWA (30 dni) ---
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader || !cookieHeader.includes('karusoula_auth=verified')) {
            return jsonResponse({ error: 'Twoje logowanie wygasło. Odśwież stronę i zaloguj się ponownie.' }, 401);
        }
        // ---------------------------------------

        const body = await request.json();
        const { type, engine, payload } = body;
        const { prompt, systemPrompt, model } = payload;

        if (type === 'TEXT') {
            if (engine === 'deepseek') {
const deepseekModel = typeof model === 'string' && model.trim() ? model.trim() : 'deepseek-flash';
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
                    body: JSON.stringify({
                        model: deepseekModel,
                        messages: [
                            { role: "system", content: systemPrompt || "Jesteś ekspertem social media." },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const data = await response.json();
                return jsonResponse(data);
                
            } else if (engine === 'gemini') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemPrompt || "Jesteś ekspertem social media." }] },
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Błąd generowania";
                return jsonResponse({ choices: [{ message: { content: textContent } }] });
                
            } else if (engine === 'grok') {
                const response = await fetch('https://api.x.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${env.GROK_API_KEY}` 
                    },
                    body: JSON.stringify({
                        model: model || 'grok-4.3',
                        messages: [
                            { role: "system", content: systemPrompt || "Jesteś ekspertem social media." },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return jsonResponse(data);
                
            } else if (engine === 'openai') {
                let openAIModel = 'gpt-5.4-mini';
                const checkText = (systemPrompt || '').toLowerCase();
                if (
                    checkText.includes('przykład pożądanego stylu') || 
                    checkText.includes('styl i narracja') || 
                    checkText.includes('uwaga dla ai') || 
                    checkText.includes('zasady formatowania')
                ) {
                    openAIModel = 'gpt-5.4';
                }

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}` 
                    },
                    body: JSON.stringify({
                        model: openAIModel,
                        messages: [
                            { role: "system", content: systemPrompt || "Jesteś ekspertem social media." },
                            { role: "user", content: prompt }
                        ]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return jsonResponse(data);
                
            } else if (engine === '1minai') {
                const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
                const response = await fetch('https://api.1min.ai/api/chat-with-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'API-KEY': env.ONEMIN_API_KEY },
                    body: JSON.stringify({
                        type: "UNIFY_CHAT_WITH_AI",
                        model: "claude-sonnet-4-5-20250929",
                        promptObject: { prompt: fullPrompt }
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                
                const textContent = data.choices?.[0]?.message?.content || data.aiRecord?.content || data.content;
                if (textContent) {
                    return jsonResponse({ choices: [{ message: { content: textContent } }] });
                }
                return jsonResponse(data);
                
            } else {
                return jsonResponse({ error: 'Nieznany silnik tekstowy.' }, 400);
            }
        }

        else if (type === 'IMAGE') {
            if (engine === 'grok') {
                const response = await fetch('https://api.x.ai/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.GROK_API_KEY}`
                    },
                    body: JSON.stringify({ model: "grok-imagine-image", prompt: prompt })
                });
                const data = await response.json();
                return jsonResponse(data);
                
            } else if (engine === 'imagen') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt + " (Aspect ratio: 1:1, square image)" }] }]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (!b64) throw new Error("Błąd pobierania obrazu.");
                return jsonResponse({ data: [{ url: `data:image/jpeg;base64,${b64}` }] });
                
            } else if (engine === 'recraft') {
                if (!env.RECRAFT_API_KEY) throw new Error("Brak klucza API dla Recraft.");
                const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.RECRAFT_API_KEY}`
                    },
                   body: JSON.stringify({ prompt: prompt, model: 'recraftv4_1' })
                });
                const apiData = await response.json();
                if (apiData.error) throw new Error(apiData.error.message);
                const extractedUrl = apiData.data && apiData.data[0] && apiData.data[0].url;
                if (!extractedUrl) throw new Error("Nie udało się pobrać URL z Recraft.");
                return jsonResponse({ data: [{ url: extractedUrl }] });
                
            } else if (engine === '1minai') {
                if (!env.ONEMIN_API_KEY) throw new Error("Brak klucza API dla 1minAI.");
                const response = await fetch('https://api.1min.ai/api/features', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'API-KEY': env.ONEMIN_API_KEY },
                    body: JSON.stringify({
                        type: "IMAGE_GENERATOR",
                        model: "black-forest-labs/flux-schnell",
                        promptObject: { prompt: prompt, aspect_ratio: "1:1", num_inference_steps: 4, go_fast: true, megapixels: "1", output_quality: 85 }
                    })
                });
                const apiData = await response.json();
                if (apiData.error) throw new Error(apiData.error.message);
                const extractedUrl = apiData.aiRecord && apiData.aiRecord.temporaryUrl;
                if (!extractedUrl) {
                    console.error("Zrzut z 1minAI:", apiData);
                    throw new Error("Nie udało się wyciągnąć URL z odpowiedzi 1minAI.");
                }
                return jsonResponse({ data: [{ url: extractedUrl }] });
                
            } else if (engine === 'openai') {
                const response = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({ 
                        model: "dall-e-3", 
                        prompt: prompt, 
                        n: 1, 
                        size: "1024x1024" 
                    })
                });
                const apiData = await response.json();
                if (apiData.error) throw new Error(apiData.error.message);
                const extractedUrl = apiData.data && apiData.data[0] && apiData.data[0].url;
                if (!extractedUrl) throw new Error("Nie udało się pobrać URL z OpenAI.");
                return jsonResponse({ data: [{ url: extractedUrl }] });
                
            } else {
                return jsonResponse({ error: 'Nieznany silnik graficzny.' }, 400);
            }
        }

        return jsonResponse({ error: 'Nieprawidłowy typ zadania.' }, 400);
    } catch (error) {
        console.error("Błąd API:", error);
        return jsonResponse({ error: error.message }, 500);
    }
}
