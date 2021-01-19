import {
    lang, INJECTOR, PROVIDERS, refl, TypeReflect, Type, Inject, Abstract, IContainer,
    IProvider, isArray, isBoolean, Injector, IInjector, isProvide, Token
} from '@tsdi/ioc';
import { AnnoationOption, IAnnoationContext, IDestroyableContext, ProdverOption } from '../Context';
import { CTX_OPTIONS } from '../tk';


/**
 * Destroyable context.
 */
@Abstract()
export class DestroyableContext<T extends ProdverOption> implements IDestroyableContext<T> {

    static ρNPT = true;
    private _destroyed = false;
    private destroyCbs: (() => void)[] = [];
    private _provider: IProvider;
    protected options: T;

    constructor(@Inject() injector: Injector, @Inject(CTX_OPTIONS) options: T) {
        this._provider = injector.getContainer().get(PROVIDERS);
        this._provider.setValue(INJECTOR, injector);
        this.setOptions(options);
    }

    /**
     * raise injector of this context.
     */
    get injector(): IInjector {
        return this._provider.getValue(INJECTOR);
    }

    /**
     * get providers of options.
     */
    get providers(): IProvider {
        return this._provider;
    }

    hasValue(token: Token): boolean {
        return this._provider.hasValue(token);
    }
    /**
     * get value from context.
     * @param key token key
     */
    getValue<T>(key: Token<T>): T {
        return this._provider.getValue(key);
    }

    /**
     * set value to this contet.
     * @param key token key
     * @param value value of key.
     */
    setValue<T>(key: Token<T>, value: T) {
        this._provider.setValue(key, value);
        return this;
    }

    /**
     * get root container.
     */
    getContainer(): IContainer {
        return this._provider.getContainer();
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
                this._provider.inject(...options.providers);
            } else {
                this._provider.copy(options.providers);
            }
        }
        this.options = Object.assign(this.options|| {}, options);
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

    clone(): this;
    clone(options: T): this;
    /**
     * clone contexts.
     */
    clone(options?: T | boolean): this {
        const Ctx = lang.getClass(this);
        if (isBoolean(options)) {
            return options ? new Ctx(null, this.injector)
                : new Ctx(this.getOptions(), this.injector);
        } else {
            return new Ctx({ ...this.getOptions(), contexts: this._provider.clone(), ...options || {} }, this.injector);
        }
    }

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
            this.destroyCbs = [];
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

    protected destroying() {
        this._provider.destroy();
        lang.cleanObj(this.options);
        this.options = null;
        this._provider = null;
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
            this._type = isProvide(options.type) ? this.injector.getTokenProvider(options.type) : options.type;
            if (!this._type) console.log('options.type', options.type);
            this._reflect = refl.get(this._type);
        }

        return super.setOptions(options);
    }
}
