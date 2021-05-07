import { IInjector, Provider, Type } from '@tsdi/ioc';
import { IModuleExports, ModuleContext, ModuleRegistered } from '../Context';
import { ModuleReflect } from '../reflect';
import { DefaultBootContext } from '../runnable/ctx';
import { ModuleStrategy } from './strategy';



/**
 * default module injector strategy.
 */
const mdInjStrategy = new ModuleStrategy<ModuleContext>(p => p instanceof ModuleContext, cu => cu.imports);



export class DefaultModuleContext<T> extends DefaultBootContext<T> implements ModuleContext<T> {

    imports: ModuleContext[] = [];
    exports: IModuleExports;
    readonly reflect: ModuleReflect<T>;
    readonly regIn: string
    constructor(target: Type<T>, parent?: IInjector, regIn?: string, strategy = mdInjStrategy) {
        super(target, parent, strategy)
        this.exports = new ModuleProvider(this);
        this.regIn = regIn || this.reflect.regIn;
        this.regModule();
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
        if (this.exports.size && this.parent === this.app) {
            this.app.imports.push(this);
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
