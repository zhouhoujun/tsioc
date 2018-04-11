import {
    ActionComponent, ActionComposite,
    CoreActions, BindParameterTypeAction,
    BindPropertyTypeAction, InjectPropertyAction,
    BindParameterProviderAction, BindProviderAction,
    ComponentInitAction, ComponentBeforeInitAction, ComponentAfterInitAction,
    CacheAction, SingletionAction, AutorunAction
} from './actions/index';
import { IocCore } from './decorators/index';

@IocCore()
export class ActionFactory {

    /**
     * create action by action type. type in 'CoreActions'
     *
     * @param {string} type
     * @returns {ActionComponent}
     * @memberof ActionFactory
     */
    create(type: string): ActionComponent {
        let action: ActionComponent;
        switch (type) {
            case CoreActions.bindParameterType:
                action = new BindParameterTypeAction();
                break;

            case CoreActions.bindPropertyType:
                action = new BindPropertyTypeAction();
                break;

            case CoreActions.injectProperty:
                action = new InjectPropertyAction();
                break;

            case CoreActions.bindProvider:
                action = new BindProviderAction();
                break;

            case CoreActions.bindParameterProviders:
                action = new BindParameterProviderAction();
                break;

            case CoreActions.componentInit:
                action = new ComponentInitAction();
                break;

            case CoreActions.componentBeforeInit:
                action = new ComponentBeforeInitAction();
                break;

            case CoreActions.componentAfterInit:
                action = new ComponentAfterInitAction();
                break;

            case CoreActions.cache:
                action = new CacheAction();
                break;

            case CoreActions.singletion:
                action = new SingletionAction();
                break;

            case CoreActions.autorun:
                action = new AutorunAction();
                break;
            default:
                action = new ActionComposite(type);
                break;

        }

        return action;
    }
}
