import 'reflect-metadata';
import { Type } from '../Type';
import { PropertyMetadata, ClassMetadata, MethodMetadata, ParameterMetadata } from './Metadata';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


export interface IParamPropMetadata extends PropertyMetadata, ParameterMetadata {

}

/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends IParamPropMetadata> {
    (metadata?: T): (target: Object, propertyKey: string | symbol, parameterIndex?: number) => void;
    // (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}
/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @returns
 */
export function createParamPropDecorator<T extends IParamPropMetadata>(name: string): IParamPropDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}


