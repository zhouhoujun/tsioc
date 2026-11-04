import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    ConsoleElement,
    TuiRenderer,
    TuiTerminalSurface,
    parseConsoleAnimations,
    parseConsoleKeyframes,
    resolveConsoleAnimationFrame
} from '../src';

function label(renderer: TuiRenderer, text: string, className: string): ConsoleElement {
    const element = renderer.createElement('label') as ConsoleElement;
    element.setAttribute('class', className);
    renderer.appendChild(element, renderer.createText(text));
    return element;
}

@Suite('console CSS animations')
export class ConsoleCssAnimationTest {
    @Test('parses keyframes, shorthand and longhand animation declarations')
    animateParse() {
        const frames = parseConsoleKeyframes(`
            @keyframes pulse {
                from, 0% { color: #000000; }
                50% { color: #808080; }
                to { color: #ffffff; }
            }
        `);
        expect(frames.get('pulse')?.length).toEqual(3);
        expect(frames.get('pulse')?.[1].declarations.color).toEqual('#808080');

        const shorthand = parseConsoleAnimations({
            animation: 'pulse 200ms linear 20ms 3 alternate both'
        })[0];
        expect(shorthand).toMatchObject({
            name: 'pulse',
            durationMs: 200,
            delayMs: 20,
            iterationCount: 3,
            direction: 'alternate',
            fillMode: 'both',
            timingFunction: 'linear',
            playState: 'running'
        });

        const longhand = parseConsoleAnimations({
            'animation-name': 'pulse, fade',
            'animation-duration': '1s, 2s',
            'animation-iteration-count': 'infinite, 2'
        });
        expect(longhand.map(spec => [spec.name, spec.durationMs, spec.iterationCount])).toEqual([
            ['pulse', 1000, Infinity],
            ['fade', 2000, 2]
        ]);
    }

    @Test('samples colour keyframes, delays, direction and fill mode')
    animateSample() {
        const frames = parseConsoleKeyframes(`
            @keyframes pulse { from { color: #000000; } to { color: #ffffff; } }
        `).get('pulse')!;
        const spec = parseConsoleAnimations({
            animation: 'pulse 100ms linear 50ms 1 normal both'
        })[0];

        expect(resolveConsoleAnimationFrame(spec, frames, 0).running).toBe(true);
        expect(resolveConsoleAnimationFrame(spec, frames, 0).declarations).toEqual({ color: '#000000' });
        expect(resolveConsoleAnimationFrame(spec, frames, 100).declarations?.color).toEqual('#808080');
        expect(resolveConsoleAnimationFrame(spec, frames, 150)).toMatchObject({
            declarations: { color: '#ffffff' },
            running: false
        });
    }

    @Test('TUI renderer applies CSS animation styles from the clock')
    animateRenderer() {
        let now = 0;
        const renderer = new TuiRenderer();
        renderer.setAnimationTimeProvider(() => now);
        renderer.setStyleSheet(`
            .pulse { animation: pulse 100ms linear 1 normal both; }
            @keyframes pulse { from { color: #000000; } to { color: #ffffff; } }
        `);
        const root = renderer.createElement('div');
        renderer.appendChild(root, label(renderer, 'pulse', 'pulse'));

        expect(renderer.renderToTuiLines(root, { width: 20 }).join('')).toContain('38;2;0;0;0');
        now = 50;
        expect(renderer.renderToTuiLines(root, { width: 20 }).join('')).toContain('38;2;128;128;128');
        now = 100;
        expect(renderer.renderToTuiLines(root, { width: 20 }).join('')).toContain('38;2;255;255;255');
        expect(renderer.hasRunningAnimations()).toBe(false);
    }

    @Test('surface keeps the shared clock alive only while CSS animation runs')
    async animateSurfaceClock() {
        let now = 0;
        let listener: (() => void) | undefined;
        const clock = {
            subscribe(fn: () => void) { listener = fn; },
            unsubscribe() { listener = undefined; }
        };
        const renderer = new TuiRenderer();
        renderer.setAnimationTimeProvider(() => now);
        renderer.setStyleSheet(`
            .pulse { animation: pulse 100ms linear infinite; }
            @keyframes pulse { from { color: #000000; } to { color: #ffffff; } }
        `);
        const root = renderer.createElement('div');
        renderer.appendChild(root, label(renderer, 'pulse', 'pulse'));
        const surface = new TuiTerminalSurface({
            renderer,
            root,
            width: 20,
            output: { write() { } },
            animationClock: clock as any
        });
        try {
            surface.render();
            expect(listener).toBeDefined();
            expect(surface.lastRenderedLines.join('')).toContain('38;2;0;0;0');

            now = 50;
            listener!();
            for (let index = 0; index < 8; index++) await Promise.resolve();
            expect(surface.lastRenderedLines.join('')).toContain('38;2;128;128;128');
        } finally {
            surface.destroy();
        }
    }

    @Test('surface releases the shared clock after a finite animation')
    async animateSurfaceFinite() {
        let now = 0;
        let subscribed = false;
        const clock = {
            subscribe() { subscribed = true; },
            unsubscribe() { subscribed = false; }
        };
        const renderer = new TuiRenderer();
        renderer.setAnimationTimeProvider(() => now);
        renderer.setStyleSheet(`
            .pulse { animation: pulse 100ms linear 1 normal both; }
            @keyframes pulse { from { color: #000000; } to { color: #ffffff; } }
        `);
        const root = renderer.createElement('div');
        renderer.appendChild(root, label(renderer, 'pulse', 'pulse'));
        const surface = new TuiTerminalSurface({
            renderer,
            root,
            width: 20,
            output: { write() { } },
            animationClock: clock as any
        });
        try {
            surface.render();
            expect(subscribed).toBe(true);
            now = 100;
            surface.render();
            expect(subscribed).toBe(false);
        } finally {
            surface.destroy();
        }
    }
}
