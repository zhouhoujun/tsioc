import { IInjector, isBoolean, isFunction, isString, isTypeReflect, Provider, refl, ROOT_INJECTOR, Type } from '@tsdi/ioc';
import { IModuleExports, ModuleFactory, ModuleInjector, ModuleOption, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../reflect';
import { CTX_ARGS, PROCESS_ROOT } from '../tk';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
export const mdInjStrategy = new ModuleStrategy<ModuleInjector>(p => p instanceof ModuleInjector, cu => cu.imports);



export class DefaultModuleInjector<T> extends ModuleInjector<T> {

    imports: ModuleInjector[] = [];
    exports: IModuleExports;
    readonly regIn: string;
    private _instance: T;
    constructor(readonly reflect: ModuleReflect<T>, parent?: IInjector, regIn?: string, protected _root = false, strategy: ModuleStrategy = mdInjStrategy) {
        super(parent, strategy)
        this.regIn = regIn || this.reflect.regIn;
        this.exports = new ModuleProvider(this);
        if (_root) {
            this.setValue(ROOT_INJECTOR, this);
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
 * module providers.
 */
export class ModuleProvider extends Provider implements IModuleExports {

    constructor(public moduleRef: ModuleInjector, strategy = mdPdrStrategy) {
        super(moduleRef, strategy);
        this.export(moduleRef.type, true);
    }

    /**
     * module injector.
     */
    exports: ModuleInjector[] = [];

    protected regType<T>(type: Type<T>) {
        this.strategy.registerIn(this.moduleRef, { type });
        this.export(type);
    }

    export(type: Type, noRef?: boolean) {
        const state = this.state();
        if (!state.isRegistered(type)) {
            this.moduleRef.register(type);
        }

        this.set(type, (pdr) => this.moduleRef.getInstance(type, pdr));
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



export class DefaultModuleFactory extends ModuleFactory {

    constructor() {
        super();
    }

    create<T>(type: Type<T> | ModuleReflect<T> | ModuleOption<T>, parent?: IInjector, root?: boolean): ModuleInjector<T>;
    create<T>(type: Type<T> | ModuleReflect<T> | ModuleOption<T>, parent?: IInjector, regIn?: string, root?: boolean): ModuleInjector<T>;
    create<T>(type: Type<T> | ModuleReflect<T> | ModuleOption<T>, parent?: IInjector, arg?: any, root?: boolean): ModuleInjector<T> {
        let regIn: string;
        if(isString(arg)){
            regIn = arg;
        } else if(isBoolean(arg)){
            root = arg;
        }

        let inj = isFunction(type) ? this.createInstance(refl.get(type), parent, root, regIn)
            : (isTypeReflect(type) ? this.createInstance(type, parent, root, regIn) : this.createByOption(type, parent, root, regIn));
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
                    inj.exports.export(ty);
                }
            })
        }
        if (inj.reflect.components) inj.register(inj.reflect.components);
        if (inj.reflect.annotation.providers) {
            inj.exports.parse(inj.reflect.annotation.providers);
        }

        inj.reflect.exports?.forEach(ty => inj.exports.export(ty));
        if (inj.exports.size && inj.parent instanceof ModuleInjector && inj.parent.isRoot) {
            inj.parent.imports.push(inj);
        }
    }


    protected createByOption(option: ModuleOption, parent?: IInjector, root?: boolean, regIn?: string) {
        parent = parent || option.injector;
        const inj = this.createInstance(refl.get(option.type), parent, root, regIn || option.regIn);
        if (option.providers) {
            inj.parse(option.providers);
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

    protected createInstance(type: ModuleReflect, parent: IInjector, root?: boolean, regIn?: string) {
        regIn = regIn || type.regIn;
        return new DefaultModuleInjector(type, (regIn && !root) ? parent.getInstance(ROOT_INJECTOR) : parent, regIn, root);
    }
}