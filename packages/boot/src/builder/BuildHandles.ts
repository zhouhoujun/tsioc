import { isClass } from '@tsdi/ioc';
import { Handle, HandleType } from '../handles/Handle';
import { Handles } from '../handles/Handles';
import { IBuildContext } from './IBuildContext';


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
