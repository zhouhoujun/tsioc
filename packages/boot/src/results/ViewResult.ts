import { Abstract } from '@tsdi/ioc';
import { HttpContext } from '../context';
import { ResultValue } from './ResultValue';

@Abstract()
export abstract class ViewRenderer {
    abstract render(ctx: HttpContext, name: string, model?: any): any;
}

/**
 * controller method return result type of view.
 * context type 'text/html'
 *
 * @export
 * @class ViewResult
 */
export class ViewResult extends ResultValue {
    constructor(private name: string, private model?: object) {
        super('text/html');
    }

    async sendValue(ctx: HttpContext) {
        const renderer = ctx.injector.get(ViewRenderer);
        if (!renderer) {
            return Promise.reject('view engin middleware no configed!');
        } else {
            ctx.type = this.contentType;
            return await renderer.render(ctx, this.name, this.model);
        }
    }
}
