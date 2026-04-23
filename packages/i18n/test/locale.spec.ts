import { Suite, Test, BeforeEach } from '@tsdi/unit';
import expect = require('expect');
import { LocaleService, TranslationBundle } from '../src/locale';

@Suite('LocaleService')
export class LocaleServiceSuite {
    localeService!: LocaleService;

    enBundle: TranslationBundle = {
        locale: 'en',
        messages: {
            hello: 'Hello',
            goodbye: 'Goodbye'
        }
    };

    zhBundle: TranslationBundle = {
        locale: 'zh-CN',
        messages: {
            hello: '你好',
            goodbye: '再见'
        }
    };

    @BeforeEach()
    setup() {
        this.localeService = new LocaleService({ defaultLocale: 'en' });
        this.localeService.registerBundle('en', this.enBundle);
        this.localeService.registerBundle('zh-CN', this.zhBundle);
    }

    @Test('should have correct default locale')
    testDefaultLocale() {
        expect(this.localeService.currentLocale).toBe('en');
    }

    @Test('should list available locales')
    testAvailableLocales() {
        expect(this.localeService.availableLocales).toEqual(['en', 'zh-CN']);
    }

    @Test('should change locale')
    testChangeLocale() {
        this.localeService.setLocale('zh-CN');
        expect(this.localeService.currentLocale).toBe('zh-CN');
    }

    @Test('should get bundle for locale')
    testGetBundle() {
        const bundle = this.localeService.getBundle('en');
        expect(bundle?.locale).toBe('en');
        expect(bundle?.messages.hello).toBe('Hello');
    }

    @Test('should get bundle for current locale')
    testGetBundleCurrent() {
        this.localeService.setLocale('zh-CN');
        const bundle = this.localeService.getBundle();
        expect(bundle?.locale).toBe('zh-CN');
    }

    @Test('should check locale availability')
    testHasLocale() {
        expect(this.localeService.hasLocale('en')).toBe(true);
        expect(this.localeService.hasLocale('fr')).toBe(false);
    }

    @Test('should return correct direction')
    testDirection() {
        expect(this.localeService.getDirection('en')).toBe('ltr');
    }

    @Test('should register locale with config')
    testRegisterLocaleConfig() {
        this.localeService.registerLocale({
            locale: 'ar',
            direction: 'rtl'
        });
        expect(this.localeService.getDirection('ar')).toBe('rtl');
    }
}