import { Component } from '@angular/core';
// Import du composant liste
import { PresetListComponent } from './components/preset-list/preset-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PresetListComponent],
  template: `
    <header class="app-header">
      <div class="header-content">
        <h1>🎛️ Admin Sampler</h1>
        <nav>
          <a href="http://localhost:8080" target="_blank" class="nav-link">🎹 Ouvrir Sampler</a>
        </nav>
      </div>
    </header>
    <main>
      <app-preset-list></app-preset-list>
    </main>
  `,
  styles: [`
    .app-header {
      background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
      color: white;
      padding: 1rem 2rem;
      border-bottom: 1px solid #333;
    }
    .header-content {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #00bfff;
    }
    .nav-link {
      color: #fff;
      text-decoration: none;
      padding: 8px 16px;
      background: #00bfff;
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .nav-link:hover {
      background: #33ccff;
    }
    main {
      padding: 20px;
    }
  `]
})
export class AppComponent {
  title = 'sampler-admin';
}