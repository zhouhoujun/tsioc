import { Task } from '../decorators/Task';
import { Handle } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import { isClass, Type, hasClassMetadata, getOwnTypeMetadata, PromiseUtil } from '@tsdi/ioc';

/**
 *  activity type.
 */
export type ActivityType<T extends ActivityContext> = Type<Activity<T>> | Activity<T> | PromiseUtil.ActionHandle<T>;


/**
 * activity base.
 *
 * @export
 * @abstract
 * @class ActivityBase
 * @implements {IActivity}
 * @implements {OnActivityInit}
 */
export abstract class Activity<T extends ActivityContext> extends Handle<T> {

    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    name: string;

    protected async execActivity(ctx: T, ...acitivites: ActivityType<T>[]): Promise<void> {
        await this.execActions(ctx, acitivites);
    }
}

/**
 * is acitivty instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is Activity<any> {
    return target instanceof Activity;
}

/**
 * target is activity class.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<IActivity>}
 */
export function isAcitvityClass(target: any, ext?: (meta: ActivityMetadata) => boolean): target is Type<Activity<any>> {
    if (!isClass(target)) {
        return false;
    }
    if (hasClassMetadata(Task, target)) {
        if (ext) {
            return getOwnTypeMetadata<ActivityMetadata>(Task, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
