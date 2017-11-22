import 'reflect-metadata';
import { Type } from '../Type';
import { ParamPropMetadata } from '../metadatas';
import { createDecorator, MetadataAdapter } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass, TypeMetadata } from '../index';
import { magenta } from 'chalk';
import { isString } from 'util';



export type PropParamDecorator = (target: Object, propertyKey: string | symbol, parameterIndex?: number) => void;
/**
 * Parameter and Property decorator.
 *
 * @export
 * @interface IParamPropDecorator
 */
export interface IParamPropDecorator<T extends ParamPropMetadata> {
    (provider: string | Type<any>, alias?: string): PropParamDecorator;
    (metadata?: T): PropParamDecorator;
    // (target: object, propertyKey: string | symbol): void;
    (target: object, propertyKey: string | symbol, parameterIndex?: number): void;
}

/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]
 * @returns {IParamPropDecorator<T>}
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(name: string, adapter?: MetadataAdapter): IParamPropDecorator<T> {
    adapter = adapter || ((...args: any[]) => {
        let metadata;
        if (args.length > 0 && args[0]) {
            if (isClass(args[0])) {
                metadata = {
                    provider: args[0],
                    alias: isString(args[1]) ? args[1] : ''
                } as ParamPropMetadata;
            } else if (isString(args[0])) {
                metadata = {
                    provider: args[0],
                    alias: isString(args[1]) ? args[1] : ''
                } as ParamPropMetadata;
            }
        }
        return metadata
    });
    let decorator = createDecorator<T>(name, adapter);
    decorator.decoratorType = DecoratorType.Property | DecoratorType.Parameter;
    return decorator;
}


