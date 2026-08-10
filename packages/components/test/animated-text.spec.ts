import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AnimatedTextDirective } from '../src/directives/animated-text';

@Suite('animated text directive')
export class AnimatedTextDirectiveTest {
    @Test('renders and advances one highlighted character at a time')
    rendersCharacterSweep() {
        const host: any = { childNodes: [], parentNode: {} };
        let tick = () => {};
        const lifecycle = {
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
        const directive = new AnimatedTextDirective({ nativeElement: host } as any, renderer, lifecycle as any);
        directive.activeStyle = { color: 'active' };
        directive.baseStyle = { color: 'base' };
        directive.trailStyle = { color: 'trail' };
        directive.text = 'ABC';
        directive.onInit();

        expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['active', 'base', 'base']);
        tick();
        expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'active', 'base']);
        tick();
        expect(host.childNodes.map((node: any) => node.styles.color)).toEqual(['trail', 'trail', 'active']);

        directive.onDestroy();
    }
}
