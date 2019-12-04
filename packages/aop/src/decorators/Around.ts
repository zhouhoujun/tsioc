import { isString } from '@tsdi/ioc';
import { AroundMetadata } from '../metadatas/AroundMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

/**
 * aop around decorator.
 *
 * @export
 * @interface IAroundDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAroundDecorator<T extends AroundMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop around advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [returning] set name provider of pointcut returing data for advices.
     * @param {string} [throwing] set name provider of pointcut throwing error for advices.
     * @param {string} [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, args?: string, returning?: string, throwing?: string, annotation?: string): MethodDecorator
}

/**
 * aop Around advice decorator.
 *
 * @Around
 */
export const Around: IAroundDecorator<AroundMetadata> =
    createAdviceDecorator<AroundMetadata>(
        'Around',
        null,
        [
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.args = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.returning = arg;
                    ctx.next(next);
                }
            },
            (ctx, next) => {
                let arg = ctx.currArg;
                if (isString(arg)) {
                    ctx.metadata.throwing = arg;
                    ctx.next(next);
                }
            }
        ]) as IAroundDecorator<AroundMetadata>;
