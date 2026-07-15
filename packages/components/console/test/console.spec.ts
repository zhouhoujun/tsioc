import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildClearScreenSequence,
    buildTerminalBrandBlock,
    buildTerminalCleanupSequence,
    buildTerminalCursorSequence,
    composePrimaryTerminalScreen,
    ConsoleElement,
    ConsoleRenderer,
    ConsoleTemplateModule,
    ConsoleText,
    renderPanel,
    renderPrimaryTerminalScreen,
    renderSelectMenu,
    wrapPrefixedText,
    compactRenderedLines,
    compactRenderedBlocks,
    compactRenderedBlocksWindow,
    windowRenderedLinesFromBottom,
    windowRenderedBlocksFromBottomWithContext,
    buildOsc52ClipboardSequence,
    getDisplayWidth,
    sliceByDisplayWidth,
    parseTerminalInputControlKey,
    parseTerminalTextPromptChunk,
    shouldPlaceConsoleCursor,
    shouldSuppressConsoleDuplicatedKeypress,
    resolveConsoleEnterAction,
    TerminalInputSequenceDecoder,
    resolveTerminalMenuInputKey,
    resolveTerminalMenuNextIndex,
    TuiRenderer,
    TuiTerminalSurface,
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
    selector: 'console-loop-update-test',
    template: `
    <section>
        <label class="loop-row" v-for="item in items">{{item.label}}</label>
    </section>
    `
})
class ConsoleLoopUpdateTestComponent {
    items = [
        { label: '› hi' },
        { label: '…' }
    ];
}

@Component({
    selector: 'console-inline-padding-test',
    template: `
    <section>
        <label style="padding: 0 1;">› hi</label>
    </section>
    `
})
class ConsoleInlinePaddingTestComponent {
}

@Component({
    selector: 'console-brand-lines-test',
    template: `
    <section>
        <label v-for="line in lines">{{line}}</label>
    </section>
    `
})
class ConsoleBrandLinesTestComponent {
    lines = buildTerminalBrandBlock(28, 'TSDI-AGENT', 'gpt-5.4', '/home/zhouyou/workspace/core');
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
    selector: 'console-working-child',
    template: '<p>Working</p>'
})
class ConsoleWorkingChildComponent {
}

@Component({
    selector: 'console-show-host-test',
    imports: [ConsoleWorkingChildComponent],
    template: `
    <section>
        <console-working-child v-show="visible"></console-working-child>
        <textarea prompt="> " value="ask"></textarea>
    </section>
    `
})
class ConsoleShowHostTestComponent {
    visible = false;
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
    selector: 'console-placeholder-textarea-test',
    template: `
    <section>
        <textarea prompt="> " value="" placeholder="Ask code or files" focused="false"></textarea>
    </section>
    `
})
class ConsolePlaceholderTextareaTestComponent {
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
    selector: 'console-region-test',
    template: `
    <section>
        <div renderRegion="input">
            <textarea prompt="> " value="hi" cursorTarget="draft"></textarea>
        </div>
    </section>
    `
})
class ConsoleRegionTestComponent {
}

@Component({
    selector: 'console-nested-region-test',
    template: `
    <section>
        <div style="padding: 1 1;">
            <div renderRegion="inner">
                <textarea prompt="> " value="hi"></textarea>
            </div>
        </div>
    </section>
    `
})
class ConsoleNestedRegionTestComponent {
}

@Component({
    selector: 'console-all-region-test',
    template: `
    <section>
        <label class="label-region">Label</label>
        <span class="span-region">Span</span>
        <input class="input-region" prompt="> " value="one"></input>
        <textarea class="textarea-region" prompt="> " value="two"></textarea>
        <select
            class="select-region"
            title="Menu"
            options='[{"label":"A","value":"a"}]'></select>
        <br class="break-region"></br>
    </section>
    `
})
class ConsoleAllRegionTestComponent {
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

    @Test('updates tui terminal surface from component property changes')
    async updatesTuiTerminalSurfaceFromComponentChanges() {
        const ctx = await Application.run(ConsoleTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        try {
            const ref = ctx.runners.getRef(ConsoleTestComponent) as ComponentRef<ConsoleTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write: value => output.push(value) },
                scheduler: task => task()
            });

            expect(output.join('')).toContain('Ready');
            ref.instance.message = 'Updated';

