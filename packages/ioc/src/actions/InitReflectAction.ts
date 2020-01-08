import { RegisterActionContext } from './RegisterActionContext';
import { isClass } from '../utils/lang';

export const InitReflectAction = function (ctx: RegisterActionContext, next?: () => void): void {
    if (!isClass(ctx.type)) {
        return;
    }
    ctx.reflects.create(ctx.type);
    let targetReflect = ctx.targetReflect;
    if (ctx.singleton) {
        targetReflect.singleton = ctx.singleton;
    }

    if (next) {
        return next();
    }
}

// /**
//  * init class reflect action.
//  *
//  * @export
//  * @class InitReflectAction
//  * @extends {IocRegisterAction}
//  */
// export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

//     execute(ctx: RegisterActionContext, next?: () => void): void {
//         if (!isClass(ctx.type)) {
//             return;
//         }
//         ctx.reflects.create(ctx.type);

//         let targetReflect = ctx.targetReflect;
//         if (ctx.singleton) {
//             targetReflect.singleton = ctx.singleton;
//         }

//         if (next) {
//             return next();
//         }
//     }
// }
