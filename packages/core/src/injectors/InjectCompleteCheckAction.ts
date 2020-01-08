import { InjectActionContext } from './InjectActionContext';

export const InjectCompleteCheckAction = function (ctx: InjectActionContext, next: () => void): void {
    if (ctx.types.length > 0) {
        next();
    }
};
