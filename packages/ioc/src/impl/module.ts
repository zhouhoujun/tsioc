import { Injector, InjectorScope } from '../injector';
import { get } from '../metadata/refl';
import { Class, ModuleDef } from '../metadata/type';
import { ModuleOption, ModuleRef } from '../module.ref';
import { Platform } from '../platform';
import { isModuleProviders, ModuleWithProviders, ProviderType } from '../providers';
import { Type, EMPTY, EMPTY_OBJ } from '../types';
import { isType } from '../utils/chk';
import { DefaultInjector, mergePromise } from './injector';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance!: T;
    private _type: Type;
    private _typeRefl: Class;

    constructor(moduleType: Class, parent: Injector, option: ModuleOption = EMPTY_OBJ) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type);
        this.isStatic = (moduleType.getAnnotation().static || option.isStatic) !== false;
        this._typeRefl = moduleType;
        this._type = moduleType.type;

        this.setValue(ModuleRef, this);
        this.initWithOptions(option);
    }

    protected initWithOptions(option: ModuleOption) {
        const dedupStack: Type[] = [];
        const platfrom = this.platform();
        platfrom.modules.set(this._type, this);
        let ps: Promise<void> | void | undefined;
        if (option.depProviders?.length) {
            ps = this.processInject(option.depProviders);
        }
        
        if (option.deps?.length) {
            const deps = option.deps;
            ps = mergePromise(ps, () => this.processUse(deps))
        }

        if (option.providers?.length) {
            const providers = option.providers;
            ps = mergePromise(ps, () => this.processInject(providers))
        }

        return mergePromise(ps, () => this.ininModule(platfrom, dedupStack, option))
    }

    protected override initProviders(providers: ProviderType[]): void {

    }

    private ininModule(platfrom: Platform, dedupStack: Type[], option: ModuleOption, ps: Promise<void> | void | undefined) {

        ps = mergePromise(ps, () => this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect));

        if (option.uses) {
            ps = mergePromise(ps, () => this.processUse(option.uses!))
        }

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
            return this.processInjectorType(this.platform(), typeOrDef, [])
        }
    }

    protected override clear() {
        this.platform()?.modules.delete(this._type);
        super.clear();
        this._type = null!;
        this._typeRefl = null!;
        this._instance = null!
    }

}

/**
 * create module ref.
 */
export function createModuleRef<T>(module: Type<T> | Class<T> | ModuleWithProviders<T>, parent: Injector, option?: ModuleOption): ModuleRef<T> {
    if (isType(module)) return new DefaultModuleRef(get<ModuleDef>(module), parent, option);
    if (isModuleProviders(module)) return new DefaultModuleRef(get<ModuleDef>(module.module), parent, {
        ...option,
        providers: [...module.providers ?? EMPTY, ...option?.providers ?? EMPTY]
    });
    return new DefaultModuleRef(module, parent, option)
}

