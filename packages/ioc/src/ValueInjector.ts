import { IocDestoryable } from './Destoryable';
import { SymbolType, Type, Token } from './types';
import { isClass, isNullOrUndefined, ClassTypes } from './utils/lang';
import { Registration } from './Registration';
import { IValueInjector } from './IInjector';

/**
 * value injector.
 */
export class ValueInjector extends IocDestoryable implements IValueInjector {
    /**
     * class type.
     */
    static d0CT: ClassTypes = 'injector';
    /**
     * values.
     */
    protected values: Map<SymbolType, any>;
    /**
     * provide types.
     *
     * @protected
     * @type {Map<Token, Type>}
     * @memberof BaseInjector
     */
    protected provideTypes: Map<SymbolType, Type>;

    constructor() {
        super();
        this.init();
    }

    protected init() {
        this.values = new Map();
        this.provideTypes = new Map();
    }

    get size(): number {
        return this.values.size;
    }

    /**
     * get token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof BaseInjector
     */
    getToken<T>(token: Token<T>, alias?: string): Token<T> {
        if (alias) {
            return new Registration(token, alias);
        }
        return token;
    }


    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof BaseInjector
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
        if (alias) {
            return new Registration(token, alias).toString();
        } else if (token instanceof Registration) {
            return token.toString();
        }
        return token;
    }

    setValue<T>(key: SymbolType<T>, value: T, provider?: Type<T>) {
        this.values.set(key, value);
        if (provider && isClass(provider)) {
            this.values.set(provider, value);
            this.provideTypes.set(key, provider);
        }
        return this;
    }

    delValue<T>(key: SymbolType<T>): void {
        this.values.delete(key);
    }

    /**
     * register value.
     *
     * @template T
     * @param {Token<T>} token
     * @param {T} value
     * @returns {this}
     * @memberof BaseInjector
     */
    registerValue<T>(token: Token<T>, value: T, provider?: Type<T>): this {
        let key = this.getTokenKey(token);
        return this.setValue(key, value, provider);
    }

    hasValue<T>(key: SymbolType<T>): boolean {
        return this.values.has(key);
    }

    hasRegisterValue<T>(key: SymbolType<T>): boolean {
        return this.values.has(key) || this.hasValueInRoot(key);
    }

    getValue<T>(key: SymbolType<T>): T {
        return this.tryGetValue(key) ?? this.getValueInRoot(key);
    }

    getFirstValue<T>(...keys: SymbolType<T>[]): T {
        let value: T;
        keys.some(k => {
            value = this.getValue(k);
            return !isNullOrUndefined(value);
        })
        return value;
    }

    protected hasValueInRoot(key: SymbolType): boolean {
        return false;
    }

    protected tryGetValue<T>(key: SymbolType<T>): T {
        return this.values.get(key) ?? null;
    }

    protected getValueInRoot<T>(key: SymbolType<T>): T {
        return null;
    }

    protected destroying() {
        this.values.clear();
        this.provideTypes.clear();
        delete this.values;
        delete this.provideTypes;
    }
}
