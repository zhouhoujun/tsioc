import { ActionData } from './ActionData';
import { ActionType } from './ActionType';
import { DecoratorType } from '../decorators/DecoratorType';
import { Mode, Express } from '../types';
import { NullAction } from './NullAction';
import { ActionComponent } from './ActionComponent';
import { Metadate } from '../metadatas/index';
import { IContainer } from '../IContainer';
import { isString } from 'util';
import { isFunction } from '../utils';
import { Composite, IComponent } from '../components';


export class ActionComposite extends Composite implements ActionComponent {

    public decorName: string;
    public decorType: DecoratorType;

    parent: ActionComponent;
    protected children: ActionComponent[];
    constructor(name: string, decorName?: string, decorType?: DecoratorType) {
        super(name);
        this.decorName = decorName;
        this.decorType = decorType;
        this.children = [];
    }

    protected working(container: IContainer, data: ActionData<Metadate>) {
        // do nothing.
    }

    execute(container: IContainer, data: ActionData<Metadate>, name?: string | ActionType) {
        if (name) {
            this.find<ActionComponent>(it => it.name === (isString(name) ? name : (<ActionType>name).toString()))
                .execute(container, data);
        } else {
            this.trans(action => {
                if (action instanceof ActionComposite) {
                    action.working(container, data);
                }
            });
        }
    }

    add(action: ActionComponent): IComponent {
        action.decorName = this.decorName;
        action.decorType = this.decorType;
        return super.add(action);
    }

    empty() {
        return NullAction;
    }

}
