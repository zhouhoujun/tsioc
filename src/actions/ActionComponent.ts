import { Type } from '../Type';
import { DecoratorType } from '../decorators/DecoratorType';
import { ObjectMap, Token, Express, Mode } from '../types';
import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { Metadate } from '../metadatas/Metadate';
import { IContainer } from '../IContainer';



/**
 * decorator action component.
 *
 * @export
 * @interface ActionComponent
 */
export interface ActionComponent {

    /**
     * the action name.
     *
     * @type {string}
     * @memberof ActionComponent
     */
    name: string;
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

    /**
     * parent action.
     *
     * @type {ActionComponent}
     * @memberof ActionComponent
     */
    parent?: ActionComponent;

    /**
     * add action to this component and return self.
     *
     * @param {ActionComponent} action the action to add.
     * @returns {ActionComponent} self.
     * @memberof ActionComponent
     */
    add(action: ActionComponent): ActionComponent;

    /**
     * remove action from this component.
     *
     * @param {(ActionComponent | string)} action
     * @returns {ActionComponent}
     * @memberof ActionComponent
     */
    remove(action: ActionComponent | string): ActionComponent;


    /**
     * find sub context via express.
     *
     * @template T
     * @param {(T | Express<T, boolean>)} express
     * @param {Mode} [mode]
     * @returns {T}
     * @memberof ActionComponent
     */
    find<T extends ActionComponent>(express: T | Express<T, boolean>, mode?: Mode): T

    /**
     * filter<T extends ActionComponent>(express: Express<ActionComponent, void | boolean>, mode?: Mode): T[]
     *
     * @template T
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     * @returns {T[]}
     * @memberof ActionComponent
     */
    filter<T extends ActionComponent>(express: Express<T, void | boolean>, mode?: Mode): T[]

    /**
     * iteration context with express.
     *
     * @template T
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     * @memberof ActionComponent
     */
    each<T extends ActionComponent>(express: Express<T, void | boolean>, mode?: Mode);

    /**
     * trans all sub actions.
     *
     * @param {(Express<ActionComponent, void | boolean>)} express
     * @memberof ActionComponent
     */
    trans(express: Express<ActionComponent, void | boolean>);

    /**
     * do express.
     *
     * @param {(Express<ActionComponent, void | boolean>)} express
     * @memberof ActionComponent
     */
    route(express: Express<ActionComponent, void | boolean>);
}
