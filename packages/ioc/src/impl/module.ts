import { Exception } from '../exception';
import { Injector, InjectorScope } from '../injector';
import { ClassRef,  getClassRef, getClassify  } from '../metadata/class';
import { ModuleOption, ModuleRef } from '../module.ref';
import { isModuleProviders, ModuleWithProviders } from '../providers';
import { Type } from '../types';
import { createValueRecord, mergePromise } from './common';
import { DefaultInjector, processInjectType, processProviders, processUse } from './injector';
import { ModuleDef } from '../metadata/type.def';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance!: T;
    private _type: Type<T>;
    private _typeRefl: ClassRef<T>;


    constructor(moduleType: ClassRef<T>, parent: Injector, option: ModuleOption = {}) {
        super(parent, undefined, option?.scope as InjectorScope ?? moduleType.type, (moduleType.getAnnotation().static || option.isStatic) !== false);
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type<T>;

        this.records.set(ModuleRef, createValueRecord(this));
        this.initWithOptions(option);
    }

    // protected override initScope(scope?: InjectorScope): void {
    //     this._runtime = this._parent!.getRuntime();
    //     this._runtime.register(this, scope);
    //     const val = createValueRecord(this);
    //     this.records.set(Injector, val);
                
    // }

    protected initWithOptions(option: ModuleOption) {
        const dedupStack: Type[] = [];
        const runtime = this.getRuntime();
        runtime.getModules().set(this._type, this);
        let ps: Promise<void> | void | undefined;

        if (option.deps?.length) {
            const deps = option.deps;
            ps = mergePromise(ps, () => processUse(this, deps))
        }

        if (option.providers?.length) {
            const providers = option.providers;
            ps = mergePromise(ps, () => processProviders(this, providers))
        }

        return mergePromise(ps, () => this.ininModule(dedupStack, option))
    }


    private ininModule(dedupStack: Type[], option: ModuleOption, ps: Promise<void> | void | undefined) {

        ps = mergePromise(ps, () => processInjectType(this, this._type, dedupStack, false, undefined, this.moduleReflect));

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
            return processInjectType(this, typeOrDef, [])
        }
    }

    protected override clear() {
        this.getRuntime().getModules().delete(this._type);
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
    const moduleDef = getClassify(module);
    if (!moduleDef.getAnnotation<ModuleDef>().module) {
        throw new Exception(`module def must be module type.`)
    }
    return new DefaultModuleRef(moduleDef, parent, option)
}

