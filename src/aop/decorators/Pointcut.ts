
import { MethodMetadata, createMethodPropDecorator, IMethodPropDecorator, MetadataAdapter, MetadataExtends } from '../../core';
import { isClassMetadata } from '../../utils';
import { isString } from 'util';
import { AdviceMetadata, PointcutMetadata } from '../metadatas';

export interface IPointcutDecorator<T extends PointcutMetadata> extends IMethodPropDecorator<T> {
    (pointcut?: string): any;
}

export function createPointcutDecorator<T extends PointcutMetadata>(name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IPointcutDecorator<T> {

    return createMethodPropDecorator<PointcutMetadata>(name,
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<T>({
                isMetadata: (arg) => isClassMetadata(arg, ['pointcut']),
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata = arg;
                }
            });
        }, metadataExtends) as IPointcutDecorator<T>;
}


export const Pointcut: IPointcutDecorator<AdviceMetadata> = createPointcutDecorator<PointcutMetadata>('Pointcut');
