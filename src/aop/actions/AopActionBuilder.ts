import { DecoratorType, ActionComposite, ActionComponent, Singleton } from '../../core';
import { IAopActionBuilder } from './IAopActionBuilder';
import { AopActions } from './AopActions';
import { RegistAspectAction } from './RegistAspectAction';
import { BeforeConstructorAction, AfterConstructorAction, BindMethodPointcutAction, BindPropertyPointcutAction } from '../actions';
import { symbols } from '../../utils';


@Singleton(symbols.IAopActionBuilder)
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

            case AopActions.beforeConstructor:
                action = new BeforeConstructorAction();
                break;

            case AopActions.afterConstructor:
                action = new AfterConstructorAction();
                break;

            case AopActions.bindMethodPointcut:
                action = new BindMethodPointcutAction();
                break;

            case AopActions.bindPropertyPointcut:
                action = new BindPropertyPointcutAction();
                break;

        }
        return action;
    }
}
