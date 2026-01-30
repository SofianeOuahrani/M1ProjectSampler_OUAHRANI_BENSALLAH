/**
 * MidiController - Gestion des entrées MIDI
 * Inspiré de l'approche sur ce git hub https://github.com/mixxxdj/mixxx/wiki/Registering-MIDI-Input-Handlers-From-Javascript)
 */

// Objet représentant une connexion MIDI (retourné par makeInputHandler)
class MidiConnection {
    constructor(controller, midiBytes, callback) {
        this.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        this.controller = controller;
        this.midiBytes = midiBytes; 
        this.callback = callback;
        this.connected = true;
    }

    disconnect() {
        if (this.connected) {
            this.controller._removeHandler(this.id);
            this.connected = false;
        }
    }

    reconnect() {
        if (!this.connected) {
            this.controller._addHandler(this);
            this.connected = true;
        }
    }
}

export default class MidiController {
    constructor(engine) {
        this.engine = engine;
        this.midiAccess = null;
        this.handlers = new Map();  // Map<id, MidiConnection>
        
        // Bind pour conserver le contexte
        this.onMidiMessage = this.onMidiMessage.bind(this);
        this.onStateChange = this.onStateChange.bind(this);
    }

    /**
     * Initialise la connexion MIDI
     * @returns {Promise<boolean>}
     */
    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("Web MIDI API non supportée");
            return false;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log("MIDI Access obtenu");
            
            this.midiAccess.onstatechange = this.onStateChange;
            this.connectInputs();
            
            return true;
        } catch (err) {
            console.error("Erreur MIDI:", err);
            return false;
        }
    }

    /**
     * Connecte tous les périphériques MIDI d'entrée
     */
    connectInputs() {
        if (!this.midiAccess) return;

        let count = 0;
        for (const input of this.midiAccess.inputs.values()) {
            console.log(`MIDI Input: ${input.name} (${input.manufacturer})`);
            input.onmidimessage = this.onMidiMessage;
            count++;
        }

        console.log(count > 0 
            ? `${count} périphérique(s) MIDI connecté(s)` 
            : "Aucun périphérique MIDI détecté"
        );
    }

    /**
     * Callback lors d'un changement d'état (connexion/déconnexion)
     */
    onStateChange(event) {
        const port = event.port;
        console.log(`MIDI ${port.type} "${port.name}" ${port.state}`);

        if (port.type === "input") {
            if (port.state === "connected") {
                port.onmidimessage = this.onMidiMessage;
            }
        }
    }

    /**
     * Crée un handler pour un signal MIDI spécifique
     * API inspirée de Mixxx: midi.makeInputHandler([status, note], callback)
     * 
     * @param {number[]} midiBytes - [status] ou [status, note]
     * @param {function} callback - Fonction appelée avec les données MIDI
     * @returns {MidiConnection}
     * 
     * @example
     * // Handler pour Note On sur la note 36 (canal 1)
     * const conn = midi.makeInputHandler([0x90, 36], (data) => {
     *     console.log("Velocity:", data[2]);
     * });
     * 
     * // Plus tard...
     * conn.disconnect();
     */
    makeInputHandler(midiBytes, callback) {
        const connection = new MidiConnection(this, midiBytes, callback);
        this._addHandler(connection);
        return connection;
    }

    /**
     * Ajoute handler
     */
    _addHandler(connection) {
        this.handlers.set(connection.id, connection);
    }

    /**
     * Supprime handler
     */
    _removeHandler(id) {
        this.handlers.delete(id);
    }

    /**
     * Traite  messages MIDI entrants
     */
    onMidiMessage(event) {
        const data = Array.from(event.data);
        const [status, note, velocity] = data;

        // Chercher les handlers correspondants
        for (const handler of this.handlers.values()) {
            if (!handler.connected) continue;

            const [handlerStatus, handlerNote] = handler.midiBytes;

            // Match sur status seul ou status + note
            const statusMatch = handlerStatus === status || 
                               handlerStatus === (status & 0xF0);  // on ignore ici le canal
            const noteMatch = handlerNote === undefined || handlerNote === note;

            if (statusMatch && noteMatch) {
                // Appel du callback avec les données MIDI
                handler.callback.call(this, data);
            }
        }
    }

    /**
     * Retourne la liste périphériques connectés
     */
    getDevices() {
        if (!this.midiAccess) return [];

        const devices = [];
        for (const input of this.midiAccess.inputs.values()) {
            devices.push({
                id: input.id,
                name: input.name,
                manufacturer: input.manufacturer,
                state: input.state
            });
        }
        return devices;
    }

    /**
     * Supprime les handlers
     */
    clearAllHandlers() {
        this.handlers.clear();
    }
}
