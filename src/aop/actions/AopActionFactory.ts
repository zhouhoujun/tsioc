import { DecoratorType, ActionComposite, ActionComponent, Singleton, CoreActions } from '../../core';
import { AopActions } from './AopActions';
import { RegistAspectAction } from './RegistAspectAction';
import {
    InvokeBeforeConstructorAction, InvokeAfterConstructorAction,
    BindMethodPointcutAction, BindPropertyPointcutAction, MatchPointcutAction
} from '../actions';
import { symbols } from '../../utils';


export class AopActionFactory {

    create(type: string): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case AopActions.registAspect:
                action = new RegistAspectAction();
                break;

            case AopActions.matchPointcut:
                action = new MatchPointcutAction();
                break;

            case AopActions.invokeBeforeConstructorAdvices:
                action = new InvokeBeforeConstructorAction();
                break;

            case AopActions.invokeAfterConstructorAdvices:
                action = new InvokeAfterConstructorAction();
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
