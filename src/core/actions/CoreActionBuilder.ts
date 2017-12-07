import { DecoratorType } from '../factories';
import { ActionComposite } from './ActionComposite';
import { ActionComponent } from './ActionComponent';
import { CoreActions } from './CoreActions';
import { ICoreActionBuilder } from './ICoreActionBuilder';
import { BindParameterTypeAction } from './BindParameterTypeAction';
import { BindPropertyTypeAction } from './BindPropertyTypeAction';
import { BindProviderAction } from './BindProviderAction';
import { BindParameterProviderAction } from './BindParameterProviderAction';
import { BindPropertyAction } from './BindPropertyAction';


export class CoreActionBuilder implements ICoreActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: CoreActions[]): ActionComponent {
        let actions = new ActionComposite('', decorName, decorType);
        types.forEach(type => {
            let action = this.createAction(type);
            action && actions.add(action);
        });

        return actions;
    }

    protected createAction(type: CoreActions): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case CoreActions.bindParameterType:
                action = new BindParameterTypeAction();
                break;

            case CoreActions.bindPropertyType:
                action = new BindPropertyTypeAction();
                break;

            case CoreActions.bindProperty:
                action = new BindPropertyAction();
                break;

            case CoreActions.bindProvider:
                action = new BindProviderAction();
                break;

            case CoreActions.bindParameterProviders:
                action = new BindParameterProviderAction();
                break;

        }
        return action;
    }
}
