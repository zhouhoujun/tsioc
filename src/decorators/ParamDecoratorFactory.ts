import 'reflect-metadata';
import { ParameterMetadata } from '../metadatas';
import { Type } from '../Type';
import { createDecorator, MetadataAdapter } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass } from '../utils';
import { isString } from 'util';


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParameterDecorator
 */
export interface IParameterDecorator<T extends ParameterMetadata> {
    (provider: Type<any> | string, alias?: string): ParameterDecorator;
    (metadata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}



/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(name: string, adapter?: MetadataAdapter): IParameterDecorator<T> {
    adapter = adapter || ((...args: any[]) => {
        let metadata;
        if (args.length > 0 && args[0]) {
            if (isClass(args[0])) {
                metadata = {
                    provider: args[0],
                    alias: isString(args[1]) ? args[1] : ''
                } as ParameterMetadata;
            } else if (isString(args[0])) {
                metadata = {
                    provider: args[0],
                    alias: isString(args[1]) ? args[1] : ''
                } as ParameterMetadata;
            }
        }
        return metadata
    });
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Parameter;
    return decorator;
}
