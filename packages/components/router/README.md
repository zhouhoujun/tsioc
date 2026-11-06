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
