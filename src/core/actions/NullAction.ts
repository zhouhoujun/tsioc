import { ActionComponent } from './ActionComponent';
import { DecoratorType } from '../factories';
import { Mode, Express } from '../../types';
import { ActionData } from './ActionData';
import { IContainer } from '../../IContainer';
import { NullComponent } from '../../components';


class NullActionClass extends NullComponent implements ActionComponent {
    name: string;
    decorName: string;
    decorType: DecoratorType;
    execute<T>(container: IContainer, data: ActionData<T>, name?: string) {

    }

    empty() {
        return NullAction;
    }

}

export const NullAction: ActionComponent = new NullActionClass();
