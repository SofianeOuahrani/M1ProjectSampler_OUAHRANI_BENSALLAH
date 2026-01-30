export default class AudioRecorder {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.mediaRecorder = null;
        this.chunks = [];
        this.stream = null;
    }

    async start() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Utilisation de codecs standards pour compatibilité
                const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                                ? "audio/webm;codecs=opus"
                                : "audio/webm";

                this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
                this.chunks = [];

                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) this.chunks.push(e.data);
                };

                this.mediaRecorder.start();
                console.log("Recorder started");
                return true;
            } catch (err) {
                console.error("Erreur micro:", err);
                throw err;
            }
        } else {
            console.error("getUserMedia non supporté.");
            return false;
        }
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) return reject("Recorder non initialisé");

            this.mediaRecorder.onstop = async () => {
                console.log("Recorder stopped");

                const blob = new Blob(this.chunks, { 'type': this.mediaRecorder.mimeType });

                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

                    if(this.stream) {
                        this.stream.getTracks().forEach(track => track.stop());
                    }

                    // Retourne le buffer (pour jouer) ET le blob (pour sauvegarder)
                    resolve({ buffer: decodedBuffer, blob: blob });
                } catch (e) {
                    reject(e);
                }
            };

            this.mediaRecorder.stop();
        });
    }
}
