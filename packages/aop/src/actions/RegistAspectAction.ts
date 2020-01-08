import { DesignActionContext } from '@tsdi/ioc';
import { IAdvisor, AdvisorToken } from '../IAdvisor';

/**
 * regist aspect action.
 *
 * @export
 */
export const RegistAspectAction = function (ctx: DesignActionContext, next: () => void): void {
    let type = ctx.type;
    let aspectMgr = ctx.injector.get<IAdvisor>(AdvisorToken);
    aspectMgr.add(type);
    next();
};

