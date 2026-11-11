import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { Router, RouterModule, RouterOutlet } from '../src';

@Component({ selector: 'guard-secure', template: '<p class="secure">Secure</p>' })
class SecurePage {}

@Component({ selector: 'guard-login', template: '<p class="login">Login</p>' })
class LoginPage {}

@Component({
    selector: 'guard-outlet-host',
    imports: [RouterOutlet],
    template: '<router-outlet></router-outlet>'
})
class GuardOutletHost {}

async function flush(): Promise<void> {
    for (let index = 0; index < 20; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

@Suite('router outlet guards with lazy routes')
export class RouterOutletGuardTest {
    ctx!: ApplicationContext;

    @After()
    async clean() {
        await this.ctx?.close();
    }

    @Test('does not render a guarded lazy component until the guard allows it')
    async lazyGuardOutlet() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        let allowed = false;
        this.ctx = await Application.run(GuardOutletHost, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                RouterModule.forRoot([
                    { path: 'login', component: LoginPage },
                    {
                        path: '',
                        canActivate: [() => allowed],
                        loadChildren: async () => [{ path: '', component: SecurePage }]
                    }
                ], '/login')
            ],
            providers: [{ provide: DOCUMENT, useValue: dom.window.document }]
        });
        const ref = this.ctx.runners.getRef(GuardOutletHost) as ComponentRef<GuardOutletHost>;
        await ref.render();
        await flush();
        const root = ref.hostView.rootNodes[0] as any;
        const router = this.ctx.get(Router);
        expect(root.querySelector('.login')).toBeTruthy();
        expect(root.querySelector('.secure')).toBeFalsy();

        expect(await router.navigateByUrl('/')).toBe(false);
        await flush();
        expect(root.querySelector('.secure')).toBeFalsy();

        allowed = true;
        expect(await router.navigateByUrl('/')).toBe(true);
        await flush();
        expect(root.querySelector('.secure')).toBeTruthy();
        dom.window.close();
    }
}
