import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule, ConsoleText } from '../src';
import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';

@Component({
    selector: 'console-test',
    template: `
    <section class="screen">
        <h1>{{title}}</h1>
        <p>{{message}}</p>
    </section>
    `
})
class ConsoleTestComponent {
    title = 'Console';
    message = 'Ready';
}

@Component({
    selector: 'console-loop-test',
    template: `
    <section>
        <button class="loop-item" v-for="item in items" @click="choose(item.value)">{{item.label}}</button>
    </section>
    `
})
class ConsoleLoopTestComponent {
    items = [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2' }
    ];

    selected = '';

    choose(value: string): void {
        this.selected = value;
    }
}

@Suite('Console Renderer')
export class ConsoleRendererTest {
    @Test('renders console nodes to indented lines')
    rendersConsoleNodesToIndentedLines() {
        const renderer = new ConsoleRenderer();
        const root = renderer.createElement('screen') as ConsoleElement;
        const title = renderer.createElement('title') as ConsoleElement;
        const text = renderer.createText('Agent Console') as ConsoleText;
        renderer.appendChild(title, text);
        renderer.appendChild(root, title);

        expect(renderer.renderToLines(root)).toEqual(['Agent Console']);
    }

    @Test('supports basic query and click semantics')
    supportsBasicQueryAndClickSemantics() {
        const renderer = new ConsoleRenderer();
        const root = renderer.createElement('screen') as ConsoleElement;
        const button = renderer.createElement('button') as ConsoleElement;
        renderer.setAttribute(button, 'role', 'action');
        renderer.addClass(button, 'primary');
        let clicked = false;
        button.addEventListener('click', () => {
            clicked = true;
        });
        renderer.appendChild(root, button);

        expect(renderer.querySelector(root, 'button')).toBe(button);
        expect(renderer.querySelector(root, '.primary')).toBe(button);
        expect(renderer.querySelector(root, '[role]')).toBe(button);

        renderer.click(button);
        expect(clicked).toBe(true);
    }

    @Test('renders component template into console node tree')
    async registersConsoleTemplateModule() {
        const ctx = await Application.run(ConsoleTestComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleTestComponent) as ComponentRef<ConsoleTestComponent>;
            const renderer = ctx.get(ConsoleRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            expect(ref.instance.title).toBe('Console');
            expect(root.tagName).toBe('section');
            expect(renderer.renderToLines(root)).toEqual([
                'Console',
                'Ready'
            ]);
        } finally {
            await ctx.close();
        }
    }

    @Test('supports v-for scoped text and events')
    async supportsVForScopedBindings() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(ConsoleRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const items = renderer.querySelectorAll(root, '.loop-item') as ConsoleElement[];

            expect(items.length).toBe(2);
            expect(renderer.renderToLines(root)).toEqual(['One', 'Two']);

            renderer.click(items[1]);
            expect(ref.instance.selected).toBe('2');
        } finally {
            await ctx.close();
        }
    }
}
