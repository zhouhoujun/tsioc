import { Abstract, InjectReference, Token } from '@tsdi/ioc';
import { Startup, IStartup } from './Startup';
import { BootContext } from '../BootContext';


/**
 * renderer interface. define the type as renderer.
 *
 * @export
 * @interface IRenderer
 * @template T
 * @template TCtx default BootContext
 */
export interface IRenderer<T = any, TCtx extends BootContext = BootContext> extends IStartup<T, TCtx> {

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
export abstract class Renderer<T = any, TCtx extends BootContext = BootContext> extends Startup<T, TCtx> implements IRenderer<T, TCtx> {

    async startup() {
        let host = this.context.getOptions().renderHost;
        if (host) {
            await this.render(host);
        }
    }

    protected abstract async renderProcess(host: any): Promise<void>;

    /**
     * render component instance.
     *
     * @param {*} [host]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    async render(host?: any): Promise<void> {
        let node = this.getBoot() as T & AfterRendererInit;
        await this.renderProcess(host);
        if (node.afterRenderInit) {
            await node.afterRenderInit();
        }
    }

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


/**
 * module instance renderer token.
 *
 * @export
 * @class InjectRendererToken
 * @extends {Registration<Startup<T>>}
 * @template T
 */
export class InjectRendererToken<T> extends InjectReference<Startup<T>> {
    constructor(type: Token<T>) {
        super(Startup, type);
    }
}

