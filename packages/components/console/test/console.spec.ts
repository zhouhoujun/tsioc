import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildClearScreenSequence,
    buildTerminalCleanupSequence,
    buildTerminalCursorSequence,
    ConsoleElement,
    ConsoleRenderer,
    ConsoleTemplateModule,
    ConsoleText,
    resolveConsoleEnterAction,
    TuiRenderer,
    TuiTemplateModule
} from '../src';
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

@Component({
    selector: 'console-style-test',
    template: `
    <section>
        <p style="color: #2f6f57; background: #dff3e8;">Styled</p>
    </section>
    `
})
class ConsoleStyleTestComponent {
}

@Component({
    selector: 'console-panel-test',
    template: `
    <section style="background: #102218; color: #d8ffea; padding: 1; border: 1px solid #29543d;">
        <p style="color: #7dd9a8;">Panel</p>
        <p style="background: #173323; color: #7ef0a6;">Body</p>
    </section>
    `
})
class ConsolePanelTestComponent {
}

@Component({
    selector: 'console-cjk-test',
    template: `
    <section style="background: #102218; color: #d8ffea; padding: 1; border: 1px solid #29543d;">
        <p>你好世界你好世界</p>
    </section>
    `
})
class ConsoleCjkTestComponent {
}

@Component({
    selector: 'console-textarea-test',
    template: `
    <section>
        <textarea prompt="> " value="line1\nline2" cursorPos="7" placeholder="Ask"></textarea>
    </section>
    `
})
class ConsoleTextareaTestComponent {
}

@Component({
    selector: 'console-textarea-focused-test',
    template: `
    <section>
        <textarea
            prompt="> "
            continuationPrompt=".. "
            value="line1\nline2"
            cursorPos="7"
            cursorTarget="draft"
            focused="true"></textarea>
    </section>
    `
})
class ConsoleTextareaFocusedTestComponent {
}

@Component({
    selector: 'console-nested-textarea-test',
    template: `
    <section>
        <div style="background: #1b2128; color: #c9d1d9; padding: 1 1;">
            <div>
                <textarea prompt="> " value="hi" cursorTarget="draft"></textarea>
            </div>
        </div>
    </section>
    `
})
class ConsoleNestedTextareaTestComponent {
}

@Component({
    selector: 'console-select-test',
    template: `
    <section>
        <select
            title="Help"
            meta="2/3"
            hint="enter confirm"
            selectedIndex="1"
            visibleCount="2"
            detailTitle="Preview"
            options='[{"label":"/help","value":"/help","description":"Show help"},{"label":"/messages","value":"/messages","description":"Browse messages"},{"label":"/exit","value":"/exit","description":"Exit"}]'
            detailLines='["Browse messages"]'></select>
    </section>
    `
})
class ConsoleSelectTestComponent {
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

