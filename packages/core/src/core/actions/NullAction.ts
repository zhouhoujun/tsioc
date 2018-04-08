import { ActionComponent } from './ActionComponent';
import { DecoratorType } from '../factories/index';
import { Mode, Express } from '../../types';
import { ActionData } from '../ActionData';
import { IContainer } from '../../IContainer';
import { NullComponent } from '../../components/index';

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

export const NullAction: ActionComponent = new NullActionClass();
