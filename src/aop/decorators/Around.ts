import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Around: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Around');
