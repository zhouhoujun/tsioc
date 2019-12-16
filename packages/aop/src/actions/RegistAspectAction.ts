import {
    ClassMetadata, IocDesignAction,
    isClass, DesignActionContext, isArray
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
        let aspectMgr = ctx.injector.get<IAdvisor>(AdvisorToken);
        let metadata = ctx.reflects.getMetadata<ClassMetadata>(ctx.currDecoractor, type);
        if (isArray(metadata) && metadata.length > 0) {
            metadata.forEach(meta => {
                if (isClass(meta.type)) {
                    aspectMgr.add(meta.type);
                }
            });
        }

        next();
    }
}
