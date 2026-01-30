# Audio Sampler - Projet M1 INFO 2025-2026

## Description

Application web de sampling audio complète permettant de créer, éditer et jouer des kits de sons. Le projet est composé de trois modules distincts :
- **Front-end Sampler** : Interface de sampling avancée (Pads, Effets, Séquenceur).
- **Back-end API** : Serveur Node.js/Express relié à MongoDB Atlas pour la persistance des données.
- **Angular Admin** : Interface d'administration pour gérer les kits (presets).

---

## Répartition du travail (Binôme)

| Membre      | Tâches réalisées                                                                 |
|-------------|----------------------------------------------------------------------------------|
| BENSALLAH Younes   | Architecture du moteur audio (Web Audio API), chaîne d'effets, séquenceur, module d'enregistrement micro |
| OUAHRANI Sofiane    | Interface graphique (GUI), intégration de l'API Freesound, système de sauvegarde, application Angular (Admin)           |

---

## Utilisation de l'intelligence artificielle

Conformément aux consignes, voici le détail de l'utilisation des assistants IA sur ce projet.

### Outils utilisés
- **GitHub Copilot** (intégrations IDE)
- **Claude / Gemini** (pour l'architecture et le refactoring)

### Parties générées ou assistées par IA

| Partie                        | Outil    | Description de l'intervention                                                                 |
|-------------------------------|----------|-----------------------------------------------------------------------------------------------|
| Structure des classes ES6     | Copilot  | Autocomplétion lors de l'écriture des classes JS                                              |
| Effets audio (Reverb)         | Copilot  | Aide pour la génération d'une "Impulse Response" (Convolver)                                  |
| Refactoring MIDI              | Gemini   | Aide à la transformation du code procédural (JSBin) en classe `MidiController` orientée objet |
| CSS Grid Layout               | Copilot  | Suggestions pour la structure responsive (3 colonnes)                                         |

---

## Installation et lancement

### Prérequis
- Node.js 18 ou supérieur
- npm ou yarn

### 1. Backend (API)

**Hébergement Cloud (Render)** :
L'API est déployée et active sur **Render**.
Il n'est pas nécessaire de lancer le serveur localement pour tester le projet. L'application Angular et le Sampler sont configurés pour communiquer directement avec l'URL de production :
`https://projet-sampler-audio-angular.onrender.com`

*(Le code source de l'API est situé dans le dossier `api/`)*

### 2. Frontend (Sampler)

Pour tester le Sampler, il suffit de servir les fichiers statiques.

```bash
cd front
# Avec Python
python3 -m http.server 8080
# OU simplement via l'extension VS Code "Live Server" sur le fichier index.html

```

Ouvrir : http://localhost:8080

### 3. Angular Admin

Pour lancer l'interface d'administration :

```bash
cd sampler-admin
npm install
ng serve

```

Ouvrir : http://localhost:4200

---

## Fonctionnalités implémentées

### Front-end (Sampler) - Obligatoire

| Fonctionnalité | Statut | Description |
| --- | --- | --- |
| **Séparation GUI/Moteur** | ✅ Oui | Architecture découplée (`SamplerEngine.js` vs `SamplerGUI.js`) |
| **Test headless** | ✅ Oui | Page `test_headless.html` avec tests automatisés sans DOM |
| **Menu presets dynamique** | ✅ Oui | Chargement AJAX depuis l'API |
| **Filtre Usine/Custom** | ✅ Oui | Distinction entre kits de base (verrouillés) et utilisateur |
| **Barres de progression** | ✅ Oui | Animation lors du chargement des buffers (Streams) |
| **Affichage waveform** | ✅ Oui | Canvas interactif avec visualisation du signal |
| **Trimming des sons** | ✅ Oui | Réglage des points de début/fin par échantillon |
| **Mapping clavier** | ✅ Oui | Touches A-Z mappées sur les pads |

### Front-end - Optionnel (Bonus)

| Fonctionnalité | Statut | Description |
| --- | --- | --- |
| **Enregistrement micro** | ✅ Oui | Module `AudioRecorder.js` avec **découpe automatique des silences** |
| **Freesound.org** | ✅ Oui | Recherche et pré-écoute de sons en ligne avant import |
| **Sauvegarde preset** | ✅ Oui | Upload combiné (Fichiers audio + JSON) vers le serveur |
| **Support MIDI** | ✅ Oui | Compatible contrôleurs USB (Mapping dynamique Note On/CC) |
| **Effets globaux** | ✅ Oui | Distorsion, Filtre passe-bas, Reverb, Vitesse |
| **Effets par pad** | ✅ Oui | Volume, Panoramique, Reverse, Pitch individuels |
| **Séquenceur** | ✅ Oui | Grille 16 pas, enregistrement temps réel et lecture |

### Back-end

| Fonctionnalité | Statut | Description |
| --- | --- | --- |
| **API REST** | ✅ Oui | CRUD complet pour les presets |
| **MongoDB Atlas** | ✅ Oui | Base de données cloud (NoSQL) |
| **Upload** | ✅ Oui | Gestion fichiers via Multer (Stockage disque) |

### Angular (Admin)

| Fonctionnalité | Statut | Description |
| --- | --- | --- |
| **Liste des presets** | ✅ Oui | Affichage global avec badge Usine/Custom |
| **Renommage** | ✅ Oui | Edition "Inline" (Double-clic / Entrée) |
| **Suppression** | ✅ Oui | Avec confirmation |
| **Création** | ✅ Oui | Formulaire pour créer un kit via URLs |

---

## Structure du projet

```text
ProjetWeb/
├── api/                    (Backend Node.js)
│   ├── server.js           (Point d'entrée Express)
│   ├── model/              (Schémas Mongoose)
│   ├── routes/             (Logique métier)
│   └── presets/            (Stockage fichiers audio)
│
├── front/                  (Frontend Sampler)
│   ├── index.html          (Interface principale)
│   ├── test_headless.html  (Preuve de découplage Moteur/GUI)
│   ├── css/                (Styles)
│   └── js/                 (Logique modulaire ES6)
│       ├── main.js         (Orchestrateur)
│       ├── samplerEngine.js(Web Audio API)
│       ├── samplerGUI.js   (Gestion DOM/Evénements)
│       ├── midiController.js (Gestion MIDI Hardware)
│       └── ...
│
└── sampler-admin/          (App Angular 17+)
    └── src/app/
        ├── components/     (PresetList, PresetForm)
        └── services/       (PresetService - HTTP Client)

```

---

## Guide d'utilisation rapide

### 🎹 Sampler

1. **Charger un kit** : Via le menu déroulant ou la recherche Freesound.
2. **Jouer** : Pads, Clavier (A-Z) ou Contrôleur MIDI.
3. **Modifier** : Cliquer sur un pad pour afficher la Waveform. Ajuster les barres blanches pour le *Trim*.
4. **Effets** : Utiliser les sliders pour modifier le son global ou par pad.
5. **Enregistrer** : Bouton **REC** (parle dans le micro, le silence découpe automatiquement les samples).

### 🎛️ Admin Angular

1. Visualiser la liste de tous les kits présents en base.
2. **Renommer** un kit custom en cliquant sur le bouton "Crayon".
3. **Supprimer** un kit obsolète via la "Corbeille".
4. **Créer** un nouveau kit en collant des URLs de fichiers audio (mp3/wav).

---

## Auteurs

**BENSALLAH Younes** & **OUHARANI Sofiane**
*Master 1 Informatique - Université Côte d'Azur*
