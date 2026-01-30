import Preset from '../model/preset.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "presets");

// 1. GET ALL
async function getPresets(req, res) {
    try {
        const presets = await Preset.find().sort({ updatedAt: -1 });
        res.json(presets);
    } catch (err) {
        res.status(500).send(err);
    }
}

// 2. GET ONE
async function getPreset(req, res) {
    try {
        const preset = await Preset.findOne({ name: req.params.name });
        if (!preset) return res.status(404).send("Preset introuvable");
        res.json(preset);
    } catch (err) {
        res.status(500).send(err);
    }
}

// 3. POST
async function postPreset(req, res) {
    try {
        const exists = await Preset.findOne({ name: req.body.name });
        if(exists) return res.status(400).send("Ce nom existe déjà.");

        let preset = new Preset(req.body);
        const saved = await preset.save();
        res.status(201).json({ message: `${saved.name} saved!`, preset: saved });
    } catch (err) {
        res.status(400).send(err);
    }
}

// 4. PUT
async function updatePreset(req, res) {
    try {
        const updated = await Preset.findOneAndUpdate(
            { name: req.params.name },
            { $set: req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!updated) return res.status(404).send("Non trouvé");
        res.json({ message: 'updated', preset: updated });
    } catch (err) {
        res.status(500).send(err);
    }
}

// 5. DELETE
async function deletePreset(req, res) {
    try {
        const deleted = await Preset.findOneAndDelete({ name: req.params.name });
        if (!deleted) return res.status(404).send("Non trouvé");

        if (!deleted.isFactoryPresets) {
            const folderPath = path.join(DATA_DIR, req.params.name);
            fs.rm(folderPath, { recursive: true, force: true }).catch(() => {});
        }
        res.json({ message: "Preset supprimé" });
    } catch (err) {
        res.status(500).send(err);
    }
}

// 6. UPLOAD
function uploadAudio(req, res) {
    res.json({ message: "Fichiers uploadés", files: req.files });
}

export { getPresets, getPreset, postPreset, updatePreset, deletePreset, uploadAudio };
