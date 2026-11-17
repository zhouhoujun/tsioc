import { AdminPage, redirectToAdminLogin } from './routing';
import { AdminLocale } from './admin.i18n';

interface AdminDocumentLike {
    defaultView?: Window | null;
    documentElement?: { setAttribute(name: string, value: string): void } | null;
}

export interface AdminShellHost {
    documentRef?: AdminDocumentLike;
    router?: any;
    locale: AdminLocale;
    theme: 'light' | 'dark';
    page: AdminPage;
    needsLogin: boolean;
    status: string;
    t(key: string, params?: Record<string, unknown>): string;
    reload(): Promise<void>;
}

/**
 * Console shell lifecycle: restore persisted preferences, subscribe to router
 * events, navigate pages and redirect unauthenticated users.
 *
 * Extracted from `GatewayAdminState`; all writes go through the reactive host.
 */
export class AdminShellController {
    private started = false;
    private routerSub?: { unsubscribe(): void };

    constructor(private readonly host: AdminShellHost) { }

    init(): void {
        const host = this.host;
        try {
            const locale = this.storage()?.getItem('tsdi-gateway-admin-locale');
            if (locale === 'zh-CN' || locale === 'en') {
                host.locale = locale;
            } else if (String((globalThis as any).navigator?.language || '').toLowerCase().startsWith('zh')) {
                host.locale = 'zh-CN';
            }
            const theme = this.storage()?.getItem('tsdi-gateway-admin-theme');
            if (theme === 'dark' || theme === 'light') {
                host.theme = theme;
            }
        } catch {
            // Private mode/storage failures keep the defaults.
        }
        host.status = host.t('status.loading');
        this.applyTheme();
    }

    async start(): Promise<void> {
        const host = this.host;
        if (this.started) {
            return;
        }
        this.started = true;
        this.applyTheme();
        const win = host.documentRef?.defaultView;
        if (host.router) {
            const initialPage = host.router.data?.page as AdminPage | undefined;
            if (initialPage) {
                host.page = initialPage;
            }
            this.routerSub = host.router.events.subscribe((event: any) => this.handleRouterEvent(event));
            const initial = win?.location?.hash
                ? String(win.location.hash).replace(/^#/, '')
                : '/';
            await host.router.navigateByUrl(initial || '/');
        }
        await host.reload();
    }

    destroy(): void {
        this.routerSub?.unsubscribe();
        this.routerSub = undefined;
    }

    setLocale(locale: AdminLocale): void {
        const host = this.host;
        if (host.locale === locale) {
            return;
        }
        host.locale = locale;
        try {
            this.storage()?.setItem('tsdi-gateway-admin-locale', locale);
            (host.documentRef ?? (globalThis as { document?: AdminDocumentLike }).document)?.documentElement?.setAttribute('lang', locale);
        } catch {
            // ignore storage failures
        }
        if (this.started) {
            void host.reload();
        }
    }

    setTheme(theme: 'light' | 'dark'): void {
        const host = this.host;
        host.theme = theme === 'dark' ? 'dark' : 'light';
        this.applyTheme();
        try {
            this.storage()?.setItem('tsdi-gateway-admin-theme', host.theme);
        } catch {
            // ignore storage failures
        }
    }

    navigate(page: AdminPage): void {
        const host = this.host;
        if (host.needsLogin) {
            this.redirectToLogin();
            return;
        }
        if (host.router) {
            void host.router.navigateByUrl(`/${page}`);
            return;
        }
        host.page = page;
    }

    redirectToLogin(): void {
        const win = this.host.documentRef?.defaultView ?? (globalThis as { window?: Window }).window;
        redirectToAdminLogin(win ?? undefined);
    }

    private handleRouterEvent(event: any): void {
        if (event.type !== 'NavigationEnd' || !event.snapshot) {
            return;
        }
        const page = (this.host.router?.data?.page || event.snapshot.data?.page) as AdminPage;
        if (page) {
            this.host.page = page;
        }
    }

    private storage(): Storage | undefined {
        try {
            return this.host.documentRef?.defaultView?.localStorage
                ?? (globalThis as { localStorage?: Storage }).localStorage;
        } catch {
            return undefined;
        }
    }

    private applyTheme(): void {
        const doc = this.host.documentRef
            ?? (globalThis as { document?: AdminDocumentLike }).document;
        if (doc?.documentElement) {
            doc.documentElement.setAttribute('data-theme', this.host.theme);
        }
    }
}
