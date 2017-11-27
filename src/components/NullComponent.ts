import { IComponent } from './IComponent';
import { Mode, Express } from '../types';


/**
 * null component.
 *
 * @export
 * @class NullComponent
 * @implements {IComponent}
 */
export class NullComponent implements IComponent {
    isEmpty(): boolean {
        return true;
    }
    name: string;
    parent?: IComponent;
    add(action: IComponent): IComponent {
        return this;
    }
    remove(action: string | IComponent): IComponent {
        return this;
    }
    find<T extends IComponent>(express: T | Express<T, boolean>, mode?: Mode): T {
        return NullNode as T;
    }
    filter<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        return [];
    }
    each<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode) {

    }
    trans(express: Express<IComponent, boolean | void>) {

    }
    route(express: Express<IComponent, boolean | void>) {

    }

    equals(node: IComponent): boolean {
        return node === NullNode;
    }

    empty() {
        return NullNode;
    }
}

export const NullNode: IComponent = new NullComponent();
