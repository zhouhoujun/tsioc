import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, ClassMetadata, MethodMetadata, ParameterMetadata } from './Metadata';


/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T metadata type.
 * @param {string} name
 * @returns
 */
export function createDecorator<T>(name: string) {
    return function (...args: any[]) {
        if (args.length === 1) {
            return createClassDecorator<T>(name).apply(this, args);
        } else if (args.length < 3 || typeof args[2] === 'undefined') {
            return createPropDecorator<T>(name).apply(this, args);
        } else if (args.length === 3 && typeof args[2] === 'number') {
            return createParamDecorator<T>(name).apply(this, args);
        }

        throw new Error(`Invalid @${name} Decorator declaration.`);
    }
}


/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string): any {
    let metaName = `class`;
    function ClassDecoratorFactory(metadata?: T) {
        this.metaName = metadata;
        return function (clsDef: Function) {
            applyParams(clsDef.hasOwnProperty('constructor') ? clsDef.constructor : undefined, 'constructor');
            let annotations = Reflect.getOwnMetadata(metaName, clsDef) || [];

            let classMetadata: ClassMetadata = metadata || {};
            classMetadata.decorator = name;
            annotations.push(classMetadata);
            Reflect.defineMetadata(metaName, annotations, clsDef);
            return clsDef;
        }
    }
    ClassDecoratorFactory.prototype.toString = () => `@${name}`;
    return ClassDecoratorFactory;

}

/**
 * create param decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string) {
    let metaName = `parameters`;
    function ParamDecoratorFactory(metadata?: T) {
        this.metaName = metaName;
        return function ParamDecorator(cls: Function, propertyKey: string | symbol, index: number) {
            let parameters: any[][] = Reflect.getOwnMetadata(metaName, cls) || [];

            // there might be gaps if some in between parameters do not have annotations.
            // we pad with nulls.
            while (parameters.length <= index) {
                parameters.push(null);
            }

            parameters[index] = parameters[index] || [];

            let paramMeadata: ParameterMetadata = metadata || {};
            paramMeadata.decorator = name;
            parameters[index].push(paramMeadata);

            Reflect.defineMetadata(metaName, parameters, cls);
            return cls;
        }
    }
    ParamDecoratorFactory.prototype.toString = () => `@${name}`;

    return ParamDecoratorFactory;
}

/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>(name: string) {
    let metaName = `method`;
    function MethodDecoratorFactory(metadata?: T) {
        this.metaName = metaName;
        return function (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void {
            let meta = Reflect.getOwnMetadata(metaName, target.constructor) || {};
            meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

            let methodMeadata: MethodMetadata = metadata || {};
            methodMeadata.decorator = name;
            meta[propertyKey].unshift(methodMeadata);
            Reflect.defineMetadata(metaName, meta, target.constructor);
        };
    }

    MethodDecoratorFactory.prototype.toString = () => `@${name}`;
    return MethodDecoratorFactory;

}

export interface IPropertyDecorator extends PropertyDecorator {
    metaName: string;
    toString(): string;

}

/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string) {
    let metaName = `property`;
    function PropDecoratorFactory(metadata?: T) {
        return function PropDecorator(target: any, propertyKey: string | symbol) {
            let meta = Reflect.getOwnMetadata(metaName, target.constructor) || {};
            let propmetadata: PropertyMetadata = metadata || {};

            propmetadata.propertyName = propertyKey;
            propmetadata.decorator = name;
            // propmetadata.type = propmetadata.type;

            meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
            meta[propertyKey].unshift(propmetadata);
            Reflect.defineMetadata(metaName, meta, target.constructor);
        };
    }

    PropDecoratorFactory.prototype.metaName = metaName;
    PropDecoratorFactory.prototype.toString = () => `@${name}`;
    return PropDecoratorFactory;
}

function extractAnnotation(annotation: any): any {
    if (typeof annotation === 'function' && annotation.hasOwnProperty('annotation')) {
        // it is a decorator, extract annotation
        annotation = annotation.annotation;
    }
    return annotation;
}

function applyParams(fnOrArray: (Function | any[]), key: string): Function {

    if (fnOrArray === Object || fnOrArray === String || fnOrArray === Function ||
        fnOrArray === Number || fnOrArray === Array) {
        throw new Error(`Can not use native ${stringify(fnOrArray)} as constructor`);
    }

    if (typeof fnOrArray === 'function') {
        return fnOrArray;
    }

    if (Array.isArray(fnOrArray)) {
        let annotations: any[] = fnOrArray;
        let annoLength = annotations.length - 1;
        let fn: Function = fnOrArray[annoLength];
        if (typeof fn !== 'function') {
            throw new Error(
                `Last position of Class method array must be Function in key ${key} was '${stringify(fn)}'`);
        }
        if (annoLength !== fn.length) {
            throw new Error(
                `Number of annotations (${annoLength}) does not match number of arguments (${fn.length}) in the function: ${stringify(fn)}`);
        }
        let paramsAnnotations: any[][] = [];
        for (let i = 0, ii = annotations.length - 1; i < ii; i++) {
            let paramAnno: any[] = [];
            paramsAnnotations.push(paramAnno);
            let annotation = annotations[i];
            if (Array.isArray(annotation)) {
                for (let j = 0; j < annotation.length; j++) {
                    paramAnno.push(extractAnnotation(annotation[j]));
                }
            } else if (typeof annotation === 'function') {
                paramAnno.push(extractAnnotation(annotation));
            } else {
                paramAnno.push(annotation);
            }
        }
        Reflect.defineMetadata('parameters', paramsAnnotations, fn);
        return fn;
    }

    throw new Error(
        `Only Function or Array is supported in Class definition for key '${key}' is '${stringify(fnOrArray)}'`);
}

function stringify(token: any): string {
    if (typeof token === 'string') {
        return token;
    }

    if (token == null) {
        return '' + token;
    }

    if (token.overriddenName) {
        return `${token.overriddenName}`;
    }

    if (token.name) {
        return `${token.name}`;
    }

    let res = token.toString();
    let newLineIndex = res.indexOf('\n');
    return newLineIndex === -1 ? res : res.substring(0, newLineIndex);
}
