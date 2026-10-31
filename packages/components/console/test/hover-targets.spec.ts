import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ConsoleElement, TuiRenderer, TuiTerminalSurface } from '../src';

function hoverableRow(renderer: TuiRenderer, text: string, attributes: Record<string, string> = {}): ConsoleElement {
    const label = renderer.createElement('label') as ConsoleElement;
    label.addEventListener('click', () => undefined);
    renderer.appendChild(label, renderer.createText(text));
    Object.entries(attributes).forEach(([name, value]) => label.setAttribute(name, value));
    return label;
}

function hover(surface: TuiTerminalSurface, x: number, y: number): void {
    // Any-motion reports hover as button 35 (32 | 3).
    surface.dispatchMouse({ button: 35, x, y, release: false } as any);
}

const ESC = String.fromCharCode(27);

function hasFade(surface: TuiTerminalSurface): boolean {
    // Animation clock reaches a truecolor fade; without it the surface paints
    // the instant reverse-video highlight.
    return (surface.lastRenderedLines || []).some(line =>
        line.includes(`${ESC}[48;2;`) || line.includes(`${ESC}[7m`));
}

@Suite('console hover targets')
export class ConsoleHoverTargetsTest {
    @Test('only pointer rows may fade; focus targets and data-hover=none stay silent')
    async hoverableFlags() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const expandable = hoverableRow(renderer, 'row that expands');
        const plain = hoverableRow(renderer, 'plain row', { 'data-hover': 'none' });
        const input = renderer.createElement('textarea');
        input.setAttribute('value', 'composer');
        renderer.appendChild(root, expandable);
        renderer.appendChild(root, plain);
        renderer.appendChild(root, input);
        const surface = new TuiTerminalSurface({ renderer, root, width: 40, output: { write() { } } });
        try {
            for (let index = 0; index < 4; index += 1) {
                await Promise.resolve();
            }
            const targets = surface.clickTargets;
            const flagOf = (node: any) => targets.find(target => target.node === node)?.hoverable;
            expect(flagOf(expandable)).toBe(true);
            expect(flagOf(plain)).toBe(false);
            expect(flagOf(input)).toBe(false);
        } finally {
            surface.destroy();
        }
    }

    @Test('hovering a non-expandable row paints no background')
    nonExpandableRowStaysFlat() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const plain = hoverableRow(renderer, 'plain row', { 'data-hover': 'none' });
        const expandable = hoverableRow(renderer, 'expandable row');
        renderer.appendChild(root, plain);
        renderer.appendChild(root, expandable);
        const surface = new TuiTerminalSurface({ renderer, root, width: 40, output: { write() { } } });
        const settle = async () => {
            for (let index = 0; index < 4; index += 1) {
                await Promise.resolve();
            }
        };
        return (async () => {
            try {
                await settle();
                hover(surface, 1, 1);
                await settle();
                expect(hasFade(surface)).toBe(false);

                hover(surface, 1, 2);
                await settle();
                expect(hasFade(surface)).toBe(true);
            } finally {
                surface.destroy();
            }
        })();
    }

    @Test('the composer input never flickers on hover')
    composerStaysFlat() {
        const renderer = new TuiRenderer();
        const root = renderer.createElement('div');
        const input = renderer.createElement('textarea');
        input.setAttribute('value', 'composer');
        renderer.appendChild(root, input);
        const surface = new TuiTerminalSurface({ renderer, root, width: 40, output: { write() { } } });
        return (async () => {
            try {
                for (let index = 0; index < 4; index += 1) {
                    await Promise.resolve();
                }
                hover(surface, 1, 1);
                for (let index = 0; index < 4; index += 1) {
                    await Promise.resolve();
                }
                expect(hasFade(surface)).toBe(false);
            } finally {
                surface.destroy();
            }
        })();
    }
}
