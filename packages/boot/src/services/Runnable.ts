import { lang, Type, Abstract, Inject, TARGET, createInjector, refl } from '@tsdi/ioc';
import { BootContext, BootstrapOption, IRunnable, ServiceFactory, ServiceFactoryResolver } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultBootContext } from './ctx';



/**
 * boot.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Runnable<T = any> implements IRunnable {

    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];


    constructor(@Inject(TARGET) protected instance: T) { }


    getInstance(): T {
        return this.instance ?? this as any;
    }

    getInstanceType(): Type<T> {
        return lang.getClass(this.instance);
    }

    /**
     * configure startup service.
     *
     * @param {BootContext<T>} [ctx]
     * @returns {(Promise<void>)}
     */
    abstract configureService(ctx: BootContext<T>): Promise<void>;

    /**
     * has destoryed or not.
     */
    get destroyed() {
        return this._destroyed;
    }
    /**
    * destory this.
    */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            this.destroyCbs.forEach(cb => cb());
            this.destroyCbs = null;
            this.destroying();
        }
    }

    /**
     * register callback on destory.
     * @param callback destory callback
     */
    onDestroy(callback: () => void): void {
        if (this.destroyCbs) {
            this.destroyCbs.push(callback);
        }
    }

    /**
     * destorying. default do nothing.
     */
    protected destroying() {
        this.instance = null;
    }

}

/**
 * target is Runnable or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Runnable}
 */
export function isRunnable(target: any): target is Runnable {
    if (target instanceof Runnable) {
        return true;
    }
    return false;
}


/**
 * runable boot factory.
 */
export class RunableServiceFactory<T = any> extends ServiceFactory<T> {

    constructor(private refl: AnnotationReflect<T>) {
        super();
    }

    get type() {
        return this.refl.type;
    }

    async create(option: BootstrapOption) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultBootContext(this.refl, injector);
        let startup: Runnable;
        if (ctx.instance instanceof Runnable) {
            startup = ctx.instance;
        } else {
            startup = injector.resolve(
                { token: Runnable, target: ctx.instance },
                { provide: BootContext, useValue: ctx }
            );
        }
        if (startup) {
            await startup.configureService(ctx);
            ctx.runnable = startup;
        }
        const app = ctx.getRoot();
        ctx.onDestroy(() => {
            lang.remove(app.bootstraps, ctx);
        });
        app.bootstraps.push(ctx);
        return ctx;
    }
}

export class RunnableFactoryResolver extends ServiceFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new RunableServiceFactory(refl.get(type));
    }
}