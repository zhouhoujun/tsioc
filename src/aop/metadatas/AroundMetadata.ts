import { AfterReturningMetadata } from './AfterReturningMetadata';
import { AfterThrowingMetadata } from './AfterThrowingMetadata';

export interface AroundMetadata extends AfterReturningMetadata, AfterThrowingMetadata {
    args?: string;
    returning?: string;
}
