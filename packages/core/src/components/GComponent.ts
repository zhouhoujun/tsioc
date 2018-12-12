import { Express, Mode } from '../types';
import { IComponent } from './IComponent';


/**
 * generics component.
 *
 * @export
 * @interface GComponent
 * @extends {IComponent}
 * @template T
 */
export interface GComponent<T extends IComponent> extends IComponent {
    /**
     * the node name.
     *
     * @type {string}
     *@memberof GComposite
     */
    name: string;

    /**
     * parent node.
     *
     * @type {T}
     *@memberof GComposite
     */
    parent?: T;

    /**
     * add node to this component and return self.
     *
     * @param {T} node the node to add.
     * @returns {this} self.
     *@memberof GComposite
     */
    add(node: T): this;

    /**
     * remove node from this component.
     *
     * @param {(T | string)} node
     * @returns {this}
     *@memberof GComposite
     */
    remove(node: T | string): this;

    /**
     * find sub context via express.
     *
     * @param {(T | Express<T, boolean>)} express
     * @param {Mode} [mode]
     * @returns {T}
     *@memberof GComposite
     */
    find(express: T | Express<T, boolean>, mode?: Mode): T

    /**
     * filter in component.
     *
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     * @returns {T[]}
     *@memberof GComposite
     */
    filter(express: Express<T, void | boolean>, mode?: Mode): T[]

    /**
     * iteration context with express.
     *
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     *@memberof GComposite
     */
    each(express: Express<T, void | boolean>, mode?: Mode);

    /**
     * trans all sub nodes. node first iteration.
     *
     * @param {(Express<T, void | boolean>)} express
     *@memberof GComposite
     */
    trans(express: Express<T, void | boolean>);

    /**
     * trans all sub nodes. node last iteration.
     *
     * @param {(Express<T, void | boolean>)} express
     *@memberof GComposite
     */
    transAfter(express: Express<T, void | boolean>);

    /**
     * route up iteration.
     *
     * @param {(Express<T, void | boolean>)} express
     *@memberof GComposite
     */
    routeUp(express: Express<T, void | boolean>);

    /**
     * this component node equals to the node or not.
     *
     * @param {T} node
     * @returns {boolean}
     *@memberof GComposite
     */
    equals(node: T): boolean;

    /**
     * get empty node.
     *
     * @returns {T}
     *@memberof GComposite
     */
    empty(): T

    /**
     * check this node is empty or not.
     *
     * @returns {boolean}
     *@memberof GComposite
     */
    isEmpty(): boolean;
}
