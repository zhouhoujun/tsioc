import { IocAction, IocActionContext } from './Action';

export class IocGetCacheAction extends IocAction {
    execute(ctx: IocActionContext, next: () => void): void {
        if (!ctx.target) {
            return;
        } else {
            next();
        }
    }
}
