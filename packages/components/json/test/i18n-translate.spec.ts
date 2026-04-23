import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, OnInit } from '@tsdi/components';
import { JsonTemplateModule, JsonTemplateParser } from '../src';
import { I18nModule, TranslationBundle } from '@tsdi/i18n';

// i18n test bundles
const enBundle: TranslationBundle = {
    locale: 'en',
    messages: {
        title: 'Application Title',
        subtitle: 'Welcome {user}',
        description: 'This is a description',
        button: 'Click me',
        status: 'Status: {state}'
    }
};

const zhBundle: TranslationBundle = {
    locale: 'zh-CN',
    messages: {
        title: '应用程序标题',
        subtitle: '欢迎 {user}',
        description: '这是一个描述',
        button: '点击我',
        status: '状态: {state}'
    }
};

// Component definition for JSON template
@Component({
    selector: 'app-i18n-json',
    template: {
        div: {
            '.class': 'i18n-app',
            header: { h1: '{{ "title" | translate }}' },
            main: {
                section: {
                    h2: '{{ "subtitle" | translate:{user: userName} }}',
                    p: '{{ "description" | translate }}'
                }
            },
            footer: {
                button: { '@click': 'changeLocale', '#text': '{{ "button" | translate }}' }
            }
        }
    }
})
export class I18nJsonComponent implements OnInit {
    userName = 'Admin';

    onInit() {
        console.log('I18nJsonComponent initialized');
    }

    changeLocale() {
        console.log('Locale changed');
    }
}

@Suite('JSON i18n Translate Pipe Tests')
export class JsonI18nTest {
    ctx!: ApplicationContext;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.ctx = await Application.run(I18nJsonComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule,
                I18nModule.withLocales({ 'en': enBundle, 'zh-CN': zhBundle }, 'en')
            ]
        });
        this.parser = this.ctx.get(JsonTemplateParser);
    }

    @Test('should parse JSON template with translate pipe')
    async testParseWithTranslate() {
        const jsonTemplate = {
            h1: '{{ "title" | translate }}'
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse JSON with translate pipe and params')
    async testParseWithParams() {
        const jsonTemplate = {
            p: '{{ "subtitle" | translate:{user: "Admin"} }}'
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse nested JSON with translate pipes')
    async testNestedWithTranslate() {
        const jsonTemplate = {
            div: {
                '.class': 'container',
                header: { h1: '{{ "title" | translate }}' },
                main: {
                    p: '{{ "description" | translate }}',
                    button: { '@click': 'handleClick', '#text': '{{ "button" | translate }}' }
                }
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse JSON with translate pipe and locale')
    async testParseWithLocale() {
        const jsonTemplate = {
            span: '{{ "title" | translate:"zh-CN" }}'
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse complex JSON with multiple translate pipes')
    async testComplexJson() {
        const jsonTemplate = {
            div: [
                { h1: '{{ "title" | translate }}' },
                { p: '{{ "status" | translate:{state: "Ready"} }}' },
                { footer: '{{ "description" | translate }}' }
            ]
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should render JSON template component with translate')
    async testRenderComponent() {
        const appRef = this.ctx.runners.getRef(I18nJsonComponent) as ComponentRef<I18nJsonComponent>;
        expect(appRef).toBeDefined();
        expect(appRef.instance).toBeDefined();
        expect(appRef.instance.userName).toBe('Admin');
    }

    @After()
    async destroy() {
        await this.ctx?.destroy();
    }
}