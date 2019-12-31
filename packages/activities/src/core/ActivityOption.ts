import { BootOption } from '@tsdi/boot';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityTemplate } from './ActivityMetadata';



/**
 * activity option.
 *
 * @export
 * @interface ActivityOption
 * @extends {BootOption}
 */
export interface ActivityOption<T = any> extends BootOption<T> {
    /**
     * workflow id.
     *
     * @type {string}
     * @memberof ActivityOption
     */
    id?: string;

    /**
     * bootstrap reference runable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    runnable?: WorkflowInstance;

    /**
     * activities component template scope.
     *
     * @type {ActivityTemplate}
     * @memberof ActivityConfigure
     */
    template?: ActivityTemplate
}
