import { IocActions } from './act';
import { IocContext, RegContext } from './ctx';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocActions<T>}
 */
export class LifeScope<T extends IocContext> extends IocActions<T> { }

/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocActions<T> {
    /**
     * register.
     * @param ctx reg context.
     * @param next next do sth.
     */
    register(ctx: T, next?: () => void) {
        this.handle(ctx, next)
    }
}


// export class LifeScope implements Handler {

//     private interceptors: InterceptorLike[];

//     private _chain?: InterceptorFn | null;
//     constructor(private backend: HandlerFn) {
//         this.interceptors = [];
//     }

//     handle(input: any, context?: any) {
//         if (!this._chain) {
//             this._chain = this.compose();
//         }
//         return this._chain(input, this.backend, context);
//     }

//     /**
//      * use interceptor for the handler.
//      * @param interceptor 
//      * @param order 
//      * @returns 
//      */
//     use(interceptors: InterceptorLike | InterceptorLike[], order?: number): this {
//         this.interceptors.push(...(Array.isArray(interceptors) ? interceptors : [interceptors]));
//         this.reset();
//         return this;
//     }

//     protected reset(): void {
//         this._chain = null;
//     }

//     /**
//      * compose iterceptors and filters in chain.
//      * @returns 
//      */
//     protected compose(): InterceptorFn {
//         return composeInterceptors(this.interceptors)
//     }

// }