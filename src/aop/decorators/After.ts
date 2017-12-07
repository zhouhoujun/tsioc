import { AdviceMetadata } from '../metadatas';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const After: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('After');
