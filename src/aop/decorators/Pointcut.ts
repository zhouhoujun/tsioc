import { AdviceMetadata } from '../metadatas/index';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Pointcut: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Pointcut');
