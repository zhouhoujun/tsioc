import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { bindingProperty } from '../src';
import { BINDINGS } from '../src/renderer/Node';

@Suite('binding factories against a destroyed node injector')
export class BindingDestroyedInjectorSpec {

    @Test('property binding does not run its effect once the injector is destroyed')
    propertyBindingSkipsDestroyedInjector() {
        const node: any = { [BINDINGS]: [], setProperty: () => undefined };
        bindingProperty(node, '[focused]', 'focused', {} as any, /\{\{|\}\}/g);

        const factory = node[BINDINGS][0];
        expect(typeof factory).toEqual('function');

        let effectRan = false;
        const effect = { run: (fn: () => void) => { effectRan = true; fn(); } };
        const injector: any = { destroyed: true };

        try {
            factory(node, {}, effect, injector);
        } catch {
            // An unguarded factory evaluates the expression, which resolves through
            // the destroyed node injector and throws. The guard must prevent that.
        }

        expect(effectRan).toEqual(false);
    }
}
