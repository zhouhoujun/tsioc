import { IInjector, Type } from '@tsdi/ioc';
import { ApplicationContext, BootContext } from '../Context';
import { AnnotationReflect } from '../metadata/ref';


export class DefaultBootContext<T> extends BootContext<T> {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    private _instance: T;
    constructor(readonly reflect: AnnotationReflect<T>, readonly injector: IInjector, private _rootCtx?: ApplicationContext) {
        super();
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    getRoot(): ApplicationContext {
        if (!this._rootCtx) {
            this._rootCtx = this.injector.get(ApplicationContext);
        }
        return this._rootCtx;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.injector.resolve({ token: this.type, regify: true }, { provide: BootContext, useValue: this });
        }
        return this._instance;
    }

    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this._dsryCbs.forEach(cb => cb());
            this._dsryCbs = null;
            this.destroying();
        }
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this._dsryCbs) {
            this._dsryCbs.unshift(callback);
        }
    }

    protected destroying() {
        this.injector.destroy();
        this._rootCtx = null;
        this._instance = null;
    }
}
