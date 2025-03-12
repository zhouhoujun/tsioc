import { Context, HandlerFn, InterceptorFn } from '../handler';
import { get } from '../metadata/refl';
import { RegContext } from './ctx';




export const initReflectInterceptor: InterceptorFn<RegContext, void> = (input: RegContext, next: HandlerFn, context: Context) => {
    if (!input.class) {
        input.class = get(input.type)
    }
    if (input.class.getAnnotation().singleton) {
        input.singleton = input.class.getAnnotation().singleton!;
    }
    return next(input, context)
}