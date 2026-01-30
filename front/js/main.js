// Import des classes principales
import SamplerEngine from './samplerEngine.js';
import SamplerGUI from './samplerGUI.js';
import MidiController from './midiController.js';
import Sequencer from './sequencer.js';

// URL du serveur backend
//const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://projet-sampler-audio-angular.onrender.com';
// Configuration MIDI - Note de base (C1 = 36)
const MIDI_BASE_NOTE = 36;

window.onload = async () => {
    // Créer le moteur audio
    const engine = new SamplerEngine(SERVER_URL);

    // Créer le séquenceur (logique, pas d'affichage)
    const sequencer = new Sequencer(engine);

    // Créer l'interface GUI (reçoit engine et sequencer)
    const gui = new SamplerGUI(engine, sequencer);

    // Initialiser la GUI
    gui.initialize();

    // Initialiser le contrôleur MIDI
    const midi = new MidiController(engine);
    const midiEnabled = await midi.init();
    
    if (midiEnabled) {
        console.log("Support MIDI activé");
        
        // Enregistrer les handlers MIDI pour les pads (notes 36-61 = 26 pads max)
        // Inspiré de l'approche Mixxx: midi.makeInputHandler([status, note], callback)
        setupMidiHandlers(midi, engine, gui, sequencer);
        
        // Rendre accessible pour debug
        window.midi = midi;
    }

    // Charger la liste des presets
    await gui.loadPresetsList();

    // Exposer pour debug
    window.engine = engine;
    window.sequencer = sequencer;
    window.gui = gui;
}

/**
 * Configure les handlers MIDI pour le sampler
 * Utilise l'API makeInputHandler inspirée de Mixxx
 */
function setupMidiHandlers(midi, engine, gui, sequencer) {
    

    // On traite toutes les notes et on calcule l'index du pad
    midi.makeInputHandler([0x90], function(data) {
        const [status, note, velocity] = data;
        
        // Ignorer les Note On avec velocity 0 (équivalent Note Off)
        if (velocity === 0) return;
        
        // Calculer l'index du pad à partir de la note MIDI
        const padIndex = note - MIDI_BASE_NOTE;
        
        // Vérifier que le pad existe
        if (padIndex >= 0 && padIndex < engine.soundBank.length) {
            // Jouer le son
            engine.playSoundByIndex(padIndex);
            
            // Feedback visuel sur le pad
            triggerPadVisual(gui, padIndex, true);
            
            // Enregistrer dans le séquenceur si en mode rec
            if (sequencer.isRecording && sequencer.isPlaying) {
                sequencer.recordHit(padIndex);
            }
        }
    });

    // feedback quand note relachée
    midi.makeInputHandler([0x80], function(data) {
        const [status, note, velocity] = data;
        const padIndex = note - MIDI_BASE_NOTE;
        
        if (padIndex >= 0 && padIndex < engine.soundBank.length) {
            triggerPadVisual(gui, padIndex, false);
        }
    });

    // controles cc pour effets
    midi.makeInputHandler([0xB0], function(data) {
        const [status, cc, value] = data;
        const normalizedValue = value / 127;

        switch (cc) {
            case 1:  // on passe de modulation a filter
                engine.setFilter(normalizedValue * 100);
                updateSlider('filterSlider', normalizedValue * 100);
                break;
            case 74: // Distortion
                engine.setDistortion(normalizedValue * 100);
                updateSlider('distoSlider', normalizedValue * 100);
                break;
            case 91: // Reverb
                engine.setReverb(normalizedValue * 100);
                updateSlider('reverbSlider', normalizedValue * 100);
                break;
        }
    });

    console.log("🎛️ Handlers MIDI configurés (notes " + MIDI_BASE_NOTE + "-" + (MIDI_BASE_NOTE + 25) + ")");
}

/**
 * Active/désactive l'effet visuel sur un pad
 */
function triggerPadVisual(gui, index, active) {
    if (!gui.padsContainer) return;
    const pad = gui.padsContainer.children[index];
    if (pad) {
        if (active) {
            pad.classList.add('active');
        } else {
            pad.classList.remove('active');
        }
    }
}

/**
 * Met à jour un slider de l'interface
 */
function updateSlider(sliderId, value) {
    const slider = document.getElementById(sliderId);
    if (slider) {
        slider.value = value;
    }
}
