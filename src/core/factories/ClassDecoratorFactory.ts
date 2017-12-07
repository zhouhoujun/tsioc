import 'reflect-metadata';
import { ClassMetadata } from '../metadatas';
import { Type } from '../../Type';
import { createDecorator, MetadataAdapter, MetadataExtends } from './DecoratorFactory';
import { DecoratorType } from './DecoratorType';
import { Registration } from '../../Registration';
import { isClass, isToken, isClassMetadata } from '../../utils';
import { isString, isSymbol, isObject } from 'util';
import { ArgsIterator } from './ArgsIterator';
import { fail } from 'assert';


/**
 * class decorator.
 *
 * @export
 * @interface IClassDecorator
 */
export interface IClassDecorator<T extends ClassMetadata> {
    (provide: Registration<any> | symbol | string, alias?: string, singlton?: boolean): ClassDecorator;
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
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): IClassDecorator<T> {

    let classAdapter = ((args: ArgsIterator) => {
        let metadata;
        if (adapter) {
            adapter(args);
        }
        args.next<T>({
            isMetadata: (arg) => isClassMetadata(arg),
            match: (arg) => isSymbol(arg) || isString(arg) || (isObject(arg) && arg instanceof Registration),
            setMetadata: (metadata, arg) => {
                metadata.provide = arg;
            }
        });

        args.next<T>({
            match: (arg) => (isString(arg)),
            setMetadata: (metadata, arg) => {
                metadata.alias = arg;
            }
        });
    });
    let decorator = createDecorator<T>(name, classAdapter, metadataExtends);
    decorator.decoratorType = DecoratorType.Class;
    return decorator;
}

