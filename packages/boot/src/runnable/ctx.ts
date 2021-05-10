import { IInjector, isFunction, refl, Strategy, Type, ROOT_INJECTOR } from '@tsdi/ioc';
import { ApplicationContext, BootContext, BootFactory, BootOption } from '../Context';
import { AnnotationReflect } from '../reflect';
import { CTX_ARGS, PROCESS_ROOT } from '../tk';


export class DefaultBootContext<T> extends BootContext<T> {

    readonly reflect: AnnotationReflect<T>;
    private _instance: T;
    constructor(readonly type: Type<T>, parent?: IInjector, strategy?: Strategy) {
        super(parent, strategy);
        this.reflect = refl.get(type);
    }

    get app(): ApplicationContext {
        return this.getInstance(ApplicationContext);
    }

    get injector(): IInjector {
        return this;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
    }

}


export class DefaultBootFactory<CT extends BootContext, OPT extends BootOption> implements BootFactory {
    constructor(public ctor: Type = DefaultBootContext) {
    }

    create(type: Type | OPT, parent?: IInjector): CT {
        if (isFunction(type)) {
            return this.createInstance(type, parent);
        } else {
            return this.createByOption(type, parent);
        }
    }


    protected createByOption(option: OPT, parent?: IInjector) {
        parent = parent || option.injector;
        const ctx = this.createInstance(option.type, option.regIn === 'root' ? parent.getInstance(ROOT_INJECTOR) : parent);
        this.initOption(ctx, option);
        return ctx;
    }

    protected initOption(ctx: CT, option: OPT) {
        if (option.providers) {
            ctx.parse(option.providers);
        }
        if (option.args) {
            ctx.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.setValue(PROCESS_ROOT, option.baseURL);
        }
    }

    protected createInstance(type: Type, parent: IInjector) {
        return new this.ctor(type, parent );
    }

}
