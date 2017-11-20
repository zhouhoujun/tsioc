import { ActionComponent} from './ActionComponent';
import { DecoratorType } from '../decorators/DecoratorType';
import { Mode, Express } from '../types';
import { ActionData } from './ActionData';
import { IContainer } from '../IContainer';


class NullActionClass implements  ActionComponent {
    name: string;
    decorName: string;
    decorType: DecoratorType;
    execute<T>(container: IContainer, data: ActionData<T>, name?: string) {

    }
    parent?: ActionComponent;
    add(action: ActionComponent): ActionComponent {
        return this;
    }
    remove(action: string | ActionComponent): ActionComponent {
        return this;
    }
    find<T extends ActionComponent>(express: T | Express<T, boolean>, mode?: Mode): T {
        return NullAction as T;
    }
    filter<T extends ActionComponent>(express: Express<T, boolean | void>, mode?: Mode): T[] {
        return [];
    }
    each<T extends ActionComponent>(express: Express<T, boolean | void>, mode?: Mode) {

    }
    trans(express: Express<ActionComponent, boolean | void>) {

    }
    route(express: Express<ActionComponent, boolean | void>) {

    }

}

export const NullAction: ActionComponent = new NullActionClass();
