import { isClass, ITypeReflects } from '@tsdi/ioc';
import { Handle, HandleType, IHandleContext } from './Handle';
import { Handles } from './Handles';


/**
 * build context.
 *
 * @export
 * @interface IBuildContext
 * @extends {IHandleContext}
 */
export interface IBuildContext extends IHandleContext {
    /**
     * types reflect
     *
     * @type {TypeReflects}
     * @memberof IBuildContext
     */
    reflects?: ITypeReflects;
}

/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IBuildContext = IBuildContext> extends Handle<T> {

}

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IBuildContext = IBuildContext> extends Handles<T> {

    protected registerHandle(handleType: HandleType<T>): this {
        if (isClass(handleType)) {
            this.actInjector.regAction(handleType);
        }
        return this;
    }
}
