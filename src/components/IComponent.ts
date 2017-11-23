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
     * @returns {IComponent} self.
     * @memberof IComponent
     */
    add(node: IComponent): IComponent;

    /**
     * remove node from this component.
     *
     * @param {(IComponent | string)} node
     * @returns {IComponent}
     * @memberof IComponent
     */
    remove(node: IComponent | string): IComponent;


    /**
     * find sub context via express.
     *
     * @template T
     * @param {(T | Express<T, boolean>)} express
     * @param {Mode} [mode]
     * @returns {T}
     * @memberof IComponent
     */
    find<T extends IComponent>(express: T | Express<T, boolean>, mode?: Mode): T

    /**
     * filter<T extends IComponent>(express: Express<IComponent, void | boolean>, mode?: Mode): T[]
     *
     * @template T
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     * @returns {T[]}
     * @memberof IComponent
     */
    filter<T extends IComponent>(express: Express<T, void | boolean>, mode?: Mode): T[]

    /**
     * iteration context with express.
     *
     * @template T
     * @param {(Express<T, void | boolean>)} express
     * @param {Mode} [mode]
     * @memberof IComponent
     */
    each<T extends IComponent>(express: Express<T, void | boolean>, mode?: Mode);

    /**
     * trans all sub nodes.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @memberof IComponent
     */
    trans(express: Express<IComponent, void | boolean>);

    /**
     * do express.
     *
     * @param {(Express<IComponent, void | boolean>)} express
     * @memberof IComponent
     */
    route(express: Express<IComponent, void | boolean>);

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
}
