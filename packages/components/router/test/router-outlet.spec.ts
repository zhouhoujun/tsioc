import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule, OnInit } from '@tsdi/components';
import { Module } from '@tsdi/ioc';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { Router, RouterLinkDirective, RouterModule, RouterOutlet } from '../src';

@Component({ selector: 'test-home', template: '<p>Home page</p>' })
class HomePage {}

@Component({
    selector: 'test-user',
    template: '<p>User {{id}}</p>'
})
class UserPage {
    constructor(private router: Router) {}
    get id(): string { return this.router.params['id'] || ''; }
}

let secureCreated = 0;

@Component({ selector: 'test-secure', template: '<p class="secure-page">Secure page</p>' })
class SecurePage {
    constructor() { secureCreated++; }
}

@Component({ selector: 'test-page-a', template: '<p class="page-a">Page A</p>' })
class PageA {}

@Component({ selector: 'test-page-b', template: '<p class="page-b">Page B</p>' })
class PageB {}

@Component({
    selector: 'router-outlet-test-host',
    imports: [RouterOutlet, RouterLinkDirective, HomePage, UserPage, PageA, PageB],
    template: '<section class="router-host"><router-outlet></router-outlet><a class="to-user" [routerLink]="[\'/users\', 7]">User</a></section>'
})
class RouterHost {
    constructor(private router: Router) {}
    get url(): string { return this.router.url; }
}

@Component({
    selector: 'test-router-shell',
    imports: [RouterOutlet, SecurePage, PageA, PageB],
    template: '<router-outlet></router-outlet>'
})
class RouterShell implements OnInit {
    constructor(private router: Router) {}
    onInit(): Promise<void> {
        return this.router.navigateByUrl('/secure').then(() => undefined);
    }
}

@Module({
    declarations: [HomePage, UserPage],
    exports: [HomePage, UserPage]
})
class RouterPagesModule {}

const ROUTES = [
    { path: '', component: HomePage },
    { path: 'users/:id', component: UserPage }
];

@Suite('router outlet and link')
export class RouterOutletTest {
    ctx!: ApplicationContext;

    @After()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }

    @Test('renders the active outlet and navigates through routerLink')
    async outletAndLink() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(RouterHost, {
            deps: [HtmlTemplateModule, ComponentsModule, RouterModule.forRoot(ROUTES, '/')],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(RouterHost) as ComponentRef<RouterHost>;
        await ref.render();
        for (let index = 0; index < 40; index++) await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        expect(root.textContent).toContain('Home page');

        const link = root.querySelector('.to-user') as any;
        link.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
        for (let index = 0; index < 40; index++) await Promise.resolve();
        expect(root.textContent).toContain('User 7');
        expect(ref.instance.url).toEqual('/users/7');

        await this.ctx.get(Router).navigateByUrl('/users/8');
        for (let index = 0; index < 40; index++) await Promise.resolve();
        expect(root.textContent).toContain('User 8');
        dom.window.close();
    }

    @Test('does not create a guarded page before the guard allows navigation')
    async guardedPageIsNotCreatedBeforeActivation() {
        secureCreated = 0;
        let allowed = false;
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(RouterShell, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                RouterModule.forRoot([
                    { path: 'secure', component: SecurePage, canActivate: [() => allowed] }
                ], '/secure')
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(RouterShell) as ComponentRef<RouterShell>;
        await ref.render();
        for (let index = 0; index < 40; index++) await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        expect(secureCreated).toBe(0);
        expect(root.textContent).not.toContain('Secure page');

        allowed = true;
        expect(await this.ctx.get(Router).navigateByUrl('/secure')).toBe(true);
        for (let index = 0; index < 40; index++) await Promise.resolve();
        expect(secureCreated).toBe(1);
        expect(root.textContent).toContain('Secure page');
        dom.window.close();
    }

    @Test('does not create lazily loaded pages when the parent guard rejects')
    async lazyParentGuardBlocksOutletActivation() {
        secureCreated = 0;
        let allowed = false;
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(RouterShell, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                RouterModule.forRoot([
                    {
                        path: '',
                        canActivate: [() => allowed],
                        loadChildren: async () => [{ path: 'secure', component: SecurePage }]
                    }
                ], '/secure')
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(RouterShell) as ComponentRef<RouterShell>;
        await ref.render();
        for (let index = 0; index < 40; index++) await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        expect(secureCreated).toBe(0);
        expect(root.textContent).not.toContain('Secure page');

        allowed = true;
        expect(await this.ctx.get(Router).navigateByUrl('/secure')).toBe(true);
        for (let index = 0; index < 40; index++) await Promise.resolve();
        expect(secureCreated).toBe(1);
        expect(root.textContent).toContain('Secure page');
        dom.window.close();
    }

    @Test('replaces the outlet component when the leaf route changes')
    async leafRouteChangeReplacesComponent() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(RouterHost, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                RouterModule.forRoot([
                    { path: 'a', component: PageA },
                    { path: 'b', component: PageB }
                ], '/a')
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(RouterHost) as ComponentRef<RouterHost>;
        await ref.render();
        for (let index = 0; index < 40; index++) await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        expect(root.querySelector('.page-a')).toBeTruthy();

        expect(await this.ctx.get(Router).navigateByUrl('/b')).toBe(true);
        for (let index = 0; index < 40; index++) await Promise.resolve();
        expect(root.querySelector('.page-b')).toBeTruthy();
        expect(root.querySelector('.page-a')).toBeNull();
        dom.window.close();
    }
}
