import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DirectiveType, ElementRef, FocusedDirective, FocusMonitor, FocusTrapFactory, shouldEvaluateDirectiveAttribute } from '../src';

@Suite('focus infrastructure')
export class FocusInfrastructureSpec {
    @Test('reports programmatic focus and cleans up monitoring')
    reportsFocusOrigin() {
        const listeners = new Map<string, (event: any) => void>();
        const element = {
            addEventListener: (name: string, listener: (event: any) => void) => listeners.set(name, listener),
            removeEventListener: (name: string) => listeners.delete(name),
            focus: () => listeners.get('focus')?.({ type: 'focus' })
        };
        const changes: any[] = [];
        const monitor = new FocusMonitor();
        const stop = monitor.monitor(element, change => changes.push(change));
        monitor.focusVia(element, 'program');
        expect(changes).toEqual([{ focused: true, origin: 'program' }]);
        stop();
        expect(listeners.size).toEqual(0);
    }

    @Test('wraps tab focus inside a trap')
    wrapsTabFocus() {
        const calls: string[] = [];
        let keydown: ((event: any) => void) | undefined;
        const first = { focus: () => calls.push('first'), hasAttribute: () => false, getAttribute: () => null };
        const last = { focus: () => calls.push('last'), hasAttribute: () => false, getAttribute: () => null };
        const host = {
            ownerDocument: { activeElement: last },
            querySelectorAll: () => [first, last],
            addEventListener: (_name: string, listener: (event: any) => void) => { keydown = listener; },
            removeEventListener: () => undefined
        };
        const trap = new FocusTrapFactory(new FocusMonitor()).create(host);
        keydown?.({ key: 'Tab', preventDefault: () => calls.push('prevent') });
        expect(calls).toEqual(['prevent', 'first']);
        trap.destroy();
    }
}

@Suite('directive attribute expression boundary')
export class DirectiveAttributeExpressionBoundarySpec {
    @Test('keeps ordinary directive attributes literal')
    keepsOrdinaryAttributesLiteral() {
        expect(shouldEvaluateDirectiveAttribute('focus-region')).toEqual(false);
        expect(shouldEvaluateDirectiveAttribute('agentConsoleMessageOutlet')).toEqual(false);
    }

    @Test('evaluates only explicit framework and structural directive syntax')
    evaluatesFrameworkSyntax() {
        expect(shouldEvaluateDirectiveAttribute('v-show')).toEqual(true);
        expect(shouldEvaluateDirectiveAttribute('*if')).toEqual(true);
        expect(shouldEvaluateDirectiveAttribute('condition', DirectiveType.Conditional)).toEqual(true);
        expect(shouldEvaluateDirectiveAttribute('items', DirectiveType.Iterable)).toEqual(true);
    }
}

@Suite('focused directive')
export class FocusedDirectiveSpec {
    @Test('focuses and blurs its host from the controlled value')
    controlsHostFocus() {
        const calls: string[] = [];
        const directive = new FocusedDirective(new ElementRef({
            focus: () => calls.push('focus'),
            blur: () => calls.push('blur')
        }), new FocusMonitor());
        directive.focused = true;
        directive.onInit();
        directive.focused = false;
        directive.focused = true;
        expect(calls).toEqual(['focus', 'blur', 'focus']);
    }
}
