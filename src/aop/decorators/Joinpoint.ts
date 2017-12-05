import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';

export const Joinpoint: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('Joinpoint');
