import { Type } from '../Type';
import { DecoratorType } from '../decorators/DecoratorType';
import { ObjectMap, Token, Express, Mode } from '../types';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { Metadate } from '../metadatas/Metadate';
import { IContainer } from '../IContainer';
import { IComponent } from '../components';



/**
 * decorator action component.
 *
 * @export
 * @interface ActionComponent
 * @extends {IComponent}
 */
export interface ActionComponent extends IComponent {

    /**
     * decorator name.
     *
     * @type {string}
     * @memberof ActionComponent
     */
    decorName: string;
    /**
     * decorator type.
     *
     * @type {DecoratorType}
     * @memberof ActionComponent
     */
    decorType: DecoratorType;

    /**
     * execute the action work.
     *
     * @template T
     * @param { IContainer } container
     * @param {ActionData<T>} data execute data;
     * @param {(string|ActionType)} [name] execute action name.
     * @memberof ActionComponent
     */
    execute<T extends Metadate>(container: IContainer, data: ActionData<T>, name?: string | ActionType);

}
