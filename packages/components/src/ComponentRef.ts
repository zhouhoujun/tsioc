import { Type, Inject, InjectToken, Abstract } from '@tsdi/ioc';
import { BootApplication } from '@tsdi/boot';


export const CTX_VIEW_REF = new InjectToken<ViewRef | ViewRef[]>('CTX_VIEW_REF')

@Abstract()
export abstract class ViewRef {

    $parent: ViewRef;
    destroyed: boolean;

    constructor(public _lView) {

    }

    abstract destroy(): void;
}


export class ElementRef<T extends any = any> {
    constructor(public nativeElement: T) {

    }
}

export class IComponentRef<T> {
    readonly location: ElementRef;
    readonly instance: T;
    readonly hostView: ViewRef;
    readonly componentType: Type<T>;
}

export const APP_COMPONENT_REFS = new InjectToken<WeakMap<any, ComponentRef<any>>>('APP_COMPONENT_REFS');


export class ComponentRef<T> implements IComponentRef<T> {
    private destroyCbs: (() => void)[] = [];
    private _hostView: ViewRef;

    get hostView(): ViewRef {
        return this._hostView;
    }

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        public readonly location: ElementRef,
        lview: any) {
        this._hostView = new RootViewRef(lview);
    }

    destroy(): void {
        if (this.destroyCbs) {
            this.destroyCbs.forEach(fn => fn());
            this.destroyCbs = null;
            !this.hostView.destroyed && this.hostView.destroy();
        }
    }

    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }
}
