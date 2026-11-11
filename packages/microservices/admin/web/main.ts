import { Application } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DOCUMENT } from '@tsdi/common';
import { GatewayAdminComponent } from './admin.component';
import { GatewayAdminAppModule } from './admin.module';

async function boot(): Promise<void> {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = 'Starting microservice admin…';
    }
    const ctx = await Application.run(GatewayAdminComponent, {
        deps: [HtmlTemplateModule, GatewayAdminAppModule],
        providers: [{
            provide: DOCUMENT,
            useValue: document
        }]
    });
    const ref = ctx.runners.getRef(GatewayAdminComponent) as ComponentRef<GatewayAdminComponent>;
    const container = document.getElementById('gateway-admin-app');
    if (!container) {
        throw new Error('gateway-admin-app container missing');
    }
    container.appendChild((ref as any).elementRef.nativeElement as HTMLElement);
    if (status) {
        status.remove();
    }
    (window as any).gatewayAdmin = ref.instance;
    (window as any).gatewayAdminContext = ctx;
}

boot().catch(error => {
    const status = document.getElementById('boot-status');
    if (status) {
        status.textContent = `启动失败：${(error as Error).message}`;
    }
    console.error(error);
});
