import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { UI_I18N, uiText } from '../src';
import { SearchListComponent, SearchListModule } from '../search-list';

@Suite('common ui i18n defaults')
export class UiI18nTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SearchListModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                },
                {
                    provide: UI_I18N,
                    useValue: {
                        translate: (key: string) => key === 'ui.common.search' ? 'Suchen' : undefined
                    }
                }
            ]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('component defaults resolve through the host translator')
    async translatedDefaults() {
        const ref = this.ctx.get(ComponentFactory).create(SearchListComponent, { injector: this.ctx }) as ComponentRef<SearchListComponent>;
        await ref.render();
        const list = ref.instance;
        expect(list.placeholderText).toEqual('Suchen');
        expect(list.ariaText).toEqual('Suchen');
        expect(list.emptyText).toEqual('No matches');
        expect(list.retryText).toEqual('Retry');
        expect(uiText({ translate: () => 'Hallo {name}' }, 'x', 'Hi {name}', { name: 'Ada' })).toEqual('Hallo Ada');
        expect(uiText({ translate: (key: string) => key }, 'x', 'Hi')).toEqual('Hi');
        ref.destroy();
    }
}
