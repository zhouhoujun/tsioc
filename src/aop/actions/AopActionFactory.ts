import { DecoratorType, ActionComposite, ActionComponent, Singleton, CoreActions } from '../../core';
import { AopActions } from './AopActions';
import { RegistAspectAction } from './RegistAspectAction';
import { BeforeConstructorAction, AfterConstructorAction, BindMethodPointcutAction, BindPropertyPointcutAction } from '../actions';
import { symbols } from '../../utils';


export class AopActionFactory {

    create(type: string): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case AopActions.registAspect:
                action = new RegistAspectAction();
                break;

            case CoreActions.beforeConstructor:
                action = new BeforeConstructorAction();
                break;

            case CoreActions.afterConstructor:
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
