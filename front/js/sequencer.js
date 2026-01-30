export default class Sequencer {
    constructor(engine) {
        this.engine = engine;

        // Config de base
        this.steps = 16; // Une mesure standard
        this.bpm = 120;
        this.isPlaying = false;
        this.isPaused = false; // État pause
        this.isRecording = false; // Mode enregistrement
        this.currentStep = 0;

        // grille : tableau 2d
        this.grid = [];

        this.intervalId = null;

        // stockage des sources
        this.activeSources = [];

        // call backs pour UI
        this.onGridChanged = () => {};
        this.onStepChanged = () => {};
    }

    // ajout ligne quand un son est ajouté
    addRow() {
        const row = new Array(this.steps).fill(false);
        this.grid.push(row);
        this.onGridChanged();
    }

    // Delete ligne si son suppr
    removeRow(index) {
        this.grid.splice(index, 1);
        this.onGridChanged();
    }

    // active / desac case
    toggleStep(rowIndex, stepIndex) {
        if (this.grid[rowIndex]) {
            this.grid[rowIndex][stepIndex] = !this.grid[rowIndex][stepIndex];
            this.onGridChanged();
        }
    }

    // Enregistrement temps réel pour pad
    recordHit(padIndex) {
        if (this.isPlaying && this.isRecording) {
            this.toggleStep(padIndex, this.currentStep);
        }
    }

    play() {
        if (this.isPlaying && !this.isPaused) return;

        // Si pause on reprends
        if (this.isPaused) {
            this.isPaused = false;
            this.isPlaying = true;
            this.scheduleNextStep();
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 0;
        this.scheduleNextStep();
    }

    pause() {
        if (!this.isPlaying) return;

        this.isPaused = true;
        this.isPlaying = false;
        clearTimeout(this.intervalId);

        // Stopper tous les sons en cours
        this.stopAllActiveSources();

        this.onGridChanged();
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        clearTimeout(this.intervalId);

        // Stopper tous les sons en cours
        this.stopAllActiveSources();

        this.currentStep = 0;
        this.onGridChanged();
    }

    // Arrête tous les sons actifs du séquenceur
    stopAllActiveSources() {
        this.activeSources.forEach(source => {
            try {
                source.stop(0);
            } catch (e) { /* Déjà stoppé */ }
        });
        this.activeSources = [];
    }

    toggleRecord() {
        this.isRecording = !this.isRecording;
        return this.isRecording;
    }

    setBPM(value) {
        this.bpm = value;
    }

    // Boucle principale du séquenceur
    scheduleNextStep() {
        if (!this.isPlaying) return;

        // Calcul temps entre deux pas
        const stepTime = (60000 / this.bpm) / 4;

        // Nettoyer les sources terminées
        this.activeSources = this.activeSources.filter(s => {
            try { return s.context && s.context.state !== 'closed'; } catch(e) { return false; }
        });

        // jouer les sons de l'étape actuelle
        this.grid.forEach((row, soundIndex) => {
            if (row[this.currentStep]) {
                const source = this.playSoundForSequencer(soundIndex, stepTime);
                if (source) {
                    this.activeSources.push(source);
                }
            }
        });

        if (this.onStepChanged) {
            this.onStepChanged(this.currentStep);
        }

        // Préparer l'étape suivante
        this.currentStep = (this.currentStep + 1) % this.steps;

        // Boucle
        this.intervalId = setTimeout(() => this.scheduleNextStep(), stepTime);
    }

    // Joue un son pour le séquenceur avec durée limitée
    playSoundForSequencer(soundIndex, maxDurationMs) {
        const sound = this.engine.soundBank[soundIndex];
        if (!sound || !sound.buffer) return null;

        const audioCtx = this.engine.audioCtx;
        const canvasW = this.engine.currentCanvasWidth || 340;

        // Calcul des temps de trim
        const startS = (sound.trim.start / canvasW) * sound.buffer.duration;
        const endS = (sound.trim.end / canvasW) * sound.buffer.duration;
        let duration = endS - startS;
        if (duration <= 0) return null;

        // Limiter la durée au temps du step pour éviter les chevauchements
        const maxDurationS = maxDurationMs / 1000;
        duration = Math.min(duration, maxDurationS);

        const source = audioCtx.createBufferSource();
        source.buffer = sound.buffer;

        // Appliquer les effets individuels du pad
        const effects = sound.effects || { volume: 100, pan: 0, pitch: 0 };

        // Calculer le playback rate avec pitch
        const pitchRate = Math.pow(2, effects.pitch / 12);
        source.playbackRate.value = this.engine.playbackRate * pitchRate;

        // Créer les noeuds d'effets individuels
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = effects.volume / 100;

        const pannerNode = audioCtx.createStereoPanner();
        pannerNode.pan.value = effects.pan / 100;

        // Connecter: source -> gain -> panner -> effets globaux
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.engine.effectChainEntry);

        source.start(0, startS, duration);

        // Auto-nettoyage quand le son se termine
        source.onended = () => {
            const idx = this.activeSources.indexOf(source);
            if (idx > -1) this.activeSources.splice(idx, 1);
        };

        return source;
    }
}
