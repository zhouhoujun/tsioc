import { IocDesignAction, DesignActionContext } from '@tsdi/ioc';
import { IAdvisor, AdvisorToken } from '../IAdvisor';

/**
 * regist aspect action.
 *
 * @export
 * @class RegistAspectAction
 * @extends {IocDesignAction}
 */
export class RegistAspectAction extends IocDesignAction {

    execute(ctx: DesignActionContext, next: () => void): void {
        let type = ctx.type;
        let aspectMgr = ctx.injector.get<IAdvisor>(AdvisorToken);
        aspectMgr.add(type);
        next();
    }
}
