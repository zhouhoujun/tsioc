import { Component, ComponentRef, OnDestroy, OnInit } from '@tsdi/components';
import { Router, RouterOutlet } from '@tsdi/components/router';

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
            if (typeof console !== 'undefined') console.log('SHELL-NAV', event?.type, event?.url);
            if (event?.type === 'NavigationEnd') {
                this.syncHash();
            }
        });
        const initial = typeof location === 'undefined'
            ? '/'
            : String(location.hash || '').replace(/^#/, '') || '/';
        void this.router.navigateByUrl(initial);
        if (typeof window !== 'undefined') {
            this.hashHandler = () => {
                const url = String(location.hash || '').replace(/^#/, '') || '/';
                void this.router.navigateByUrl(url);
            };
            window.addEventListener('hashchange', this.hashHandler);
        }
        const url = typeof location === 'undefined'
            ? '/'
            : String(location.hash || '').replace(/^#/, '') || '/';
        await this.router.navigateByUrl(url);
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
