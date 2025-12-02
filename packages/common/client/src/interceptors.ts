// import { ArgumentException, composeInterceptors, Token } from '@tsdi/ioc';
// import { Protocols, RequestContext, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
// import { getInterceptorsToken } from './tokens';





// /**
//  * Creates an `RequestInterceptorFn` which lazily initializes an interceptor chain from the legacy
//  * class-based interceptors and runs the request through it.
//  */
// export function legacyInterceptorFnFactory(token: Token<RequestInterceptorLike[]>): RequestInterceptorFn {
//   let chain: RequestInterceptorFn<any> | null = null;

//   return (req, handler, context: RequestContext) => {
//     if (chain === null) {
//       // if(!protocol) throw new ArgumentException('no protocol for legacy interceptors');
//       const interceptors = context.get(token) ?? [];
//       // Note: interceptors are wrapped right-to-left so that final execution order is
//       // left-to-right. That is, if `interceptors` is the array `[a, b, c]`, we want to
//       // produce a chain that is conceptually `c(b(a(end)))`, which we build from the inside
//       // out.
//       chain = composeInterceptors(interceptors as any[]);
//     }

//     return chain(req, handler, context);
//     // const pendingTasks = inject(PendingTasks);
//     // const contributeToStability = inject(REQUESTS_CONTRIBUTE_TO_STABILITY);
//     // if (contributeToStability) {
//     //   const taskId = pendingTasks.add();
//     //   return chain(req, handler).pipe(finalize(() => pendingTasks.remove(taskId)));
//     // } else {
//     //   return chain(req, handler);
//     // }
//   };
// }

