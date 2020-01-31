import { DesignActionContext } from '@tsdi/ioc';
import { AdvisorToken } from '../IAdvisor';

/**
 * regist aspect action.
 *
 * @export
 */
export const RegistAspectAction = function (ctx: DesignActionContext, next: () => void): void {
    let type = ctx.type;
    let aspectMgr = ctx.reflects.getActionInjector().getInstance(AdvisorToken);
    aspectMgr.add(type);
    next();
};

