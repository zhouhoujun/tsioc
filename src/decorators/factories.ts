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
export function createClassDecorator<T extends ClassMetadata>(name: string) {
    let metaName = `@${name}`;
    function ClassDecoratorFactory(metadata?: T) {
        return function (target: any) {
            let annotations = Reflect.getMetadata(metaName, target) || [];
            // let designParams = Reflect.getMetadata('design:paramtypes', target) || [];
            let classMetadata: ClassMetadata = metadata || {};
            classMetadata.decorator = name;
            annotations.push(classMetadata);
            Reflect.defineMetadata(metaName, annotations, target);
            return target;
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
    let metaName = `@${name}`;
    function ParamDecoratorFactory(metadata?: T) {
        return function ParamDecorator(target: any, propertyKey: string | symbol, parameterIndex: number) {
            let parameters: any[][] = Reflect.getOwnMetadata(metaName, target) || [];

            // there might be gaps if some in between parameters do not have annotations.
            // we pad with nulls.
            while (parameters.length <= parameterIndex) {
                parameters.push(null);
            }

            parameters[parameterIndex] = parameters[parameterIndex] || [];

            let paramMeadata: ParameterMetadata = metadata || {};

            let t = Reflect.getMetadata('design:type', target, propertyKey);
            if (!t) {
                // Needed to support react native inheritance
                t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
            }
            paramMeadata.decorator = name;
            paramMeadata.type = paramMeadata.type || t;
            paramMeadata.index = parameterIndex;
            parameters[parameterIndex].push(paramMeadata);

            Reflect.defineMetadata(metaName, parameters, target);
            return target;
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
    let metaName = `@${name}`;
    function MethodDecoratorFactory(metadata?: T) {
        this.metaName = metaName;
        return function (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void {
            let meta = Reflect.getOwnMetadata(metaName, target) || {};
            meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];

            let methodMeadata: MethodMetadata = metadata || {};
            methodMeadata.decorator = name;
            meta[propertyKey].unshift(methodMeadata);
            Reflect.defineMetadata(metaName, meta, target);
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
    let metaName = `@${name}`;
    function PropDecoratorFactory(metadata?: T) {
        return function PropDecorator(target: any, propertyKey: string | symbol) {
            let meta = Reflect.getOwnMetadata(metaName, target) || {};
            let propmetadata: PropertyMetadata = metadata || {};

            propmetadata.propertyName = propertyKey;
            propmetadata.decorator = name;
            let t = Reflect.getMetadata('design:type', target, propertyKey);
            if (!t) {
                // Needed to support react native inheritance
                t = Reflect.getMetadata('design:type', target.constructor, propertyKey);
            }
            propmetadata.type = propmetadata.type || t;

            meta[propertyKey] = meta.hasOwnProperty(propertyKey) && meta[propertyKey] || [];
            meta[propertyKey].unshift(propmetadata);
            Reflect.defineMetadata(metaName, meta, target.constructor);
        };
    }

    // PropDecoratorFactory.prototype.metaName = metaName;
    PropDecoratorFactory.prototype.toString = () => `@${name}`;
    return PropDecoratorFactory;
}
