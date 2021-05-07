import { IInjector, Injector, IProvider, isNil, lang, Provider, ProviderState, Strategy, Token, Type } from '@tsdi/ioc';
import { IModuleProvider, ModuleRef, ModuleRegistered } from './ref';
import { ModuleReflect } from '../reflect';



/**
 * module injector strategy.
 */
 export class ModuleStrategy<TI extends IProvider> extends Strategy {

    constructor(private vaild: (parent: IProvider) => boolean, private getMDRef: (curr: TI) => ModuleRef[]) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }


    hasToken<T>(key: Token<T>, curr: TI, deep?: boolean) {
        return this.getMDRef(curr).some(r => r.exports.has(key)) || (deep && curr.parent?.has(key));
    }

    getInstance<T>(key: Token<T>, curr: TI, provider: IProvider) {
        let inst: T;
        if (this.getMDRef(curr).some(e => {
            inst = e.exports.toInstance(key, provider);
            return !isNil(inst);
        })) return inst;
        return curr.parent?.toInstance(key, provider);
    }

    hasValue<T>(key: Token<T>, curr: TI) {
        return this.getMDRef(curr).some(r => r.exports.hasValue(key)) || curr.parent?.hasValue(key);
    }

    getValue<T>(key: Token<T>, curr: TI) {
        let value: T;
        if (this.getMDRef(curr).some(r => {
            value = r.exports.getValue(key);
            return !isNil(value)
        })) return value;
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: Token<T>, curr: TI) {
        let type;
        this.getMDRef(curr).some(r => {
            type = r.exports.getTokenProvider(key);
            return type;
        });
        return type ?? curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<Token, ProviderState>, callbackfn: (fac: ProviderState, key: Token, resolvor?: TI) => void | boolean, curr: TI, deep?: boolean) {
        if (lang.mapEach(map, callbackfn, curr) === false) {
            return false;
        }
        if (this.getMDRef(curr).some(exp => exp.exports.iterator(callbackfn) === false)) {
            return false;
        }
        if (deep) {
            return curr.parent?.iterator(callbackfn, deep);
        }
    }
}



/**
 * default module injector strategy.
 */
const mdInjStrategy = new ModuleStrategy<ModuleRef>(p => p instanceof Injector, cu => cu.deps);


/**
 * default module provider strategy.
 */
const mdPdrStrategy = new ModuleStrategy<IModuleProvider>(p => !(p instanceof ModuleRef), cu => cu.exports);

/**
 * module providers.
 */
export class ModuleProvider extends Provider implements IModuleProvider {

    constructor(public moduleRef: ModuleRef, strategy: Strategy = mdPdrStrategy) {
        super(moduleRef, strategy);
    }

    /**
     * module injector.
     */
    exports: ModuleRef[] = [];

    protected regType<T>(type: Type<T>) {
        this.strategy.registerIn(this.moduleRef, { type });
        this.export(type);
    }

    export(type: Type, noRef?: boolean) {
        const state = this.state();
        if (!state.isRegistered(type)) {
            this.moduleRef.register(type);
        }

        this.set(type, (pdr) => this.moduleRef.toInstance(type, pdr));
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this.set({ provide: p, useClass: type });
        });
        if (!noRef && reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }

    protected destroying() {
        super.destroying();
        this.exports.forEach(e => e.destroy());
        this.moduleRef = null;
        this.exports = null;
    }
}



export class DIModuleRef<T = any> extends ModuleRef<T> {

    private _exports: ModuleProvider;
    public readonly instance: T;

    constructor(_type: Type<T> | ModuleReflect<T>, protected _parent?: IInjector, protected _regIn?: string | 'root', strategy = mdInjStrategy) {
        super(_type, _parent, _regIn, strategy)
        this._exports = new ModuleProvider(this);
        this.onDestroy(() => this._exports.destroy());
        this.instance = this.getInstance(this.type);
    }

    get exports(): IModuleProvider {
        return this._exports;
    }

    protected destroying() {
        this._exports.destroy();
        super.destroying();
        this._exports = null;
    }

}