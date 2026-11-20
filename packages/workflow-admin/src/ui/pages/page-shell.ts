import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '@tsdi/activities/src/visual/i18n';
import { ToastService } from '@tsdi/components/common/toast';

export type AdminPageLocale = 'en' | 'zh-CN';

/** Locale shared with the designer so admin pages follow the user choice. */
export function adminLocale(): AdminPageLocale {
    try {
        const stored = localStorage.getItem('workflow-designer-locale');
        if (stored === 'zh-CN') {
            return 'zh-CN';
        }
    } catch {
        // Private mode must not break the page.
    }
    return 'en';
}

export function adminText(
    translator: Translator | undefined,
    locale: AdminPageLocale,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    return translateWorkflow(translator, locale, `workflow.ui.${key}`, fallback, params);
}

export function formatAdminTime(at: number | undefined, locale: AdminPageLocale): string {
    if (!at) {
        return '—';
    }
    try {
        return new Date(at).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US');
    } catch {
        return new Date(at).toISOString();
    }
}

export function formatAdminDuration(start?: number, end?: number): string {
    if (!start) {
        return '—';
    }
    const milliseconds = Math.max(0, (end || Date.now()) - start);
    if (milliseconds < 1000) {
        return `${milliseconds}ms`;
    }
    if (milliseconds < 60_000) {
        return `${(milliseconds / 1000).toFixed(1)}s`;
    }
    const minutes = Math.floor(milliseconds / 60_000);
    const seconds = Math.round((milliseconds % 60_000) / 1000);
    return `${minutes}m ${seconds}s`;
}

/**
 * Admin page chrome shared by the Plugins, Sessions and Audit routes. Keeps a
 * single navigation strip and the shared toast queue so pages only render
 * their own content.
 */
@Component({
    selector: 'workflow-admin-page',
    template: `
    <div class="wa-page">
        <header class="wa-page-header">
            <div class="wa-page-heading">
                <a class="wa-page-back" href="#/workflows">← {{backLabel}}</a>
                <h1 class="wa-page-title">{{title}}</h1>
                <p class="wa-page-subtitle" v-if="subtitle">{{subtitle}}</p>
            </div>
            <nav class="wa-page-nav" aria-label="{{title}}">
                <a class="wa-page-nav-item {{item.active ? 'is-active' : ''}}"
                    v-for="item in navItems" :href="item.href" data-nav="{{item.id}}">{{item.label}}</a>
            </nav>
        </header>
        <main class="wa-page-body"><v-content></v-content></main>
        <div class="wa-page-toast" v-if="toastService">
            <ui-toast-stack :items="toastService.current" :closeAction="dismissToast"></ui-toast-stack>
        </div>
    </div>`
})
export class WorkflowAdminPageComponent {
    @Attribute() title = '';
    @Attribute() subtitle = '';
    @Attribute() active = '';
    @Attribute() locale: AdminPageLocale = adminLocale();

    constructor(
        @Optional() private translator?: Translator,
        @Optional() public readonly toastService?: ToastService
    ) { }

    readonly dismissToast = (id: string): void => {
        this.toastService?.dismiss(id);
    };

    get backLabel(): string { return this.t('adminBack', 'Back to workflows'); }

    get navItems(): Array<{ id: string; href: string; label: string; active: boolean }> {
        return [
            { id: 'workflows', href: '#/workflows', label: this.t('adminWorkflows', 'Workflows') },
            { id: 'plugins', href: '#/plugins', label: this.t('plugins', 'Plugins') },
            { id: 'sessions', href: '#/sessions', label: this.t('adminSessions', 'Sessions') },
            { id: 'audit', href: '#/audit', label: this.t('audit', 'Audit log') }
        ].map(item => ({ ...item, active: item.id === this.active }));
    }

    private t(key: string, fallback: string): string {
        return adminText(this.translator, this.locale, key, fallback);
    }
}
