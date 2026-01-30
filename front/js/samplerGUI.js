import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import AudioRecorder from './audioRecorder.js';
import FreesoundClient from './freesoundClient.js';

export default class SamplerGUI {
    constructor(engine, sequencer) {
        this.engine = engine;
        this.sequencer = sequencer;
        this.waveformDrawer = new WaveformDrawer();
        this.trimbarsDrawer = null;
        this.currentPad = null;
        this.currentPadIndex = null;
        this.isRecording = false;

        this.recorder = new AudioRecorder(this.engine.audioCtx);
        this.freesound = new FreesoundClient();

        // Preview audio
        this.previewAudio = null;
        this.previewUrl = null;

        // Découpe auto
        this.autoSliceEnabled = false;
        this.silenceThreshold = -40;

        this.keys = [
            'a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
            'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
            'w', 'x', 'c', 'v', 'b', 'n'
        ];

        // ici on connecte le sequencer
        this.sequencer.onGridChanged = () => this.drawSequencerGrid();
        this.sequencer.onStepChanged = (step) => this.updateSequencerCursor(step);
    }

    initialize() {
        // differents selecteurs
        this.categorySelect = document.querySelector("#categorySelect");
        this.presetSelect = document.querySelector("#presetSelect");
        this.libraryList = document.querySelector("#library-list");
        this.padsContainer = document.querySelector("#sampler-pads");
        this.savePresetBtn = document.querySelector("#savePresetBtn");

        this.fsSearchInput = document.querySelector("#fsSearchInput");
        this.fsSearchBtn = document.querySelector("#fsSearchBtn");

        this.canvas = document.querySelector("#myCanvas");
        this.canvasOverlay = document.querySelector("#myCanvasOverlay");
        this.waveformWrapper = document.querySelector(".wrapper");
        this.editorBox = document.querySelector(".editor-box");

        // Preview
        this.previewPlayer = document.querySelector("#preview-player");
        this.previewName = document.querySelector("#preview-name");
        this.previewPlayBtn = document.querySelector("#previewPlayBtn");
        this.previewProgressBar = document.querySelector("#previewProgressBar");

        // UI Titre & Temps
        this.soundTitleDisplay = document.createElement("div");
        this.soundTitleDisplay.style.color = "#00bfff";
        this.soundTitleDisplay.style.fontWeight = "bold";
        this.soundTitleDisplay.style.marginBottom = "5px";
        this.soundTitleDisplay.style.minHeight = "20px";
        this.soundTitleDisplay.textContent = "";
        const controlsDiv = this.editorBox.querySelector(".controls");
        this.editorBox.insertBefore(this.soundTitleDisplay, controlsDiv);

        this.timeDisplay = document.querySelector("#timeDisplay");

        this.playButton = document.querySelector("#playButton");
        this.pauseButton = document.querySelector("#pauseButton");
        this.loopButton = document.querySelector("#loopButton");
        this.recordButton = document.querySelector("#recordButton");

        this.speedInput = document.querySelector("#speedInput");
        this.distoSlider = document.querySelector("#distoSlider");
        this.filterSlider = document.querySelector("#filterSlider");
        this.reverbSlider = document.querySelector("#reverbSlider");

        // Effets individuels par pad
        this.padVolumeSlider = document.querySelector("#padVolumeSlider");
        this.padVolumeValue = document.querySelector("#padVolumeValue");
        this.padPanSlider = document.querySelector("#padPanSlider");
        this.padPanValue = document.querySelector("#padPanValue");
        this.padReverseBtn = document.querySelector("#padReverseBtn");
        this.padPitchSlider = document.querySelector("#padPitchSlider");
        this.padPitchValue = document.querySelector("#padPitchValue");

        // Auto-slice checkbox
        this.autoSliceCheckbox = document.querySelector("#autoSliceCheckbox");
        this.thresholdControl = document.querySelector("#thresholdControl");
        this.thresholdSlider = document.querySelector("#thresholdSlider");
        this.thresholdValue = document.querySelector("#thresholdValue");

        //  Callbacks engine
        this.engine.onPresetLoaded = (soundBank) => this.createPads(soundBank);
        this.engine.onSoundProgress = (index, progress) => this.updatePadProgress(index, progress);
        this.engine.onSoundLoaded = (index) => this.updatePadLoaded(index);
        this.engine.onStateChange = (state) => this.updatePauseButton(state);
        this.engine.onError = (msg) => alert(msg);

        // écouteurs
        this.speedInput.oninput = (e) => this.engine.setPlaybackRate(parseFloat(e.target.value));
        this.distoSlider.oninput = (e) => this.engine.setDistortion(parseFloat(e.target.value));
        this.filterSlider.oninput = (e) => this.engine.setFilter(parseFloat(e.target.value));
        this.reverbSlider.oninput = (e) => this.engine.setReverb(parseFloat(e.target.value));

        // Catégories
        if (this.categorySelect) {
            this.categorySelect.onchange = () => this.filterPresetsByCategory();
        }

        // Preview player
        if (this.previewPlayBtn) {
            this.previewPlayBtn.onclick = () => this.togglePreview();
        }

        // Effets individuels
        if (this.padVolumeSlider) {
            this.padVolumeSlider.oninput = (e) => this.updatePadEffect('volume', e.target.value);
        }
        if (this.padPanSlider) {
            this.padPanSlider.oninput = (e) => this.updatePadEffect('pan', e.target.value);
        }
        if (this.padReverseBtn) {
            this.padReverseBtn.onclick = () => this.togglePadReverse();
        }
        if (this.padPitchSlider) {
            this.padPitchSlider.oninput = (e) => this.updatePadEffect('pitch', e.target.value);
        }

        // Découpe auto
        if (this.autoSliceCheckbox) {
            this.autoSliceCheckbox.onchange = (e) => {
                this.autoSliceEnabled = e.target.checked;
                if (this.thresholdControl) {
                    this.thresholdControl.style.display = e.target.checked ? 'block' : 'none';
                }
            };
        }
        if (this.thresholdSlider) {
            this.thresholdSlider.oninput = (e) => {
                this.silenceThreshold = parseInt(e.target.value);
                if (this.thresholdValue) this.thresholdValue.textContent = e.target.value;
            };
        }

        // Boutons du séquenceur avec gestion visuelle
        const seqPlayBtn = document.querySelector("#seqPlayBtn");
        const seqPauseBtn = document.querySelector("#seqPauseBtn");
        const seqStopBtn = document.querySelector("#seqStopBtn");

        seqPlayBtn.onclick = () => {
            this.sequencer.play();
            seqPlayBtn.classList.add('active');
            seqPauseBtn.classList.remove('active');
        };

        seqPauseBtn.onclick = () => {
            this.sequencer.pause();
            seqPlayBtn.classList.remove('active');
            seqPauseBtn.classList.add('active');
        };

        seqStopBtn.onclick = () => {
            this.sequencer.stop();
            seqPlayBtn.classList.remove('active');
            seqPauseBtn.classList.remove('active');
        };

        document.querySelector("#seqRecBtn").onclick = (e) => {
            const isRec = this.sequencer.toggleRecord();
            e.target.classList.toggle('active', isRec);
        };

        const bpmInput = document.querySelector("#bpmInput");
        const bpmSlider = document.querySelector("#bpmSlider");
        bpmInput.oninput = (e) => { this.sequencer.setBPM(e.target.value); bpmSlider.value = e.target.value; };
        bpmSlider.oninput = (e) => { this.sequencer.setBPM(e.target.value); bpmInput.value = e.target.value; };

        this.trimbarsDrawer = new TrimbarsDrawer(this.canvasOverlay, 0, 340);
        requestAnimationFrame(() => this.animateTrims());

        this.presetSelect.onchange = (e) => this.handleLibrarySelection(e.target.value);
        this.savePresetBtn.onclick = () => this.handleSavePreset();

        this.fsSearchBtn.onclick = () => this.handleFreesoundSearch();
        this.fsSearchInput.onkeypress = (e) => { if(e.key === "Enter") this.handleFreesoundSearch(); };

        this.playButton.onclick = () => this.engine.playCurrentSound(this.canvas.width);
        this.pauseButton.onclick = () => this.engine.togglePause();
        this.loopButton.onclick = () => this.handleLoopClick();

        this.canvasOverlay.onmousedown = (e) => this.handleOverlayMouseDown(e);
        this.canvasOverlay.onmousemove = (e) => this.handleTrimMouseMove(e);
        this.canvasOverlay.onmouseup = () => this.handleTrimMouseUp();

        if(this.recordButton) this.recordButton.onclick = () => this.handleRecordClick();

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));

        this.injectStyles();
    }

    // Filtre par catégorie (factory vs custom)
    filterPresetsByCategory() {
        const category = this.categorySelect.value;
        const options = this.presetSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value === "" || opt.disabled) return;
            const preset = this.engine.allPresets.find(p => p.name === opt.value);
            if (!preset) return;

            if (category === 'all') {
                opt.style.display = '';
            } else if (category === 'factory') {
                opt.style.display = preset.isFactoryPresets ? '' : 'none';
            } else if (category === 'custom') {
                opt.style.display = !preset.isFactoryPresets ? '' : 'none';
            }
        });

        // Reset selection si le preset actuel est caché
        const currentOpt = this.presetSelect.options[this.presetSelect.selectedIndex];
        if (currentOpt && currentOpt.style.display === 'none') {
            this.presetSelect.selectedIndex = 0;
        }
    }

    // Preview audio
    startPreview(url, name) {
        this.stopPreview();

        this.previewUrl = url;
        this.previewAudio = new Audio(url);
        this.previewAudio.crossOrigin = "anonymous";

        if (this.previewPlayer) {
            this.previewPlayer.style.display = 'block';
            this.previewName.textContent = name;
            this.previewPlayBtn.textContent = '⏸';
            this.previewPlayBtn.classList.add('playing');
        }

        this.previewAudio.ontimeupdate = () => {
            if (this.previewAudio && this.previewProgressBar) {
                const progress = (this.previewAudio.currentTime / this.previewAudio.duration) * 100;
                this.previewProgressBar.style.width = progress + '%';
            }
        };

        this.previewAudio.onended = () => {
            this.resetPreviewUI();
        };

        this.previewAudio.play().catch(e => console.error("Preview error:", e));
    }

    stopPreview() {
        if (this.previewAudio) {
            this.previewAudio.pause();
            this.previewAudio.currentTime = 0;
            this.previewAudio = null;
        }
        this.resetPreviewUI();
    }

    togglePreview() {
        if (this.previewAudio && !this.previewAudio.paused) {
            this.previewAudio.pause();
            this.previewPlayBtn.textContent = '▶';
            this.previewPlayBtn.classList.remove('playing');
        } else if (this.previewAudio) {
            this.previewAudio.play();
            this.previewPlayBtn.textContent = '⏸';
            this.previewPlayBtn.classList.add('playing');
        }
    }

    resetPreviewUI() {
        if (this.previewPlayBtn) {
            this.previewPlayBtn.textContent = '▶';
            this.previewPlayBtn.classList.remove('playing');
        }
        if (this.previewProgressBar) {
            this.previewProgressBar.style.width = '0%';
        }
    }

    // Effets individuels par pad
    updatePadEffect(effect, value) {
        if (this.currentPadIndex === null) return;

        const sound = this.engine.soundBank[this.currentPadIndex];
        if (!sound) return;

        // Initialisation des effets
        if (!sound.effects) {
            sound.effects = { volume: 100, pan: 0, reverse: false, pitch: 0 };
        }

        switch (effect) {
            case 'volume':
                sound.effects.volume = parseInt(value);
                if (this.padVolumeValue) this.padVolumeValue.textContent = value + '%';
                break;
            case 'pan':
                sound.effects.pan = parseInt(value);
                if (this.padPanValue) {
                    const panVal = parseInt(value);
                    this.padPanValue.textContent = panVal === 0 ? 'C' : (panVal < 0 ? 'L' + Math.abs(panVal) : 'R' + panVal);
                }
                break;
            case 'pitch':
                sound.effects.pitch = parseInt(value);
                if (this.padPitchValue) this.padPitchValue.textContent = value;
                break;
        }
    }

    togglePadReverse() {
        if (this.currentPadIndex === null) return;

        const sound = this.engine.soundBank[this.currentPadIndex];
        if (!sound || !sound.buffer) return;

        if (!sound.effects) {
            sound.effects = { volume: 100, pan: 0, reverse: false, pitch: 0 };
        }

        sound.effects.reverse = !sound.effects.reverse;
        this.padReverseBtn.classList.toggle('active', sound.effects.reverse);

        // Inverser le buffer audio
        if (sound.effects.reverse) {
            this.reverseBuffer(sound);
        } else {
            // Re-inverser pour revenir à l'original
            this.reverseBuffer(sound);
        }
    }

    reverseBuffer(sound) {
        const buffer = sound.buffer;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            data.reverse();
        }
        // Redessiner la waveform
        if (this.currentPadIndex !== null && this.engine.currentSound === sound) {
            this.waveformDrawer.init(sound.buffer, this.canvas, '#00bfff');
            this.waveformDrawer.drawWave(0, this.canvas.height);
        }
    }

    updatePadEffectsUI(sound) {
        const effects = sound.effects || { volume: 100, pan: 0, reverse: false, pitch: 0 };

        if (this.padVolumeSlider) {
            this.padVolumeSlider.value = effects.volume;
            this.padVolumeValue.textContent = effects.volume + '%';
        }
        if (this.padPanSlider) {
            this.padPanSlider.value = effects.pan;
            const panVal = effects.pan;
            this.padPanValue.textContent = panVal === 0 ? 'C' : (panVal < 0 ? 'L' + Math.abs(panVal) : 'R' + panVal);
        }
        if (this.padReverseBtn) {
            this.padReverseBtn.classList.toggle('active', effects.reverse);
        }
        if (this.padPitchSlider) {
            this.padPitchSlider.value = effects.pitch;
            this.padPitchValue.textContent = effects.pitch;
        }
    }

    // Détection des silences pour découpe auto
    detectSilences(buffer, thresholdDb = -40) {
        const threshold = Math.pow(10, thresholdDb / 20);
        const data = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const minSilenceDuration = 0.1; // 100ms minimum
        const minSoundDuration = 0.05; // 50ms minimum pour un son

        const regions = [];
        let inSound = false;
        let soundStart = 0;
        let silence_start = 0;

        for (let i = 0; i < data.length; i++) {
            const amplitude = Math.abs(data[i]);

            if (!inSound && amplitude > threshold) {
                // Début d'un son
                inSound = true;
                soundStart = i;
            } else if (inSound && amplitude <= threshold) {
                // Possible fin de son
                if (silence_start === 0) silence_start = i;

                const silenceDuration = (i - silence_start) / sampleRate;
                if (silenceDuration >= minSilenceDuration) {
                    // Confirmer la fin du son
                    const soundDuration = (silence_start - sound_start) / sampleRate;
                    if (soundDuration >= minSoundDuration) {
                        regions.push({
                            start: sound_start / sampleRate,
                            end: silence_start / sampleRate
                        });
                    }
                    inSound = false;
                    silence_start = 0;
                }
            } else if (inSound && amplitude > threshold) {
                // Réinitialiser le compteur de silence
                silence_start = 0;
            }
        }

        // Ajouter la dernière région si on est encore dans un son
        if (inSound) {
            const soundDuration = (data.length - sound_start) / sampleRate;
            if (soundDuration >= minSoundDuration) {
                regions.push({
                    start: sound_start / sampleRate,
                    end: data.length / sampleRate
                });
            }
        }

        return regions;
    }

    sliceBufferByRegions(originalBuffer, regions) {
        const audioCtx = this.engine.audioCtx;
        const slices = [];

        regions.forEach((region, index) => {
            const startSample = Math.floor(region.start * originalBuffer.sampleRate);
            const endSample = Math.floor(region.end * originalBuffer.sampleRate);
            const length = endSample - startSample;

            if (length > 0) {
                const sliceBuffer = audioCtx.createBuffer(
                    originalBuffer.numberOfChannels,
                    length,
                    originalBuffer.sampleRate
                );

                for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
                    const sourceData = originalBuffer.getChannelData(channel);
                    const destData = sliceBuffer.getChannelData(channel);
                    for (let i = 0; i < length; i++) {
                        destData[i] = sourceData[startSample + i];
                    }
                }

                slices.push({
                    buffer: sliceBuffer,
                    index: index + 1
                });
            }
        });

        return slices;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .sound-pad { position: relative; overflow: hidden; }
            .pad-close-btn { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; font-size: 12px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
            .pad-close-btn:hover { background: red; }
            .pad-progress { position: absolute; bottom: 0; left: 0; height: 4px; background: #00bfff; transition: width 0.1s; width: 0%; z-index: 5; }
            .action-btn { background: #444; color: white; border: none; padding: 8px; width: 100%; margin-bottom: 10px; cursor: pointer; border-radius: 4px; font-weight: bold; border: 1px solid #555; }
            .action-btn:hover { background: #555; }
        `;
        document.head.appendChild(style);
    }

    // Gestion affichage des pads

    // Appelée par l'engine quand on change de preset (avant chargement audio)
    createPads(soundBank) {
        this.padsContainer.innerHTML = '';
        this.hideEditor();
        this.sequencer.grid = [];
        document.querySelector('#sequencer-grid').innerHTML = '<p class="empty-seq-msg">Chargement...</p>';

        soundBank.forEach((soundObj, index) => {
            this.addSinglePad(soundObj, index);
        });
    }

    updatePadProgress(index, progress) {
        const pad = this.padsContainer.children[index];
        if(!pad) return;

        let bar = pad.querySelector('.pad-progress');
        if(!bar) {
            bar = document.createElement('div');
            bar.className = 'pad-progress';
            pad.appendChild(bar);
        }
        bar.style.width = (progress * 100) + '%';

        if(progress < 1) {
            pad.style.opacity = 0.6;
            pad.disabled = true; // Désactive le clic pendant le chargement
        }
    }

    updatePadLoaded(index) {
        const pad = this.padsContainer.children[index];
        if(!pad) return;

        pad.style.opacity = 1;
        pad.disabled = false;
        const bar = pad.querySelector('.pad-progress');
        if(bar) bar.remove();

        this.drawSequencerGrid();
    }


    // Sauvegarde du preset
    async handleSavePreset() {
        const name = prompt("Nom du nouveau kit :");
        if (!name || name.trim() === "") return;

        // Préparation de l'upload des fichiers
        const formData = new FormData();
        const soundsToSave = [];
        let needsUpload = false;

        this.engine.soundBank.forEach((sound, index) => {
            // Génère un nom de fichier
            const safeSoundName = (sound.name || "sound").replace(/[^a-zA-Z0-9]/g, '_');
            const safePresetName = name.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${safePresetName}_${index}_${safeSoundName}.webm`;

            if (sound.blob) {
                // Nouveau son alors on upload
                formData.append("files", sound.blob, filename);
                soundsToSave.push({
                    name: sound.name,
                    url: `${name}/${filename}`
                });
                needsUpload = true;
            } else if (sound.originalUrl) {
                // Son existant alors on garde la référence
                soundsToSave.push({
                    name: sound.name,
                    url: sound.originalUrl
                });
            }
        });

        try {
            // Upload audio
            if (needsUpload) {
                console.log(`Envoi des fichiers vers /api/upload/${encodeURIComponent(name)}...`);
                const uploadRes = await fetch(`${this.engine.serverUrl}/api/upload/${encodeURIComponent(name)}`, {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) {
                    const errorText = await uploadRes.text();
                    throw new Error(`Erreur Upload (${uploadRes.status}): ${errorText}`);
                }
            }

            // Sauvegarde JSON

            const presetData = {
                name: name,
                type: "user",
                isFactoryPresets: false,
                samples: soundsToSave
            };

            console.log("Envoi du JSON preset...", presetData);
            const saveRes = await fetch(`${this.engine.serverUrl}/api/presets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(presetData)
            });

            if (!saveRes.ok) {
                const errorText = await saveRes.text();
                // Affiche l'erreur précise du serveur (ex: champs manquants)
                throw new Error(`Erreur Sauvegarde JSON (${saveRes.status}): ${errorText}`);
            }

            alert(`Le kit "${name}" a été sauvegardé avec succès !`);
            this.loadPresetsList();

        } catch (e) {
            console.error("Détails de l'erreur:", e);
            alert("Échec de la sauvegarde :\n" + e.message);
        }
    }

    // gestion shortcuts clavier
    handleKeyDown(evt) {
        if (evt.target === this.fsSearchInput) return;
        const key = evt.key.toLowerCase();
        const index = this.keys.indexOf(key);
        if (index !== -1 && index < this.engine.soundBank.length) {
            const padButton = this.padsContainer.children[index];
            if (padButton) { padButton.click(); padButton.classList.add('active'); setTimeout(() => padButton.classList.remove('active'), 100); }
        }
    }
    async loadPresetsList() {
        const presets = await this.engine.fetchPresetsList();
        this.presetSelect.innerHTML = '<option value="" disabled selected>Choisir un kit...</option>';
        presets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            opt.dataset.type = p.type || 'user';
            this.presetSelect.appendChild(opt);
        });
        // Application du filtre de caté
        if (this.categorySelect && this.categorySelect.value !== 'all') {
            this.filterPresetsByCategory();
        }
    }
    async handleLibrarySelection(presetName) {
        this.fsSearchInput.value = "";
        this.libraryList.innerHTML = '<li class="lib-item">Chargement...</li>';
        const samples = await this.engine.getPresetData(presetName);
        const items = samples.map(s => ({ name: s.name, url: s.url, origin: 'loc' }));
        this.populateLibraryList(items);
    }
    async handleFreesoundSearch() {
        const query = this.fsSearchInput.value.trim();
        if(!query) return;
        this.presetSelect.value = "";
        this.libraryList.innerHTML = '<li class="lib-item">Recherche Freesound...</li>';
        const results = await this.freesound.searchSounds(query);
        const items = results.map(r => ({
            name: r.name,
            url: r.previews['preview-hq-mp3'],
            origin: 'fs',
            duration: r.duration,
            username: r.username
        }));
        this.populateLibraryList(items);
    }
    populateLibraryList(items) {
        this.libraryList.innerHTML = '';
        if(items.length === 0) {
            this.libraryList.innerHTML = '<li class="empty-msg">Aucun résultat.</li>';
            return;
        }
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'lib-item';

            // Partie gauche avec tag, preview et nom
            const leftDiv = document.createElement('div');
            leftDiv.className = 'lib-item-left';

            const tag = document.createElement('span');
            tag.className = `origin-tag ${item.origin}`;
            tag.textContent = item.origin === 'fs' ? 'FS' : 'LOC';

            // Bouton preview
            const previewBtn = document.createElement('button');
            previewBtn.className = 'preview-btn';
            previewBtn.textContent = '▶';
            previewBtn.title = 'Écouter';
            previewBtn.onclick = (e) => {
                e.stopPropagation();
                // Arrêter les autres previews
                document.querySelectorAll('.preview-btn.playing').forEach(btn => {
                    btn.classList.remove('playing');
                    btn.textContent = '▶';
                });

                if (this.previewUrl === item.url && this.previewAudio && !this.previewAudio.paused) {
                    this.stopPreview();
                    previewBtn.textContent = '▶';
                } else {
                    this.startPreview(item.url, item.name);
                    previewBtn.classList.add('playing');
                    previewBtn.textContent = '⏹';
                }
            };

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = item.name;
            if (item.duration) {
                nameSpan.title = `Durée: ${item.duration.toFixed(1)}s - Par: ${item.username || 'Unknown'}`;
            }

            leftDiv.appendChild(tag);
            leftDiv.appendChild(previewBtn);
            leftDiv.appendChild(nameSpan);

            // Partie droite avec bouton ajouter
            const rightDiv = document.createElement('div');
            rightDiv.className = 'lib-item-right';

            const addBtn = document.createElement('button');
            addBtn.className = 'add-btn';
            addBtn.textContent = '+';
            addBtn.title = 'Ajouter au kit';
            addBtn.onclick = async () => {
                addBtn.disabled = true;
                addBtn.textContent = '...';
                try {
                    const result = await this.engine.loadAndAddSound(item.url, item.name);
                    this.addSinglePad(result.sound, result.index);
                    addBtn.textContent = '✓';
                    setTimeout(() => { addBtn.textContent = '+'; addBtn.disabled = false; }, 1000);
                } catch(e) {
                    addBtn.textContent = 'Err';
                    addBtn.disabled = false;
                }
            };

            rightDiv.appendChild(addBtn);

            li.appendChild(leftDiv);
            li.appendChild(rightDiv);
            this.libraryList.appendChild(li);
        });
    }
    addSinglePad(soundObj, index) {
        const placeholder = this.padsContainer.querySelector('.placeholder-msg');
        if(placeholder) placeholder.remove();
        if(this.sequencer.grid.length <= index) { this.sequencer.addRow(); }
        const pad = document.createElement('button');
        pad.className = 'sound-pad';
        pad.textContent = soundObj.name.substring(0, 15) + (soundObj.name.length>15 ? "..." : "");
        const assignedKey = this.keys[index] ? this.keys[index].toUpperCase() : '';
        if (assignedKey) {
            const keyHint = document.createElement('span'); keyHint.className = 'key-hint'; keyHint.textContent = assignedKey; pad.appendChild(keyHint);
        }
        const closeBtn = document.createElement('button');
        closeBtn.className = 'pad-close-btn'; closeBtn.innerHTML = '&times;';
        closeBtn.onclick = (e) => { e.stopPropagation(); this.removePad(index); };
        pad.appendChild(closeBtn);
        pad.onclick = () => this.handlePadClick(pad, index);
        pad.oncontextmenu = (e) => { e.preventDefault(); this.handlePadRightClick(pad, index, soundObj); };
        this.padsContainer.appendChild(pad);
    }
    removePad(index) {
        if(!confirm("Supprimer ce son ?")) return;
        this.engine.removeSound(index); this.sequencer.removeRow(index);
        if (this.currentPad && this.padsContainer.children[index] === this.currentPad) { this.hideEditor(); }
        this.padsContainer.innerHTML = '';
        if(this.engine.soundBank.length === 0) { this.padsContainer.innerHTML = `<div class="placeholder-msg">Votre kit est vide.</div>`; }
        else { this.engine.soundBank.forEach((sound, i) => { this.addSinglePad(sound, i); }); }
    }
    handlePadClick(padButton, index) {
        this.sequencer.recordHit(index);
        if(this.currentPad) this.currentPad.classList.remove('selected');
        this.currentPad = padButton;
        this.currentPadIndex = index;
        this.currentPad.classList.add('selected');
        const sound = this.engine.selectSound(index); if(!sound) return;
        this.showEditor(sound);
        // Mettre à jour l'UI des effets individuels
        this.updatePadEffectsUI(sound);
    }
    handlePadRightClick(padButton, index, soundObj) {
        const newName = prompt("Renommer le pad :", soundObj.name);
        if(newName && newName.trim() !== "") {
            this.engine.renameSound(index, newName.trim());
            padButton.childNodes[0].nodeValue = newName.trim().substring(0, 15) + "...";
            if(this.currentPad === padButton) this.soundTitleDisplay.textContent = newName.trim();
            this.drawSequencerGrid();
        }
    }
    showEditor(sound) {
        this.waveformWrapper.style.display = 'block'; if(this.editorInfo) this.editorInfo.style.display = 'none';
        this.playButton.disabled = false; this.soundTitleDisplay.textContent = sound.name; this.speedInput.value = this.engine.playbackRate;
        const ctx = this.canvas.getContext('2d'); ctx.clearRect(0,0, this.canvas.width, this.canvas.height);
        this.waveformDrawer.init(sound.buffer, this.canvas, '#00bfff'); this.waveformDrawer.drawWave(0, this.canvas.height);
        this.trimbarsDrawer.leftTrimBar.x = sound.trim.start; this.trimbarsDrawer.rightTrimBar.x = sound.trim.end;
    }
    hideEditor() {
        this.waveformWrapper.style.display = 'none'; if(this.editorInfo) this.editorInfo.style.display = 'block';
        this.playButton.disabled = true; this.soundTitleDisplay.textContent = ""; this.timeDisplay.textContent = "-- / --"; this.currentPad = null;
    }
    handleOverlayMouseDown(e){ e.preventDefault(); const rect=this.canvas.getBoundingClientRect(); const x=e.clientX-rect.left; this.trimbarsDrawer.highLightTrimBarsWhenClose({x,y:0}); this.trimbarsDrawer.startDrag(); if(!this.trimbarsDrawer.leftTrimBar.dragged && !this.trimbarsDrawer.rightTrimBar.dragged){this.engine.playFromPixel(x,this.canvas.width);} }
    handleTrimMouseMove(e){ const rect=this.canvas.getBoundingClientRect(); const x=e.clientX-rect.left; if(!this.trimbarsDrawer.leftTrimBar.dragged && !this.trimbarsDrawer.rightTrimBar.dragged){this.trimbarsDrawer.highLightTrimBarsWhenClose({x,y:0}); return;} const w=this.canvas.width; if(this.trimbarsDrawer.leftTrimBar.dragged){const max=this.trimbarsDrawer.rightTrimBar.x-2; this.trimbarsDrawer.leftTrimBar.x=Math.max(0,Math.min(x,max));}else if(this.trimbarsDrawer.rightTrimBar.dragged){const min=this.trimbarsDrawer.leftTrimBar.x+2; this.trimbarsDrawer.rightTrimBar.x=Math.min(w,Math.max(x,min));} }
    handleTrimMouseUp(){ if(this.trimbarsDrawer.leftTrimBar.dragged || this.trimbarsDrawer.rightTrimBar.dragged){this.trimbarsDrawer.stopDrag(); this.engine.saveTrims(this.trimbarsDrawer.leftTrimBar.x,this.trimbarsDrawer.rightTrimBar.x);} }
    animateTrims(){
        this.trimbarsDrawer.clear(); this.trimbarsDrawer.draw();
        const time=this.engine.getPlayheadTime();
        if(time!==-1 && this.engine.currentSound){
            const dur=this.engine.currentSound.buffer.duration; const x=(time/dur)*this.canvas.width;
            const ctx=this.canvasOverlay.getContext('2d'); ctx.beginPath(); ctx.strokeStyle='#00bfff'; ctx.lineWidth=2; ctx.moveTo(x,0); ctx.lineTo(x,this.canvas.height); ctx.stroke();
            const totalS=(dur/this.engine.playbackRate).toFixed(2); const currentS=(time/this.engine.playbackRate).toFixed(2);
            this.timeDisplay.textContent=`${currentS}s / ${totalS}s`;
        }
        requestAnimationFrame(()=>this.animateTrims());
    }
    handleLoopClick(){ const l=this.engine.toggleLoop(); if(l) this.loopButton.classList.add('selected'); else this.loopButton.classList.remove('selected'); }
    updatePauseButton(s){ this.pauseButton.textContent = (s==='running')?'Pause':'Resume'; }
    async handleRecordClick(){
        const status=document.querySelector('.rec-status');
        if(!this.isRecording){
            try{
                if(await this.recorder.start()){
                    this.isRecording=true;
                    this.recordButton.textContent="STOP";
                    this.recordButton.classList.add('recording');
                    status.textContent="Enregistrement...";
                    status.style.color="#ff4d4d";
                }
            } catch(e){console.error(e);}
        } else {
            this.isRecording=false;
            this.recordButton.textContent="REC";
            this.recordButton.classList.remove('recording');
            status.textContent="Traitement...";
            status.style.color="#aaa";

            try {
                const d = await this.recorder.stop();

                // Si auto-découpe activée, analyser et découper
                if (this.autoSliceEnabled) {
                    status.textContent = "Analyse des silences...";

                    const regions = this.detectSilences(d.buffer, this.silenceThreshold);

                    if (regions.length > 1) {
                        status.textContent = `${regions.length} sons détectés...`;

                        const slices = this.sliceBufferByRegions(d.buffer, regions);

                        // Ajouter chaque slice comme un pad séparé
                        slices.forEach((slice, idx) => {
                            const name = `Rec ${new Date().toLocaleTimeString()} #${slice.index}`;
                            const res = this.engine.addLocalSound({ buffer: slice.buffer, blob: null }, name);
                            this.addSinglePad(res.sound, res.index);
                        });

                        status.textContent = `${slices.length} sons ajoutés !`;
                    } else {
                        // Un seul son ou pas de découpe nécessaire
                        const name = "Rec " + new Date().toLocaleTimeString();
                        const res = this.engine.addLocalSound(d, name);
                        this.addSinglePad(res.sound, res.index);
                        status.textContent = "Sauvegardé !";
                    }
                } else {
                    // Mode normal sans découpe
                    const name = "Rec " + new Date().toLocaleTimeString();
                    const res = this.engine.addLocalSound(d, name);
                    this.addSinglePad(res.sound, res.index);
                    status.textContent = "Sauvegardé !";
                }

                setTimeout(() => status.textContent = "Prêt", 2000);
            } catch(e){
                console.error(e);
                status.textContent = "Erreur";
            }
        }
    }

    // Affichage sequenceur

    // Dessine la grille du séquenceur
    drawSequencerGrid() {
        const container = document.querySelector('#sequencer-grid');
        if (!container) return;
        container.innerHTML = '';

        // Pour chaque piste (son)
        this.sequencer.grid.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seq-row';

            // Nom du son à gauche
            const label = document.createElement('div');
            label.className = 'seq-label';
            const soundName = this.engine.soundBank[rowIndex]?.name || `Pad ${rowIndex + 1}`;
            label.textContent = soundName.substring(0, 8);
            label.title = soundName;
            rowDiv.appendChild(label);

            // Les 16 pas
            row.forEach((isActive, stepIndex) => {
                const stepBtn = document.createElement('div');
                stepBtn.className = `seq-step ${isActive ? 'active' : ''}`;
                // Marqueur pour les temps forts (tous les 4 pas)
                if (stepIndex % 4 === 0) stepBtn.classList.add('beat');

                stepBtn.onclick = () => this.sequencer.toggleStep(rowIndex, stepIndex);

                // Stocke l'ID pour le curseur
                stepBtn.id = `step-${rowIndex}-${stepIndex}`;

                rowDiv.appendChild(stepBtn);
            });

            container.appendChild(rowDiv);
        });
    }

    // maj curseur séquenceur
    updateSequencerCursor(currentStep) {
        // Enlève l'ancienne classe playing
        document.querySelectorAll('.seq-step.playing').forEach(el => el.classList.remove('playing'));

        // Ajoute la classe playing sur la colonne actuelle
        this.sequencer.grid.forEach((_, rowIndex) => {
            const el = document.getElementById(`step-${rowIndex}-${currentStep}`);
            if (el) el.classList.add('playing');
        });
    }
}
