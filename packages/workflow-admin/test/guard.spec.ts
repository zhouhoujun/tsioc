import expect = require('expect');
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { WorkflowAdminAppModule } from '../src/ui/app.module';
import { WorkflowAdminShellComponent } from '../src/ui/shell';

async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
}

function jsonResponse(body: any, status = 200): any {
    const payload = new TextEncoder().encode(JSON.stringify(body));
    return {
        ok: status >= 200 && status < 300,
        status,
        url: 'http://localhost/',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(payload);
                controller.close();
            }
        }),
        async json() { return body; },
        async text() { return JSON.stringify(body); }
    };
}

describe('workflow admin route guard', () => {
    let ctx: ApplicationContext | undefined;
    let originalFetch: any;
    let originalWindow: any;
    let originalLocation: any;
    let originalHistory: any;
    let originalDocument: any;

    beforeEach(() => {
        originalFetch = (globalThis as any).fetch;
        originalWindow = (globalThis as any).window;
        originalLocation = (globalThis as any).location;
        originalHistory = (globalThis as any).history;
        originalDocument = (globalThis as any).document;
    });

    afterEach(async () => {
        (globalThis as any).fetch = originalFetch;
        (globalThis as any).window = originalWindow;
        (globalThis as any).location = originalLocation;
        (globalThis as any).history = originalHistory;
        (globalThis as any).document = originalDocument;
        await ctx?.close();
        ctx = undefined;
    });

    it('redirects to login and never renders the designer when unauthenticated', async () => {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="workflow-app"></div></body></html>', {
            url: 'http://localhost/',
            pretendToBeVisual: true
        });
        const win: any = dom.window;
        (globalThis as any).window = win;
        (globalThis as any).location = win.location;
        (globalThis as any).history = win.history;
        (globalThis as any).document = win.document;
        (globalThis as any).fetch = async (url: string) => {
            const path = String(url).replace(/^https?:\/\/[^/]+/, '');
            if (path === '/auth/session') {
                return jsonResponse({ authenticated: false }, 401);
            }
            return jsonResponse({ message: 'not found' }, 404);
        };

        ctx = await Application.run(WorkflowAdminShellComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, WorkflowAdminAppModule],
            providers: [{ provide: DOCUMENT, useValue: win.document }]
        });
        const ref = ctx.runners.getRef(WorkflowAdminShellComponent) as ComponentRef<WorkflowAdminShellComponent>;
        win.document.getElementById('workflow-app')!.appendChild((ref as any).elementRef.nativeElement);

        for (let attempt = 0; attempt < 30; attempt++) {
            await flush();
            if ((win.location.hash || '').includes('login')) {
                break;
            }
        }
        await flush();

        expect(win.location.hash).toContain('login');
        expect(!!win.document.querySelector('workflow-admin-login, .wa-login')).toBe(true);
        expect(!!win.document.querySelector('workflow-designer, workflow-admin-designer')).toBe(false);
    });
});
