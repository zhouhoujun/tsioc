import { RegisterActionContext, IocAutorunAction, Singleton, hasOwnClassMetadata } from '@ts-ioc/ioc';
import { IocExt } from '../decorators';

@Singleton
export class IocExtRegisterAction extends IocAutorunAction {
    execute(ctx: RegisterActionContext, next: () => void): void {
        this.runAuto(ctx, IocExt);
        next()
    }

}
