import { Application } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import {
    createDefaultWorkflowDefinition,
    HttpWorkflowDefinitionStore,
    WorkflowDesignerComponent,
    WorkflowModule
} from '@tsdi/activities';
import { WorkflowCodeEditorModule } from '@tsdi/activities/web';

async function boot(): Promise<void> {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = 'Booting workflow designer…';
    }
    const ctx = await Application.run(WorkflowDesignerComponent, {
        deps: [HtmlTemplateModule, WorkflowModule, WorkflowCodeEditorModule],
        providers: [{
            provide: DOCUMENT,
            useValue: document
        }]
    });
    const ref = ctx.runners.getRef(WorkflowDesignerComponent) as ComponentRef<WorkflowDesignerComponent>;
    const container = document.getElementById('workflow-app');
    if (!container) {
        throw new Error('workflow-app container missing');
    }
    const host = (ref as any).elementRef.nativeElement as HTMLElement;
    container.appendChild(host);

    // Persist through the framework HTTP microservice (`demo/serve.ts`).
    ref.instance.store = new HttpWorkflowDefinitionStore({ baseUrl: '/api' });

    const fitSoon = () => {
        const run = () => ref.instance.fitView();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(run);
        } else {
            run();
        }
    };

    const locale = localStorage.getItem('workflow-demo-locale') || 'en';
    const applyLocale = (next: 'en' | 'zh-CN') => {
        ref.instance.locale = next;
        // Only the untouched starter document needs re-localized default names;
        // switching language must never discard user edits.
        if (!ref.instance.designer.dirty) {
            ref.instance.designer.load(
                createDefaultWorkflowDefinition(ref.instance.designer.registry, next)
            );
            fitSoon();
        }
        localStorage.setItem('workflow-demo-locale', next);
    };
    applyLocale(locale === 'zh-CN' ? 'zh-CN' : 'en');
    document.getElementById('lang-en')?.addEventListener('click', () => applyLocale('en'));
    document.getElementById('lang-zh')?.addEventListener('click', () => applyLocale('zh-CN'));

    // Remember the last theme across reloads; the component stays host-agnostic.
    const savedTheme = localStorage.getItem('workflow-demo-theme');
    if (savedTheme) {
        ref.instance.setTheme(savedTheme);
    }
    ref.instance.themeChangeAction = theme => localStorage.setItem('workflow-demo-theme', theme);

    if (status) {
        status.remove();
    }
    // Expose for preview/debug tooling and console demos.
    (window as any).workflowDesigner = ref.instance;
    (window as any).workflowContext = ctx;
    (window as any).setWorkflowLocale = applyLocale;
}

boot().catch(error => {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = `启动失败：${(error as Error).message}`;
    }
    console.error(error);
});
