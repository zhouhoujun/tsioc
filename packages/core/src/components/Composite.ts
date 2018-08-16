
import { Mode, Express } from '../types';
import { IComponent } from './IComponent';
import { GComposite } from './GComposite';

/**
 * compoiste.
 *
 * @export
 * @class Composite
 * @implements {IComponent}
 */
export class Composite extends GComposite<IComponent> implements IComponent {

    constructor(name: string) {
        super(name);
    }

    find<T extends IComponent>(express: T | Express<T, boolean>, mode?: Mode): T {
        return super.find(express, mode) as T;
    }
    filter<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        return super.filter(express, mode) as T[];
    }
    each<T extends IComponent>(express: Express<T, boolean | void>, mode?: Mode) {
        return super.each(express, mode);
    }

    eachChildren<T extends IComponent>(express: Express<T, void | boolean>) {
        super.eachChildren(express);
    }
}
