import { AdviceMetadata } from './AdviceMetadata';

export interface AfterThrowingMetadata extends AdviceMetadata {
    throwing: string;
}
