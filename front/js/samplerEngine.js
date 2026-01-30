import { loadAndDecodeSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

export default class SamplerEngine {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.soundBank = [];
        this.allPresets = [];

        this.currentSound = null;
        this.currentSourceNode = null;
        this.playbackStartTime = 0;
        this.soundStartTime = 0;
        this.isLooping = false;
        this.pauseTime = 0;
        this.playbackRate = 1.0;
        this.currentCanvasWidth = 340;

        this.initEffects();

        // Callbacks
        this.onError = () => {};
        this.onStateChange = () => {};
        this.onPresetLoaded = () => {}; // Appelé quand la structure est prête
        this.onSoundProgress = () => {}; // (index, progress 0-1)
        this.onSoundLoaded = () => {}; // (index)
    }

    
    initEffects() {
        this.distortionNode = this.audioCtx.createWaveShaper();
        this.distortionNode.curve = this._makeDistortionCurve(0);
        this.distortionNode.oversample = '4x';
        this.filterNode = this.audioCtx.createBiquadFilter();
        this.filterNode.type = "lowpass";
        this.filterNode.frequency.value = 20000;
        this.convolverNode = this.audioCtx.createConvolver();
        this.convolverNode.buffer = this._buildImpulse();
        this.reverbGainNode = this.audioCtx.createGain();
        this.reverbGainNode.gain.value = 0;
        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.value = 1.0;

        this.distortionNode.connect(this.filterNode);
        this.filterNode.connect(this.masterGainNode);
        this.filterNode.connect(this.convolverNode);
        this.convolverNode.connect(this.reverbGainNode);
        this.reverbGainNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.audioCtx.destination);
        this.effectChainEntry = this.distortionNode;
    }
    setDistortion(amount) { this.distortionNode.curve = this._makeDistortionCurve(amount); }
    setFilter(value) {
        const minValue = 40; const maxValue = this.audioCtx.sampleRate / 2;
        const numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
        const multiplier = Math.pow(2, numberOfOctaves * (value / 100.0) - 1.0);
        this.filterNode.frequency.value = maxValue * multiplier;
    }
    setReverb(amount) { this.reverbGainNode.gain.value = (amount / 100) * 2; }
    setPlaybackRate(value) {
        const currentPos = this.getPlayheadTime();
        this.playbackRate = value;
        if(this.currentSourceNode && this.audioCtx.state === 'running') {
            this.currentSourceNode.playbackRate.value = this.playbackRate;
            this.playbackStartTime = this.audioCtx.currentTime;
            this.soundStartTime = currentPos;
        }
    }
    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 0;
        const n_samples = 44100; const curve = new Float32Array(n_samples); const deg = Math.PI / 180;
        if (amount === 0) { for (let i = 0; i < n_samples; ++i) curve[i] = (i / n_samples) * 2 - 1; return curve; }
        for (let i = 0; i < n_samples; ++i) { const x = (i * 2) / n_samples - 1; curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x)); }
        return curve;
    }
    _buildImpulse() {
        const rate = this.audioCtx.sampleRate; const length = rate * 2.0; const decay = 2.0;
        const impulse = this.audioCtx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0); const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) { const n = i; left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay); right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay); }
        return impulse;
    }

    async fetchPresetsList() {
        try {
            const response = await fetch(`${this.serverUrl}/api/presets`);
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            this.allPresets = await response.json();
            return this.allPresets;
        } catch (error) {
            console.error("Engine:", error);
            this.onError("Impossible de contacter le serveur.", error);
            return [];
        }
    }

    async getPresetData(presetName) {
        const preset = this.allPresets.find(p => p.name === presetName);
        if (!preset) return [];
        return preset.samples.map(s => ({
            name: s.name || s.url.replace(/\.[^/.]+$/, ""),
            url: `${this.serverUrl}/presets/${s.url}`
        }));
    }

    // CHARGEMENT  DES PRESETS
    async loadPresetSounds(preset) {
        if (!preset || !preset.samples) {
            this.onError("Preset invalide.");
            return;
        }

        console.log(`Engine: Loading preset ${preset.name}`);
        this.soundBank = [];

        // On initialise les sons 
        this.soundBank = preset.samples.map(sample => ({
            name: sample.name || sample.url.split('.')[0].replace(/_/g, ' '),
            buffer: null, // Pas encore chargé
            blob: null,
            trim: { start: 0, end: 600 },
            loading: true,
            url: `${this.serverUrl}/presets/${sample.url}`, // URL source originale
            originalUrl: sample.url // Chemin relatif pour la sauvegarde
        }));

        // on prévient la gui 
        this.onPresetLoaded(this.soundBank);

        // Chargement individuel des sons
        this.soundBank.forEach(async (soundItem, index) => {
            try {
                const result = await loadAndDecodeSound(
                    soundItem.url,
                    this.audioCtx,
                    (progress) => {
                        this.onSoundProgress(index, progress);
                    }
                );

                // maj de l'objet son
                soundItem.buffer = result.buffer;
                soundItem.blob = result.blob; 
                soundItem.loading = false;
                soundItem.trim.end = 340; // Default width

                this.onSoundLoaded(index);

            } catch (err) {
                console.error(`Failed to load sound ${index}`, err);
                this.onError(`Erreur chargement ${soundItem.name}`);
            }
        });
    }

    // Charge un son externe
    async loadAndAddSound(url, name) {
        const newIndex = this.soundBank.length;
        const soundItem = {
            name: name,
            buffer: null,
            blob: null,
            trim: { start: 0, end: 340 },
            loading: true,
            url: url
        };
        this.soundBank.push(soundItem);



        // on retourne l'index pour que la gui l'affiche si elle le gere


        try {
            const result = await loadAndDecodeSound(url, this.audioCtx, (p) => {
                if(this.onSoundProgress) this.onSoundProgress(newIndex, p);
            });

            soundItem.buffer = result.buffer;
            soundItem.blob = result.blob; // On stock le blob téléchargé
            soundItem.loading = false;

            return { index: newIndex, sound: soundItem };
        } catch (e) {
            this.soundBank.splice(newIndex, 1); 
            throw e;
        }
    }

    // Ajout dson local 
    addLocalSound(data, name) {

        const newSound = {
            buffer: data.buffer,
            blob: data.blob, 
            name: name,
            trim: { start: 0, end: 340 },
            loading: false
        };
        this.soundBank.push(newSound);
        return { index: this.soundBank.length - 1, sound: newSound };
    }

    removeSound(index) {
        if(this.currentSound === this.soundBank[index]) {
            this.stopCurrentSound();
            this.currentSound = null;
        }
        this.soundBank.splice(index, 1);
    }
    renameSound(index, newName) {
        if (this.soundBank[index]) { this.soundBank[index].name = newName; return true; } return false;
    }
    selectSound(index) {
        this.stopCurrentSound(); this.pauseTime = 0;
        if (!this.soundBank[index] || this.soundBank[index].loading) return null;
        this.currentSound = this.soundBank[index];
        return this.currentSound;
    }
    stopCurrentSound() {
        if (this.currentSourceNode) {
            try { this.currentSourceNode.onended = null; this.currentSourceNode.stop(0); } catch (e) {}
            this.currentSourceNode = null;
        }
    }
    playSoundByIndex(index) {
        const sound = this.soundBank[index];
        if (!sound || !sound.buffer) return;
        const canvasW = this.currentCanvasWidth || 340;
        const startS = pixelToSeconds(sound.trim.start, sound.buffer.duration, canvasW);
        const endS = pixelToSeconds(sound.trim.end, sound.buffer.duration, canvasW);
        const duration = endS - startS;
        if (duration <= 0) return;
        
        const source = this.audioCtx.createBufferSource();
        source.buffer = sound.buffer;
        
        // on applie les effets de chaque son
        const effects = sound.effects || { volume: 100, pan: 0, pitch: 0 };
        
        // calcul du pitch
        const pitchRate = Math.pow(2, effects.pitch / 12);
        source.playbackRate.value = this.playbackRate * pitchRate;
        
        // création des nodes 
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = effects.volume / 100;
        
        const pannerNode = this.audioCtx.createStereoPanner();
        pannerNode.pan.value = effects.pan / 100;
        
        // connexion: source -> gain -> panner -> effets globaux
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.effectChainEntry);
        
        source.start(0, startS, duration);
    }
    playCurrentSound(canvasWidth, startTimeInSound) {
        if (!this.currentSound) return;
        this.currentCanvasWidth = canvasWidth;
        this.stopCurrentSound();
        const trimStartTime = pixelToSeconds(this.currentSound.trim.start, this.currentSound.buffer.duration, canvasWidth);
        const trimEndTime = pixelToSeconds(this.currentSound.trim.end, this.currentSound.buffer.duration, canvasWidth);
        let playFrom = (startTimeInSound !== undefined) ? startTimeInSound : trimStartTime;
        if (playFrom < trimStartTime) playFrom = trimStartTime;
        if (playFrom >= trimEndTime) return;
        const duration = trimEndTime - playFrom;
        const sourceNode = this.audioCtx.createBufferSource();
        sourceNode.buffer = this.currentSound.buffer;
        sourceNode.playbackRate.value = this.playbackRate;
        sourceNode.connect(this.effectChainEntry);
        sourceNode.loop = this.isLooping;
        sourceNode.loopStart = trimStartTime;
        sourceNode.loopEnd = trimEndTime;
        this.playbackStartTime = this.audioCtx.currentTime;
        this.soundStartTime = playFrom;
        this.pauseTime = playFrom;
        if (this.isLooping) { sourceNode.start(0, playFrom); } else { sourceNode.start(0, playFrom, duration); }
        this.currentSourceNode = sourceNode;
        sourceNode.onended = () => { this.currentSourceNode = null; };
    }
    playFromPixel(pixelX, canvasWidth) {
        if (!this.currentSound) return;
        this.currentCanvasWidth = canvasWidth;
        const seekTime = pixelToSeconds(pixelX, this.currentSound.buffer.duration, canvasWidth);
        if (this.audioCtx.state === 'suspended') {
            this.pauseTime = seekTime; this.soundStartTime = seekTime;
            this.onStateChange('suspended'); return;
        }
        if (this.audioCtx.state === 'running') { this.playCurrentSound(canvasWidth, seekTime); }
        else { this.audioCtx.resume().then(() => { this.playCurrentSound(canvasWidth, seekTime); this.onStateChange('running'); }); }
    }
    getPlayheadTime() {
        if (this.audioCtx.state === 'suspended') return this.pauseTime;
        if (!this.currentSourceNode) return -1;
        const elapsed = (this.audioCtx.currentTime - this.playbackStartTime) * this.playbackRate;
        let timeInSound = elapsed + this.soundStartTime;
        if (this.isLooping && this.currentSourceNode.loop) {
            const loopDuration = this.currentSourceNode.loopEnd - this.currentSourceNode.loopStart;
            if (loopDuration > 0) { while (timeInSound >= this.currentSourceNode.loopEnd) timeInSound -= loopDuration; }
        }
        return timeInSound;
    }
    saveTrims(trimStartPx, trimEndPx) {
        if (!this.currentSound) return;
        this.currentSound.trim.start = trimStartPx;
        this.currentSound.trim.end = trimEndPx;
        if (this.currentSourceNode) {
            const canvasW = this.currentCanvasWidth || 340;
            const duration = this.currentSound.buffer.duration;
            const startS = pixelToSeconds(trimStartPx, duration, canvasW);
            const endS = pixelToSeconds(trimEndPx, duration, canvasW);
            try {
                this.currentSourceNode.loopStart = startS;
                this.currentSourceNode.loopEnd = endS;
                const currentTime = this.getPlayheadTime();
                if (currentTime < startS) { this._restartPlayingFrom(startS); }
                else if (currentTime >= endS) { if (this.isLooping) { this._restartPlayingFrom(startS); } else { this.stopCurrentSound(); } }
            } catch (e) { }
        }
    }
    togglePause() {
        if (this.audioCtx.state === 'running') {
            const t = this.getPlayheadTime(); if(t !== -1) this.pauseTime = t;
            this.stopCurrentSound(); this.audioCtx.suspend().then(() => this.onStateChange('suspended'));
        } else {
            this.audioCtx.resume().then(() => { this.playCurrentSound(this.currentCanvasWidth, this.pauseTime); this.onStateChange('running'); });
        }
    }
    toggleLoop() {
        this.isLooping = !this.isLooping;
        if (this.currentSourceNode) {
            this.currentSourceNode.loop = this.isLooping;
            try {
                const canvasW = this.currentCanvasWidth || 340;
                const startS = pixelToSeconds(this.currentSound.trim.start, this.currentSound.buffer.duration, canvasW);
                const endS = pixelToSeconds(this.currentSound.trim.end, this.currentSound.buffer.duration, canvasW);
                this.currentSourceNode.loopStart = startS;
                this.currentSourceNode.loopEnd = endS;
            } catch(e){}
        }
        return this.isLooping;
    }
}
