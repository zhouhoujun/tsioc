import { FacRecord, IInjector, isArray, isFunction, isPlainObject, KeyValueProvider, Provider, ProviderType, refl, ROOT_INJECTOR, StaticProviders, Type } from '@tsdi/ioc';
import { IModuleProvider, ModuleFactory, ModuleInjector, ModuleOption, ModuleRegistered } from '../Context';
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
    exports: ModuleInjector[] = [];

    readonly regIn: string;
    private _instance: T;
    private _providers: ModuleProvider;

    constructor(readonly reflect: ModuleReflect<T>, parent?: IInjector, regIn?: string, protected _root = false, strategy: ModuleStrategy = mdInjStrategy) {
        super(parent, strategy)

        const recd = { value: this };
        this.factories.set(ModuleInjector, recd);
        this.regIn = regIn || this.reflect.regIn;
        this._providers = new ModuleProvider(this);
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

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
    }

    get providers() {
        return this._providers;
    }

    export(type: Type, noRef?: boolean, hasReged?: boolean): void {
        const state = this.state();

        if (!hasReged && !state.isRegistered(type)) {
            this.register(type);
        }
        this._providers.set(type, (pdr) => this.get(type, pdr));
        const reged = state.getRegistered<ModuleRegistered>(type);
        reged.provides?.forEach(p => {
            this._providers.set(p, (pdr) => this.get(type, pdr));
        });
        if (!noRef && reged.moduleRef) {
            this.exports.push(reged.moduleRef);
        }
    }

    registerProviders(providers: ProviderType[]) {
        providers.forEach(p => {
            if (!p) {
                return;
            }
            if (isFunction(p)) {
                return this.export(p);
            }

            if (isArray(p)) {
                const types = this.use(p);
                types.forEach(ty => this.export(ty, true, true));
                return;
            }

            if (isPlainObject(p)) {
                if ((p as StaticProviders).provide) {
                    const provide = (p as StaticProviders).provide;
                    this.factories.set(provide, this.generateRecord(p as StaticProviders));
                    this._providers.set(provide, (pdr) => this.get(provide, pdr));

                } else {
                    const types = this.use(p as any);
                    types.forEach(ty => this.export(ty, true, true));
                    return;
                }
            }

            if (p instanceof Provider) {
                this.copy(p);
                p.tokens().forEach(k => {
                    this._providers.set(k, (pdr) => this.get(k, pdr));
                });
                return;
            }

            if (p instanceof KeyValueProvider) {
                p.each((k, useValue) => {
                    this.factories.set(k, { value: useValue });
                    this._providers.set(k, () => this.get(k));
                });
                return;
            }
        });
        return this;
    }

    protected destroying() {
        super.destroying();
        this.imports.forEach(e => e.destroy());
        this._instance = null;
        this.imports = [];
        this.exports = [];
        this._providers = null;
        (this as any).reflect = null;
    }
}


/**
 * default module provider strategy.
 */
const mdPdrStrategy = new ModuleStrategy<IModuleProvider>(p => false, cu => cu.moduleRef.exports);

/**
 * module providers.
 */
export class ModuleProvider extends Provider implements IModuleProvider {

    constructor(public moduleRef: ModuleInjector, strategy = mdPdrStrategy) {
        super(moduleRef, strategy);
    }

    protected regType<T>(type: Type<T>) {
        this.moduleRef.export(type);
    }


    protected destroying() {
        super.destroying();
        this.moduleRef = null;
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

    create(parent: IInjector, option?: ModuleOption): ModuleInjector<T> {
        if ((parent as ModuleInjector)?.type === this._modelRefl.type) return parent as ModuleInjector;
        let inj = option ? this.createByOption(parent, option) : this.createInstance(parent);
        this.regModule(inj);
        return inj;
    }

    protected regModule(inj: ModuleInjector) {
        const state = inj.state();
        const isRoot = inj.regIn === 'root';
        if (inj.reflect.imports) {
            inj.register(inj.reflect.imports);
            inj.reflect.imports.forEach(ty => {
                const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                if (importRef) {
                    inj.imports.unshift(importRef);
                }
                if (isRoot) {
                    inj.export(ty);
                }
            })
        }
        if (inj.reflect.declarations) {
            inj.register(inj.reflect.declarations);
            if (isRoot) {
                inj.reflect.declarations.forEach(d => inj.export(d, true, true));
            }
        }
        if (inj.reflect.annotation?.providers) {
            inj.inject(inj.reflect.annotation.providers);
        }

        inj.reflect.exports?.forEach(ty => inj.export(ty));
        if (inj.providers.size && inj.parent instanceof ModuleInjector && inj.parent.isRoot) {
            inj.parent.imports.push(inj);
        }
    }


    protected createByOption(parent: IInjector, option: ModuleOption) {
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

    protected createInstance(parent: IInjector, regIn?: string, root?: boolean) {
        regIn = regIn || this._modelRefl.regIn;
        return new DefaultModuleInjector(this._modelRefl, (regIn && !root) ? parent.get(ROOT_INJECTOR) : parent, regIn, root);
    }
}