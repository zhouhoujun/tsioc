import { AdviceMetadata } from '../metadatas/index';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Before: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Before');
