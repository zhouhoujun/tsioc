import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createInjector, Injector, Type } from '@tsdi/ioc';
import { Renderer } from '@tsdi/components';
import { AgentConsoleMessageOutletDirective } from '../src/AgentConsoleMessageOutlet';

/**
 * Regression coverage for the second-turn fatal error
 * `NodeInjector has already been destroyed.`
 *
 * `AgentConsoleMessageOutletDirective` caches the `ComponentRef` it creates. A
 * `ComponentRef` is bound to its own `NodeInjector` lifetime (see
 * `ComponentRefImpl`: `context.onDestroy(this)`), and `NodeInjector.detachNodes`
 * destroys a component's host view while the outlet keeps holding the reference.
 *
 * The stale reference must never be dereferenced: `ComponentRef.instance`
 * lazily calls `createInstance()`, which resolves through the (already
 * destroyed) injector and throws. The outlet must detect a dead ref and rebuild.
 */

class MessagePanel {
    item?: { component: Type<MessagePanel> };
}

/**
 * Mirrors the real `ComponentRef` lazy `instance` semantics
 * (`AbstractInvocation.instance` -> `createInstance()` -> injector resolution),
 * which is what throws once the backing injector is destroyed.
 */
class FakeComponentRef {
    private _inst?: MessagePanel;
    public destroyCalled = 0;

    constructor(public readonly injector: Injector, private readonly initialItem?: unknown) {}

    get instance(): MessagePanel {
        if (!this._inst) {
            // Real lazy resolution against the component's own injector.
            this.injector.get(Renderer, null);
            if (this.injector.destroyed) {
                throw new Error('NodeInjector has already been destroyed.');
            }
            this._inst = new MessagePanel();
            // Mirrors createComponent seeding the instance from `inputs`.
            this._inst.item = this.initialItem as never;
        }
        return this._inst;
    }

    destroy(): void {
        this.destroyCalled++;
        this.injector.destroy();
    }
}

class FakeViewContainer {
    public created: FakeComponentRef[] = [];
    public cleared = 0;

    constructor(public readonly injector: Injector) {}

    createComponent(componentType: Type<MessagePanel>, options?: { inputs?: { item?: unknown } }): FakeComponentRef {
        const child = createInjector(this.injector);
        const ref = new FakeComponentRef(child, options?.inputs?.item);
        this.created.push(ref);
        return ref;
    }

    clear(): void {
        this.cleared++;
    }
}

function createOutlet(): { outlet: AgentConsoleMessageOutletDirective; container: FakeViewContainer } {
    const injector = createInjector([{ provide: Renderer, useValue: {} }]);
    const container = new FakeViewContainer(injector);
    const outlet = new AgentConsoleMessageOutletDirective(
        container as never,
        {} as never
    );
    return { outlet, container };
}

const itemFor = (component: Type<MessagePanel>) => ({ component }) as never;

@Suite('p410 outlet stale componentRef')
export class P410OutletStaleComponentRefSpec {
    @Test('a componentRef whose injector was destroyed must be rebuilt, not dereferenced')
    staleRefIsRebuilt() {
        const { outlet, container } = createOutlet();

        outlet.agentConsoleMessageOutlet = itemFor(MessagePanel);
        expect(container.created.length).toBe(1);

        // Simulate NodeInjector.detachNodes destroying the component's host view
        // without the outlet being notified.
        container.created[0].injector.destroy();

        // Old implementation reused the dead ref and threw
        // "NodeInjector has already been destroyed." from `componentRef.instance`.
        expect(() => {
            outlet.agentConsoleMessageOutlet = itemFor(MessagePanel);
        }).not.toThrow();
        expect(container.created.length).toBe(2);
    }

    @Test('the rebuilt component receives the latest item')
    rebuiltComponentReceivesLatestItem() {
        const { outlet, container } = createOutlet();

        outlet.agentConsoleMessageOutlet = itemFor(MessagePanel);
        const stale = container.created[0];
        stale.injector.destroy();

        const next = { component: MessagePanel, marker: 'latest' } as never;
        outlet.agentConsoleMessageOutlet = next;

        expect((outlet.component?.instance.item as { marker?: string }).marker).toBe('latest');
    }

    @Test('a healthy componentRef is reused without recreating')
    healthyRefIsReused() {
        const { outlet, container } = createOutlet();

        outlet.agentConsoleMessageOutlet = itemFor(MessagePanel);
        outlet.agentConsoleMessageOutlet = itemFor(MessagePanel);

        expect(container.created.length).toBe(1);
    }
}
