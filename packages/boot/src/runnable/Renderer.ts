import { Abstract } from '@tsdi/ioc';
import { Startup, IStartup } from './Startup';


/**
 * renderer interface. define the type as renderer.
 *
 * @export
 * @interface IRenderer
 * @template T
 * @template TCtx default BootContext
 */
export interface IRenderer<T = any> extends IStartup<T> {

    /**
     * render component instance.
     *
     * @param {*} [host]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    render(host?: any): Promise<void>;

}

/**
 * after on render init hooks.
 *
 * @export
 * @interface RendererInit
 */
export interface AfterRendererInit {
    /**
     * after on render init hooks.
     *
     * @returns {(void | Promise<void>)}
     */
    afterRenderInit(): void | Promise<void>;
}


/**
 * renderer for composite.
 *
 * @export
 * @class Boot
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Renderer<T = any> extends Startup<T> implements IRenderer<T> {

    async startup() {
        let host = this.context.getOptions().renderHost;
        if (host) {
            await this.render(host);
        }
    }


    /**
     * render component instance.
     *
     * @param {*} [host]
     * @returns {Promise<any>}
     */
    abstract render(host?: any): Promise<void>;

}

/**
 * target is Renderer or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Renderer}
 */
export function isRenderer(target: any): target is Renderer {
    if (target instanceof Renderer) {
        return true;
    }
    return false;
}

