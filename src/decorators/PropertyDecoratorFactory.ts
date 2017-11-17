import 'reflect-metadata';
import { PropertyMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';


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
    return createDecorator<T>(name);
}

