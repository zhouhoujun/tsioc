import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const After: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('After');
