import { ClassType, ObjectMap, Type } from '../types';
import { IocCoreService } from '../IocCoreService';
import { DecoratorProvider } from './DecoratorProvider';
import { IIocContainer } from '../IIocContainer';
import { ITypeReflect, TargetDecoractors, TypeDefine } from './ITypeReflect';
import { MetadataTypes, DecoratorTypes, DefineClassTypes } from '../factories';
import {
    getMethodMetadata, getPropertyMetadata, getParamMetadata, hasOwnClassMetadata,
    hasParamMetadata, hasPropertyMetadata, hasMethodMetadata,
    getOwnTypeMetadata, getParamerterNames, getClassDecorators,
    getMethodDecorators, getPropDecorators, getParamDecorators
} from '../factories/DecoratorFactory';
import { MetadataAccess, IMetadataAccess } from './MetadataAccess';
import { isUndefined } from '../utils';
import { ParamProviders } from '../providers/types';
import { IParameter } from '../IParameter';
import { MethodAccessorToken } from '../IMethodAccessor';
import { DesignDecoratorRegisterer, RuntimeDecoratorRegisterer } from '../actions/DecoratorRegisterer';
import { DesignDecorators } from '../actions/DesignDecorators';
import { RuntimeDecorators } from '../actions/RuntimeDecorators';
import { Singleton } from '../decorators';


/**
 * type reflects.
 *
 * @export
 * @class TypeReflects
 * @extends {IocCoreService}
 */
export class TypeReflects extends IocCoreService implements IMetadataAccess {
    protected map: Map<ClassType, ITypeReflect>;
    constructor(private container: IIocContainer) {
        super();
        this.map = new Map();
    }

    has(type: ClassType): boolean {
        return this.map.has(type);
    }

    set(type: ClassType, typeInfo: ITypeReflect): this {
        if (!this.map.has(type)) {
            this.map.set(type, typeInfo);
        }
        return this;
    }

    create(type: ClassType, info?: ITypeReflect) {
        if (this.has(type)) {
            return this.get(type);
        }
        let designReger = this.container.get(DesignDecoratorRegisterer);
        let runtimeReger = this.container.get(RuntimeDecoratorRegisterer);
        let decs = new TargetDecoractors(
            new DesignDecorators(type, this, designReger),
            new RuntimeDecorators(type, this, runtimeReger));
        let targetReflect: ITypeReflect = {
            type: type,
            decorators: decs,
            defines: new TypeDefine(type),
            propProviders: new Map(),
            methodParams: new Map(),
            methodParamProviders: new Map(),
            provides: []
        };
        targetReflect.singleton = this.hasMetadata(Singleton, type);
        if (info) {
            targetReflect = Object.assign(targetReflect, info);
        }
        this.set(type, targetReflect);
        return targetReflect;
    }

    get<T extends ITypeReflect>(type: ClassType): T {
        return this.map.get(type) as T || null;
    }

    hasMetadata<T = any>(decorator: string | Function, target: ClassType): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'constructor'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: ClassType, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): boolean;
    hasMetadata<T = any>(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): boolean;
    hasMetadata(decorator: string | Function, target: any, propertyKey?: any, type?: MetadataTypes): boolean {
        let access = this.container.get(DecoratorProvider).resolve(decorator, MetadataAccess);
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
        return propertyKey ? this.getMetadata(decorator, target, propertyKey, 'method') : this.getMetadata(decorator, target, 'method')
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
        let access = this.container.get(DecoratorProvider).resolve(decorator, MetadataAccess);
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

    getDecorators(target: ClassType, type: DefineClassTypes): string[]
    getDecorators(target: ClassType, type: 'parameter', propertyKey?: string): string[]
    getDecorators(target: ClassType, type: DecoratorTypes, propertyKey?: string): string[] {
        let tgref = this.get(target);
        let decorators: string[];
        switch (type) {
            case 'class':
                decorators = (tgref && tgref.decorators) ? tgref.decorators.classDecors : getClassDecorators(target);
                break;
            case 'method':
                decorators = (tgref && tgref.decorators) ? tgref.decorators.methodDecors : getMethodDecorators(target);
                break;
            case 'property':
                decorators = (tgref && tgref.decorators) ? tgref.decorators.propsDecors : getPropDecorators(target);
                break;
            case 'parameter':
                decorators = (tgref && tgref.decorators) ? tgref.decorators.runtime.getParamDecors(propertyKey, target) : getParamDecorators(target, propertyKey);
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
        return this.container.get(MethodAccessorToken).getParameters(this.container, type, instance, propertyKey);
    }

}
