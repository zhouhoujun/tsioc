import { ClassType, ObjectMap, Type, Token } from '../types';
import { IocCoreService } from '../IocCoreService';
import { IIocContainer, ContainerProxy } from '../IIocContainer';
import { ITypeReflect, TargetDecoractors, TypeDefine } from './ITypeReflect';
import { MetadataTypes, DefineClassTypes } from '../factories/DecoratorType';
import {
    getMethodMetadata, getPropertyMetadata, getParamMetadata, hasOwnClassMetadata,
    hasParamMetadata, hasPropertyMetadata, hasMethodMetadata, getOwnTypeMetadata, getParamerterNames
} from '../factories/DecoratorFactory';
import { MetadataAccess } from './MetadataAccess';
import { isUndefined, isClassType, lang } from '../utils/lang';
import { ParamProviders } from '../providers/types';
import { IParameter } from '../IParameter';
import { MethodAccessorToken } from '../IMethodAccessor';
import { RuntimeDecorators } from '../actions/RuntimeDecorators';
import { Singleton } from '../decorators/Singleton';
import { DecoratorProvider } from './DecoratorProvider';
import { DesignRegisterer, RuntimeRegisterer } from '../actions/DecoratorsRegisterer';
import { ITypeReflects } from './ITypeReflects';
import { ActionInjectorToken, IActionInjector } from '../actions/Action';
import { TypeDecorators } from '../actions/TypeDecorators';
import { IInjector } from '../IInjector';


/**
 * type reflects.
 *
 * @export
 * @class TypeReflects
 * @extends {IocCoreService}
 */
export class TypeReflects extends IocCoreService implements ITypeReflects {
    protected map: Map<ClassType, ITypeReflect>;
    constructor(private containerFactory: ContainerProxy) {
        super();
        this.map = new Map();
    }

    getContainer<T extends IIocContainer>(): T {
        return this.containerFactory() as T;
    }

    private _actInj: IActionInjector;
    getActionInjector(): IActionInjector {
        if (!this._actInj) {
            this._actInj = this.getContainer().get(ActionInjectorToken);
        }
        return this._actInj;
    }

    private decorPdr: DecoratorProvider;
    getDecorProvider(): DecoratorProvider {
        if (!this.decorPdr) {
            this.decorPdr = this.getActionInjector().getInstance(DecoratorProvider);
        }
        return this.decorPdr;
    }

    getInjector<T extends IInjector>(type: Type): T {
        let refl = this.get(type);
        return ((refl && refl.getInjector) ? refl.getInjector() : this.getContainer()) as T;
    }

    has(type: ClassType): boolean {
        return this.map.has(type);
    }

    hasRegister(type: ClassType): boolean {
        return !!this.map.get(type)?.getInjector;
    }

    set(type: ClassType, typeInfo: ITypeReflect): this {
        this.map.set(type, typeInfo);
        return this;
    }

    create<T extends ITypeReflect>(type: ClassType, info?: T): T {
        let targetReflect: ITypeReflect;
        let exists = this.has(type);
        if (exists) {
            targetReflect = this.get(type);
        } else {
            let decs = new TargetDecoractors(
                new TypeDecorators(type, this, this.getActionInjector().getInstance(DesignRegisterer)),
                new RuntimeDecorators(type, this, this.getActionInjector().getInstance(RuntimeRegisterer)));
            targetReflect = {
                type: type,
                decorators: decs,
                defines: new TypeDefine(type),
                propProviders: new Map(),
                methodParams: new Map(),
                methodParamProviders: new Map(),
                provides: []
            };
            targetReflect.singleton = this.hasMetadata(Singleton, type);
        }
        if (info) {
            targetReflect = Object.assign(targetReflect, info);
        }
        if (!exists || info) {
            this.set(type, targetReflect);
        }
        return targetReflect as T;
    }

    get<T extends ITypeReflect>(type: ClassType): T {
        return this.map.get(type) as T || null;
    }

