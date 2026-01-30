import { Component, inject, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PresetService, Preset } from '../../services/preset.service';

@Component({
  selector: 'app-preset-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preset-form.component.html',
  styleUrl: './preset-form.component.css'
})
export class PresetFormComponent {
  @Output() presetCreated = new EventEmitter<Preset>();
  @Output() cancelled = new EventEmitter<void>();

  private presetService = inject(PresetService);

  presetName: string = '';
  soundUrls: string[] = [''];

  isSubmitting: boolean = false;
  error: string = '';

  addSoundUrl(): void {
    this.soundUrls.push('');
  }

  removeSoundUrl(index: number): void {
    if (this.soundUrls.length > 1) {
      this.soundUrls.splice(index, 1);
    }
  }

  updateUrl(index: number, value: string): void {
    this.soundUrls[index] = value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  isValid(): boolean {
    if (!this.presetName.trim()) return false;
    const validUrls = this.soundUrls.filter(url => url.trim() !== '');
    return validUrls.length > 0;
  }

  extractNameFromUrl(url: string): string {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    } catch {
      return 'Sound';
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.error = '';

    try {
      const samples = this.soundUrls
        .filter(url => url.trim() !== '')
        .map((url, index) => ({
          name: this.extractNameFromUrl(url) || `Sound ${index + 1}`,
          url: url.trim()
        }));

      const newPreset: Preset = {
        name: this.presetName.trim(),
        type: 'user', // Forcé en mode custom pour le backend
        isFactoryPresets: false,
        samples: samples
      };

      this.presetService.createPreset(newPreset).subscribe({
        next: () => {
          this.presetCreated.emit(newPreset);
          this.resetForm();
          this.isSubmitting = false;
        },
        error: (err) => {
          this.error = err.error || 'Erreur lors de la création';
          this.isSubmitting = false;
        }
      });
    } catch (e: any) {
      this.error = e.message || 'Erreur inattendue';
      this.isSubmitting = false;
    }
  }

  resetForm(): void {
    this.presetName = '';
    this.soundUrls = [''];
    this.error = '';
  }

  onCancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }
}
