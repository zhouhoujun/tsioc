import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { AfterReturningMetadata } from '../metadatas/index';
import { isString } from '@ts-ioc/core';

export interface IAfterReturningDecorator<T extends AfterReturningMetadata> extends IAdviceDecorator<T> {
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
