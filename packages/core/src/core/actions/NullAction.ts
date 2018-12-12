import { ActionComponent } from './ActionComponent';
import { ActionData } from '../ActionData';
import { IContainer } from '../../IContainer';
import { NullComponent } from '../../components';

/**
 * Null action.
 *
 * @class NullActionClass
 * @extends {NullComponent}
 * @implements {ActionComponent}
 */
class NullActionClass extends NullComponent implements ActionComponent {

    insert(action: ActionComponent, index: number): this {
        return this;
    }
    execute<T>(container: IContainer, data: ActionData<T>, name?: string) {

    }

    empty() {
        return NullAction;
    }

}

/**
 * Null Action
 */
export const NullAction: ActionComponent = new NullActionClass();
