import { ITypeReflect } from './ITypeReflect';
import { ClassType, ObjectMap } from '../types';
import { DefineClassTypes } from '../factories';

export interface IMetadataAccess {
    hasMetadata(decorator: string | Function, target: ClassType): boolean;
    hasMetadata(decorator: string | Function, target: ClassType, type: 'constructor'): boolean;
    hasMetadata(decorator: string | Function, target: ClassType, type: 'method' | 'property'): boolean;
    hasMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): boolean;
    hasMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): boolean;

    getMetadata(decorator: string | Function, target: ClassType): any[];
    getMetadata(decorator: string | Function, target: ClassType, type: 'constructor'): any[][];
    getMetadata(decorator: string | Function, target: ClassType, type: 'method' | 'property'): ObjectMap<any[]>;
    getMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): any[];
    getMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): any[][];

}

/**
 * metadata access for decorator.
 *
 * @export
 * @interface MetadataAccess
 */
export abstract class MetadataAccess implements IMetadataAccess {

    abstract hasMetadata(decorator: string | Function, target: ClassType): boolean;
    abstract hasMetadata(decorator: string | Function, target: ClassType, type: 'constructor'): boolean;
    abstract hasMetadata(decorator: string | Function, target: ClassType, type: 'method' | 'property'): boolean;
    abstract hasMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): boolean;
    abstract hasMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): boolean;

    abstract getMetadata(decorator: string | Function, target: ClassType): any[];
    abstract getMetadata(decorator: string | Function, target: ClassType, type: 'constructor'): any[][];
    abstract getMetadata(decorator: string | Function, target: ClassType, type: 'method' | 'property'): ObjectMap<any[]>;
    abstract getMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'method' | 'property'): any[];
    abstract getMetadata(decorator: string | Function, target: any, propertyKey: string, type: 'parameter'): any[][];

    abstract getDecorators(target: ClassType, type: DefineClassTypes): string[];
    abstract getDecorators(target: ClassType, type: 'parameter', propertyKey: string): string[];
    /**
     * set the dectoactor metadata to type reflect.
     *
     * @abstract
     * @param {ITypeReflect} typeReflect
     * @param {...any[]} metadata
     * @memberof MetadataAccess
     */
    abstract setTypeReflect(typeReflect: ITypeReflect, ...metadata: any[]): void;
}

