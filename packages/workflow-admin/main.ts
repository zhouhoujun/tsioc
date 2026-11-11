import { Application } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { WorkflowAdminAppModule } from './src/ui/app.module';
import { WorkflowAdminShellComponent } from './src/ui/shell';

async function boot(): Promise<void> {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = 'Booting workflow admin…';
    }
    const ctx = await Application.run(WorkflowAdminShellComponent, {
        deps: [HtmlTemplateModule, ComponentsModule, WorkflowAdminAppModule],
        providers: [{ provide: DOCUMENT, useValue: document }]
    });
    const ref = ctx.runners.getRef(WorkflowAdminShellComponent) as ComponentRef<WorkflowAdminShellComponent>;
    const container = document.getElementById('workflow-app');
    if (!container) {
        throw new Error('workflow-app container missing');
    }
    container.appendChild((ref as any).elementRef.nativeElement as HTMLElement);
    if (status) {
        status.remove();
    }
    (window as any).workflowContext = ctx;
}

boot().catch(error => {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = `启动失败：${(error as Error).message}`;
    }
    console.error(error);
});
