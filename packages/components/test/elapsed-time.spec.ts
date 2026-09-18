import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ElapsedTimeDirective } from '../src/directives/elapsed-time';

@Suite('elapsed time directive')
export class ElapsedTimeDirectiveTest {
    @Test('advances only when the Date.now-derived second changes')
    rendersElapsedSeconds() {
        const host: any = { childNodes: [], parentNode: {} };
        let subscribed = false;
        const lifecycle = {
            subscribe() { subscribed = true; }
        };
        const renderer: any = {
            createText: (text: string) => ({ text }),
            appendChild: (parent: any, child: any) => parent.childNodes.push(child),
            removeChild: (parent: any, child: any) => parent.childNodes.splice(parent.childNodes.indexOf(child), 1)
        };
        const originalNow = Date.now;
        let now = 10_000;
        Date.now = () => now;
        try {
            const directive = new ElapsedTimeDirective({ nativeElement: host } as any, renderer, lifecycle as any);
            directive.startedAt = now;
            directive.onInit();
            expect(host.childNodes[0].text).toEqual('0s');
            now += 999;
            (directive as any).render();
            expect(host.childNodes[0].text).toEqual('0s');
            now += 1;
            (directive as any).render();
            expect(host.childNodes[0].text).toEqual('1s');
            now += 60_000;
            (directive as any).render();
            expect(host.childNodes[0].text).toEqual('1m 1s');
            expect(subscribed).toBe(false);
        } finally {
            Date.now = originalNow;
        }
    }
}
