import {
    lang, refl, TypeReflect, Type, Inject, Abstract, Token, isArray,
    isProvide, IProvider, Provider, IInjector, Injector, ROOT_INJECTOR
} from '@tsdi/ioc';
import { AnnoationOption, IAnnoationContext } from '../Context';
import { CTX_OPTIONS } from '../tk';


/**
 * annoation context.
 */
@Abstract()
export class AnnoationContext<T extends AnnoationOption, TRefl extends TypeReflect = TypeReflect> extends Provider implements IAnnoationContext<T> {

    private _type: Type;
    get type() {
        return this._type;
    }

    private _reflect: TRefl;
    get reflect(): TRefl {
        return this._reflect;
    }

    protected options: T;

    constructor(@Inject() injector: Injector, @Inject(CTX_OPTIONS) options?: T) {
        super(injector)
        if (options) this.setOptions(options);
    }

    get root(): IInjector {
        return this.parent.getValue(ROOT_INJECTOR);
    }

    get injector(): IInjector {
        return this.parent as IInjector;
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

        if (options.type) {
            this._type = isProvide(options.type) ? this.injector.getTokenProvider(options.type) : options.type;
            this._reflect = refl.get(this._type);
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

    protected merge(from: AnnoationContext<T>, to: AnnoationContext<T>, filter?: (key: Token) => boolean) {
        super.merge(from, to, filter);
        to.setOptions(from.options);
    }

    protected destroying() {
        super.destroying()
        lang.cleanObj(this.options);
        this.options = null;
    }
}
