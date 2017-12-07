import { AdviceMetadata } from '../metadatas';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Before: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Before');
