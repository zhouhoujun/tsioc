import {
    ClassMetadata, getOwnTypeMetadata, IocDesignAction,
    isClass, DecoratorRegisterer, lang, DesignActionContext
} from '@ts-ioc/ioc';
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
        let decorReg = this.container.get(DecoratorRegisterer);
        let matchs = decorReg.getClassDecorators(type, lang.getClass(this))
        let aspectMgr = this.container.get<IAdvisor>(AdvisorToken);
        let raiseContainer = ctx.getRaiseContainer() || this.container;
        matchs.forEach(d => {
            let metadata = getOwnTypeMetadata<ClassMetadata>(d, type);
            if (Array.isArray(metadata) && metadata.length > 0) {
                metadata.forEach(meta => {
                    if (isClass(meta.type)) {
                        aspectMgr.add(meta.type, raiseContainer);
                    }
                });
            }
        });
        next();
    }
}
