import 'reflect-metadata';
import { ParameterMetadata } from '../metadatas/index';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { isClass, isToken, isParamMetadata, isString, isSymbol } from '../../utils/index';
import { ArgsIterator } from './ArgsIterator';
import { Registration } from '../../Registration';
import { Token } from '../../types';


/**
 * Parameter decorator.
 *
 * @export
 * @interface IParameterDecorator
 */
export interface IParameterDecorator<T extends ParameterMetadata> {
    (provider: Token<T>): ParameterDecorator;
    (metadata?: T): ParameterDecorator;
    (target: object, propertyKey: string | symbol, parameterIndex: number): void;
}



/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IParameterDecorator<T> {

    let paramAdapter = ((args: ArgsIterator) => {
        if (adapter) {
            adapter(args);
        }
        args.next<T>({
            isMetadata: (arg) => isParamMetadata(arg),
            match: (arg) => isToken(arg),
            setMetadata: (metadata, arg) => {
                metadata.provider = arg;
            }
        });
        // args.next<T>({
        //     match: (arg) => isString(arg),
        //     setMetadata: (metadata, arg) => {
        //         metadata.alias = arg;
        //     }
        // });
    });
    let decorator = createDecorator<T>(name, paramAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Parameter;
    return decorator;
}
