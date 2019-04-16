import { ActivityContext, ActivityOption } from '../core';
import { ClassMetadata, Token } from '@tsdi/ioc';

/**
 * task metadata.
 *
 * @export
 * @interface TaskMetadata
 * @extends {ClassMetadata}
 */
export interface ActivityMetadata extends ClassMetadata, ActivityOption<ActivityContext> {
    decorType?: string;

    /**
     * context type.
     *
     * @type {Token<ActivityContext>}
     * @memberof ActivityMetadata
     */
    contextType?: Token<ActivityContext>;
}


