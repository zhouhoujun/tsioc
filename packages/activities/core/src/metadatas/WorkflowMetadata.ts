
import { CoreActivityConfigs } from '../core/ActivityConfigure';

/**
 * workflow metadata.
 *
 * @export
 * @interface IWorkflowMetadata
 * @extends {ActivityConfigure}
 * @extends {ClassMetadata}
 */
export interface IWorkflowMetadata {

}

/**
 * workflow metadata.
 */
export type WorkflowMetadata = IWorkflowMetadata & CoreActivityConfigs;
