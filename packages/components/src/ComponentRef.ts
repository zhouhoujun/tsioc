import { Type, InjectToken, Abstract, isFunction } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { TemplateContext } from './parses/TemplateContext';

export const CTX_VIEW_REF = new InjectToken<ViewRef | ViewRef[]>('CTX_VIEW_REF')

@Abstract()
export abstract class ViewRef {

    protected _destroyed = false;
    get destroyed() {
        return this._destroyed;
    }

    constructor() {
    }

    abstract destroy(): void;
    abstract onDestroy(callback: () => void): void
}

export class RootViewRef<T> extends ViewRef {

    private destroyCbs: (() => void)[] = [];

    get rootNodes(): T {
        return this.context.value;
    }

    constructor(private context: TemplateContext) {
        super();
    }

    destroy(): void {
        if (!this.destroyed) {
            let node: any = this.rootNodes;
            if (node && isFunction(node.destroy)) {
                node.destroy();
            }
            delete this.context;
            this._destroyed = true;
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}



export class ElementRef<T = any> {
    constructor(public nativeElement: T) {

    }
}

export class IComponentRef<T> {
    readonly context: AnnoationContext;
    readonly instance: T;
    readonly hostView: ViewRef;
    readonly componentType: Type<T>;
}

export const APP_COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef>>('APP_COMPONENT_REFS');


export class ComponentRef<T = any> implements IComponentRef<T> {
    private destroyCbs: (() => void)[] = [];
    get hostView(): ViewRef {
        return this.context.get(ViewRef);
    }


    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        public readonly context: TemplateContext
    ) {

    }

    destroy(): void {
        if (this.destroyCbs) {
            this.destroyCbs.forEach(fn => fn());
            this.destroyCbs = null;
            !this.hostView.destroyed && this.hostView.destroy();
            this.context.clear();
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}