    @Test('renders ansi styles through tui renderer')
    async rendersAnsiStylesThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleStyleTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleStyleTestComponent) as ComponentRef<ConsoleStyleTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 20 });
            expect(lines.length).toBeGreaterThan(0);
            expect(lines[0]).toContain('\x1b[');
            expect(lines[0]).toContain('Styled');
        } finally {
            await ctx.close();
        }
    }

    @Test('renders framed panel blocks through tui renderer')
    async rendersFramedPanelBlocksThroughTuiRenderer() {
        const ctx = await Application.run(ConsolePanelTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsolePanelTestComponent) as ComponentRef<ConsolePanelTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 24 });
            expect(lines.some(line => line.includes('┌'))).toBe(true);
            expect(lines.some(line => line.includes('┐'))).toBe(true);
            expect(lines.some(line => line.includes('│'))).toBe(true);
            expect(lines.some(line => line.includes('Panel'))).toBe(true);
            expect(lines.some(line => line.includes('Body'))).toBe(true);
            expect(lines.some(line => line.includes('\x1b['))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('prefers six digit hex colors in tui renderer')
    prefersSixDigitHexColors() {
        const renderer = new TuiRenderer();
        expect((renderer as any).extractHexColor('background: #0d1117;')).toBe('#0d1117');
        expect((renderer as any).extractHexColor('color: #abc;')).toBe('#abc');
    }

    @Test('fits cjk content by terminal display width in tui renderer')
    async fitsCjkContentByDisplayWidth() {
        const ctx = await Application.run(ConsoleCjkTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleCjkTestComponent) as ComponentRef<ConsoleCjkTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 16 });
            expect(lines.some(line => line.includes('你好世界'))).toBe(true);
            expect(lines.every(line => !line.includes('�'))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('renders textarea content through tui renderer')
    async rendersTextareaContentThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleTextareaTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleTextareaTestComponent) as ComponentRef<ConsoleTextareaTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 24 });
            expect(lines.some(line => line.includes('line1'))).toBe(true);
            expect(lines.some(line => line.includes('line2'))).toBe(true);
            expect(lines.some(line => line.includes('>'))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('renders focused textarea cursor and continuation prompt through tui renderer')
    async rendersFocusedTextareaCursorThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleTextareaFocusedTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleTextareaFocusedTestComponent) as ComponentRef<ConsoleTextareaFocusedTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 24 });
            const layout = renderer.renderToTuiLayout(root, { width: 24 });
            expect(lines.some(line => line.includes('>'))).toBe(true);
            expect(lines.some(line => line.includes('.. '))).toBe(true);
            expect(lines.some(line => line.includes('\x1b['))).toBe(true);
            expect(layout.cursorTargets).toEqual([{
                id: 'draft',
                row: 1,
                column: 4
            }]);
            const narrowLayout = renderer.renderToTuiLayout(root, { width: 10 });
            expect(narrowLayout.lines.some(line => line.includes('...'))).toBe(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('does not add extra spacer rows for plain div wrappers around inputs')
    async avoidsExtraSpacerRowsForPlainDivWrappers() {
        const ctx = await Application.run(ConsoleNestedTextareaTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleNestedTextareaTestComponent) as ComponentRef<ConsoleNestedTextareaTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const layout = renderer.renderToTuiLayout(root, { width: 20 });
            const visible = layout.lines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
            const inputRow = visible.findIndex(line => line.includes('> hi'));
            expect(inputRow).toBeGreaterThan(0);
            expect(layout.cursorTargets).toEqual([{
                id: 'draft',
                row: inputRow,
                column: 3
            }]);
            expect(visible[inputRow - 1].trim()).toBe('');
            let blankRowsAfterInput = 0;
            for (let index = inputRow + 1; index < visible.length; index++) {
                if (visible[index].trim()) {
                    break;
                }
                blankRowsAfterInput += 1;
            }
            expect(blankRowsAfterInput).toBeLessThanOrEqual(1);
        } finally {
            await ctx.close();
        }
    }

    @Test('renders select window and detail preview through tui renderer')
    async rendersSelectWindowThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleSelectTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleSelectTestComponent) as ComponentRef<ConsoleSelectTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 28 });
            expect(lines.some(line => line.includes('Help'))).toBe(true);
            expect(lines.some(line => line.includes('2. /messages'))).toBe(true);
            expect(lines.some(line => line.includes('Preview'))).toBe(true);
            expect(lines.some(line => line.includes('Browse messages'))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('resolves console enter actions at the base input layer')
    resolvesConsoleEnterActions() {
        expect(resolveConsoleEnterAction()).toBe('submit');
        expect(resolveConsoleEnterAction({ ctrlKey: true })).toBe('newline');
        expect(resolveConsoleEnterAction({ altKey: true })).toBe('newline');
        expect(resolveConsoleEnterAction({ hasSelectMenu: true })).toBe('confirm-selection');
    }

    @Test('builds terminal cleanup sequences for host cli adapters')
    buildsTerminalCleanupSequences() {
        expect(buildClearScreenSequence()).toBe('\x1b[2J\x1b[H');
        expect(buildClearScreenSequence(true)).toBe('\x1b[2J\x1b[3J\x1b[H');
        expect(buildTerminalCleanupSequence({
            reset: '\x1b[0m',
            preserveScreen: true
        })).toBe('\x1b[0m\r\x1b[J');
        expect(buildTerminalCleanupSequence({
            reset: '\x1b[0m',
            preserveScreen: true,
            cursorRowOffset: 4
        })).toBe('\x1b[0m\r\x1b[4A\x1b[J');
        expect(buildTerminalCleanupSequence({
            reset: '\x1b[0m',
            paintedLineCount: 2,
            terminalRows: 1
        })).toBe('\x1b[0m\x1b[1;1H\x1b[2K\x1b[2;1H\x1b[2K\x1b[1;1H');
        expect(buildTerminalCursorSequence({
            target: { row: 2, column: 4 },
            width: 80
        })).toBe('\x1b[3;5H');
        expect(buildTerminalCursorSequence({
            target: { row: 2, column: 4 },
            width: 80,
            renderedLineCount: 5,
            mode: 'flow'
        })).toBe('\x1b[2A\r\x1b[4C');
        expect(buildTerminalCursorSequence({
            target: { row: 2, column: 4 },
            width: 80,
            mode: 'line'
        })).toBe('\r\x1b[4C');
    }
}
