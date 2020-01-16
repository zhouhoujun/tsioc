import { isClass, Type, Abstract, PromiseUtil } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from './ActivityMetadata';
import { WorkflowContext } from './WorkflowInstance';

@Abstract()
export abstract class Activity<T = any, TCtx extends ActivityContext = ActivityContext> {
    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    @Input() name: string;

    abstract execute(ctx: TCtx): Promise<T>;

    toAction<T extends WorkflowContext>(content: TCtx): PromiseUtil.ActionHandle<T> {
        return async (ctx: T, next) => {
            await this.execute(content);
        };
    }
}


/**
 * target is activity class.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<Activity>}
 */
export function isAcitvityClass(target: any, ext?: (meta: ActivityMetadata) => boolean): target is Type<Activity> {
    if (!isClass(target)) {
        return false;
    }
    let key = Task.toString();
    if (Reflect.hasOwnMetadata(key, target)) {
        if (ext) {
            return Reflect.getOwnMetadata(key, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
