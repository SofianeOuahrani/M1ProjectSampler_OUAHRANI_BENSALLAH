import mongoose from 'mongoose';
const { Schema } = mongoose;

// Sous-document pour les sons
const SampleSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }
});

// Schéma principal
const PresetSchema = new Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, default: "user" },
  isFactoryPresets: { type: Boolean, default: false },
  samples: [SampleSchema],
  updatedAt: { type: Date, default: Date.now }
});

// Export du modèle
export default mongoose.model('Preset', PresetSchema);
