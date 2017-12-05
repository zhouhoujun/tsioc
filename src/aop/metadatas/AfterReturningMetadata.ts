import { AdviceMetadata } from './AdviceMetadata';

export interface AfterReturningMetadata extends AdviceMetadata {
    returning?: string;
}
