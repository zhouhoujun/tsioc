import { DefaultInjector, EMPTY, Injector, isArray, isFunction, isPlainObject, KeyValueProvider, ProviderType, refl, ROOT_INJECTOR, StaticProviders, Type } from '@tsdi/ioc';
import { IModuleExports, ModuleFactory, ModuleInjector, ModuleOption, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../metadata/ref';
import { CTX_ARGS, PROCESS_ROOT } from '../metadata/tk';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
export const mdInjStrategy = new ModuleStrategy<ModuleInjector>(p => p instanceof ModuleInjector, cu => cu.imports);


/**
 * default module injector.
 */
export class DefaultModuleInjector<T> extends ModuleInjector<T> {

    imports: ModuleInjector[] = [];
    exports: IModuleExports;
    private _regIn: string;
    private _instance: T;
    constructor(readonly reflect: ModuleReflect<T>, parent?: Injector, regIn?: string, protected _root = false, strategy: ModuleStrategy = mdInjStrategy) {
        super(EMPTY, parent, strategy)

        const recd = { value: this };
        this.factories.set(ModuleInjector, recd);
        this._regIn = regIn;
        this.exports = new ModuleExports(this);
        if (_root) {
            this.factories.set(ROOT_INJECTOR, recd);
        }
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    get isRoot() {
        return this._root;
    }

    get regIn(): string {
        return this._regIn ?? this.reflect.regIn ?? this.reflect.annotation?.regIn;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
    }

    protected destroying() {
        super.destroying();
        this.imports.forEach(e => e.destroy());
        this._instance = null;
        this.imports = [];
        this.exports = null;
        (this as any).reflect = null;
    }
}


/**
 * default module provider strategy.
 */
const mdPdrStrategy = new ModuleStrategy<IModuleExports>(p => false, cu => cu.exports);

/**
 * module exports.
 */
export class ModuleExports extends DefaultInjector implements IModuleExports {

    constructor(public moduleRef: ModuleInjector, strategy = mdPdrStrategy) {
        super(EMPTY, moduleRef, strategy);
        this.export(moduleRef.type, true);
    }

    /**
     * module injector.
     */
    exports: ModuleInjector[] = [];

    protected regType<T>(type: Type<T>) {
        if (this.registerIn(this.moduleRef, type)) {
            this.export(type, true, true);
        }
    }

    export(type: Type, noRef?: boolean, hasReged?: boolean) {
        if (this.has(type)) {
            return;
        }
        const state = this.state();
        if (!hasReged && !state.isRegistered(type)) {
            this.moduleRef.register(type);
        }

        const fn = (pdr) => this.moduleRef.get(type, pdr);
        this.set(type, fn);
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this.set(p, fn);
        });
        if (!noRef && reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }

    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    inject(...providers: ProviderType[]): this;
    inject(...args: any[]): this {
        const providers = (args.length === 1 && isArray(args[0])) ? args[0] : args;
        providers?.length && providers.forEach(p => {
            if (!p) {
                return;
            }
            if (isFunction(p)) {
                return this.regType(p);
            }

            if (isArray(p)) {
                return this.use(p);
            }

            if (isPlainObject(p)) {
                if ((p as StaticProviders).provide) {
                    const key = (p as StaticProviders).provide;
                    this.moduleRef.set(p as StaticProviders);
                    this.set(key, (pdr) => this.moduleRef.get(key, pdr));
                } else {
                    this.use(p);
                }
            } else if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.moduleRef.setValue(k, useValue);
                    this.set(k, () => this.moduleRef.get(k));
                });
            }
        });
        return this;
    }

    protected destroying() {
        super.destroying();
        this.exports.forEach(e => e.destroy());
        this.moduleRef = null;
        this.exports = null;
    }
}



export class DefaultModuleFactory<T = any> extends ModuleFactory<T> {

    private _modelRefl: ModuleReflect<T>;
    constructor(modelRefl: ModuleReflect<T> | Type<T>) {
        super();
        this._modelRefl = isFunction(modelRefl) ? refl.get(modelRefl) : modelRefl;
    }

    get moduleType() {
        return this._modelRefl?.type;
    }

    create(parent: Injector, option?: ModuleOption): ModuleInjector<T> {
        if ((parent as ModuleInjector)?.type === this._modelRefl.type) return parent as ModuleInjector;
        let inj = option ? this.createByOption(parent, option) : this.createInstance(parent);
        this.regModule(inj);
        return inj;
    }

    protected regModule(inj: ModuleInjector) {
        const state = inj.state();
        const regInRoot = inj.regIn === 'root';
        if (inj.reflect.imports) {
            inj.register(inj.reflect.imports);
            inj.reflect.imports.forEach(ty => {
                const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                if (importRef) {
                    inj.imports.unshift(importRef);
                }
                if (regInRoot) {
                    inj.exports.export(ty, false, true);
                }
            })
        }
        if (inj.reflect.declarations) {
            inj.register(inj.reflect.declarations);
            if (regInRoot) {
                inj.reflect.declarations.forEach(d => inj.exports.export(d, true, true));
            }
        }
        if (inj.reflect.annotation?.providers) {
            inj.exports.inject(inj.reflect.annotation.providers);
        }

        inj.reflect.exports?.forEach(ty => inj.exports.export(ty));
        if (inj.exports.size && inj.parent instanceof ModuleInjector && inj.parent.isRoot) {
            inj.parent.imports.push(inj);
        }
    }


    protected createByOption(parent: Injector, option: ModuleOption) {
        parent = parent || option.injector;
        const inj = this.createInstance(parent, option.regIn, option.root);
        if (option.providers) {
            inj.inject(option.providers);
        }
        if (option.deps) {
            inj.use(option.deps);
        }
        if (option.args) {
            inj.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            inj.setValue(PROCESS_ROOT, option.baseURL);
        }
        return inj;
    }

    protected createInstance(parent: Injector, regIn?: string, root?: boolean) {
        regIn = regIn || this._modelRefl.regIn;
        return new DefaultModuleInjector(this._modelRefl, (regIn && !root) ? parent.get(ROOT_INJECTOR) : parent, regIn, root);
    }
}