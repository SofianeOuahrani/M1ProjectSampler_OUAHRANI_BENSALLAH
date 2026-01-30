import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Preset, PresetService } from '../../services/preset.service';
import { PresetFormComponent } from '../preset-form/preset-form.component';

@Component({
  selector: 'app-preset-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PresetFormComponent],
  templateUrl: './preset-list.component.html',
  styleUrl: './preset-list.component.css'
})
export class PresetListComponent implements OnInit {
  presets: Preset[] = [];
  loading = true;
  error = '';

  editingName: string | null = null;
  editValue: string = '';
  showCreateForm = false;

  private presetService = inject(PresetService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadPresets();
  }

  loadPresets(): void {
    this.loading = true;
    this.presetService.getPresets().subscribe({
      next: (data: Preset[]) => {
        this.presets = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = 'Impossible de contacter le serveur.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  deletePreset(name: string): void {
    if(!confirm(`Supprimer "${name}" ?`)) return;
    this.presetService.deletePreset(name).subscribe({
      next: () => {
        this.presets = this.presets.filter(p => p.name !== name);
        this.cdr.detectChanges();
      },
      error: () => alert("Erreur suppression.")
    });
  }

  startEdit(preset: Preset): void {
    this.editingName = preset.name;
    this.editValue = preset.name;
  }

  cancelEdit(): void {
    this.editingName = null;
    this.editValue = '';
  }

  saveEdit(preset: Preset): void {
    if (!this.editValue.trim() || this.editValue === preset.name) {
      this.cancelEdit();
      return;
    }
    const updatedPreset = { ...preset, name: this.editValue };
    this.presetService.updatePreset(preset.name, updatedPreset).subscribe({
      next: () => {
        preset.name = this.editValue;
        this.cancelEdit();
        this.cdr.detectChanges();
      },
      error: () => alert("Erreur modification.")
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
  }

  onPresetCreated(preset: Preset): void {
    this.showCreateForm = false;
    this.loadPresets();
  }

  onFormCancelled(): void {
    this.showCreateForm = false;
  }

  getSoundCount(preset: Preset): number {
    return preset.samples?.length || 0;
  }
}
