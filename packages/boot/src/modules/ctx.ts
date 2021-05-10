import { IInjector, isFunction, Provider, refl, ROOT_INJECTOR, Type } from '@tsdi/ioc';
import { ApplicationContext, IModuleExports, ModuleContext, ModuleFactory, ModuleOption, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../reflect';
import { CTX_ARGS, PROCESS_ROOT } from '../tk';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
const mdInjStrategy = new ModuleStrategy<ModuleContext>(p => p instanceof ModuleContext, cu => cu.imports);



export class DefaultModuleContext<T> extends ModuleContext<T> {

    imports: ModuleContext[] = [];
    exports: IModuleExports;
    readonly reflect: ModuleReflect<T>;
    readonly regIn: string;
    private _instance: T;
    constructor(readonly type: Type<T>, parent?: IInjector, regIn?: string, strategy: ModuleStrategy = mdInjStrategy) {
        super(parent, strategy)
        this.reflect = refl.get(type);
        this.exports = new ModuleProvider(this);
        this.regIn = regIn || this.reflect.regIn;
        this.regModule();
    }

    get injector() {
        return this;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
    }
    protected regModule() {
        const state = this.state();
        if (this.reflect.imports) {
            this.register(this.reflect.imports);
            const isRoot = this.regIn === 'root'
            this.reflect.imports.forEach(ty => {
                const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                if (importRef) {
                    this.imports.unshift(importRef);
                }
                if (isRoot) {
                    this.exports.export(ty);
                }
            })
        }
        if (this.reflect.components) this.register(this.reflect.components);
        if (this.reflect.annotation.providers) {
            this.exports.parse(this.reflect.annotation.providers);
        }

        this.reflect.exports?.forEach(ty => this.exports.export(ty));
        const appctx = this.getInstance(ApplicationContext);
        if (this.exports.size && this.parent === appctx) {
            appctx.imports.push(this);
        }
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

    constructor(public moduleRef: ModuleContext, strategy = mdPdrStrategy) {
        super(moduleRef, strategy);
    }

    /**
     * module injector.
     */
    exports: ModuleContext[] = [];

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


export class DefaultModuleFactory<CT extends ModuleContext = ModuleContext, OPT extends ModuleOption = ModuleOption> extends ModuleFactory {
    
    constructor(protected ctor: Type = DefaultModuleContext) {
        super();
    }

    create(type: Type | OPT, parent?: IInjector): CT {
        if (isFunction(type)) {
            return this.createInstance(type, parent);
        } else {
            return this.createByOption(type, parent);
        }
    }


    protected createByOption(option: OPT, parent?: IInjector) {
        parent = parent || option.injector;
        const ctx = this.createInstance(option.type, option.regIn === 'root' ? parent.getInstance(ROOT_INJECTOR) : parent);
        this.initOption(ctx, option);
        return ctx;
    }

    protected initOption(ctx: CT, option: OPT) {
        if (option.providers) {
            ctx.parse(option.providers);
        }
        if (option.args) {
            ctx.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.setValue(PROCESS_ROOT, option.baseURL);
        }
    }

    protected createInstance(type: Type, parent: IInjector) {
        return new this.ctor(type, parent);
    }
}