    isExtends(type: Token, base: ClassType): boolean {
        if (!isClassType(type)) {
            return false;
        }
        return this.has(type) ? this.get(type).defines.isExtends(base) : lang.isExtendsClass(type, base);
    }

    getExtends(type: ClassType): ClassType[] {
        return this.has(type) ? this.get(type).defines.extendTypes : lang.getClassChain(type);
    }

    hasMetadata<T = any>(decorator: string | Function, target: ClassType): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'constructor'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): boolean;
    hasMetadata(decorator: string | Function, target: any, propertyKey?: any, type?: MetadataTypes): boolean {
        let access = this.getDecorProvider().resolve(decorator, MetadataAccess);
        if (!propertyKey) {
            type = 'class';
        }
        if (isUndefined(type) && propertyKey) {
            type = propertyKey;
            propertyKey = undefined;
        }
        switch (type) {
            case 'class':
                return access ? access.hasMetadata(decorator, target) : hasOwnClassMetadata(decorator, target);
            case 'constructor':
                return access ? access.hasMetadata(decorator, target, type) : hasParamMetadata(decorator, target);
            case 'property':
                if (propertyKey) {
                    return access ? access.hasMetadata(decorator, target, propertyKey, type) : hasPropertyMetadata(decorator, target, propertyKey);
                } else {
                    return access ? access.hasMetadata(decorator, target, type) : hasPropertyMetadata(decorator, target);
                }
            case 'method':
                if (propertyKey) {
                    return access ? access.hasMetadata(decorator, target, propertyKey, type) : hasMethodMetadata(decorator, target, propertyKey);
                } else {
                    return access ? access.hasMetadata(decorator, target, type) : hasMethodMetadata(decorator, target);
                }
            case 'parameter':
                return access ? access.hasMetadata(decorator, target, propertyKey, type) : hasParamMetadata(decorator, target, propertyKey);

        }
        return false;
    }

    hasMethodMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean {
        return propertyKey ? this.hasMetadata(decorator, target, propertyKey, 'method') : this.hasMetadata(decorator, target, 'method')
    }
    hasPropertyMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean {
        return propertyKey ? this.hasMetadata(decorator, target, propertyKey, 'property') : this.hasMetadata(decorator, target, 'property');
    }
    hasParamerterMetadata(decorator: string | Function, target: any, propertyKey?: string): boolean {
        return (propertyKey && propertyKey !== 'constructor') ? this.hasMetadata(decorator, target, propertyKey, 'parameter') : this.hasMetadata(decorator, target, 'constructor');
    }

    getMethodMetadata<T = any>(decorator: string | Function, target: any): ObjectMap<T[]>;
    getMethodMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string): T[]
    getMethodMetadata(decorator: string | Function, target: any, propertyKey?: string): any {
        return propertyKey ? this.getMetadata(decorator, target, propertyKey, 'method') : this.getMetadata(decorator, target, 'method');
    }

    getPropertyMetadata<T = any>(decorator: string | Function, target: any): ObjectMap<T[]>;
    getPropertyMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string): T[]
    getPropertyMetadata(decorator: string | Function, target: any, propertyKey?: string): any {
        return propertyKey ? this.getMetadata(decorator, target, propertyKey, 'property') : this.getMetadata(decorator, target, 'property');
    }

    getParamerterMetadata<T = any>(decorator: string | Function, target: any, propertyKey?: string): T[][] {
        return (propertyKey && propertyKey !== 'constructor') ? this.getMetadata(decorator, target, propertyKey, 'parameter') : this.getMetadata(decorator, target, 'constructor');
    }

    getMetadata<T = any>(decorator: string | Function, target: ClassType): T[];
    getMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'constructor'): T[][];
    getMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'method' | 'property'): ObjectMap<T[]>;
    getMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): T[];
    getMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): T[][];
    getMetadata(decorator: string | Function, target: any, propertyKey?: any, type?: MetadataTypes): any {
        let access = this.getDecorProvider().resolve(decorator, MetadataAccess);
        if (!propertyKey) {
            type = 'class';
        }
        if (isUndefined(type) && propertyKey) {
            type = propertyKey;
            propertyKey = undefined;
        }
        switch (type) {
            case 'class':
                return access ? access.getMetadata(decorator, target) : getOwnTypeMetadata(decorator, target);
            case 'constructor':
                return access ? access.getMetadata(decorator, target, type) : getParamMetadata(decorator, target);
            case 'property':
                if (propertyKey) {
                    return access ? access.getMetadata(decorator, target, propertyKey, type) : getPropertyMetadata(decorator, target)[propertyKey];
                } else {
                    return access ? access.getMetadata(decorator, target, type) : getPropertyMetadata(decorator, target);
                }
            case 'method':
                if (propertyKey) {
                    return access ? access.getMetadata(decorator, target, propertyKey, type) : getMethodMetadata(decorator, target)[propertyKey];
                } else {
                    return access ? access.getMetadata(decorator, target, type) : getMethodMetadata(decorator, target);
                }
            case 'parameter':
                return access ? access.getMetadata(decorator, target, propertyKey, type) : getParamMetadata(decorator, target, propertyKey);
        }
    }

    getDecorators(target: ClassType): string[];
    getDecorators(target: ClassType): string[];
    getDecorators(target: ClassType, type: DefineClassTypes): string[];
    getDecorators(target: ClassType, type: DefineClassTypes): string[];
    getDecorators(target: ClassType, type: 'parameter', propertyKey?: string): string[];
    getDecorators(target: ClassType, type?: any, propertyKey?: any): string[] {
        let tgref = this.create(target);
        let decorators: string[];
        if (!type) {
            type = 'class';
        }
        switch (type) {
            case 'class':
                decorators = tgref.decorators.classDecors;
                break;
            case 'method':
                decorators = tgref.decorators.methodDecors;
                break;
            case 'property':
                decorators = tgref.decorators.propsDecors;
                break;
            case 'parameter':
                decorators = tgref.decorators.runtime.getParamDecors(propertyKey, target);
                break;
        }
        return decorators || [];
    }

    getMetadatas<T = any>(target: ClassType): T[];
    getMetadatas<T = any>(target: any, propertyKey: string, type: 'method' | 'property'): T[];
    getMetadatas(target: any, propertyKey?: any, type?: any): any {
        if (!propertyKey) {
            type = 'class';
        }
        return this.getDecorators(target, type, propertyKey)
            .map(v => this.getMetadata(v, target, propertyKey, type))
            .reduce((v, c) => {
                return v.concat(c);
            }, []);
    }

    /**
     * get all method paramerter names.
     *
     * @export
     * @param {ClassType} target
     * @returns {ObjectMap<string[]>}
     */
    getParamerterNames(target: ClassType): ObjectMap<string[]>;
    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames(target: ClassType<any>, propertyKey: string): string[];
    getParamerterNames(target: ClassType<any>, propertyKey?: string): any {
        return getParamerterNames(target, propertyKey);
    }

    /**
     * get method paramerter providers.
     *
     * @template T
     * @param {ClassType<T>} type
     * @param {string} propertyKey
     * @returns {ParamProviders[]}
     * @memberof TypeReflects
     */
    getParamProviders<T>(type: ClassType<T>, propertyKey: string): ParamProviders[] {
        let tref = this.get(type);
        if (tref.methodParamProviders) {
            return tref.methodParamProviders.get(propertyKey) || [];
        }
        return [];
    }

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    getParameters<T>(type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof TypeReflects
     */
    getParameters<T>(type: Type<T>, instance: T, propertyKey: string): IParameter[];
    getParameters<T>(type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let targetReflect = this.get(type);
        if (targetReflect && targetReflect.methodParams.has(propertyKey)) {
            return targetReflect.methodParams.get(propertyKey) || [];
        }
        let container = this.getContainer();
        return container.get(MethodAccessorToken).getParameters(container, type, instance, propertyKey);
    }

}
