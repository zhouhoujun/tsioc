# @tsdi/components/router

Angular-style routing for `@tsdi/components`.

The router is renderer-neutral: route matching, guards, lazy loading and
navigation state live in a DI service, while `router-outlet` and `[routerLink]`
are ordinary directives that work with the HTML, console and XML renderers.

## Architecture

```
RouterModule.forRoot(routes)
        │  provides ROUTES + ROUTER_INITIAL_URL
        ▼
Router (service)                     RouterOutlet (directive)
 ├─ match(path, :params, **)          ├─ renders the route component
 ├─ redirects (max 20)                ├─ one outlet per nesting depth
 ├─ loadChildren / loadComponent      │   (ACTIVATED_ROUTE / ROUTE_OUTLET_DEPTH)
 ├─ canActivate guards                └─ owns ComponentRef lifecycle
 ├─ events: NavigationStart | RoutesRecognized |
 │          NavigationEnd | NavigationCancel | NavigationError
 └─ url / activeRoute / activeLeaf / params / data / navigated

RouterLinkDirective ([routerLink])
 ├─ click → router.navigate(commands, extras)
 ├─ keeps href in sync
 └─ routerLinkActive toggles a class via router.events + isActive()
```

| Export | Purpose |
| --- | --- |
| `RouterModule.forRoot(routes, initialUrl = '/')` | Root config; also `withRoutes(...)` alias. Provides `Router`, `RouterOutlet`, `RouterLinkDirective` and the route tokens. |
| `Router` | `navigate(commands, extras)`, `navigateByUrl(url, extras)`, `url`, `activeRoute`, `activeLeaf`, `params`, `data`, `navigating`, `navigated`, `isActive(url, exact?)`, `events` (rxjs-backed `EventEmitter`), `resetConfig(routes)`. |
| `RouterOutlet` | Selector `router-outlet` / `[routerOutlet]`. Renders the component for its depth; guarded routes activate only after `NavigationEnd` (never from the constructor's unguarded initial match). |
| `RouterLinkDirective` | Selector `[routerLink]`. Accepts a string or command array; inputs `routerLink`, `routerLinkActive`, `queryParams`, `fragment`. Ignores modified clicks (middle/ctrl/meta/shift) and respects `defaultPrevented`. |
| Tokens | `ROUTES`, `ROUTER_INITIAL_URL`, `ACTIVATED_ROUTE`, `ROUTE_OUTLET_DEPTH` (for hosts that build nested outlets/manually create components). |

## Route configuration

```ts
import { Routes } from '@tsdi/components/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home' },
  { path: 'users/:id', component: UserPage, canActivate: [AuthGuard],
    data: { title: 'User' } },
  { path: 'admin', loadChildren: () => import('./admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: 'reports', loadComponent: () => import('./reports.page').then(m => m.ReportsPage) },
  { path: '**', redirectTo: '/home' }
];
```

| Field | Meaning |
| --- | --- |
| `path` | Static segments and `:params`; `**` matches the rest. Empty string matches the parent URL. |
| `pathMatch` | `prefix` (default) or `full`. |
| `component` | Eager route component. |
| `loadComponent` | Lazy component (`() => import(...).then(m => m.Page)` or `{ component }`); resolved before `NavigationEnd` and cached on the route. |
| `loadChildren` | Lazy child route array (or `{ routes }`); cached on the route config so re-navigation does not re-import. |
| `children` | Nested routes rendered by a nested `<router-outlet>`. |
| `redirectTo` | Resolved through the same matcher (redirect loops fail after 20 hops). |
| `data` | Copied into the activation snapshot. |
| `canActivate` | Class implementing `CanActivate` or a `(snapshot) => boolean \| Promise<boolean>` function. Guards run parent → child after lazy resolution; any `false` cancels navigation. |

`ActivatedRouteSnapshot` exposes `url`, `path`, `params`, `data`, `route` and
`children`. Nested outlets receive the snapshot they own through DI, and
component-less parent routes are skipped when resolving outlet depth.

## Usage

### Root shell

```ts
import { Module } from '@tsdi/ioc';
import { Component, ComponentsModule, OnDestroy, OnInit } from '@tsdi/components';
import { Router, RouterModule } from '@tsdi/components/router';

@Module({
  imports: [ComponentsModule, RouterModule.forRoot(routes)],
  providers: [AuthGuard]
})
export class AppModule {}

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {
  private sub?: { unsubscribe(): void };

  constructor(private router: Router) {}

  onInit() {
    this.sub = this.router.events.subscribe(event => {
      if (event?.type === 'NavigationEnd') {
        // host concern: mirror router.url into location.hash, title, etc.
      }
    });
    void this.router.navigateByUrl('/');
  }

  onDestroy() { this.sub?.unsubscribe(); }
}
```

Add `HtmlTemplateModule` (browser) or `ConsoleTemplateModule` (terminal) to the
application deps, as with any component app.

### Links

```html
<a [routerLink]="['/users', user.id]" routerLinkActive="active">Profile</a>
<a routerLink="/search" [queryParams]="{ q: query }" fragment="results">Search</a>
```

`[routerLinkActive]` adds the class when `router.isActive(path)` is true and
removes it on the next navigation event.

### Nested layouts

```html
<!-- shell for /admin -->
<header>…</header>
<router-outlet></router-outlet>
<footer>…</footer>
```

A nested outlet reads `ACTIVATED_ROUTE` / `ROUTE_OUTLET_DEPTH` from its injector.
Do not render the same child page in two outlets at the same depth.

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

## Navigation semantics

- `navigate(commands, extras)` joins commands into a URL, appending
  `queryParams` / `fragment`. `NavigationExtras.replaceUrl` is reserved for hosts
  (the router does not manipulate browser history itself).
- URLs normalize to a leading `/`, collapse duplicate slashes and ignore
  trailing slashes; `#`/`?` parts are stripped before matching.
- A navigation emits `NavigationStart` → `RoutesRecognized` → `NavigationEnd`,
  or `NavigationCancel` (no match/guard rejected) / `NavigationError`
  (loader or guard threw). Only one navigation runs at a time; a concurrent call
  returns `false`.
- `navigated` stays `false` until the first guarded navigation completes; the
  constructor's initial match is unguarded by design.

## Testing

```bash
cd packages/components/router
npm run test
```

Specs drive the real `Router`/outlet/link directives (no stubbed matcher) and
assert URL state, events, guard ordering, nesting depth and lazy caching. Run the
`@tsdi/components` and renderer suites too when changing directive compilation or
`ViewContainerRef` behavior.
