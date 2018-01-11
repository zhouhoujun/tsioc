
import { MethodMetadata, createMethodDecorator, IMethodDecorator, MetadataAdapter, MetadataExtends } from '../../core/index';
import { AdviceMetadata } from '../metadatas/index';
import { isClassMetadata, isString, isRegExp } from '../../utils/index';

export interface IAdviceDecorator<T extends AdviceMetadata> extends IMethodDecorator<T> {
    (value?: string | RegExp): MethodDecorator;
}

export function createAdviceDecorator<T extends AdviceMetadata>(adviceName: string,
    adapter?: MetadataAdapter,
    afteradapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IAdviceDecorator<T> {

    return createMethodDecorator<AdviceMetadata>('Advice',
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<AdviceMetadata>({
                isMetadata: (arg) => isClassMetadata(arg, ['pointcut', 'annotation']),
                match: (arg) => isString(arg) || isRegExp(arg),
                setMetadata: (metadata, arg) => {
                    if (isString(arg) && /^@annotation\(\S+\)$/.test(arg.trim())) {
                        metadata.annotation = arg;
                    } else {
                        metadata.pointcut = arg;
                    }
                }
            });
            if (afteradapter) {
                afteradapter(args);
            }
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
