import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, OnInit } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule, HtmlTemplateParser } from '../src';
import { I18nModule, TranslationBundle } from '@tsdi/i18n';

// i18n test bundles
const enBundle: TranslationBundle = {
    locale: 'en',
    messages: {
        welcome: 'Welcome to our application',
        greeting: 'Hello {name}!',
        goodbye: 'Goodbye'
    }
};

const zhBundle: TranslationBundle = {
    locale: 'zh-CN',
    messages: {
        welcome: '欢迎使用我们的应用程序',
        greeting: '你好 {name}！',
        goodbye: '再见'
    }
};

// Component using translate pipe in HTML
@Component({
    selector: 'app-i18n-html',
    imports: [],
    template: `
        <div class="i18n-container">
            <h1>{{ "welcome" | translate }}</h1>
            <p>{{ "greeting" | translate:{name: userName} }}</p>
            <footer>{{ "goodbye" | translate }}</footer>
        </div>
    `
})
export class I18nHtmlComponent implements OnInit {
    userName = 'User';

    onInit() {
        console.log('I18nHtmlComponent initialized');
    }
}

@Suite('HTML i18n Translate Pipe Tests')
export class HtmlI18nTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(I18nHtmlComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                I18nModule.withLocales({ 'en': enBundle, 'zh-CN': zhBundle }, 'en')
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
            ]
        });
    }

    @Test('should render translated content in HTML template')
    async testTranslateInHtml() {
        const appRef = this.ctx.runners.getRef(I18nHtmlComponent) as ComponentRef<I18nHtmlComponent>;
        expect(appRef).toBeDefined();
        expect(appRef.instance).toBeDefined();
        expect(appRef.instance.userName).toBe('User');

        const rootNodes = appRef.hostView.rootNodes;
        expect(rootNodes).toBeDefined();
        expect(rootNodes.length).toBeGreaterThan(0);
    }

    @Test('should use translate pipe with simple key')
    async testSimpleTranslate() {
        const parser = this.ctx.get(HtmlTemplateParser);
        const template = '<p>{{ "welcome" | translate }}</p>';
        const nodes = parser.parse(template);

        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should use translate pipe with params')
    async testTranslateWithParams() {
        const parser = this.ctx.get(HtmlTemplateParser);
        const template = '<span>{{ "greeting" | translate:{name: "World"} }}</span>';
        const nodes = parser.parse(template);

        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should use translate pipe with locale')
    async testTranslateWithLocale() {
        const parser = this.ctx.get(HtmlTemplateParser);
        const template = '<div>{{ "welcome" | translate:"zh-CN" }}</div>';
        const nodes = parser.parse(template);

        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @After()
    async destroy() {
        await this.ctx?.destroy();
    }
}