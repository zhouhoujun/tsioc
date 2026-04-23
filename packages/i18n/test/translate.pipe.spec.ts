import { Suite, Test, BeforeEach } from '@tsdi/unit';
import expect = require('expect');
import { TranslatePipe } from '../src/pipes/translate.pipe';
import { Translator } from '../src/translator';
import { TranslationBundle } from '../src/locale';

// Mock Translator for testing
class MockTranslator extends Translator {
    private _locale = 'en';
    private _translations: Map<string, TranslationBundle>;

    constructor(bundles: Record<string, TranslationBundle>) {
        super();
        this._translations = new Map(Object.entries(bundles));
    }

    get currentLocale(): string {
        return this._locale;
    }

    setLocale(locale: string): void {
        this._locale = locale;
    }

    translate(key: string, localeOrParams?: string | Record<string, any>, params?: Record<string, any>): string {
        const locale = typeof localeOrParams === 'string' ? localeOrParams : this._locale;
        const actualParams = typeof localeOrParams === 'string' ? params : localeOrParams;

        const bundle = this._translations.get(locale);
        if (!bundle) return key;

        let message = bundle.messages[key] as string;
        if (!message) return key;

        // Simple interpolation
        if (actualParams) {
            for (const [k, v] of Object.entries(actualParams)) {
                message = message.replace(`{${k}}`, String(v));
            }
        }

        return message;
    }

    has(key: string, locale?: string): boolean {
        const targetLocale = locale || this._locale;
        const bundle = this._translations.get(targetLocale);
        return !!bundle && bundle.messages[key] !== undefined;
    }

    get availableLocales(): string[] {
        return Array.from(this._translations.keys());
    }
}

@Suite('TranslatePipe')
export class TranslatePipeSuite {
    pipe!: TranslatePipe;
    translator!: Translator;

    enBundle: TranslationBundle = {
        locale: 'en',
        messages: {
            hello: 'Hello {name}!',
            welcome: 'Welcome',
            goodbye: 'Goodbye'
        }
    };

    zhBundle: TranslationBundle = {
        locale: 'zh-CN',
        messages: {
            hello: '你好 {name}！',
            welcome: '欢迎',
            goodbye: '再见'
        }
    };

    @BeforeEach()
    setup() {
        this.translator = new MockTranslator({
            'en': this.enBundle,
            'zh-CN': this.zhBundle
        });
        this.pipe = new TranslatePipe(this.translator);
    }

    @Test('should translate simple key')
    testSimpleTranslation() {
        const result = this.pipe.transform('welcome');
        expect(result).toBe('Welcome');
    }

    @Test('should translate with params')
    testTranslationWithParams() {
        const result = this.pipe.transform('hello', { name: 'World' });
        expect(result).toBe('Hello World!');
    }

    @Test('should translate with locale')
    testTranslationWithLocale() {
        const result = this.pipe.transform('welcome', 'zh-CN');
        expect(result).toBe('欢迎');
    }

    @Test('should translate with locale and params')
    testTranslationWithLocaleAndParams() {
        const result = this.pipe.transform('hello', 'zh-CN', { name: '世界' });
        expect(result).toBe('你好 世界！');
    }

    @Test('should return key when translation not found')
    testNotFound() {
        const result = this.pipe.transform('nonexistent');
        expect(result).toBe('nonexistent');
    }

    @Test('should return empty string for empty value')
    testEmptyValue() {
        const result = this.pipe.transform('');
        expect(result).toBe('');
    }

    @Test('should return empty string for null value')
    testNullValue() {
        const result = this.pipe.transform(null as any);
        expect(result).toBe('');
    }
}