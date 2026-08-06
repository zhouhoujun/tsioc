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
    ConsoleTerminalSurfaceLifecycleService,
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
    PanelComponent,
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
    selector: 'console-loop-scope-update-test',
    template: `
    <section>
        <label class="loop-row" v-for="item in items">{{title}} {{item.label}}</label>
    </section>
    `
})
class ConsoleLoopScopeUpdateTestComponent {
    title = 'Chat';
    items = [
        { label: 'One' },
        { label: 'Two' }
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
    selector: 'console-stable-region-test',
    template: `
    <section>
        <label>Header</label>
        <div renderRegion="body">
            <label>{{message}}</label>
        </div>
    </section>
    `
})
class ConsoleStableRegionTestComponent {
    message = 'short';
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
    selector: 'console-fold-panel-test',
    imports: [PanelComponent],
    template: `
    <section>
        <panel>
            <panel-header>{{summary}}</panel-header>
            <panel-summary>
                <label v-for="line in summaryLines">{{line}}</label>
            </panel-summary>
            <panel-body>
                <label v-for="line in detailLines">{{line}}</label>
                <label v-if="showFooter">{{footer}}</label>
            </panel-body>
        </panel>
    </section>
    `
})
class ConsoleFoldPanelTestComponent {
    summary = 'Preview';
    summaryLines = ['line 1', 'line 2', '… 2 more lines'];
    detailLines = ['line 1', 'line 2', 'line 3', 'line 4'];
    showFooter = true;
    footer = 'Footer';
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

