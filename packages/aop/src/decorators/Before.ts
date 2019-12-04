import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

/**
 * aop Before advice decorator.
 *
 * @Before
 */
export const Before: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Before') as IAdviceDecorator<AdviceMetadata>;
