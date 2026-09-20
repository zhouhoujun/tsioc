import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AnimatedTextDirective } from '../src/directives/animated-text';

@Suite('animated text directive')
export class AnimatedTextDirectiveTest {
    @Test('renders and advances one highlighted character at a time')
    rendersCharacterSweep() {
        const host: any = { childNodes: [], parentNode: {} };
        let tick = () => {};
        const clock = {
            subscribe(listener: () => void) { tick = listener; },
            unsubscribe() { tick = () => {}; }
        };
        const renderer: any = {
            createElement: () => ({ childNodes: [], styles: {} }),
            createText: (text: string) => ({ text }),
            appendChild: (parent: any, child: any) => parent.childNodes.push(child),
            removeChild: (parent: any, child: any) => {
                parent.childNodes.splice(parent.childNodes.indexOf(child), 1);
            },
            setStyle: (node: any, key: string, value: string) => node.styles[key] = value
        };
        const directive = new AnimatedTextDirective({ nativeElement: host } as any, renderer, clock as any);
        directive.activeStyle = { color: 'active' };
        directive.baseStyle = { color: 'base' };
        directive.trailStyle = { color: 'trail' };
        directive.interval = 100;
        directive.text = 'ABC';

        const originalNow = Date.now;
        let now = 0;
        try {
            Date.now = () => now;
            directive.onInit();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['active', 'base', 'base']);
            now = 100;
            tick();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'active', 'base']);
            now = 200;
            tick();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'trail', 'active']);
            directive.onDestroy();
        } finally {
            Date.now = originalNow;
        }
    }

    @Test('renders a configurable-width highlight band')
    rendersWideSweepBand() {
        const host: any = { childNodes: [], parentNode: {} };
        const renderer: any = {
            createElement: () => ({ childNodes: [], styles: {} }),
            createText: (text: string) => ({ text }),
            appendChild: (parent: any, child: any) => parent.childNodes.push(child),
            removeChild: (parent: any, child: any) => {
                parent.childNodes.splice(parent.childNodes.indexOf(child), 1);
            },
            setStyle: (node: any, key: string, value: string) => node.styles[key] = value
        };
        const directive = new AnimatedTextDirective({ nativeElement: host } as any, renderer);
        directive.activeStyle = { color: 'active' };
        directive.baseStyle = { color: 'base' };
        directive.trailStyle = { color: 'trail' };
        directive.scanWidth = 3;
        const originalNow = Date.now;
        try {
            Date.now = () => 0;
            directive.text = 'ABCDE';
            expect(host.childNodes.map((node: any) => node.styles.color))
                .toEqual(['active', 'active', 'active', 'base', 'base']);
        } finally {
            Date.now = originalNow;
        }
    }
}
