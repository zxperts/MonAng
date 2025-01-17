import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor]
})
export class HeaderComponent {
  menuItems = [
    { path: '/home', label: 'Home' },
    { path: '/services', label: 'Services' },
    { path: '/feuille-de-temps', label: 'Feuille de temps' },
    { path: '/jeux', label: 'Jeux' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' }
  ];
} 