import { ResultValue } from '@tsdi/core';
import { RestfulRequestContext } from '@tsdi/endpoints';
export declare abstract class ViewRenderer {
    abstract render(ctx: RestfulRequestContext, name: string, model?: any): any;
}
/**
 * controller method return result type of view.
 * context type 'text/html'
 *
 * @export
 * @class ViewResult
 */
export declare class ViewResult extends ResultValue {
    private name;
    private model?;
    constructor(name: string, model?: object | undefined);
    sendValue(ctx: RestfulRequestContext): Promise<any>;
}
