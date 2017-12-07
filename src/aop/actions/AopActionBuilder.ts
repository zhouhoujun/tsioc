import { DecoratorType, ActionComposite, ActionComponent } from '../../core';
import { IAopActionBuilder } from './IAopActionBuilder';
import { AopActions } from './AopActions';
import { RegistAspectAction } from './RegistAspectAction';

export class AopActionBuilder implements IAopActionBuilder {
    build(decorName: string, decorType: DecoratorType, ...types: AopActions[]): ActionComponent {
        let actions = new ActionComposite('', decorName, decorType);
        types.forEach(type => {
            let action = this.createAction(type);
            action && actions.add(action);
        });

        return actions;
    }

    protected createAction(type: AopActions): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case AopActions.registAspect:
                action = new RegistAspectAction();
                break;

        }
        return action;
    }
}
