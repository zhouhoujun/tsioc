import { Injector, InjectorScope } from '../injector';
import { get } from '../metadata/refl';
import { Class, ModuleDef } from '../metadata/type';
import { ModuleOption, ModuleRef } from '../module.ref';
import { Platform } from '../platform';
import { isModuleProviders, ModuleWithProviders } from '../providers';
import { ReflectiveFactory } from '../reflective';
import { Type, EMPTY, EMPTY_OBJ } from '../types';
import { isType } from '../utils/chk';
import { defer } from '../utils/lang';
import { DefaultInjector } from './injector';
import { ReflectiveFactoryImpl } from './reflective';


/**
 * default modeuleRef implements {@link ModuleRef}
 */
export class DefaultModuleRef<T = any> extends DefaultInjector implements ModuleRef<T> {
    private _instance!: T;
    private _type: Type;
    private _typeRefl: Class;

    reflectiveFactory = new ReflectiveFactoryImpl();

    private defer = defer<void>();

    constructor(moduleType: Class, parent: Injector, option: ModuleOption = EMPTY_OBJ) {
        super(undefined, parent, option?.scope as InjectorScope ?? moduleType.type);
        this.isStatic = (moduleType.getAnnotation().static || option.isStatic) !== false;
        this._typeRefl = moduleType;
        this._type = moduleType.type;

        this.inject(
            { provide: ReflectiveFactory, useValue: this.reflectiveFactory }
        );
        this.setValue(ModuleRef, this);
        this.initWithOptions(option);
    }

    protected initWithOptions(option: ModuleOption) {
        const dedupStack: Type[] = [];
        const platfrom = this.platform();
        platfrom.modules.set(this._type, this);
        const ps: Promise<void>[] = [];
        if (option.deps) {
            const deps$ = this.processUse(option.deps);
            if (deps$) ps.push(deps$);
        }
        if (option.providers) {
            const providers$ = this.processInject(option.providers);
            if (providers$) ps.push(providers$);
        }
        if (ps.length) {
            Promise.all(ps).then(() => {
                this.ininModule(platfrom, dedupStack, option, []);
            })
        } else {
            this.ininModule(platfrom, dedupStack, option, ps);
        }

    }

    private ininModule(platfrom: Platform, dedupStack: Type[], option: ModuleOption, ps: Promise<void>[]) {
        const inj$ = this.processInjectorType(platfrom, this._type, dedupStack, this.moduleReflect);
        if (inj$) ps.push(inj$);
        if (option.uses) {
            const uses$ = this.processUse(option.uses);
            if (uses$) ps.push(uses$);
        }

        if (ps.length) {
            Promise.all(ps).then(() => {
                this._instance = this.get(this._type);
                this.defer.resolve()
            })
        } else {
            this._instance = this.get(this._type);
            this.defer.resolve();
        }
    }


    get ready() {
        return this.defer.promise
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

