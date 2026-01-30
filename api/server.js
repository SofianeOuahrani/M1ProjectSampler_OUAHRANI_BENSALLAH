import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Import de nos routes
import * as presetRoutes from './routes/presets.js';

// config chemins 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "presets");

// config dotenv
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

// connexion mongodb
mongoose.Promise = global.Promise;
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error(" ERREUR: MONGODB_URI manquant dans le fichier .env");
    process.exit(1);
}

mongoose.connect(uri)
  .then(() => {
      console.log(" Connecté à MongoDB Atlas !");
  })
  .catch(err => {
      console.error(" Erreur connexion DB:", err);
  });


app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use("/presets", express.static(DATA_DIR));

// config multer
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const folder = req.params.folder || "default";
      const destDir = path.join(DATA_DIR, folder);
      try {
        await fs.mkdir(destDir, { recursive: true });
        cb(null, destDir);
      } catch (err) { cb(err, null); }
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
});

// routes
const prefix = '/api';

app.route(prefix + '/presets')
    .get(presetRoutes.getPresets)
    .post(presetRoutes.postPreset);

app.route(prefix + '/presets/:name')
    .get(presetRoutes.getPreset)
    .put(presetRoutes.updatePreset)
    .delete(presetRoutes.deletePreset);

app.route(prefix + '/upload/:folder')
    .post(upload.array("files"), presetRoutes.uploadAudio);

// start
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
