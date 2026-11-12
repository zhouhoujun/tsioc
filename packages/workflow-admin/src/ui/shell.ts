import { Component, ComponentRef, OnDestroy, OnInit } from '@tsdi/components';
import { Router, RouterOutlet } from '@tsdi/components/router';
import { WORKFLOW_ADMIN_ADMIN_PATH, WORKFLOW_ADMIN_PREVIEW_PATH } from './routes';

/**
 * Router shell. Keeps the browser hash in sync with `@tsdi/components/router`
 * and exposes all feature areas through lazy route components.
 */
@Component({
    selector: 'workflow-admin-shell',
    imports: [RouterOutlet],
    template: '<router-outlet></router-outlet>'
})
export class WorkflowAdminShellComponent implements OnInit, OnDestroy {
    private subscription?: { unsubscribe(): void };
    private hashHandler?: () => void;

    constructor(private readonly router: Router) { }

    async onInit(): Promise<void> {
        this.subscription = this.router.events.subscribe(event => {
            if (event?.type === 'NavigationEnd') {
                this.syncHash();
            }
        });
        if (typeof window !== 'undefined') {
            this.hashHandler = () => { void this.navigateCurrent(); };
            window.addEventListener('hashchange', this.hashHandler);
        }
        await this.navigateCurrent();
    }

    private async navigateCurrent(): Promise<void> {
        const url = typeof location === 'undefined'
            ? '/'
            : String(location.hash || '').replace(/^#/, '') || '/';
        await this.router.navigateByUrl(await this.resolveLanding(url));
    }

    /**
     * `/` lands on the authenticated admin area when auth is enabled, and on
     * the open preview area when authentication is disabled.
     */
    private async resolveLanding(url: string): Promise<string> {
        if (url !== '/' && url !== '') {
            return url;
        }
        try {
            const response = await fetch('/auth/config', { credentials: 'same-origin' });
            if (response.ok) {
                const config = await response.json() as { enabled?: boolean };
                return config?.enabled === false
                    ? `/${WORKFLOW_ADMIN_PREVIEW_PATH}`
                    : `/${WORKFLOW_ADMIN_ADMIN_PATH}`;
            }
        } catch {
            // Fall back to the protected area; the guard redirects to login.
        }
        return `/${WORKFLOW_ADMIN_ADMIN_PATH}`;
    }

    onDestroy(): void {
        this.subscription?.unsubscribe();
        if (this.hashHandler && typeof window !== 'undefined') {
            window.removeEventListener('hashchange', this.hashHandler);
        }
    }

    private syncHash(): void {
        if (typeof history === 'undefined' || typeof location === 'undefined') {
            return;
        }
        const hash = `#${this.router.url === '/' ? '/' : this.router.url}`;
        if (location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }
}
