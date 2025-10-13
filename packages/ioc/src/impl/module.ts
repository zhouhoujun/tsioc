import { Exception } from '../exception';
import { Injector, InjectorScope } from '../injector';
import { getClassRef, getClassify } from '../metadata/refl';
import { ClassRef, ModuleDef } from '../metadata/class';
import { ModuleOption, ModuleRef } from '../module.ref';
import { Runtime } from '../runtime';
import { isModuleProviders, ModuleWithProviders, Provider } from '../providers';
import { Type } from '../types';
import { DefaultInjector } from './injector';
import { mergePromise, processInject } from './resolve';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance!: T;
    private _type: Type<T>;
    private _typeRefl: ClassRef<T>;

    constructor(moduleType: ClassRef<T>, parent: Injector, option: ModuleOption = {}) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type);
        this.isStatic = (moduleType.getAnnotation().static || option.isStatic) !== false;
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type<T>;

        this.setValue(ModuleRef, this);
        this.initWithOptions(option);
    }

    protected initWithOptions(option: ModuleOption) {
        const dedupStack: Type[] = [];
        const runtime = this.getRuntime();
        runtime.modules.set(this._type, this);
        let ps: Promise<void> | void | undefined;
        
        if (option.deps?.length) {
            const deps = option.deps;
            ps = mergePromise(ps, () => this.processUse(deps))
        }

        if (option.providers?.length) {
            const providers = option.providers;
            ps = mergePromise(ps, () => processInject(runtime, this, providers))
        }

        return mergePromise(ps, () => this.ininModule(runtime, dedupStack, option))
    }

    protected override initProviders(providers: Provider[]): void {

    }

    private ininModule(platfrom: Runtime, dedupStack: Type[], option: ModuleOption, ps: Promise<void> | void | undefined) {

        ps = mergePromise(ps, () => this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect));

        return mergePromise(ps, () => {
            this._instance = this.get(this._type);
            this._readyDefer.resolve()
        });
    }

    get moduleType() {
        return this._type
    }

    get moduleReflect() {
        return this._typeRefl
    }

    get injector(): Injector {
        return this
    }

    get instance(): T {
        return this._instance
    }

    import(typeOrDef: Type | ModuleWithProviders, children?: boolean) {
        if (children) {
            const modeuleRef = createModuleRef(typeOrDef, this);
            return modeuleRef.ready;
        } else {
            return this.processInjectorType(this.getRuntime(), typeOrDef, [])
        }
    }

    protected override clear() {
        this.getRuntime()?.modules.delete(this._type);
        super.clear();
        this._type = null!;
        this._typeRefl = null!;
        this._instance = null!
    }

}

/**
 * create module ref.
 */
export function createModuleRef<T>(module: Type<T> | ClassRef<T> | ModuleWithProviders<T>, parent: Injector, option?: ModuleOption): ModuleRef<T> {
    if (isModuleProviders(module)) {
        return new DefaultModuleRef(getClassRef(module.module), parent, {
            ...option,
            providers: option?.providers?.length ? [module.providers ?? [], option?.providers] : module.providers
        })
    }
    const moduleDef =  getClassify(module);
    if (!moduleDef.getAnnotation<ModuleDef>().module) {
        throw new Exception(`module def must be module type.`)
    }
    return new DefaultModuleRef(moduleDef, parent, option)
}

