import {
    Token, lang, SymbolType, Type, IInjector, Provider, InstFac, ProviderType, Strategy,
    isNil, isPlainObject, InjectorImpl, isContainer, IProvider, Injector, Container
} from '@tsdi/ioc';
import { IModuleInjector, IModuleProvider, ModuleRef, ModuleRegistered } from './ref';
import { ROOT_INJECTOR } from '../tk';



export class ModuleStrategy<TI extends IProvider> extends Strategy {

    constructor(private vaild: (parent: IProvider) => boolean, private getMDRef: (curr: TI) => ModuleRef[]) {
        super();
    }

    vaildParent(parent: IProvider) {
        return this.vaild(parent);
    }


    hasTokenKey<T>(key: SymbolType<T>, curr: TI, deep?: boolean) {
        return this.getMDRef(curr).some(r => r.exports.hasTokenKey(key)) || (deep && curr.parent?.hasTokenKey(key));
    }

    getInstance<T>(key: SymbolType<T>, curr: TI, ...providers: ProviderType[]) {
        let inst: T;
        if (this.getMDRef(curr).some(e => {
            inst = e.exports.getInstance(key, ...providers);
            return !isNil(inst);
        })) return inst;
        return curr.parent?.getInstance(key, ...providers);
    }

    hasValue<T>(key: SymbolType<T>, curr: TI) {
        return this.getMDRef(curr).some(r => r.exports.hasValue(key)) || curr.parent?.hasValue(key);
    }

    getValue<T>(key: SymbolType<T>, curr: TI) {
        let value: T;
        if (this.getMDRef(curr).some(r => {
            value = r.exports.getValue(key);
            return !isNil(value)
        })) return value;
        return curr.parent?.getValue(key);
    }

    getTokenProvider<T>(key: SymbolType<T>, curr: TI) {
        let type;
        this.getMDRef(curr).some(r => {
            type = r.exports.getTokenProvider(key);
            return type;
        });
        return type ?? curr.parent?.getTokenProvider(key);
    }

    iterator(map: Map<SymbolType, InstFac>, callbackfn: (fac: InstFac, key: SymbolType, resolvor?: TI) => void | boolean, curr: TI, deep?: boolean) {
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
};

const mdInjStrategy = new ModuleStrategy<IModuleInjector>(p => p instanceof Injector, cu => cu.deps);
/**
 * DI module exports.
 *
 * @export
 * @class DIModuleExports
 * @extends {IocCoreService}
 * @implements {IResolver}
 */
export class ModuleInjector extends InjectorImpl implements IModuleInjector {

    deps: ModuleRef[];
    private _root: boolean;

    constructor(parent: IInjector) {
        super(parent, mdInjStrategy);
        this._root = isContainer(parent);
        this.deps = [];
        this.onDestroy(() => {
            this.deps.forEach(mr => mr.destroy());
            this.deps = [];
        });
    }

    static create(parent: IInjector) {
        return new ModuleInjector(parent);
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
    private _exports: ModuleProviders;
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
        const container = this.parent.getContainer();
        const root = container.getValue(ROOT_INJECTOR);
        if (this.regIn === 'root') {
            this._parent = root;
        }
        this._injector = ModuleInjector.create(root);
        this._injector.setValue(ModuleRef, this);
        const pdr = new ModuleProviders(this._injector);
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

    get<T>(key: SymbolType<T>, ...providers: ProviderType[]): T {
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

const mdPdrStrategy = new ModuleStrategy<IModuleProvider>(p => !(p instanceof Injector), cu => cu.exports);
/**
 * module providers.
 */
export class ModuleProviders extends Provider implements IModuleProvider {

    constructor(injector: IModuleInjector) {
        super(injector, mdPdrStrategy);
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
    /**
     * register type class.
     * @param type the class type.
     * @param [options] the class prodvider to.
     * @returns {this}
     */
    registerType<T>(type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register type class.
     * @param Type the class.
     * @param [provide] the class prodvider to.
     * @param [singleton]
     * @returns {this}
     */
    registerType<T>(type: Type<T>, provide?: Token<T>, singleton?: boolean): this;
    registerType<T>(type: Type<T>, provide?: any, singleton?: boolean): this {
        if (isPlainObject(provide)) {
            this.getContainer()?.registerIn(this.mdInjector, type, provide as any);
        } else {
            this.getContainer()?.registerIn(this.mdInjector, type, { provide, singleton });
        }
        this.export(type);
        return this;
    }

    export(type: Type, noRef?: boolean) {
        const state = this.getContainer().regedState;
        if (!state.isRegistered(type)) {
            this.mdInjector.registerType(type);
        }
        this.set(type, (...pdrs) => this.mdInjector.getInstance(type, ...pdrs));
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this.set(p, { fac: (...pdrs) => this.mdInjector.get(p, ...pdrs), provider: type }, true);
        });
        if (!noRef && reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }
}
