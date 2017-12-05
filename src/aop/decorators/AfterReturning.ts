import { AdviceMetadata } from '../metadatas/AdviceMetadata';
import { IAdviceDecorator, createAdviceDecorator } from './Advice';



export interface AfterReturningMetadata extends AdviceMetadata {
    returning: string;
}

export const AfterReturning: IAdviceDecorator<AdviceMetadata> = createAdviceDecorator<AdviceMetadata>('AfterReturning');
