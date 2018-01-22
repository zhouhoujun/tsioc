import { Type } from '../../Type';
import { DecoratorType } from '../factories';
import { ObjectMap, Token, Express, Mode } from '../../types';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { Metadate } from '../metadatas';
import { IContainer } from '../../IContainer';
import { IComponent, GComponent } from '../../components';
import { IExecutable } from '../IExecutable';



/**
 * decorator action component.
 *
 * @export
 * @interface ActionComponent
 * @extends {GComponent<ActionComponent>}
 */
export interface ActionComponent extends GComponent<ActionComponent>, IExecutable {

    /**
     * insert ActionComponent
     *
     * @param {ActionComponent} node
     * @param {number} index
     * @returns {this}
     * @memberof ActionComponent
     */
    insert(node: ActionComponent, index: number): this;

}
