import 'reflect-metadata';
import { ClassMetadata } from './Metadata';
import { Type } from '../Type';
import { createDecorator } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';


/**
 * class decorator.
 *
 * @export
 * @interface IClassDecorator
 */
export interface IClassDecorator<T extends ClassMetadata> {
    (metadata?: T): ClassDecorator;
    /**
     * not allow abstract to decorator with out metadata.
     */
    (target: Type<any>): void;
}


/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string): IClassDecorator<T> {
    let decorator = createDecorator<T>(name);
    decorator.decoratorType = DecoratorType.Class;
    return decorator;
}
