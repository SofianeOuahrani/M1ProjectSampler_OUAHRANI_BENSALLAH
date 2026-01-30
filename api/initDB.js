import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Preset from './model/preset.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESETS_DIR = path.join(__dirname, 'presets');

const importPresets = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Lire le contenu du dossier presets
    const files = await fs.readdir(PRESETS_DIR);

    for (const file of files) {
      // On ne traite que les fichiers qui finissent par .json
      if (path.extname(file) === '.json') {
        const jsonPath = path.join(PRESETS_DIR, file);
        console.log(`\n📄 Lecture de : ${file}`);

        try {
          // 1. Lecture
          const data = await fs.readFile(jsonPath, 'utf-8');
          const presetJson = JSON.parse(data);

          // 2. Nettoyage / Validation
          if (!presetJson.name) {
            console.log('   ⚠️  JSON ignoré (pas de nom)');
            continue;
          }

          // On s'assure que c'est marqué comme "Usine"
          presetJson.isFactoryPresets = true;
          if (!presetJson.type) presetJson.type = 'Drumkit';

          // 3. Vérification doublon
          const exists = await Preset.findOne({ name: presetJson.name });

          if (!exists) {
            await Preset.create(presetJson);
            console.log(`   ✅ SUCCÈS : "${presetJson.name}" importé !`);
          } else {
            console.log(`   ⚠️  Déjà existant : "${presetJson.name}"`);
          }

        } catch (err) {
          console.error(`   ❌ Erreur lecture/import :`, err.message);
        }
      }
    }

    console.log('\n🎉 Opération terminée !');
    console.log('👉 Tu peux relancer le serveur avec "npm run start"');
    process.exit();

  } catch (error) {
    console.error("Erreur critique:", error);
    process.exit(1);
  }
};

importPresets();
