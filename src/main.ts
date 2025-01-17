import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, Routes } from '@angular/router';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'home', 
    pathMatch: 'full' as 'full'
  },
  { 
    path: 'home', 
    loadComponent: () => import('./app/home/home.component').then(m => m.HomeComponent)
  },
  { 
    path: 'services', 
    loadComponent: () => import('./app/services/services.component').then(m => m.ServicesComponent)
  },
  { 
    path: 'feuille-de-temps', 
    loadComponent: () => import('./app/feuille-de-temps/feuille-de-temps.component').then(m => m.FeuilleDeTempsComponent)
  },
  { 
    path: 'jeux', 
    loadComponent: () => import('./app/jeux/jeux.component').then(m => m.JeuxComponent)
  },
  { 
    path: 'about', 
    loadComponent: () => import('./app/about/about.component').then(m => m.AboutComponent)
  },
  { 
    path: 'contact', 
    loadComponent: () => import('./app/contact/contact.component').then(m => m.ContactComponent)
  }
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes)
  ]
}).catch(err => console.error(err));
