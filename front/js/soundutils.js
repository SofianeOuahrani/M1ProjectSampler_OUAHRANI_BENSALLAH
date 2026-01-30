// Charge et décode un son avec suivi de progression (pour les barres de chargement)
async function loadAndDecodeSound(url, ctx, onProgress) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Récupération de la taille totale pour le calcul du pourcentage
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        // Boucle de lecture du flux (Stream)
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            loaded += value.length;

            // Appel du callback de progression
            if (onProgress && total) {
                onProgress(loaded / total);
            }
        }

        // Reconstruction du fichier binaire (Blob)
        const blob = new Blob(chunks);
        const arrayBuffer = await blob.arrayBuffer();

        // Décodage audio (Web Audio API)
        const decodedSound = await ctx.decodeAudioData(arrayBuffer);

        // On retourne le buffer (pour jouer) ET le blob (pour sauvegarder plus tard)
        return { buffer: decodedSound, blob: blob };

    } catch (error) {
        console.error("Erreur chargement son:", error);
        throw error;
    }
}

// Construction du graphe audio simple
function buildAudioGraph(ctx, buffer) {
    let bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.connect(ctx.destination);
    return bufferSource;
}

function playSound(ctx, buffer, startTime, endTime) {
    if(startTime < 0) startTime = 0;
    if(endTime > buffer.duration) endTime = buffer.duration;

    let bufferSource = buildAudioGraph(ctx, buffer);
    bufferSource.start(0, startTime, endTime);
}

export { loadAndDecodeSound, playSound };