    @Test('keeps stable prefix when a tracked region grows')
    async keepsStablePrefixWhenTrackedRegionGrows() {
        const ctx = await Application.run(ConsoleStableRegionTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleStableRegionTestComponent) as ComponentRef<ConsoleStableRegionTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 12,
                output: { write: value => output.push(value) },
                stableRegionId: 'body',
                scheduler: task => task()
            });

            const initialWrites = output.length;
            ref.instance.message = '12345678901234567890';

            expect(surface.lastRenderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual([
                'Header',
                '123456789012',
                '34567890'
            ]);
            const lastWrite = output.slice(initialWrites).join('');
            expect(lastWrite).not.toContain('Header');
            expect(lastWrite).toContain('123456789012');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('keeps common prefix when trailing content grows without tracked regions')
    async keepsCommonPrefixWhenTrailingContentGrowsWithoutTrackedRegions() {
        const ctx = await Application.run(ConsoleStableRegionTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const output: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleStableRegionTestComponent) as ComponentRef<ConsoleStableRegionTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 12,
                output: { write: value => output.push(value) },
                scheduler: task => task()
            });

            const initialWrites = output.length;
            ref.instance.message = '12345678901234567890';

            expect(surface.lastRenderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual([
                'Header',
                '123456789012',
                '34567890'
            ]);
            const lastWrite = output.slice(initialWrites).join('');
            expect(lastWrite).not.toContain('Header');
            expect(lastWrite).toContain('123456789012');
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

    @Test('updates reused v-for view context values with inherited parent scope bindings')
    async updatesReusedVForViewContextValuesWithInheritedParentScope() {
        const ctx = await Application.run(ConsoleLoopScopeUpdateTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleLoopScopeUpdateTestComponent) as ComponentRef<ConsoleLoopScopeUpdateTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['Chat One', 'Chat Two']);

            ref.instance.items = [
                { label: 'One' },
                { label: 'Updated' }
            ];

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['Chat One', 'Chat Updated']);
        } finally {
            await ctx.close();
        }
    }

    @Test('removes stale v-for views when the collection shrinks')
    async removesStaleVForViewsWhenCollectionShrinks() {
        const ctx = await Application.run(ConsoleLoopUpdateTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleLoopUpdateTestComponent) as ComponentRef<ConsoleLoopUpdateTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['› hi', '…']);

            ref.instance.items = [{ label: '› hi' }];

            expect(renderer.renderToTuiLines(root, { width: 40 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))).toEqual(['› hi']);
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
            const lines = renderer.renderToTuiLines(root, { width: 12 }).map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
            expect(lines[0]).toBe(' › hi       ');
            expect(lines[0].length).toBe(12);
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

    @Test('toggles panel summary and detail through tui renderer')
    async togglesPanelSummaryAndDetailThroughTuiRenderer() {
        const ctx = await Application.run(ConsoleFoldPanelTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleFoldPanelTestComponent) as ComponentRef<ConsoleFoldPanelTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 48,
                output: { write() {} }
            });
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.join('\n')).toContain('Preview');
            expect(surface.lastRenderedLines.join('\n')).toContain('line 1');
            expect(surface.lastRenderedLines.join('\n')).toContain('line 2');
            expect(surface.lastRenderedLines.join('\n')).toContain('… 2 more lines');
            expect(surface.lastRenderedLines.join('\n')).not.toContain('line 4');
            expect(surface.lastRenderedLines.join('\n')).toContain('点击展开');

            const expandRow = surface.lastRenderedLines.findIndex(line => line.includes('点击展开'));
            expect(expandRow).toBeGreaterThanOrEqual(0);
            expect(surface.dispatchMouse({
                button: 0,
                x: 3,
                y: expandRow + 1,
                release: true
            })).toBe(true);
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.join('\n')).toContain('line 4');
            expect(surface.lastRenderedLines.join('\n')).not.toContain('… 2 more lines');
            expect(surface.lastRenderedLines.join('\n')).toContain('点击折叠');

            const collapseRow = surface.lastRenderedLines.findIndex(line => line.includes('点击折叠'));
            expect(surface.dispatchMouse({
                button: 0,
                x: 3,
                y: collapseRow + 1,
                release: true
            })).toBe(true);
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.join('\n')).toContain('… 2 more lines');
            expect(surface.lastRenderedLines.join('\n')).not.toContain('line 4');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('updates projected panel summary and body from dynamic v-for and v-if content')
    async updatesProjectedPanelContent() {
        const ctx = await Application.run(ConsoleFoldPanelTestComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ConsoleFoldPanelTestComponent) as ComponentRef<ConsoleFoldPanelTestComponent>;
            const panel = ref.hostView.query(PanelComponent) as ComponentRef<PanelComponent>;

            expect(panel.instance.headerLines).toEqual(['Preview']);
            expect(panel.instance.summaryLines).toEqual(['line 1', 'line 2', '… 2 more lines']);
            expect(panel.instance.bodyLines).toEqual(['line 1', 'line 2', 'line 3', 'line 4', 'Footer']);
            expect(panel.instance.hasSummary).toBe(true);
            expect(panel.instance.bodyVisible).toBe(false);
            expect(panel.instance.toggleLabel).toBe('点击展开');

            panel.instance.locale = 'en-US';
            expect(panel.instance.toggleLabel).toBe('Click to expand');

            panel.instance.expandText = 'Show details';
            panel.instance.collapseText = 'Hide details';
            expect(panel.instance.toggleLabel).toBe('Show details');

            ref.instance.summaryLines = ['Updated summary'];
            ref.instance.detailLines = ['Updated body', 'Second body line'];
            ref.instance.showFooter = false;

            expect(panel.instance.summaryLines).toEqual(['Updated summary']);
            expect(panel.instance.bodyLines).toEqual(['Updated body', 'Second body line']);

            panel.instance.toggle();
            expect(panel.instance.expanded).toBe(true);
            expect(panel.instance.bodyVisible).toBe(true);
            expect(panel.instance.toggleLabel).toBe('Hide details');

            ref.instance.summaryLines = [];
            panel.instance.expanded = false;
            expect(panel.instance.hasSummary).toBe(false);
            expect(panel.instance.bodyVisible).toBe(true);
            panel.instance.toggle();
            expect(panel.instance.expanded).toBe(false);
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

    @Test('decodes split terminal mouse sequences in the base console layer')
    decodesSplitTerminalMouseSequences() {
        const decoder = new TerminalInputSequenceDecoder();
        expect(decoder.decode('\u001b[<0;12;7')).toEqual({ text: '', partial: true });
        expect(decoder.decode('m')).toEqual({
            text: '\u001b[<0;12;7m',
            mouse: {
                button: 0,
                x: 12,
                y: 7,
                release: true
            },
            partial: false
        });
    }

    @Test('decodes terminal mouse motion events for drag detection')
    decodesTerminalMouseMotionEventsForDragDetection() {
        const decoder = new TerminalInputSequenceDecoder();
        expect(decoder.decode('\u001b[<32;12;7M')).toEqual({
            text: '\u001b[<32;12;7M',
            mouse: {
                button: 32,
                x: 12,
                y: 7,
                release: false
            },
            partial: false
        });
    }

    @Test('dispatches tui mouse clicks to clickable nodes')
    async dispatchesTuiMouseClicks() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write() {} }
            });
            await Promise.resolve();
            await Promise.resolve();

            const targetRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(targetRow).toBeGreaterThanOrEqual(0);
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: targetRow + 1,
                release: true
            })).toBe(true);
            expect(ref.instance.selected).toBe('2');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('refreshes tui click targets after the rendered tree shrinks')
    async refreshesTuiClickTargetsAfterRenderedTreeShrinks() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write() {} }
            });
            await Promise.resolve();
            await Promise.resolve();

            const firstRow = surface.lastRenderedLines.findIndex(line => line.includes('One'));
            const secondRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(firstRow).toBeGreaterThanOrEqual(0);
            expect(secondRow).toBeGreaterThanOrEqual(0);
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: secondRow + 1,
                release: true
            })).toBe(true);
            expect(ref.instance.selected).toBe('2');

            ref.instance.items = [{ label: 'Only', value: '1' }];
            await Promise.resolve();
            await Promise.resolve();

            expect(surface.lastRenderedLines.some(line => line.includes('Two'))).toBe(false);
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: secondRow + 1,
                release: true
            })).toBe(false);
            expect(ref.instance.selected).toBe('2');

            const onlyRow = surface.lastRenderedLines.findIndex(line => line.includes('Only'));
            expect(onlyRow).toBeGreaterThanOrEqual(0);
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: onlyRow + 1,
                release: true
            })).toBe(true);
            expect(ref.instance.selected).toBe('1');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('ignores non-release and out-of-range tui mouse clicks')
    async ignoresNonReleaseAndOutOfRangeTuiMouseClicks() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write() {} }
            });
            await Promise.resolve();
            await Promise.resolve();

            const targetRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(targetRow).toBeGreaterThanOrEqual(0);
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: targetRow + 1,
                release: false
            })).toBe(false);
            expect(ref.instance.selected).toBe('');
            expect(surface.dispatchMouse({
                button: 0,
                x: 1,
                y: targetRow + 3,
                release: true
            })).toBe(false);
            expect(ref.instance.selected).toBe('');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('hands terminal selection off on tui drag and re-arms on keyboard input')
    async handsTerminalSelectionOffOnTuiDrag() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const writes: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write: (value: string) => writes.push(value) }
            });
            await Promise.resolve();
            await Promise.resolve();

            const targetRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(targetRow).toBeGreaterThanOrEqual(0);

            // press, then drag beyond the threshold.
            expect(surface.dispatchMouse({
                button: 0,
                x: 2,
                y: targetRow + 1,
                release: false
            })).toBe(false);
            expect(surface.dispatchMouse({
                button: 32,
                x: 12,
                y: targetRow + 1,
                release: false
            })).toBe(false);
            expect(writes).toContain('\x1b[?1000l\x1b[?1002l\x1b[?1006l');
            expect(ref.instance.selected).toBe('');

            // no click is dispatched for the drag, even on a late release.
            expect(surface.dispatchMouse({
                button: 0,
                x: 12,
                y: targetRow + 1,
                release: true
            })).toBe(false);
            expect(ref.instance.selected).toBe('');

            // keyboard input re-arms mouse tracking.
            expect(surface.notifyNonMouseInput()).toBe(true);
            expect(writes).toContain('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
            expect(surface.notifyNonMouseInput()).toBe(false);

            // clicks work again after re-arm.
            expect(surface.dispatchMouse({
                button: 0,
                x: 2,
                y: targetRow + 1,
                release: true
            })).toBe(true);
            expect(ref.instance.selected).toBe('2');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('dispatches tui click on quick press-release without drag')
    async dispatchesTuiClickOnQuickPressReleaseWithoutDrag() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const writes: string[] = [];
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write: (value: string) => writes.push(value) }
            });
            await Promise.resolve();
            await Promise.resolve();

            const targetRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(targetRow).toBeGreaterThanOrEqual(0);

            expect(surface.dispatchMouse({
                button: 0,
                x: 2,
                y: targetRow + 1,
                release: false
            })).toBe(false);
            expect(surface.dispatchMouse({
                button: 0,
                x: 2,
                y: targetRow + 1,
                release: true
            })).toBe(true);
            expect(ref.instance.selected).toBe('2');
            expect(writes.join('')).not.toContain('\x1b[?1000l');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
    }

    @Test('does not dispatch tui click when press and release are far apart')
    async doesNotDispatchTuiClickWhenPressAndReleaseAreFarApart() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        let surface: TuiTerminalSurface | undefined;
        try {
            const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
            const renderer = ctx.get(TuiRenderer);
            const root = ref.hostView.rootNodes[0] as ConsoleElement;
            surface = new TuiTerminalSurface({
                renderer,
                root,
                width: 40,
                output: { write() {} }
            });
            await Promise.resolve();
            await Promise.resolve();

            const targetRow = surface.lastRenderedLines.findIndex(line => line.includes('Two'));
            expect(targetRow).toBeGreaterThanOrEqual(0);

            expect(surface.dispatchMouse({
                button: 0,
                x: 2,
                y: targetRow + 1,
                release: false
            })).toBe(false);
            expect(surface.dispatchMouse({
                button: 0,
                x: 40,
                y: targetRow + 1,
                release: true
            })).toBe(false);
            expect(ref.instance.selected).toBe('');
        } finally {
            surface?.destroy();
            await ctx.close();
        }
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

    @Test('clears removed primary lines and restores prompt cursor after shrink')
    clearsRemovedPrimaryLinesAndRestoresPromptCursorAfterShrink() {
        const expanded = renderPrimaryTerminalScreen({
            lines: ['logo', 'line 1', 'line 2', 'line 3', '> ask'],
            width: 80,
            stablePrefixRows: 1,
            cursorRow: 4,
            cursorTarget: { row: 4, column: 5 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        const collapsed = renderPrimaryTerminalScreen({
            state: expanded.state,
            lines: ['logo', '… 2 more lines. /messages + Enter to view', '> ask'],
            width: 80,
            stablePrefixRows: 1,
            cursorRow: 2,
            cursorTarget: { row: 2, column: 5 },
            cursorMode: 'prompt',
            placeCursor: true
        });
        expect(collapsed.output).toContain('\x1b[J');
        expect(collapsed.output).toContain('/messages + Enter to view');
        expect(collapsed.output).not.toContain('line 3');
        expect(collapsed.state.cursorTarget).toEqual({ row: 2, column: 5 });
        expect(collapsed.state.terminalRow).toBe(2);
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

    @Test('writes terminal clipboard text through the console surface lifecycle service')
    writesTerminalClipboardTextThroughConsoleSurfaceLifecycleService() {
        const writes: string[] = [];
        const service = new ConsoleTerminalSurfaceLifecycleService({} as any);
        Object.defineProperty(service, 'output', {
            value: {
                isTTY: true,
                write(value: string) {
                    writes.push(value);
                }
            },
            configurable: true
        });

        expect(service.writeTerminalClipboardText('hello')).toBe(true);
        expect(writes).toEqual([buildOsc52ClipboardSequence('hello')]);
    }

    @Test('returns stripped rendered text through the console surface lifecycle service')
    returnsStrippedRenderedTextThroughConsoleSurfaceLifecycleService() {
        const service = new ConsoleTerminalSurfaceLifecycleService({} as any);
        Object.defineProperty(service, 'surface', {
            value: {
                lastRenderedLines: ['\x1b[31mHello\x1b[0m ', ' World ']
            },
            configurable: true
        });

        expect(service.getLastRenderedText(value => value.replace(/\x1b\[[0-9;]*m/g, ''))).toBe('Hello\n World');
    }

    @Test('does not write terminal clipboard text when output is unavailable or text is empty')
    doesNotWriteTerminalClipboardTextWhenUnavailable() {
        const writes: string[] = [];
        const service = new ConsoleTerminalSurfaceLifecycleService({} as any);
        Object.defineProperty(service, 'output', {
            value: {
                isTTY: false,
                write(value: string) {
                    writes.push(value);
                }
            },
            configurable: true
        });

        expect(service.writeTerminalClipboardText('hello')).toBe(false);
        expect(service.writeTerminalClipboardText('')).toBe(false);
        expect(writes).toEqual([]);
    }

    @Test('ignores terminal mouse clicks after the surface is destroyed')
    async ignoresTerminalMouseClicksAfterSurfaceDestroy() {
        const ctx = await Application.run(ConsoleLoopTestComponent, {
            deps: [TuiTemplateModule, ComponentsModule]
        });
        const ref = ctx.runners.getRef(ConsoleLoopTestComponent) as ComponentRef<ConsoleLoopTestComponent>;
        const renderer = ctx.get(TuiRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const surface = new TuiTerminalSurface({
            renderer,
            root,
            width: 40,
            output: { write() {} }
        });
        await Promise.resolve();
        await Promise.resolve();

        surface.destroy();
        expect(surface.dispatchMouse({
            button: 0,
            x: 1,
            y: 1,
            release: true
        })).toBe(false);
        await ctx.close();
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
        expect(parseTerminalTextPromptChunk(new TextEncoder().encode('token\nextra') as any)).toEqual({
            text: 'token',
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
