import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Preset {
  name: string;
  type?: string;
  isFactoryPresets?: boolean;
  samples?: { name: string; url: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class PresetService {
  private apiUrl = 'https://projet-sampler-audio-angular.onrender.com/api/presets';

  constructor(private http: HttpClient) { }

  getPresets(): Observable<Preset[]> {
    return this.http.get<Preset[]>(this.apiUrl);
  }

  getPreset(name: string): Observable<Preset> {
    return this.http.get<Preset>(`${this.apiUrl}/${name}`);
  }

  createPreset(preset: Preset): Observable<any> {
    return this.http.post(this.apiUrl, preset);
  }

  deletePreset(name: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${name}`);
  }

  updatePreset(name: string, data: Preset): Observable<any> {
    return this.http.put(`${this.apiUrl}/${name}`, data);
  }
}
