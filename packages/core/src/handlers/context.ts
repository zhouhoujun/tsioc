import { AbstractType, ContextToken, DefaultInvocationContext, Injector, InvokeOptions, ResolveContext, ResolveInterceptorLike, getType, isBoolean } from '@tsdi/ioc';
import { getResolveHandlerToken, ParameterScope } from './resolver';

/**
 * handle context options.
 */
export interface HandleContextOpts extends InvokeOptions {
    bootstrap?: boolean;
}


// const BOOTSTRAP = new ContextToken<boolean>(() => false);

// export class RunableContext extends ResolveContext {

//     constructor(injector: Injector,
//         readonly target?: AbstractType,
//         bootstrap?: boolean,
//         failed?: (target: AbstractType, propertyKey: string) => void) {
//         super(injector, target, failed)
//         if(isBoolean(bootstrap)) this.set(BOOTSTRAP, bootstrap);
//     }

//     getBootstrap() {
//         return this.get(BOOTSTRAP);
//     }
// }


// /**
//  * invoke handle context.
//  */
// export class HandleContext extends DefaultInvocationContext {
//     readonly bootstrap: boolean;

//     constructor(
//         injector: Injector,
//         options: HandleContextOpts = {}) {
//         super(injector, options);
//         this.bootstrap = options.bootstrap === true;
//         this.setValue(getType(this), this);
//     }

//     private _execption: any;
//     /**
//      * execption.
//      */
//     get execption(): any {
//         return this._execption;
//     }

//     set execption(err: any) {
//         this._execption = err;
//         this.onException(err);
//     }

//     protected onException(err: any) { }

//     protected override getArgumentResolver(): ResolveInterceptorLike[] {
//         const res: ResolveInterceptorLike[] = [];
//         const defRels = this.playloadDefaultResolvers();
//         if (defRels?.length) {
//             res.push(...defRels);
//         }
//         if (this.request) {
//             const args = this.get(getResolveHandlerToken(this.request), null);
//             if (args?.length) {
//                 res.unshift(...args);
//             }
//         }
//         return res;
//     }

//     protected playloadDefaultResolvers(): ResolveInterceptorLike[] | null {
//         return null
//     }

//     protected override clear(): void {
//         super.clear();
//         this.execption = null
//     }

// }
