
import { MethodMetadata } from '../../metadatas';
import { createMethodDecorator, IMethodDecorator, MetadataAdapter, MetadataExtends, IDecorator } from '../../decorators';
import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { isClassMetadata } from '../../utils';
import { isString } from 'util';
import { PointcutMetadata } from '../metadatas';

export interface IPointcutDecorator<T extends PointcutMetadata> extends IDecorator<T> {
    (pointcut?: string): any;
}

export function createPointcutDecorator<T extends PointcutMetadata>(name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IPointcutDecorator<T> {

    return createMethodDecorator<PointcutMetadata>(name,
        args => {
            if (adapter) {
                adapter(args);
            }
            args.next<T>({
                isMetadata: (arg) => isClassMetadata(arg, ['pointcut']),
                match: (arg) => isString(arg),
                setMetadata: (metadata, arg) => {
                    metadata.pointcut = arg;
                }
            });
        }, metadataExtends) as IPointcutDecorator<T>;
}


export const Pointcut: IPointcutDecorator<AdviceMetadata> = createPointcutDecorator<PointcutMetadata>('Pointcut');
