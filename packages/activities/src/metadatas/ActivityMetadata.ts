import { ActivityOption, ActivityContext } from '../core';
import { ClassMetadata, Token } from '@tsdi/ioc';

/**
 * task metadata.
 *
 * @export
 * @interface TaskMetadata
 * @extends {ClassMetadata}
 */
export interface ActivityMetadata extends ClassMetadata {
    decorType?: string;

    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name?: string;

    /**
     * context type.
     *
     * @type {Token<ActivityContext>}
     * @memberof ActivityMetadata
     */
    contextType?: Token<ActivityContext>;

    /**
     * selector.
     *
     * @type {string}
     * @memberof ActivityConfigure
     */
    selector?: string| string [];
}

