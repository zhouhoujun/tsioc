import { Destroyable, IInjector, isFunction, lang, Type } from '@tsdi/ioc';
import { ApplicationContext, IRunnable, Runnable, Runner } from '../Context';
import { AnnotationReflect } from '../metadata/ref';

/**
 * application default runner.
 */
export class DefaultRunner<T> extends Runner<T> {

    private _instance: T;

    constructor(readonly reflect: AnnotationReflect<T>, readonly injector: IInjector) {
        super();
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.injector.resolve({ token: this.type, regify: true }, { provide: Runner, useValue: this });
        }
        return this._instance;
    }

    private _runnable: IRunnable;
    protected getRunnable() {
        if (!this._runnable) {
            if (isFunction((this.instance as T & IRunnable).run)) {
                this._runnable = this.instance as T & IRunnable;
            }
            this._runnable = this.injector.resolve({ token: Runnable, target: this.instance }, { provide: Runner, useValue: this }) ?? this.instance as T & IRunnable;
        }
        return this._runnable;
    }

    run(context?: ApplicationContext) {
        const runable = this.getRunnable() as Runnable;
        if (context) {
            this.onDestroy(() => {
                lang.remove(context.bootstraps, this);
            });
            context.bootstraps.push(this);
        }
        return runable.run(...context.args);
    }

    /**
    * destory this.
    */
    destroy(): void {
        this.injector.destroy();
        (this._runnable as Runnable & Destroyable)?.destroy();
        this._runnable = null;
        this._instance = null;
    }
    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        this.injector.onDestroy(callback);
    }
}
