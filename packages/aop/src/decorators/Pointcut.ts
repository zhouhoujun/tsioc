import { AdviceMetadata } from '../metadatas/index';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

/**
 * aop Pointcut advice decorator.
 *
 * @Pointcut
 */
export const Pointcut: IAdviceDecorator<AdviceMetadata> =
    createAdviceDecorator<AdviceMetadata>('Pointcut') as IAdviceDecorator<AdviceMetadata>;
