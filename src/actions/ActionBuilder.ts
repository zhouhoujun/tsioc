import { DecoratorType } from '../decorators';
import { ActionComposite } from './ActionComposite';
import { ActionComponent } from './ActionComponent';
import { ActionType } from './ActionType';
import { SetParamAction } from './SetParamAction';
import { SetPropAction } from './SetPropAction';
import { ProviderAction } from './ProviderAction';
import { IActionBuilder } from './IActionBuilder';
import { AccessMethodAction } from './AccessMethodAction';
import { AspectAction } from './AspectAction';


export class ActionBuilder implements IActionBuilder {
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
            case ActionType.setParamType:
                action = new SetParamAction();
                break;

            case ActionType.setPropType:
                action = new SetPropAction();
                break;

            case ActionType.provider:
                action = new ProviderAction();
                break;

            case ActionType.accessMethod:
                action = new AccessMethodAction();
                break;

            case ActionType.aspect:
                action =  new AspectAction();
                break;

        }
        return action;
    }
}
