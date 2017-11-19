import 'reflect-metadata';
import { PropertyMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator<T extends PropertyMetadata> {
    (metadata?: T): PropertyDecorator;
    (target: object, propertyKey: string | symbol): void;
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string): IPropertyDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Property;
    return decorator;
}
