export default class FreesoundClient {
    constructor() {
        // notre clé API (c'était pas évident)
        this.apiKey = "cQfaAVaInOifMKmloj3SIdcWfK5pBkRKUEHxvPsK";
        this.baseUrl = "https://freesound.org/apiv2";
    }

    async searchSounds(query) {
        // On demande le nom, les previews et la durée
        // On limite à 15 résultats pour ne pas surcharger la liste (on en a fais les frais...)
        const fields = "id,name,previews,duration,username";
        const url = `${this.baseUrl}/search/text/?query=${encodeURIComponent(query)}&fields=${fields}&page_size=15&token=${this.apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Erreur Freesound");
            const data = await response.json();
            return data.results; // Retourne le tableau de sons
        } catch (error) {
            console.error("Freesound error:", error);
            return [];
        }
    }
}
