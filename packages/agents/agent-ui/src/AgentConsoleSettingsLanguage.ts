import { settingsLabel } from './AgentConsoleDisplayCommands';
import { formatAgentUiNotice } from './agent-ui.i18n';
import type { SettingsPanelHost } from './AgentConsoleSettingsCommands';

/** Locale picker for Settings · General (kept out of the growing command file). */
export async function openSettingsLanguage(host: SettingsPanelHost): Promise<boolean> {
    const locales = host.translator?.availableLocales?.length
        ? host.translator.availableLocales
        : ['en', 'zh-CN'];
    const current = host.translator?.currentLocale || 'en';
    const selected = await host.select(settingsLabel(host.translator, 'agent.menu.settings.languageTitle', 'Settings · Language'), locales.map(locale => ({
        label: `${locale === current ? '● ' : '  '}${locale}`,
        value: locale,
        description: locale === current
            ? settingsLabel(host.translator, 'agent.menu.settings.languageCurrent', 'current language')
            : settingsLabel(host.translator, 'agent.menu.settings.languageSwitch', 'switch and save')
    })), Math.max(0, locales.indexOf(current)), settingsLabel(host.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close'));
    if (!selected) return true;
    host.translator?.setLocale(selected);
    host.state?.applyLocaleDefaults?.(selected);
    try {
        await host.persistSettings({ language: selected });
    } catch (error: any) {
        host.notify(error?.message || formatAgentUiNotice(host.translator, 'languageSwitchSaveFailed', { language: selected }));
        return true;
    }
    host.notify(formatAgentUiNotice(host.translator, 'languageSet', { selected: selected }));
    return true;
}
