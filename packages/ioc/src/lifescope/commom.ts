import { Context, HandlerFn, InterceptorFn } from '../handler';
import { getClass } from '../metadata/refl';
import { RegContext } from './ctx';




export const initReflectInterceptor: InterceptorFn<RegContext, void> = (input: RegContext, next: HandlerFn, context: Context) => {
    if (!input.class) {
        input.class = getClass(input.type)
    }
    const singleton = input.class.getAnnotation().singleton;
    if (singleton) {
        input.singleton = singleton;
    }
    return next(input, context)
}