import { IInjector, DefaultInjector, isFunction, refl, Strategy, Type, ROOT_INJECTOR } from '@tsdi/ioc';
import { ApplicationContext, BootContext, BootFactory, BootOption } from '../Context';
import { AnnotationReflect } from '../reflect';
import { CTX_ARGS, PROCESS_ROOT } from '../tk';


export class DefaultBootContext<T> extends DefaultInjector implements BootContext<T> {
    private _type: Type<T>;
    readonly reflect: AnnotationReflect<T>;
    private _instance: T;
    constructor(target: Type<T>, parent?: IInjector, strategy?: Strategy) {
        super(parent, strategy);
        this._type = target;
        this.reflect = refl.get(target);
    }

    get app(): ApplicationContext {
        return this.getValue(ApplicationContext);
    }

    /**
     * module type.
     */
    get type(): Type<T> {
        return this._type;
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
        const ctx = this.createInstance(option.type, option.regIn === 'root' ? parent.getValue(ROOT_INJECTOR) : parent);
        this.initOption(ctx, option);
        return ctx;
    }

    protected initOption(ctx: CT, option: OPT) {
        if (option.providers) {
            ctx.injector.parse(option.providers);
        }
        if (option.args) {
            ctx.injector.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.injector.setValue(PROCESS_ROOT, option.baseURL);
        }
    }

    protected createInstance(type: Type, parent: IInjector) {
        return new this.ctor(type, parent );
    }

}
