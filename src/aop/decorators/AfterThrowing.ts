import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';



export interface AfterThrowingMetadata extends AdviceMetadata {
    throwing: string;
}

export const AfterThrowing: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('AfterThrowing');
