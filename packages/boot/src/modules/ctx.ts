import { IInjector, isFunction, Provider, refl, RegisteredState, ROOT_INJECTOR, Type } from '@tsdi/ioc';
import { ApplicationContext, IModuleExports, ModuleContext, ModuleFactory, ModuleOption, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../reflect';
import { CTX_ARGS, PROCESS_ROOT } from '../tk';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
export const mdInjStrategy = new ModuleStrategy<ModuleContext>(p => p instanceof ModuleContext, cu => cu.imports);



export class DefaultModuleContext<T> extends ModuleContext<T> {

    imports: ModuleContext[] = [];
    exports: IModuleExports;
    readonly reflect: ModuleReflect<T>;
    readonly regIn: string;
    private _instance: T;
    constructor(readonly type: Type<T>, parent?: IInjector, regIn?: string, strategy: ModuleStrategy = mdInjStrategy) {
        super(parent, strategy)
        this.reflect = refl.get(type);
        this.regIn = regIn || this.reflect.regIn;
        this.exports = new ModuleProvider(this);
        this.onDestroy(()=>{
            this.imports.forEach(e => e.destroy());
        });
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve({ token: this.type, regify: true });
        }
        return this._instance;
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
        this.export(moduleRef.type, true);
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


export class DefaultModuleFactory extends ModuleFactory {

    constructor() {
        super();
    }

    create(type: Type | ModuleOption, parent?: IInjector): ModuleContext {
        let ctx = isFunction(type) ? this.createInstance(type, parent) : this.createByOption(type, parent);
        this.regModule(ctx);
        return ctx;
    }

    protected regModule(ctx: ModuleContext) {
        const state = ctx.state();
        const isRoot = ctx.regIn === 'root';
        if (ctx.reflect.imports) {
            ctx.register(ctx.reflect.imports);
            ctx.reflect.imports.forEach(ty => {
                const importRef = state.getRegistered<ModuleRegistered>(ty)?.moduleRef;
                if (importRef) {
                    ctx.imports.unshift(importRef);
                }
                if (isRoot) {
                    ctx.exports.export(ty);
                }
            })
        }
        if (ctx.reflect.components) ctx.register(ctx.reflect.components);
        if (ctx.reflect.annotation.providers) {
            ctx.exports.parse(ctx.reflect.annotation.providers);
        }

        ctx.reflect.exports?.forEach(ty => ctx.exports.export(ty));
        if (ctx.exports.size && ctx.parent instanceof ApplicationContext) {
            ctx.parent.imports.push(ctx);
        }
    }


    protected createByOption(option: ModuleOption, parent?: IInjector) {
        parent = parent || option.injector;
        const ctx = this.createInstance(option.type, option.regIn === 'root' ? (parent.getInstance(ROOT_INJECTOR) ?? parent) : parent);
        if (option.providers) {
            ctx.parse(option.providers);
        }
        if (option.args) {
            ctx.setValue(CTX_ARGS, option.args);
        }
        if (option.baseURL) {
            ctx.setValue(PROCESS_ROOT, option.baseURL);
        }
        return ctx;
    }

    protected createInstance(type: Type, parent: IInjector) {
        return new DefaultModuleContext(type, parent);
    }
}