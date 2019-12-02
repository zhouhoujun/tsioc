import { Type, Inject, InjectToken } from '@tsdi/ioc';
import { BootApplication } from '@tsdi/boot';


export const CTX_VIEW_REF = new InjectToken<ViewRef|ViewRef[]>('CTX_VIEW_REF')

export class ViewRef {
    @Inject()
    private _app: BootApplication;

    $parent: ViewRef;

    constructor(public _lView) {

    }

}

export class RootViewRef extends ViewRef {

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

    private _hostView: ViewRef;
    get hostView(): ViewRef {
        return this._hostView;
    }

    get location(): ElementRef {
        return this.hostView._lView;
    }

    constructor(
        public readonly componentType: Type<T>,
        public readonly instance: T,
        view: any) {
        this._hostView = new RootViewRef(view);
    }
}
