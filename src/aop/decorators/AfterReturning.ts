import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { AfterReturningMetadata } from '../metadatas';
import { isString } from 'util';

export interface IAfterReturningDecorator<T extends AfterReturningMetadata> extends IAdviceDecorator<T> {
    (returning?: string, pointcut?: string | RegExp): MethodDecorator;
}
export const AfterReturning: IAfterReturningDecorator<AfterReturningMetadata> =
    createAdviceDecorator<AfterReturningMetadata>(
        'AfterReturning',
        args => {
            args.next<AfterReturningMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.returning = arg;
                }
            })
        }
    );
