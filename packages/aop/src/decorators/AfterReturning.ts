import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { AfterReturningMetadata } from '../metadatas/index';
import { isString } from '@ts-ioc/core';

/**
 * aop after returning decorator.
 *
 * @export
 * @interface IAfterReturningDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAfterReturningDecorator<T extends AfterReturningMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop after returning advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [returning] set name provider of pointcut returing data for advices.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, returning?: string, annotation?: string): MethodDecorator;
}
export const AfterReturning: IAfterReturningDecorator<AfterReturningMetadata> =
    createAdviceDecorator<AfterReturningMetadata>(
        'AfterReturning',
        null,
        args => {
            args.next<AfterReturningMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.returning = arg;
                }
            })
        }
    ) as IAfterReturningDecorator<AfterReturningMetadata>;
