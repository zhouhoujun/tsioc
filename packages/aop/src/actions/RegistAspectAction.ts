import {
    ClassMetadata, getOwnTypeMetadata,
    isClass, IocRegisterAction, RegisterActionContext, DecoratorRegisterer, lang
} from '@ts-ioc/ioc';
import { IAdvisor, AdvisorToken } from '../IAdvisor';


/**
 * regist aspect action.
 *
 * @export
 * @class RegistAspectAction
 * @extends {IocRegisterAction}
 */
export class RegistAspectAction extends IocRegisterAction {

    execute(ctx: RegisterActionContext, next: () => void): void {
        let type = ctx.targetType;
        let decorReg = this.container.resolve(DecoratorRegisterer);
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
