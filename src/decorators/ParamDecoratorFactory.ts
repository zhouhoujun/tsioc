import 'reflect-metadata';
import { ParameterMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParameterDecorator
 */
export interface IParameterDecorator<T extends ParameterMetadata> {
    (metadata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}



/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string): IParameterDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Parameter;
    return decorator;
}
