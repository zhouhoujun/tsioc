import { Token } from '../tokens';
import { Platform } from '../platform';
import { Injector, InjectorScope } from '../injector';
import { get } from '../metadata/refl';
import { Class, ModuleDef } from '../metadata/type';
import { ModuleOption, ModuleRef, ModuleType } from '../module.ref';
import { isModuleProviders, ModuleWithProviders } from '../providers';
import { ReflectiveFactory } from '../reflective';
import { Type, EMPTY, EMPTY_OBJ } from '../types';
import { isArray, isType } from '../utils/chk';
import { deepForEach } from '../utils/lang';
import { isPlainObject } from '../utils/obj';
import { DefaultInjector, processInjectorType } from './injector';
import { ReflectiveResolverImpl } from './reflective';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance!: T;
    private _type: Type;
    private _typeRefl: Class;

    reflectiveFactory = new ReflectiveResolverImpl();

    constructor(moduleType: Class, parent: Injector, option: ModuleOption = EMPTY_OBJ) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type);
        const dedupStack: Type[] = [];
        this.isStatic = (moduleType.getAnnotation().static || option.isStatic) !== false;
        this._typeRefl = moduleType;
        this._type = moduleType.type;

        this.inject(
            { provide: ReflectiveFactory, useValue: this.reflectiveFactory }
        );
        // this.onDestroy(this.reflectiveResolver);
        this.setValue(ModuleRef, this);
        const platfrom = this.platform();
        platfrom.modules.set(this._type, this);
        option.deps && this.use(option.deps);
        option.providers && this.inject(option.providers);
        this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect);
        option.uses && this.use(option.uses);
        this._instance = this.get(this._type)
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
            createModuleRef(typeOrDef, this)
        } else {
            this.processInjectorType(this.platform(), typeOrDef, [], this.moduleReflect)
        }
    }

    override use(modules: ModuleType[]): Type[];
    override use(...modules: ModuleType[]): Type[];
    override use(...args: any[]): Type[] {
        this.assertNotDestroyed();
        const types: Type[] = [];
        const platform = this.platform();
        const stk: Type[] = [];
        deepForEach(args, ty => {
            if (isType(ty)) {
                types.push(ty);
                this.processInjectorType(platform, ty, stk)
            } else if (isType(ty.module) && isArray(ty.providers)) {
                types.push(ty.module);
                this.processInjectorType(platform, ty, stk)
            }
        }, v => isPlainObject(v) && !(isType(v.module) && isArray(v.providers)));
        return types
    }

    protected processInjectorType(platform: Platform, typeOrDef: Type | ModuleWithProviders, dedupStack: Type[], moduleRefl?: Class) {
        processInjectorType(typeOrDef, dedupStack,
            (pdr, pdrs) => this.processProvider(platform, pdr, pdrs),
            (tyref, type) => {
                this.registerReflect(platform, tyref)
            }, moduleRefl)
    }

    protected override onRegistered(def: Class): void {

    }

    protected override onResolved(value: any, token?: Token): void {

    }

    protected override clear() {
        this.platform()?.modules.delete(this._type);
        super.clear();
        this._type = null!;
        this.reflectiveFactory = null!;
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

