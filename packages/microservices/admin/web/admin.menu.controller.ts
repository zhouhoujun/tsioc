import { MenuBarGroup } from '@tsdi/components/common/menu-bar';
import { AdminLocale } from './admin.i18n';

export interface AdminMenuHost {
    locale: AdminLocale;
    theme: 'light' | 'dark';
    t(key: string, params?: Record<string, unknown>): string;
    setLocale(locale: AdminLocale): void;
    setTheme(theme: 'light' | 'dark'): void;
}

/**
 * Global menu (language/theme) for the admin console.
 *
 * Caches the group list by locale/theme; the state proxy stays the source of
 * truth so bindings re-render when either value changes.
 */
export class AdminMenuController {
    private cache?: { locale: AdminLocale; theme: string; groups: MenuBarGroup[] };

    constructor(private readonly host: AdminMenuHost) { }

    get groups(): MenuBarGroup[] {
        const host = this.host;
        const cache = this.cache;
        if (cache && cache.locale === host.locale && cache.theme === host.theme) {
            return cache.groups;
        }
        const groups: MenuBarGroup[] = [
            {
                items: [
                    {
                        id: 'menu:language',
                        label: host.t('top.language'),
                        icon: '🌐',
                        children: [
                            { id: 'language:en', label: 'English', checked: host.locale === 'en' },
                            { id: 'language:zh-CN', label: '中文', checked: host.locale === 'zh-CN' }
                        ]
                    },
                    {
                        id: 'menu:theme',
                        label: host.t('top.theme'),
                        icon: '◐',
                        children: [
                            { id: 'theme:light', label: host.t('theme.light'), checked: host.theme === 'light' },
                            { id: 'theme:dark', label: host.t('theme.dark'), checked: host.theme === 'dark' }
                        ]
                    }
                ]
            }
        ];
        this.cache = { locale: host.locale, theme: host.theme, groups };
        return groups;
    }

    select(id: string): void {
        if (id === 'language:en' || id === 'language:zh-CN') {
            this.host.setLocale(id.slice('language:'.length) as AdminLocale);
            return;
        }
        if (id === 'theme:light' || id === 'theme:dark') {
            this.host.setTheme(id.slice('theme:'.length) as 'light' | 'dark');
        }
    }
}
