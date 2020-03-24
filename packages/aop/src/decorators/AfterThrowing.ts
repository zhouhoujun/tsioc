import { isString } from '@tsdi/ioc';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { AfterThrowingMetadata } from '../metadatas/AfterThrowingMetadata';
/**
 * aop after throwing decorator.
 *
 * @export
 * @interface IAfterThrowingDecorator
 * @extends {IAdviceDecorator<T>}
 * @template T
 */
export interface IAfterThrowingDecorator<T extends AfterThrowingMetadata> extends IAdviceDecorator<T> {
    /**
     * define aop after throwing advice.
     *
     * @param {(string | RegExp)} [pointcut] define advice match express for pointcut.
     * @param {string} [throwing] set name provider of pointcut throwing error for advices.
     * @param { string } [annotation] annotation name, special annotation metadata for annotation advices.
     */
    (pointcut?: string | RegExp, throwing?: string, annotation?: string): MethodDecorator
}

/**
 * aop after throwing advice decorator.
 *
 * @AfterThrowing
 */
export const AfterThrowing: IAfterThrowingDecorator<AfterThrowingMetadata> =
    createAdviceDecorator<AfterThrowingMetadata>(
        'AfterThrowing',
        null,
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.throwing = arg;
                ctx.next(next);
            }
        }
    ) as IAfterThrowingDecorator<AfterThrowingMetadata>;
