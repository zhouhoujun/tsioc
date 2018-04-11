
import { createMethodDecorator, IMethodDecorator, MetadataAdapter, MetadataExtends, isClassMetadata, isString, isRegExp  } from '@ts-ioc/core';
import { AdviceMetadata } from '../metadatas/index';

export interface IAdviceDecorator<T extends AdviceMetadata> extends IMethodDecorator<T> {
    (pointcut?: string | RegExp, annotation?: string): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string,
    adapter?: MetadataAdapter,
    afterPointcutAdapter?: MetadataAdapter,
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
            if (afterPointcutAdapter) {
                afterPointcutAdapter(args);
            }

            args.next<AdviceMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.annotationArgName = arg;
                }
            });

            args.next<AdviceMetadata>({
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.annotation = arg;
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
