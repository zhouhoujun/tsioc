import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { isString } from '../../utils/index';
import { AdviceMetadata, AfterThrowingMetadata } from '../metadatas/index';


export interface IAfterThrowingDecorator<T extends AfterThrowingMetadata> extends IAdviceDecorator<T> {
    (pointcut?: string | RegExp, throwing?: string): MethodDecorator
}
export const AfterThrowing: IAfterThrowingDecorator<AfterThrowingMetadata> =
    createAdviceDecorator<AfterThrowingMetadata>(
        'AfterThrowing',
        null,
        args => {
            args.next<AfterThrowingMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.throwing = arg;
                }
            })
        }
    );
