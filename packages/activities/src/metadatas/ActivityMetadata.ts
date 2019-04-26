import { ActivityContext, ActivityConfigure } from '../core';
import { Token } from '@tsdi/ioc';

/**
 * task metadata.
 *
 * @export
 * @interface TaskMetadata
 * @extends {ClassMetadata}
 */
export interface ActivityMetadata extends ActivityConfigure {
    decorType?: string;

    /**
     * context type.
     *
     * @type {Token<ActivityContext>}
     * @memberof ActivityMetadata
     */
    contextType?: Token<ActivityContext>;
}


