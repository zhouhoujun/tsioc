import { IAnnotationMetadata } from '@ts-ioc/bootstrap';
import { CoreActivityConfigs } from '../core/ActivityConfigure';
import { IActivity } from '../core/IActivity';

/**
 * task metadata.
 *
 * @export
 * @interface TaskMetadata
 * @extends {ClassMetadata}
 */
export interface IActivityMetadata extends IAnnotationMetadata<IActivity> {
    decorType?: string;
}

/**
 * activity metadata.
 */
export type ActivityMetadata = (IActivityMetadata & CoreActivityConfigs);
