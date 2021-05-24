import { IInjector, refl, Type, createInjector, lang, isTypeReflect } from '@tsdi/ioc';
import { ApplicationContext, BootContext, BootFactory, BootFactoryOption } from '../Context';
import { AnnotationReflect } from '../reflect';
import { Runnable } from './Runnable';


export class DefaultBootContext<T> extends BootContext<T> {

    private _destroyed = false;
    private _dsryCbs: (() => void)[] = [];
    runnable: Runnable;
    private _instance: T;
    constructor(readonly reflect: AnnotationReflect<T>, readonly injector: IInjector) {
        super();
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    get app(): ApplicationContext {
        return this.injector.get(ApplicationContext);
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
            this._dsryCbs.push(callback);
        }
    }

    protected destroying() {
        this.injector.destroy();
        this.runnable?.destroy();
        this._instance = null;
    }
}

/**
 * runable boot factory.
 */
export class RunnableBootFactory extends BootFactory {

    async create<T>(type: Type<T> | AnnotationReflect<T>, option: BootFactoryOption) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultBootContext(isTypeReflect(type) ? type : refl.get(type), injector);
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
        const app = ctx.app;
        ctx.onDestroy(() => {
            lang.remove(app.bootstraps, ctx);
        });
        app.bootstraps.push(ctx);
        return ctx;
    }
}
