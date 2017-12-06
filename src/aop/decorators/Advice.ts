
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator, MetadataAdapter, MetadataExtends } from '../../decorators';
import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { isClassMetadata } from '../../utils';
import { isString } from 'util';

export interface IAdviceDecorator<T extends AdviceMetadata> extends IMethodDecorator<T> {
    (pointcut?: string): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAdviceDecorator<T> {

    return createMethodDecorator<AdviceMetadata>(name,
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<AdviceMetadata>({
                isMetadata: (arg) => isClassMetadata(arg, ['pointcut']),
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.pointcut = arg;
                }
            });
        }, metadataExtends) as IAdviceDecorator<T>;
}
