import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule, TuiRenderer, TuiTemplateModule, TuiTerminalSurface } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

function dumpChildren(node: any, indent = ''): void {
    const tag = String(node?.tagName || node?.nodeType || '?');
    const text = String(node?.textContent || '').replace(/\x1b\[[0-9;]*m/g, '');
    console.log(`${indent}${tag} text="${text.length > 60 ? text.slice(0, 60) + '…' : text}" attrs=${JSON.stringify((node as any)?.attributes || {})}`);
    const children = node?.childNodes || [];
    for (const child of children) {
        dumpChildren(child, indent + '  ');
    }
}

@Suite('Repro: expand/collapse toggle duplication')
export class ExpandCollapseDuplicationReproTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('dumps TUI toggle row DOM with full children')
    async dumpTuiToggleRow() {
        const componentFactory = this.ctx.get(ComponentFactory);
        const consoleRef = componentFactory.create(AgentConsoleComponent, { injector: this.ctx });
        await consoleRef.render();
        const renderer = this.ctx.get(TuiRenderer);

        consoleRef.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 0 } as any,
            { id: 'a1', role: 'assistant', content: Array.from({ length: 12 }, (_value, index) => `line ${index + 1}`).join('\n'), createdAt: 1 } as any
        ]);
        await Promise.resolve();
        await Promise.resolve();

        const surface = new TuiTerminalSurface({
            renderer,
            root: consoleRef.elementRef.nativeElement,
            width: 80,
            output: { write() {} }
        });
        await Promise.resolve();
        await Promise.resolve();

        console.log('=== TUI LINES (collapsed) ===');
        surface.lastRenderedLines.forEach((l, i) => console.log(`${i}: ${l.replace(/\x1b\[[0-9;]*m/g, '')}`));

        // find the toggle span in the DOM and dump its ancestors chain
        console.log('=== toggle span ancestors ===');
        const walk = (node: any, path: string[] = []): void => {
            const tag = String(node?.tagName || node?.nodeType || '?');
            const text = String(node?.textContent || '').replace(/\x1b\[[0-9;]*m/g, '');
            if (text.includes('Click to expand')) {
                console.log(`FOUND at path=${path.join(' > ')}`);
                dumpChildren(node, '  ');
            }
            const children = node?.childNodes || [];
            for (const child of children) {
                walk(child, [...path, `${tag}[${children.indexOf(child)}]`]);
            }
        };
        walk(consoleRef.elementRef.nativeElement);
    }
}
