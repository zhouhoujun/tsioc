# @tsdi/components/router

Angular-style routing for `@tsdi/components`.

```ts
@Module({
  imports: [RouterModule.forRoot([
    { path: '', component: HomePage },
    { path: 'users/:id', component: UserPage, canActivate: [AuthGuard] },
    { path: '**', redirectTo: '/home' }
  ])],
  declarations: [ShellPage, HomePage, UserPage]
})
class AppModule {}
```

- `<router-outlet></router-outlet>` renders the active route component.
- `[routerLink]="['/users', id]"` navigates on click; `routerLinkActive="active"` toggles the class.
- Inject `Router` for `navigate`, `navigateByUrl`, `url`, `params`, `data` and `events`.
- Guards implement `CanActivate` or use `(snapshot) => boolean | Promise<boolean>`.

## Lazy route modules

Routes support Angular-style lazy loaders:

```ts
const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin.routes').then(m => m.ADMIN_ROUTES)
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports.page').then(m => m.ReportsPage)
  }
];
```

`loadChildren` may resolve to a route array or `{ routes }`. Loaded children are
cached on the route config, so subsequent navigations do not re-import the
module. `loadComponent` is resolved before `NavigationEnd` and cached on the
route for `router-outlet`. Guards run after the lazy route is resolved.
