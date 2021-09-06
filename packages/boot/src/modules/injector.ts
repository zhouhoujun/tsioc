import { DefaultInjector, EMPTY, Injector, InjectorScope, isArray, isFunction, isPlainObject, KeyValueProvider, Modules, ProviderType, refl, ROOT_INJECTOR, StaticProviders, Type } from '@tsdi/ioc';
import { IModuleExports, ModuleFactory, ModuleInjector, ModuleOption, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../metadata/ref';
import { CTX_ARGS, PROCESS_ROOT } from '../metadata/tk';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
export const mdInjStrategy = new ModuleStrategy<ModuleInjector>(cu => cu.imports);


/**
 * default module injector.
 */
export class DefaultModuleInjector<T> extends ModuleInjector<T> {

    imports: ModuleInjector[] = [];
    exports: IModuleExports;
    private _instance: T;

    constructor(readonly reflect: ModuleReflect<T>, providers?: ProviderType[], parent?: Injector, private _regIn?: string, scope?: InjectorScope | string, strategy: ModuleStrategy = mdInjStrategy) {
        super(providers || EMPTY, parent, scope, strategy);

        this.setValue(ModuleInjector, this);
        this.exports = new ModuleExports(this);
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    get isRoot() {
        return this.scope === 'root';
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

    protected override destroying() {
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
const mdPdrStrategy = new ModuleStrategy<IModuleExports>(cu => cu.exports);

/**
 * module exports.
 */
export class ModuleExports extends DefaultInjector implements IModuleExports {

    constructor(public moduleRef: ModuleInjector, scope?: InjectorScope, strategy = mdPdrStrategy) {
        super(EMPTY, moduleRef, scope, strategy);
        this.export(moduleRef.type, true);
    }

    protected override initParent(parent: ModuleInjector) {
        parent.onDestroy(this.destCb);
        this._action = parent.action();
        this._state = parent.state();
        (this as any).parent = null;
    }

    /**
     * module injector.
     */
    exports: ModuleInjector[] = [];

    protected override regType<T>(type: Type<T>) {
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
    override inject(providers: ProviderType[]): this;
    /**
     * inject providers.
     *
     * @param {...ProviderType[]} providers
     * @returns {this}
     */
    override inject(...providers: ProviderType[]): this;
    override inject(...args: any[]): this {
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

    protected override destroying() {
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

    override get moduleType() {
        return this._modelRefl?.type;
    }

    override create(parent: Injector, option?: ModuleOption): ModuleInjector<T> {
        let inj: ModuleInjector;
        if ((parent as ModuleInjector)?.type === this._modelRefl.type) {
            inj = parent as ModuleInjector;
        } else {
            inj = createModuleInjector(this._modelRefl, option.providers, parent || option.injector, option);
        }
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

}

export function createModuleInjector(type: ModuleReflect | Type, providers: ProviderType[], parent?: Injector,
    option: {
        scope?: string | InjectorScope;
        regIn?: string;
        deps?: Modules[];
        args?: any[];
        baseURL?: string;
    } = {}) {

    let inj = new DefaultModuleInjector(isFunction(type) ? refl.get<ModuleReflect>(type) : type, providers, parent, option.regIn, option.scope);
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