import {
    Token, lang, Type, IInjector, Provider, ProviderState, ProviderType, Strategy,
    isNil, InjectorImpl, IProvider, Injector, ProviderOption, ROOT_INJECTOR
} from '@tsdi/ioc';
import { IModuleInjector, IModuleProvider, ModuleRef, ModuleRegistered } from './ref';




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
const mdInjStrategy = new ModuleStrategy<IModuleInjector>(p => p instanceof Injector, cu => cu.deps);

/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @implements {IResolver}
 */
export class ModuleInjector extends InjectorImpl implements IModuleInjector {

    deps: ModuleRef[];
    private _root: boolean;

    constructor(parent: IInjector, strategy: Strategy = mdInjStrategy) {
        super(parent, strategy);
        this.deps = [];
        this.onDestroy(() => {
            this.deps.forEach(mr => mr.destroy());
            this.deps = [];
        });
    }

    /**
     * create new module injector
     * @param parent parent.
     * @param root is root or not.
     * @returns 
     */
    static create(parent: IInjector, root = false) {
        const inj = new ModuleInjector(parent);
        inj._root = root;
        return inj;
    }

    isRoot() {
        return this._root;
    }

    addRef(ref: ModuleRef, first?: boolean): this {
        if (this.hasRef(ref)) {
            return this;
        }
        if (first) {
            this.deps.unshift(ref);
        } else {
            this.deps.push(ref);
        }
        return this;
    }

    hasRef(ref: ModuleRef): boolean {
        return this.deps.indexOf(ref) >= 0;
    }

    delRef(ref: ModuleRef) {
        return lang.remove(this.deps, ref);
    }
}

/**
 * default moduleRef.
 */
export class DefaultModuleRef<T = any> extends ModuleRef<T> {

    private _injector: IModuleInjector;
    private _exports: ModuleProvider;
    private _inst: T;
    private _imports: Type[];
    constructor(
        moduleType: Type<T>,
        parent?: IModuleInjector,
        regIn?: string
    ) {
        super(moduleType, parent, regIn);
        this.initRef();
    }

    protected initRef() {
        const root = this.parent.getValue(ROOT_INJECTOR);
        if (this.regIn === 'root') {
            this._parent = root as IModuleInjector;
        }
        this._injector = ModuleInjector.create(root);
        this._injector.setValue(ModuleRef, this);
        const pdr = new ModuleProvider(this._injector);
        pdr.export(this.type, true);
        this._exports = pdr;
    }


    get injector(): IModuleInjector {
        return this._injector;
    }

    get instance(): T {
        if (!this._inst) {
            this._inst = this.injector.getInstance(this.type);
        }
        return this._inst;
    }

    get<T>(key: Token<T>, ...providers: ProviderType[]): T {
        return this.injector.getInstance(key, ...providers);
    }

    get imports(): Type[] {
        return this._imports || [];
    }
    set imports(imports: Type[]) {
        this._imports = imports;
    }

    get exports(): IModuleProvider {
        return this._exports;
    }

    protected destroying() {
        const parent = this.parent;
        if (parent instanceof ModuleInjector) {
            parent.delRef(this);
        } else {
            this.exports.iterator((f, k) => {
                parent.unregister(k);
            });
        }
        this._exports.destroy();
        this._injector.destroy();
        this._type = null;
        this._parent = null;
        this._regIn = null;
        this._exports = null;
        this._imports = null;
        this._injector = null;
        this._inst = null;
    }
}


/**
 * default module provider strategy.
 */
const mdPdrStrategy = new ModuleStrategy<IModuleProvider>(p => !(p instanceof Injector), cu => cu.exports);

/**
 * module providers.
 */
export class ModuleProvider extends Provider implements IModuleProvider {

    constructor(injector: IModuleInjector, strategy: Strategy = mdPdrStrategy) {
        super(injector, strategy);
        this.mdInjector = injector;
        this.onDestroy(() => {
            this.mdInjector = null;
            this.exports.forEach(e => e.destroy());
            this.exports = [];
        });
    }
    /**
     * module Injector
     */
    mdInjector: IModuleInjector;
    /**
     * module injector.
     */
    exports: ModuleRef[] = [];

    protected regType<T>(type: Type<T>) {
        this.strategy.registerIn(this.mdInjector, { type });
        this.export(type);
    }

    export(type: Type, noRef?: boolean) {
        const state = this.state();
        if (!state.isRegistered(type)) {
            this.mdInjector.register(type);
        }
        this.set(type, (pdr) => this.mdInjector.toInstance(type, pdr));
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this.set(p, { fac: (pdr) => this.mdInjector.toInstance(p, pdr), useClass: type });
        });
        if (!noRef && reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }
}
