import { Routes } from '@angular/router';
import { WorkspacePage } from './features/workspace/workspace-page/workspace-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'collections' },
  { path: 'collections', component: WorkspacePage, title: 'Folio — Local Document Studio' },
  { path: 'collections/:id', component: WorkspacePage, title: 'Folio — Local Document Studio' },
  { path: '**', redirectTo: 'collections' },
];
