import { Suite, Test, BeforeEach } from '@tsdi/unit';
import expect = require('expect');
import { TranslatorService } from '../src/translator.service';
import { LocaleService, TranslationBundle } from '../src/locale';

@Suite('TranslatorService')
export class TranslatorServiceSuite {
    translator!: TranslatorService;
    localeService!: LocaleService;

    enBundle: TranslationBundle = {
        locale: 'en',
        messages: {
            hello: 'Hello {name}!',
            messages: {
                one: 'You have {count, plural, one{# message} other{# messages}}'
            },
            nested: {
                deep: {
                    key: 'Deep nested value'
                }
            }
        }
    };

    zhBundle: TranslationBundle = {
        locale: 'zh-CN',
        messages: {
            hello: '你好 {name}！',
            messages: {
                one: '你有 {count, plural, other{# 条消息}}'
            }
        }
    };

    @BeforeEach()
    setup() {
        this.localeService = new LocaleService({ defaultLocale: 'en' });
        this.localeService.registerBundle('en', this.enBundle);
        this.localeService.registerBundle('zh-CN', this.zhBundle);
        // Create translator with bundles
        this.translator = new TranslatorService(
            {} as any, // injector mock
            { bundles: { 'en': this.enBundle, 'zh-CN': this.zhBundle }, defaultLocale: 'en' },
            this.localeService
        );
    }

    @Test('should have correct default locale')
    testDefaultLocale() {
        expect(this.translator.currentLocale).toBe('en');
    }

    @Test('should translate simple key')
    testSimpleTranslation() {
        const result = this.translator.translate('hello', { name: 'World' });
        expect(result).toBe('Hello World!');
    }

    @Test('should translate nested key')
    testNestedKey() {
        const result = this.translator.translate('nested.deep.key');
        expect(result).toBe('Deep nested value');
    }

    @Test('should return key when translation not found')
    testNotFound() {
        const result = this.translator.translate('nonexistent.key');
        expect(result).toBe('nonexistent.key');
    }

    @Test('should change locale')
    testChangeLocale() {
        this.translator.setLocale('zh-CN');
        expect(this.translator.currentLocale).toBe('zh-CN');
    }

    @Test('should translate with specific locale')
    testSpecificLocale() {
        const result = this.translator.translate('hello', 'zh-CN', { name: '世界' });
        expect(result).toBe('你好 世界！');
    }

    @Test('should check if translation exists')
    testHasTranslation() {
        expect(this.translator.has('hello')).toBe(true);
        expect(this.translator.has('nonexistent')).toBe(false);
    }

    @Test('should list available locales')
    testAvailableLocales() {
        expect(this.translator.availableLocales).toEqual(['en', 'zh-CN']);
    }
}