import { Suite, Test } from '@tsdi/unit';
import expect = require('expect');
import { I18nModule, I18nModuleOptions, I18N_PROVIDERS } from '../src/i18n.module';
import { TranslationBundle } from '../src/locale';

@Suite('I18nModule')
export class I18nModuleSuite {
    enBundle: TranslationBundle = {
        locale: 'en',
        messages: {
            greeting: 'Hello',
            farewell: 'Goodbye'
        }
    };

    zhBundle: TranslationBundle = {
        locale: 'zh-CN',
        messages: {
            greeting: '你好',
            farewell: '再见'
        }
    };

    @Test('should create module with options')
    testWithOptions() {
        const options: I18nModuleOptions = {
            defaultLocale: 'en',
            bundles: {
                'en': this.enBundle,
                'zh-CN': this.zhBundle
            }
        };
        const moduleWithProviders = I18nModule.withOptions(options);
        expect(moduleWithProviders.module).toBe(I18nModule);
        expect(moduleWithProviders.providers).toBeDefined();
        expect(moduleWithProviders.providers!.length).toBeGreaterThan(0);
    }

    @Test('should create module with locales')
    testWithLocales() {
        const locales = {
            'en': this.enBundle,
            'zh-CN': this.zhBundle
        };
        const moduleWithProviders = I18nModule.withLocales(locales, 'zh-CN');
        expect(moduleWithProviders.module).toBe(I18nModule);
        expect(moduleWithProviders.providers).toBeDefined();
    }

    @Test('should have providers constant defined')
    testProviders() {
        expect(I18N_PROVIDERS).toBeDefined();
        expect(I18N_PROVIDERS.length).toBeGreaterThan(0);
    }

    @Test('should create module with default locale from first bundle')
    testDefaultLocaleFromFirstBundle() {
        const locales = {
            'en': this.enBundle
        };
        const moduleWithProviders = I18nModule.withLocales(locales);
        expect(moduleWithProviders.module).toBe(I18nModule);
    }

    @Test('should support basePath option')
    testBasePathOption() {
        const options: I18nModuleOptions = {
            defaultLocale: 'en',
            basePath: './locales',
            locales: ['en', 'zh-CN']
        };
        const moduleWithProviders = I18nModule.withOptions(options);
        expect(moduleWithProviders.providers).toBeDefined();
    }
}