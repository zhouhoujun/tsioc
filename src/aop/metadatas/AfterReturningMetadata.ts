import { AdviceMetadata } from './AdviceMetadata';

export interface AfterReturningMetadata extends AdviceMetadata {
    /**
     * set name provider of pointcut returing data for advices.
     *
     * @type {string}
     * @memberof AfterReturningMetadata
     */
    returning?: string;
}
