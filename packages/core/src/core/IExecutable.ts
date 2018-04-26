import { IContainer } from '../IContainer';
import { ActionData } from './ActionData';

/**
 * execute action
 *
 * @export
 * @interface IExecutable
 */
export interface IExecutable {

    /**
     * execute the action work.
     *
     * @template T
     * @param { IContainer } container
     * @param {ActionData<T>} data execute data;
     * @param {string} [name] execute action name.
     * @memberof ActionComponent
     */
    execute<T>(container: IContainer, data: ActionData<T>, name?: string);
}
