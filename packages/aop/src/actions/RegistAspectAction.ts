import {
    ClassMetadata, IocDesignAction,
    isClass, DesignActionContext, isArray, CTX_CURR_DECOR
} from '@tsdi/ioc';
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
        let type = ctx.targetType;
        let aspectMgr = this.container.get<IAdvisor>(AdvisorToken);
        let raiseContainer = ctx.getContainer();
        let metadata = ctx.reflects.getMetadata<ClassMetadata>(ctx.get(CTX_CURR_DECOR), type);
        if (isArray(metadata) && metadata.length > 0) {
            metadata.forEach(meta => {
                if (isClass(meta.type)) {
                    aspectMgr.add(meta.type, raiseContainer);
                }
            });
        }

        next();
    }
}
