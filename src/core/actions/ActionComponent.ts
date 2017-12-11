import { Type } from '../../Type';
import { DecoratorType } from '../factories';
import { ObjectMap, Token, Express, Mode } from '../../types';
import { ActionData } from '../ActionData';
import { CoreActions } from './CoreActions';
import { Metadate } from '../metadatas';
import { IContainer } from '../../IContainer';
import { IComponent } from '../../components';
import { IExecutable } from '../IExecutable';



/**
 * decorator action component.
 *
 * @export
 * @interface ActionComponent
 * @extends {IComponent}
 */
export interface ActionComponent extends IComponent, IExecutable {

    /**
     * insert ActionComponent
     *
     * @param {IComponent} node
     * @returns {IComponent}
     * @memberof ActionComponent
     */
    insert(node: ActionComponent, index: number): ActionComponent;

}
