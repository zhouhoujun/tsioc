import { DecoratorType } from '../decorators';
import { ActionComposite } from './ActionComposite';
import { ActionComponent } from './ActionComponent';
import { type } from 'os';
import { ActionType } from './ActionType';
import { ResetParamAction } from './ResetParamAction';
import { ResetPropAction } from './ResetPropAction';
import { ProviderAction } from './ProviderAction';


export class ActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: ActionType[]): ActionComponent {
        let actions = new ActionComposite('', decorName, decorType);
        types.forEach(type => {
            let action = this.createAction(type);
            action && actions.add(action);
        });

        return actions;
    }

    protected createAction(type: ActionType): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case ActionType.resetParamType:
                action = new ResetParamAction();
                break;

            case ActionType.resetPropType:
                action = new ResetPropAction();
                break;

            case ActionType.provider:
                action = new ProviderAction();
                break;

        }
        return action;
    }
}
