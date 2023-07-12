import { Abstract } from '@tsdi/ioc';
import { AssetContext, ResultValue } from '@tsdi/core';

@Abstract()
export abstract class ViewRenderer {
    abstract render(ctx: AssetContext, name: string, model?: any): any;
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
        super('text/html')
    }

    async sendValue(ctx: AssetContext) {
        const renderer = ctx.get(ViewRenderer);
        if (!renderer) {
            return Promise.reject('view engin middleware no configed!')
        } else {
            ctx.contentType = this.contentType;
            return await renderer.render(ctx, this.name, this.model)
        }
    }
}