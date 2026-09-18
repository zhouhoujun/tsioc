import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AnimatedTextDirective } from '../src/directives/animated-text';

@Suite('animated text directive')
export class AnimatedTextDirectiveTest {
    @Test('renders and advances one highlighted character at a time')
    rendersCharacterSweep() {
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
        directive.interval = 100;
        directive.text = 'ABC';

        const originalNow = Date.now;
        try {
            Date.now = () => 0;
            (directive as any).render();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['active', 'base', 'base']);
            Date.now = () => 100;
            (directive as any).render();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'active', 'base']);
            Date.now = () => 200;
            (directive as any).render();
            expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'trail', 'active']);
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
