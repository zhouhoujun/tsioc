import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { AfterReturningMetadata } from '../metadatas';
import { isString } from 'util';

export interface IAfterReturningDecorator<T extends AfterReturningMetadata> extends IAdviceDecorator<T> {
    (returning?: string, pointcut?: string): MethodDecorator;
}
export const AfterThrowing: IAfterReturningDecorator<AfterReturningMetadata> =
    createAdviceDecorator<AfterReturningMetadata>(
        'AfterThrowing',
        args => {
            args.next<AfterReturningMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.returning = arg;
                }
            })
        }
    );

export const AfterReturning: IAfterReturningDecorator<AfterReturningMetadata> = createAdviceDecorator<AfterReturningMetadata>('AfterReturning');
