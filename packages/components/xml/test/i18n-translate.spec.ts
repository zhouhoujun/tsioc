import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component, OnInit } from '@tsdi/components';
import { XmlTemplateModule, XmlTemplateParser } from '../src';
import { I18nModule, TranslationBundle } from '@tsdi/i18n';

// i18n test bundles
const enBundle: TranslationBundle = {
    locale: 'en',
    messages: {
        title: 'Document Title',
        header: 'Header Content',
        content: 'Main content here',
        footer: 'Footer information',
        item: 'Item {index}'
    }
};

const zhBundle: TranslationBundle = {
    locale: 'zh-CN',
    messages: {
        title: '文档标题',
        header: '头部内容',
        content: '主要内容在这里',
        footer: '底部信息',
        item: '项目 {index}'
    }
};

// Component definition for XML template
@Component({
    selector: 'app-i18n-xml',
    template: `
        <document>
            <title>{{ "title" | translate }}</title>
            <header>{{ "header" | translate }}</header>
            <body>
                <content>{{ "content" | translate }}</content>
            </body>
            <footer>{{ "footer" | translate }}</footer>
        </document>
    `
})
export class I18nXmlComponent implements OnInit {
    onInit() {
        console.log('I18nXmlComponent initialized');
    }
}

@Suite('XML i18n Translate Pipe Tests')
export class XmlI18nTest {
    ctx!: ApplicationContext;
    parser!: XmlTemplateParser;

    @Before()
    async init() {
        this.ctx = await Application.run(I18nXmlComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule,
                I18nModule.withLocales({ 'en': enBundle, 'zh-CN': zhBundle }, 'en')
            ]
        });
        this.parser = this.ctx.get(XmlTemplateParser);
    }

    @Test('should parse XML template with translate pipe')
    async testParseWithTranslate() {
        const xmlTemplate = '<title>{{ "title" | translate }}</title>';

        const nodes = this.parser.parse(xmlTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse XML with translate pipe and params')
    async testParseWithParams() {
        const xmlTemplate = '<item>{{ "item" | translate:{index: 1} }}</item>';

        const nodes = this.parser.parse(xmlTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse nested XML with translate pipes')
    async testNestedWithTranslate() {
        const xmlTemplate = `
            <document>
                <header>{{ "header" | translate }}</header>
                <body>
                    <content>{{ "content" | translate }}</content>
                </body>
                <footer>{{ "footer" | translate }}</footer>
            </document>
        `;

        const nodes = this.parser.parse(xmlTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse XML with translate pipe and locale')
    async testParseWithLocale() {
        const xmlTemplate = '<span>{{ "title" | translate:"zh-CN" }}</span>';

        const nodes = this.parser.parse(xmlTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse complex XML with multiple translate pipes')
    async testComplexXml() {
        const xmlTemplate = `
            <root>
                <section>
                    <h1>{{ "title" | translate }}</h1>
                    <p>{{ "content" | translate }}</p>
                </section>
                <items>
                    <item>{{ "item" | translate:{index: 1} }}</item>
                    <item>{{ "item" | translate:{index: 2} }}</item>
                </items>
            </root>
        `;

        const nodes = this.parser.parse(xmlTemplate);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should render XML template component with translate')
    async testRenderComponent() {
        const appRef = this.ctx.runners.getRef(I18nXmlComponent) as ComponentRef<I18nXmlComponent>;
        expect(appRef).toBeDefined();
        expect(appRef.instance).toBeDefined();
    }

    @After()
    async destroy() {
        await this.ctx?.destroy();
    }
}