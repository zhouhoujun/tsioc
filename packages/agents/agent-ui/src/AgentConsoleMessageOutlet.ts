import { Attribute, ComponentRef, Directive, Renderer, TemplateCompiler, ViewContainerRef, noReact } from '@tsdi/components';
import { Type } from '@tsdi/ioc';
import type { AgentConsoleRenderedMessageItem } from './AgentConsoleMessageRenderers';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

interface AgentConsoleMessageTemplateInstance {
    item?: AgentConsoleRenderedMessageItem;
    state?: AgentConsoleSessionState;
}

/** Instantiates the component selected by the semantic message renderer route. */
@Directive({ selector: '[agentConsoleMessageOutlet]' })
export class AgentConsoleMessageOutletDirective {
    [noReact] = true;

    private componentRef?: ComponentRef<AgentConsoleMessageTemplateInstance>;
    private componentType?: Type<AgentConsoleMessageTemplateInstance>;
    private creating = false;
    private pendingItem?: AgentConsoleRenderedMessageItem;

    constructor(
        private viewContainer: ViewContainerRef,
        private state: AgentConsoleSessionState
    ) {}

    get component(): ComponentRef<AgentConsoleMessageTemplateInstance> | undefined {
        return this.componentRef;
    }

    @Attribute()
    set agentConsoleMessageOutlet(item: AgentConsoleRenderedMessageItem | undefined) {
        if (this.viewContainer.injector.destroyed) {
            return;
        }
        this.pendingItem = item;
        if (!item?.component) {
            if (this.creating) {
                return;
            }
            this.clear();
            return;
        }
        const componentType = item.component as Type<AgentConsoleMessageTemplateInstance>;
        if (!this.componentRef || this.componentType !== componentType) {
            if (this.creating) {
                return;
            }
            this.clear();
            const injector = this.viewContainer.injector;
            const compiler = injector.get(TemplateCompiler, null);
            if (!injector.get(Renderer, null) && !(compiler as { renderer?: Renderer } | null)?.renderer) {
                return;
            }
            this.componentType = componentType;
            this.creating = true;
            try {
                this.componentRef = this.viewContainer.createComponent(componentType, {
                    inputs: { state: this.state, item },
                    onError: () => {
                        if (!this.viewContainer.injector.destroyed) {
                            this.clear();
                        }
                    }
                });
            } finally {
                this.creating = false;
            }
        }
        const latestItem = this.pendingItem;
        if (this.componentRef && latestItem?.component === this.componentType && this.componentRef.instance.item !== latestItem) {
            this.componentRef.instance.item = latestItem;
        }
    }

    onDestroy(): void {
        this.clear();
    }

    private clear(): void {
        this.componentRef?.destroy();
        this.viewContainer.clear();
        this.componentRef = undefined;
        this.componentType = undefined;
        this.pendingItem = undefined;
    }
}
