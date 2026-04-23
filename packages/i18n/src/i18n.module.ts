import { Module, ModuleWithProviders, Provider, Type, token } from '@tsdi/ioc';
import { Translator } from './translator';
import { TranslatorService } from './translator.service';
import { LocaleService, TranslationBundle } from './locale';
import { JsonTranslationLoader, TranslationLoader } from './loaders';
import { I18N_OPTIONS, TRANSLATION_LOADERS } from './tokens';

/**
 * i18n module options.
 */
export interface I18nModuleOptions {
    /**
     * default locale code.
     */
    defaultLocale?: string;

    /**
     * supported locales.
     */
    locales?: string[];

    /**
     * translation bundles.
     */
    bundles?: Record<string, TranslationBundle>;

    /**
     * translation file loader.
     */
    loader?: Type<TranslationLoader>;

    /**
     * base path for translation files.
     */
    basePath?: string;
}

/**
 * i18n module providers.
 */
export const I18N_PROVIDERS: Provider[] = [
    LocaleService,
    TranslatorService,
    { provide: Translator, useClass: TranslatorService },
    JsonTranslationLoader,
    { provide: TRANSLATION_LOADERS, useClass: JsonTranslationLoader, multi: true }
];

/**
 * i18n module.
 *
 * 国际化模块，提供翻译管理、语言切换、消息格式化等功能。
 */
@Module({
    providers: I18N_PROVIDERS,
    exports: [Translator, LocaleService]
})
export class I18nModule {
    /**
     * create i18n module with options.
     * @param options i18n module options.
     * @returns module with providers.
     */
    static withOptions(options: I18nModuleOptions): ModuleWithProviders<I18nModule> {
        const providers: Provider[] = [
            { provide: I18N_OPTIONS, useValue: options }
        ];

        if (options.loader) {
            providers.push(
                { provide: TRANSLATION_LOADERS, useClass: options.loader, multi: true }
            );
        }

        return {
            module: I18nModule,
            providers
        };
    }

    /**
     * create i18n module with locale configurations.
     * @param locales locale configurations.
     * @returns module with providers.
     */
    static withLocales(locales: Record<string, TranslationBundle>, defaultLocale?: string): ModuleWithProviders<I18nModule> {
        return this.withOptions({
            bundles: locales,
            defaultLocale: defaultLocale || Object.keys(locales)[0]
        });
    }
}