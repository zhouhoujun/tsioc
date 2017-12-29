import { AdviceMetadata } from '../metadatas/index';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const After: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('After');
