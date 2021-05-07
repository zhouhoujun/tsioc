import { CTX_BASEURL } from '@tsdi/activities';
import { IInjector, isFunction, refl, Strategy, Type } from '@tsdi/ioc';
import { ApplicationContext, BootContext, BootFactory, BootOption } from '../Context';
import { AnnotationReflect } from '../reflect';
import { CTX_ARGS } from '../tk';


export class DefaultBootContext<T> extends BootContext<T> {
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


export class DefaultBootFactory<T> extends BootFactory<T> {
    constructor(private root: IInjector) {
        super();
    }

    create(type: Type<T> | BootOption<T>, parent?: IInjector): BootContext<T> {
        if (isFunction(type)) {
            return this.viaType(type, parent);
        } else {
            return this.viaOption(type, parent);
        }
    }

    protected viaType(type: Type<T>, parent?: IInjector) {
        return new DefaultBootContext(type, parent || this.root);
    }

    protected viaOption(option: BootOption<T>, parent?: IInjector) {
        const ctx = new DefaultBootContext(option.type, option.regIn ==='root'? this.root : (parent || option.injector || this.root));
        if (option.providers) {
            ctx.parse(option.providers);
        }
        if (option.args) {
            ctx.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.setValue(CTX_BASEURL, option.baseURL);
        }
        return ctx;
    }

}
