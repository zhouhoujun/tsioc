import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Pointcut: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Pointcut');