            expect(surface.lastRenderedLines.join('\n')).toContain('Updated');
            expect(output.join('')).toContain('Updated');
            surface.destroy();
        } finally {
            await ctx.close();
        }
    }

    @Test('updates terminal surface when component host v-show changes')
    async updatesTerminalSurfaceFromHostShowDirective() {
        const ctx = await Application.run(ConsoleShowHostTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleShowHostTestComponent) as ComponentRef<ConsoleShowHostTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            surface = new TuiTerminalSurface({
                renderer,
                root: ref.elementRef.nativeElement,
                width: 60,
                output: { write: value => output.push(value) }
            });
            await Promise.resolve();

            expect(surface.lastRenderedLines.some(line => line.includes('Working'))).toBe(false);

            ref.instance.visible = true;
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.some(line => line.includes('Working'))).toBe(true);
            expect(output.join('')).toContain('Working');
        } finally {
            surface?.destroy();
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

    @Test('updates reused v-for view context values')
    async updatesReusedVForViewContextValues() {
        const ctx = await Application.run(ConsoleLoopUpdateTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleLoopUpdateTestComponent) as ComponentRef<ConsoleLoopUpdateTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['› hi', '…']);

            ref.instance.items = [
                { label: '› hi' },
                { label: 'Echo: hi' }
            ];

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['› hi', 'Echo: hi']);
        } finally {
            await ctx.close();
        }
    }

    @Test('preserves inline padding in tui renderer')
    async preservesInlinePaddingInTuiRenderer() {
        const ctx = await Application.run(ConsoleInlinePaddingTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleInlinePaddingTestComponent) as ComponentRef<ConsoleInlinePaddingTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
            expect(lines[0]).toBe(' › hi ');
        } finally {
            await ctx.close();
        }
    }

    @Test('preserves preformatted brand line spacing in tui renderer')
    async preservesPreformattedBrandLineSpacingInTuiRenderer() {
        const ctx = await Application.run(ConsoleBrandLinesTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleBrandLinesTestComponent) as ComponentRef<ConsoleBrandLinesTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
            expect(lines[0]).toBe('╭──────────────────────────╮');
            expect(lines[1]).toBe('│        TSDI-AGENT        │');
            expect(lines[1].length).toBe(lines[0].length);
            expect(lines[2].length).toBe(lines[0].length);
            expect(lines[3]).toBe('╰──────────────────────────╯');
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

    @Test('renders placeholder text with dimmer placeholder style')
    async rendersPlaceholderTextWithDarkerStyle() {
        const ctx = await Application.run(ConsolePlaceholderTextareaTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsolePlaceholderTextareaTestComponent) as ComponentRef<ConsolePlaceholderTextareaTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const lines = renderer.renderToTuiLines(root, { width: 40 });
            expect(lines[0]).toContain('Ask code or files');
            expect(lines[0]).toContain('[38;2;110;118;129m');
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

    @Test('renders panel body at natural height before footer when height is unset')
    rendersPanelBodyAtNaturalHeightBeforeFooterWhenHeightIsUnset() {
        const lines = renderPanel('Tasks', ['one', 'two', 'three'], 24, undefined, {
            footerLines: ['status ready']
        });
        expect(lines).toEqual([
            'Tasks',
            '  one',
            '  two',
            '  three',
            'status ready'
        ]);
    }

    @Test('clips panel body only when height is set')
    clipsPanelBodyOnlyWhenHeightIsSet() {
        expect(renderPanel('Tasks', ['one', 'two', 'three'], 24, 4, {
            footerLines: ['footer']
        })).toEqual(['Tasks', '  two', '  three', 'footer']);
        expect(renderPanel('Tasks', ['hidden'], 24, 2, {
            footerLines: ['footer']
        })).toEqual(['Tasks', 'footer']);
        expect(renderPanel('Tasks', ['hidden'], 24, 2, {
            footerLines: ['footer one', 'footer two']
        })).toEqual(['Tasks', 'footer one', 'footer two']);
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
            const lines = renderer.renderToTuiLines(root, { width: 48 });
            expect(lines.some(line => line.includes('Help'))).toBe(true);
            expect(lines.some(line => line.includes('2. /messages'))).toBe(true);
            expect(lines.some(line => /1\. \/help\s{4,}Show help/.test(line))).toBe(true);
            expect(lines.some(line => /2\. \/messages\s{2,}Browse messages/.test(line))).toBe(true);
            expect(lines.some(line => line.includes('Preview'))).toBe(true);
            expect(lines.some(line => line.includes('Browse messages'))).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('records render regions declared by console directives')
    async recordsRenderRegionsThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleRegionTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleRegionTestComponent) as ComponentRef<ConsoleRegionTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const layout = renderer.renderToTuiLayout(root, { width: 20 });
            expect(layout.regions.find(region => region.id === 'input')).toEqual({
                id: 'input',
                startRow: 0,
                endRow: 1
            });
        } finally {
            await ctx.close();
        }
    }

    @Test('records nested render regions after parent block offsets')
    async recordsNestedRenderRegionsAfterOffsets() {
        const ctx = await Application.run(ConsoleNestedRegionTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleNestedRegionTestComponent) as ComponentRef<ConsoleNestedRegionTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const layout = renderer.renderToTuiLayout(root, { width: 20 });
            const region = layout.regions.find(item => item.id === 'inner');
            expect(region?.startRow).toBe(1);
            expect(region?.endRow).toBe(2);
        } finally {
            await ctx.close();
        }
    }

    @Test('records render regions for all base tui directives')
    async recordsRenderRegionsForAllBaseTuiDirectives() {
        const ctx = await Application.run(ConsoleAllRegionTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleAllRegionTestComponent) as ComponentRef<ConsoleAllRegionTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            const layout = renderer.renderToTuiLayout(root, { width: 32 });
            const regionIds = layout.regions.map(region => region.id);
            ['label-region', 'span-region', 'input-region', 'textarea-region', 'select-region', 'break-region'].forEach(id => {
                expect(regionIds).toContain(id);
                expect(layout.regions.find(region => region.id === id)?.endRow).toBeGreaterThanOrEqual(
                    layout.regions.find(region => region.id === id)?.startRow || 0
                );
            });
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

    @Test('renders select menu descriptions as compact table rows')
    rendersSelectMenuDescriptionsAsCompactTableRows() {
        const lines = renderSelectMenu('Commands', [
            { label: '/a', value: '/a', description: 'short' },
            { label: '/very-long-command', value: '/very-long-command', description: 'very long command description that should not flood the menu' }
        ], 0);
        expect(lines.some(line => /\/a\s{10,}short/.test(line))).toBe(true);
        expect(lines.some(line => line.includes('very long command description...'))).toBe(true);
        expect(lines.every(line => !line.includes('should not flood'))).toBe(true);
    }

    @Test('resolves terminal menu input keys in the base console layer')
    resolvesTerminalMenuInputKeys() {
        expect(resolveTerminalMenuInputKey('down')).toBe('down');
        expect(resolveTerminalMenuInputKey('escape')).toBe('');
        expect(resolveTerminalMenuInputKey('', '2', { blockingMenu: true })).toBe('2');
        expect(resolveTerminalMenuInputKey('', '2', { blockingMenu: false })).toBe('');
        expect(resolveTerminalMenuNextIndex(0, 3, -1)).toBe(2);
        expect(resolveTerminalMenuNextIndex(2, 3, 1)).toBe(0);
        expect(resolveTerminalMenuNextIndex(0, 0, 1)).toBe(-1);
    }

    @Test('decodes split terminal input control sequences in the base console layer')
    decodesSplitTerminalInputControlSequences() {
        const decoder = new TerminalInputSequenceDecoder();
        expect(decoder.decode('\u001b')).toEqual({ text: '', partial: true });
        expect(decoder.decode('[')).toEqual({ text: '', partial: true });
        expect(decoder.decode('B')).toEqual({ text: '\u001b[B', controlKey: 'down', partial: false });
        expect(decoder.decode('\u001b[A')).toEqual({ text: '\u001b[A', controlKey: 'up', partial: false });
        expect(decoder.decode('x')).toEqual({ text: 'x', partial: false });
    }

    @Test('builds terminal cleanup sequences for host cli adapters')
    buildsTerminalCleanupSequences() {
        expect(buildClearScreenSequence()).toBe('\x1b[2J\x1b[H');
        expect(buildClearScreenSequence(true)).toBe('\x1b[2J\x1b[3J\x1b[H');
        expect(buildTerminalCleanupSequence({
            reset: '\x1b[0m',
            preserveScreen: true
        })).toBe('\x1b[0m\r');
        expect(buildTerminalCleanupSequence({
            reset: '\x1b[0m',
            preserveScreen: true,
            paintedLineCount: 5,
            currentRow: 2
        })).toBe('\x1b[0m\x1b[3B\r');
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
        expect(buildTerminalCursorSequence({
            target: { row: 2, column: 4 },
            width: 80,
            currentRow: 1,
            mode: 'relative'
        })).toBe('\x1b[1B\r\x1b[4C');
    }

    @Test('centers terminal brand title while keeping metadata left aligned')
    centersTerminalBrandTitle() {
        const lines = buildTerminalBrandBlock(40, 'TSDI Agent', 'gpt-5.4', '/home/zhouyou/workspace/core')
            .map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
        expect(lines[1]).toContain('│');
        expect(lines[1]).toContain(' TSDI AGENT ');
        expect(lines[2]).toContain('gpt-5.4 · ~/workspace/core');
    }

    @Test('keeps footer sections pinned and offsets their component positions')
    keepsFooterSectionsPinnedAndOffsetsComponentPositions() {
        const layout = composePrimaryTerminalScreen({
            topLines: ['logo'],
            transcriptBlocks: [
                ['u1'],
                ['a1', 'a2', 'a3', 'a4', 'a5']
            ],
            footerSections: [
                {
                    lines: ['status 1']
                },
                {
                    lines: ['> ask', 'model flash'],
                    regions: [{ id: 'input-shell', startRow: 0, endRow: 2 }],
                    cursorTargets: [{ row: 0, column: 4 }]
                }
            ],
            height: 5,
            minContextRows: 1
        });
        expect(layout.lines).toEqual(['logo', 'a5', 'status 1', '> ask', 'model flash']);
        expect(layout.regions.find(region => region.id === 'input-shell')).toEqual({ id: 'input-shell', startRow: 3, endRow: 5 });
        expect(layout.cursorTargets[0]).toEqual({ row: 3, column: 4 });
    }

    @Test('lets primary body grow when height is unset')
    letsPrimaryBodyGrowWhenHeightIsUnset() {
        const first = composePrimaryTerminalScreen({
            topLines: ['logo'],
            transcriptBlocks: [['message 1']],
            footerSections: [{ lines: ['footer'] }]
        });
        const render = renderPrimaryTerminalScreen({
            lines: first.lines,
            width: 40
        });
        const next = composePrimaryTerminalScreen({
            state: render.state,
            topLines: ['logo'],
            transcriptBlocks: [['message 1', 'message 2', 'message 3']],
            footerSections: [{ lines: ['footer'] }]
        });
        expect(first.lines).toEqual(['logo', 'message 1', 'footer']);
        expect(next.lines).toEqual(['logo', 'message 1', 'message 2', 'message 3', 'footer']);
    }

    @Test('renders primary terminal screen from previous render state')
    rendersPrimaryTerminalScreenFromState() {
        const first = renderPrimaryTerminalScreen({
            lines: ['logo', '> hi'],
            width: 20,
            stablePrefixRows: 1,
            cursorRow: 1,
            cursorMode: 'prompt'
        });
        expect(first.output).toContain('logo');
        const second = renderPrimaryTerminalScreen({
            state: first.state,
            lines: ['logo', '> hi'],
            width: 20,
            stablePrefixRows: 1,
            cursorRow: 1,
            cursorMode: 'prompt'
        });
        expect(second.changed).toBe(false);
        expect(second.output).toBe('');
    }

    @Test('does not emit cursor-only output for unchanged primary screen')
    doesNotEmitCursorOnlyOutputForUnchangedPrimaryScreen() {
        const first = renderPrimaryTerminalScreen({
            lines: ['logo', '> hi'],
            width: 20,
            stablePrefixRows: 1,
            cursorRow: 1,
            cursorTarget: { row: 1, column: 4 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        const second = renderPrimaryTerminalScreen({
            state: first.state,
            lines: ['logo', '> hi'],
            width: 20,
            stablePrefixRows: 1,
            cursorRow: 1,
            cursorTarget: { row: 1, column: 4 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        expect(second.changed).toBe(false);
        expect(second.output).toBe('');
    }

    @Test('rewrites primary tail growth without repainting stable history')
    rewritesPrimaryTailGrowthWithoutRepaintingStableHistory() {
        const first = renderPrimaryTerminalScreen({
            lines: ['logo', '> hi', 'footer'],
            width: 40,
            stablePrefixRows: 2,
            cursorRow: 1,
            cursorMode: 'prompt'
        });
        const second = renderPrimaryTerminalScreen({
            state: first.state,
            lines: ['logo', '> hi', 'answer', 'footer'],
            width: 40,
            stablePrefixRows: 3,
            cursorRow: 3,
            cursorMode: 'prompt'
        });
        expect(second.output).not.toContain('logo');
        expect(second.output).toContain('\x1b[J');
        expect(second.output).toContain('answer');
        expect(second.output).toContain('footer');
    }

    @Test('rewrites primary footer growth without repainting stable prefix')
    rewritesPrimaryFooterGrowthWithoutRepaintingStablePrefix() {
        const first = renderPrimaryTerminalScreen({
            lines: ['logo', '> hi', 'model'],
            width: 40,
            stablePrefixRows: 1,
            cursorRow: 1,
            cursorMode: 'prompt'
        });
        const second = renderPrimaryTerminalScreen({
            state: first.state,
            lines: ['logo', '› hi', '> Ask', 'model'],
            width: 40,
            stablePrefixRows: 2,
            cursorRow: 2,
            cursorMode: 'prompt'
        });
        expect(second.output).not.toContain('logo');
        expect(second.output).toContain('› hi');
        expect(second.output).toContain('> Ask');
    }

    @Test('keeps primary render state anchored after same-height region patch')
    keepsPrimaryRenderStateAnchoredAfterPatch() {
        const first = renderPrimaryTerminalScreen({
            lines: ['logo', 'Working (0s)', '> ask'],
            width: 40,
            stablePrefixRows: 1,
            cursorRow: 2,
            cursorTarget: { row: 2, column: 5 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        const second = renderPrimaryTerminalScreen({
            state: first.state,
            lines: ['logo', 'Working (1s)', '> ask'],
            width: 40,
            stablePrefixRows: 1,
            cursorRow: 2,
            cursorTarget: { row: 2, column: 5 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        expect(second.output).toContain('Working (1s)');
        expect(second.state.terminalRow).toBe(2);
        const third = renderPrimaryTerminalScreen({
            state: second.state,
            lines: ['logo', 'Working (2s)', '> ask'],
            width: 40,
            stablePrefixRows: 1,
            cursorRow: 2,
            cursorTarget: { row: 2, column: 5 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        expect(third.output).toContain('Working (2s)');
        expect(third.output).toContain('\x1b[1A');
    }

    @Test('wraps terminal prefixed text locally')
    wrapsTerminalPrefixedTextLocally() {
        expect(wrapPrefixedText('hello world wide', 10, '> ', '  ')).toEqual([
            '> hello wo',
            '  rld wide'
        ]);
    }

    @Test('resolves terminal rendering helpers locally')
    resolvesTerminalRenderingHelpersLocally() {
        expect(getDisplayWidth('你好')).toBe(4);
        expect(sliceByDisplayWidth('abc你好', 6)).toBe('abc你');
        expect(buildOsc52ClipboardSequence('hello')).toBe('\u001b]52;c;aGVsbG8=\u0007');
    }

    @Test('windows terminal rendered blocks locally')
    windowsTerminalRenderedBlocksLocally() {
        expect(compactRenderedLines(['', 'old', 'new', ''], 2)).toEqual(['old', 'new']);
        expect(compactRenderedBlocks([
            ['old-1'],
            ['selected-1', 'selected-2'],
            ['new-1']
        ], 3, 1)).toEqual(['selected-1', 'selected-2', 'new-1']);

        expect(compactRenderedBlocksWindow([
            ['old'],
            ['new-1', 'new-2']
        ], 2, 1).lines).toEqual(['new-1', 'new-2']);

        expect(windowRenderedLinesFromBottom(['l1', 'l2', 'l3'], 2, 1)).toEqual({
            lines: ['l1', 'l2'],
            startRow: 0,
            totalRows: 3
        });

        expect(windowRenderedBlocksFromBottomWithContext([
            ['old-1', 'old-2'],
            ['new-1', 'new-2', 'new-3']
        ], 4, 2)).toEqual({
            lines: ['old-1', 'old-2', '…', 'new-3'],
            startRow: 0,
            totalRows: 5
        });
    }

    @Test('parses terminal prompt and cursor helpers locally')
    parsesTerminalPromptAndCursorHelpersLocally() {
        expect(parseTerminalInputControlKey('\u001b[A')).toBe('up');
        expect(parseTerminalInputControlKey('\r')).toBe('return');
        expect(parseTerminalInputControlKey('x')).toBe(undefined);
        expect(parseTerminalTextPromptChunk(Buffer.from('sk-test\nextra'))).toEqual({
            text: 'sk-test',
            submitted: true
        });
        expect(shouldPlaceConsoleCursor({
            isTTY: true,
            isSelecting: false,
            hasBlockingSelectMenu: false,
            inputLocked: true,
            modalPromptActive: true,
            hasActiveTextPrompt: true,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(true);
        expect(shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: 'x',
            lastRawAt: 100,
            now: 120,
            text: 'x'
        })).toBe(true);
        expect(shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: 'text',
            lastRawAt: 100,
            now: 120,
            text: 'x'
        })).toBe(true);
    }
}
