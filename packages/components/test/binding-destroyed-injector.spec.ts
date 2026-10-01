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
        try {
            factory(node, {}, effect, { destroyed: true });
        } catch {
            // An unguarded factory proceeds into the destroyed node injector and
            // throws; the guard must stop it before that happens.
        }

        expect(effectRan).toEqual(false);
    }
}
