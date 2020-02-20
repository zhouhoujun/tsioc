import { tokenId } from '@tsdi/ioc';
import { IBootContext } from '@tsdi/boot';
import { ActivityOption } from './ActivityOption';

/**
 * workflow context token.
 */
export const WorkflowContextToken = tokenId<IWorkflowContext>('WorkflowContext');


export interface IWorkflowContext extends IBootContext<ActivityOption> {
    /**
    * workflow id.
    *
    * @type {string}
    * @memberof ActivityContext
    */
   id: string;
   /**
   * action name.
   *
   * @type {string}
   * @memberof ActivityOption
   */
   name: string;

   readonly result: any;

}
