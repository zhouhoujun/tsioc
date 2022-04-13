import { Abstract } from '@tsdi/ioc';
import { ResultValue } from '@tsdi/core';
import { WritableHttpResponse } from '../response';

@Abstract()
export abstract class ViewRenderer {
    abstract render(ctx: WritableHttpResponse, name: string, model?: any): any;
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

    async sendValue(resp: WritableHttpResponse) {
        const renderer = resp.context.get(ViewRenderer);
        if (!renderer) {
            return Promise.reject('view engin middleware no configed!');
        } else {
            resp.contentType = this.contentType;
            return await renderer.render(resp, this.name, this.model);
        }
    }
}
