import 'reflect-metadata';
import { PropertyMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass } from '../types';


/**
 * property decorator.
 *
 * @export
 * @interface IPropertyDecorator
 */
export interface IPropertyDecorator<T extends PropertyMetadata> {
    (provider: string | Type<any>, alias?: string): PropertyDecorator;
    (metadata?: T): PropertyDecorator;
    (target: object, propertyKey: string | symbol): void;
}


/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string, adapter?: MetadataAdapter): IPropertyDecorator<T> {
    adapter = adapter || ((...args: any[]) => {
        let metadata = null;
        if (args.length > 0 && args[0]) {
            if (isClass(args[0])) {
                metadata = {
                    provider: args[0],
                    alias: typeof args[1] === 'string' ? args[1] : ''
                } as PropertyMetadata;
            } else if (typeof args[0] === 'string') {
                metadata = {
                    provider: args[0],
                    alias: typeof args[1] === 'string' ? args[1] : ''
                } as PropertyMetadata;
            }
        }
        return metadata;
    });
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Property;
    return decorator;
}
