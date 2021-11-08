import { Token } from '../tokens';
import { Type } from '../types';
import { get } from '../metadata/refl';
import { ModuleReflect } from '../metadata/type';
import { ModuleFactory, ModuleFactoryResolver, ModuleOption } from '../module.factory';
import { ModuleRef } from '../module.ref';
import { InjectorTypeWithProviders, ProviderType } from '../providers';
import { isFunction, isPlainObject } from '../utils/chk';
import { deepForEach } from '../utils/lang';
import { Injector, InjectorScope, Platform } from '../injector';
import { DefaultInjector, tryResolveToken } from './injector';

export class DefaultModuleRef<T> extends DefaultInjector implements ModuleRef<T> {

    private _instance!: T;
    private defTypes = new Set<Type>();
    private _type: Type;
    private _typeRefl: ModuleReflect;
    constructor(moduleType: ModuleReflect, providers: ProviderType[] | undefined, readonly parent: Injector, readonly scope?: InjectorScope) {
        super(providers, parent, scope);
        const dedupStack: Type[] = [];
        this._typeRefl = moduleType;
        this._type = moduleType.type as Type;
        this.setValue(ModuleRef, this);
        this.processInjectorType(this.platform(), this._type, dedupStack, this.moduleReflect);
        this._instance = this.get(this._type);
    }

    get moduleType() {
        return this._type;
    }

    get moduleReflect() {
        return this._typeRefl;
    }


    get injector(): Injector {
        return this;
    }

    get instance(): T {
        return this._instance;
    }

    protected override isself(token: Token): boolean {
        return token === ModuleRef || super.isself(token);
    }

    // override get<T>(token: Token<T>, notFoundValue?: T, flags = InjectFlags.Default): T {
    //     this.assertNotDestroyed();
    //     return tryResolveToken(token, this.records.get(token), this.records, this.platform(), this.parent, notFoundValue, flags);
    // }

    protected processInjectorType(platform: Platform, typeOrDef: Type | InjectorTypeWithProviders, dedupStack: Type[], moduleRefl?: ModuleReflect) {
        const type = isFunction(typeOrDef) ? typeOrDef : typeOrDef.module;
        if (!isFunction(typeOrDef)) {
            deepForEach(
                typeOrDef.providers,
                pdr => this.processProvider(platform, pdr, typeOrDef.providers),
                v => isPlainObject(v) && !v.provide
            );
        }
        const isDuplicate = dedupStack.indexOf(type) !== -1;
        const typeRef = moduleRefl ?? get<ModuleReflect>(type);
        if (typeRef.module && !isDuplicate) {
            dedupStack.push(type);
            typeRef.imports?.forEach(imp => {
                this.processInjectorType(platform, imp, dedupStack);
            });

            typeRef.declarations?.forEach(d => {
                this.processInjectorType(platform, d, dedupStack);
            });

            if (typeRef.providers) {
                deepForEach(
                    typeRef.providers,
                    pdr => this.processProvider(platform, pdr, typeRef.providers),
                    v => isPlainObject(v) && !v.provide
                );
            }
        }

        this.defTypes.add(type);
        this.registerType(platform, type);
    }

    protected override destroying() {
        super.destroying();
        this._type = null!;
        this._typeRefl = null!;
        this._instance = null!;
    }

}


export class DefaultModuleFactory<T = any> extends ModuleFactory<T> {

    private _moduleType: Type;
    private _moduleRefl: ModuleReflect;
    constructor(moduleType: Type<T> | ModuleReflect<T>) {
        super();
        if (isFunction(moduleType)) {
            this._moduleType = moduleType;
            this._moduleRefl = get(moduleType);
        } else {
            this._moduleRefl = moduleType;
            this._moduleType = moduleType.type as Type;
        }
    }

    get moduleType() {
        return this._moduleType;
    }

    get moduleReflect() {
        return this._moduleRefl;
    }

    create(parent: Injector, option?: ModuleOption): ModuleRef<T> {
        return new DefaultModuleRef(this.moduleReflect, option?.providers, parent, option?.scope);
    }
}

export class DefaultModuleFactoryResolver extends ModuleFactoryResolver {
    resolve<T>(type: Type<T> | ModuleReflect<T>): ModuleFactory<T> {
        return new DefaultModuleFactory(type);
    }
}

export const DEFAULTA_MODULE_FACTORYS: ProviderType[] = [
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() }
]
