import { IocExt } from '../../decorators';
import { RegisterActionContext, IocAutorunAction, Singleton } from '@ts-ioc/ioc';

@Singleton
export class IocExtRegisterAction extends IocAutorunAction {
    constructor() {
        super()
    }
    execute(ctx: RegisterActionContext, next: () => void): void {
        this.runAuto(ctx, IocExt);
        next()
    }

}
