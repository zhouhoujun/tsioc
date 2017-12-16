import { AroundMetadata } from '../metadatas';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';
import { isString } from 'util';


export interface IAroundDecorator<T extends AroundMetadata> extends IAdviceDecorator<T> {
    (pointcut?: string | RegExp, args?: string, returning?: string, throwing?: string): MethodDecorator
}

export const Around: IAroundDecorator<AroundMetadata> =
    createAdviceDecorator<AroundMetadata>(
        'Around',
        null,
        args => {
            args.next<AroundMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.args = arg;
                }
            });

            args.next<AroundMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.returning = arg;
                }
            });

            args.next<AroundMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.throwing = arg;
                }
            });
        });
