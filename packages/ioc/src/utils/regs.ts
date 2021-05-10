import { IContainer } from '../IContainer';
import { INVOKER } from './tk';
import { InvokerImpl } from '../actions/invoker';
import { DesignLifeScope } from '../actions/design';
import { RuntimeLifeScope } from '../actions/runtime';


/**
 * register core for container.
 *
 * @export
 * @param {IContainer} container
 */
export function registerCores(container: IContainer) {

    // container.setValue(CONTAINER, container);
    container.setValue(INVOKER, new InvokerImpl());

    // bing action.
    container.action().regAction(
        DesignLifeScope,
        RuntimeLifeScope
    );

}
