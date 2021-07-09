import { IInjector, Type } from '@tsdi/ioc';
import { BootContext } from '../Context';
import { AnnotationReflect } from '../metadata/ref';


export class DefaultBootContext<T> extends BootContext<T> {

    private _instance: T;

    constructor(readonly reflect: AnnotationReflect<T>, readonly injector: IInjector) {
        super();
    }

    get type(): Type<T> {
        return this.reflect.type;
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
        this._instance = null;
        this.injector.destroy();
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this.injector.onDestroy(callback);
    }
}
