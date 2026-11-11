import { Component, OnDestroy, OnInit } from '@tsdi/components';
import { Router } from '@tsdi/components/router';

function currentUrl(): string {
    if (typeof location === 'undefined') {
        return '/';
    }
    return String(location.hash || '').replace(/^#/, '') || '/';
}

function displayHash(url: string): string {
    return `#${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Root application component (Angular-style `AppComponent`).
 *
 * It only owns the router outlet: the active page is resolved dynamically from
 * the route table, so a route guard can cancel navigation before any protected
 * page component is created. The browser hash mirrors the router URL.
 */
@Component({
    selector: 'gateway-admin-app',
    template: '<router-outlet></router-outlet>'
})
export class GatewayAdminAppComponent implements OnInit, OnDestroy {
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
            this.hashHandler = () => { void this.router.navigateByUrl(currentUrl()); };
            window.addEventListener('hashchange', this.hashHandler);
        }
        await this.router.navigateByUrl(currentUrl());
    }

    onDestroy(): void {
        this.subscription?.unsubscribe();
        this.subscription = undefined;
        if (this.hashHandler && typeof window !== 'undefined') {
            window.removeEventListener('hashchange', this.hashHandler);
        }
        this.hashHandler = undefined;
    }

    private syncHash(): void {
        if (typeof history === 'undefined' || typeof location === 'undefined') {
            return;
        }
        const hash = displayHash(this.router.url);
        if (location.hash !== hash) {
            history.replaceState(null, '', hash);
        }
    }
}
