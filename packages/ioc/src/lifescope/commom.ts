// import { Context, HandlerFn, InterceptorFn } from '../handler';
// import { getClassRef } from '../metadata/refl';
// import { RegContext } from './ctx';




// export const initReflectInterceptor: InterceptorFn<RegContext, void> = (input: RegContext, next: HandlerFn, context: Context) => {
//     if (!input.classRef) {
//         input.classRef = getClassRef(input.type)
//     }
//     const singleton = input.classRef.getAnnotation().singleton;
//     if (singleton) {
//         input.singleton = singleton;
//     }
//     return next(input, context)
// }