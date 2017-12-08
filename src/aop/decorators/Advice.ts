
import { MethodMetadata, createMethodDecorator, IMethodDecorator, MetadataAdapter, MetadataExtends } from '../../core';
import { AdviceMetadata } from '../metadatas';
import { isClassMetadata } from '../../utils';
import { isString, isRegExp } from 'util';

export interface IAdviceDecorator<T extends AdviceMetadata> extends IMethodDecorator<T> {
    (pointcut?: string | RegExp): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAdviceDecorator<T> {

    return createMethodDecorator<AdviceMetadata>('Advice',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<AdviceMetadata>({
                isMetadata: (arg) => isClassMetadata(arg, ['pointcut']),
                match: (arg) => isString(arg) || isRegExp(arg),
                setMetadata: (metadata, arg) => {
                    metadata.pointcut = arg;
                }
            });
        },
        metadata => {
            if (metadataExtends) {
                metadata = metadataExtends(metadata as T);
            }
            metadata.adviceName = adviceName;
            return metadata;
        }) as IAdviceDecorator<T>;
}

export const Advice: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator('Advice');
