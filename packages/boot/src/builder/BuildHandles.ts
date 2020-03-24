import { isClass, ActionInjectorToken, Inject, IActionInjector, AsyncHandler } from '@tsdi/ioc';
import { Handle, HandleType } from '../handles/Handle';
import { Handles } from '../handles/Handles';
import { IBuildContext } from './IBuildContext';
import { IAnnoationContext } from '../AnnoationContext';


/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IAnnoationContext = IBuildContext> extends Handle<T> {
    constructor(@Inject(ActionInjectorToken) protected actInjector: IActionInjector) {
        super();
    }
}

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IAnnoationContext = IBuildContext> extends Handles<T> {
    constructor(@Inject(ActionInjectorToken) protected actInjector: IActionInjector) {
        super();
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        return this.actInjector.getAction<AsyncHandler<T>>(handleType);
    }

    protected registerHandle(handleType: HandleType<T>): this {
        if (isClass(handleType)) {
            this.actInjector.regAction(handleType);
        }
        return this;
    }
}
