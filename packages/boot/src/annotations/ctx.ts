import {
    lang, refl, TypeReflect, Type, Inject, Abstract,
    IProvider, isArray, Injector, IInjector, isProvide, Token, Provider
} from '@tsdi/ioc';
import { AnnoationOption, IAnnoationContext, IDestroyableContext, ProdverOption } from '../Context';
import { CTX_OPTIONS } from '../tk';


/**
 * Destroyable context.
 */
@Abstract()
export class DestroyableContext<T extends ProdverOption> extends Provider implements IDestroyableContext<T> {

    protected _root: Injector;
    protected options: T;

    constructor(@Inject() injector: Injector, @Inject(CTX_OPTIONS) options?: T) {
        super(injector)
        this._root = injector;
        if (options) this.setOptions(options);
    }

    /**
     * root injector of context.
     */
    get root(): IInjector {
        return this._root;
    }

    get injector(): IInjector {
        return this._root;
    }


    /**
     * get providers of options.
     */
    get providers(): IProvider {
        return this;
    }

    /**
     * set options for context.
     * @param options options.
     */
    protected setOptions(options: T): this {
        if (!options) {
            return;
        }

        if (options.providers) {
            if (isArray(options.providers)) {
                this.inject(...options.providers);
            } else {
                this.copy(options.providers);
            }
        }
        this.options = Object.assign(this.options || {}, options);
        return this;
    }

    /**
     * get options of context.
     *
     * @returns {T}
     */
    getOptions(): T {
        return this.options;
    }

    protected merge(from: DestroyableContext<T>, to: DestroyableContext<T>, filter?: (key: Token) => boolean) {
        super.merge(from, to, filter);
        to.setOptions(from.options);
    }

    protected destroying() {
        super.destroying()
        lang.cleanObj(this.options);
        this.options = null;
    }
}

/**
 * annoation context.
 */
@Abstract()
export class AnnoationContext<T extends AnnoationOption, TRefl extends TypeReflect = TypeReflect> extends DestroyableContext<T> implements IAnnoationContext<T> {


    private _type: Type;
    get type() {
        return this._type;
    }

    private _reflect: TRefl;
    get reflect(): TRefl {
        return this._reflect;
    }

    /**
     * set options for context.
     * @param options options.
     */
    protected setOptions(options: T): this {
        if (!options) {
            return;
        }

        if (options.type) {
            this._type = isProvide(options.type) ? this.root.getTokenProvider(options.type) : options.type;
            this._reflect = refl.get(this._type);
        }

        return super.setOptions(options);
    }
}
