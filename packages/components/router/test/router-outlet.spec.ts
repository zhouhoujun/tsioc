import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
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

@Component({
    selector: 'router-outlet-test-host',
    imports: [RouterOutlet, RouterLinkDirective, HomePage, UserPage],
    template: '<section class="router-host"><router-outlet></router-outlet><a class="to-user" [routerLink]="[\'/users\', 7]">User</a></section>'
})
class RouterHost {
    constructor(private router: Router) {}
    get url(): string { return this.router.url; }
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
}
