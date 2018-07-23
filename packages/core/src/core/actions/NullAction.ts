import { ActionComponent } from './ActionComponent';
import { ActionData } from '../ActionData';
import { IContainer } from '../../IContainer';
import { NullComponent } from '../../components';

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
