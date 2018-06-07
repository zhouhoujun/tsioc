import { Express, Mode } from '../types';


/**
 * component.
 *
 * @export
 * @interface IComponent
 */
export interface IComponent {

    /**
     * the node name.
     *
     * @type {string}
     * @memberof IComponent
     */
    name: string;

    /**
     * parent node.
     *
     * @type {IComponent}
     * @memberof IComponent
     */
    parent?: IComponent;

    /**
     * add node to this component and return self.
     *
     * @param {IComponent} node the node to add.
     * @returns {this} self.
     * @memberof IComponent
     */
    add(node: IComponent): this;

    /**
     * remove node from this component.
     *
     * @param {(IComponent | string)} node
     * @returns {this}
     * @memberof IComponent
     */
    remove(node: IComponent | string): this;


    /**
     * find sub context via express.
     *
     * @param {(IComponent | Express<IComponent, boolean>)} express
     * @param {Mode} [mode]
     * @returns {IComponent}
     * @memberof IComponent
     */
    find(express: IComponent | Express<IComponent, boolean>, mode?: Mode): IComponent

    /**
     * filter in component.
     *

     * @param {(Express<IComponent, void | boolean>)} express
     * @param {Mode} [mode]
     * @returns {IComponent[]}
     * @memberof IComponent
     */
    filter(express: Express<IComponent, void | boolean>, mode?: Mode): IComponent[]

    /**
     * iteration context with express.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @param {Mode} [mode]
     * @memberof IComponent
     */
    each(express: Express<IComponent, void | boolean>, mode?: Mode);

    /**
     * trans all sub nodes. node first iteration.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @memberof IComponent
     */
    trans(express: Express<IComponent, void | boolean>);

    /**
     * trans all sub nodes. node last iteration.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @memberof IComponent
     */
    transAfter(express: Express<IComponent, void | boolean>);

    /**
     * route up iteration.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @memberof IComponent
     */
    routeUp(express: Express<IComponent, void | boolean>);

    /**
     * this component node equals to the node or not.
     *
     * @param {IComponent} node
     * @returns {boolean}
     * @memberof IComponent
     */
    equals(node: IComponent): boolean;

    /**
     * get empty node.
     *
     * @returns {IComponent}
     * @memberof IComponent
     */
    empty(): IComponent

    /**
     * check this node is empty or not.
     *
     * @returns {boolean}
     * @memberof IComponent
     */
    isEmpty(): boolean;
}
