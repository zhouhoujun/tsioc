import { IComponent } from './IComponent';
import { Mode, Express } from '../types';
import { GComponent } from './GComponent';


/**
 * null component.
 *
 * @export
 * @class NullComponent
 * @implements {IComponent}
 */
export class NullComponent implements GComponent<any> {

    isEmpty(): boolean {
        return true;
    }
    name: string;
    parent?: any;
    add(action: any): this {
        return this;
    }
    remove(action: string | any): this {
        return this;
    }
    find(express: any | Express<any, boolean>, mode?: Mode): any {
        return NullNode;
    }
    filter(express: Express<any, boolean | void>, mode?: Mode): any[] {
        return [];
    }
    each(express: Express<any, boolean | void>, mode?: Mode) {
    }

    trans(express: Express<any, boolean | void>) {
    }

    transAfter(express: Express<any, boolean | void>) {
    }

    routeUp(express: Express<any, boolean | void>) {

    }

    equals(node: any): boolean {
        return node === NullNode;
    }

    empty() {
        return NullNode;
    }
}

/**
 * Null node
 */
export const NullNode: GComponent<any> = new NullComponent();
