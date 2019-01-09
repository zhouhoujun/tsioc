import { CleanActivity, TestActivity, IBuildActivity } from '@ts-ioc/build';
import { Registration, Type } from '@ts-ioc/core';
import { ServeActivity } from '../serves';
import { isAcitvityClass } from '@ts-ioc/activities';

/**
 * package activity.
 *
 * @export
 * @interface IPackActivity
 * @extends {IActivity}
 */
export interface IPackActivity extends IBuildActivity {
    /**
     * clean activity.
     *
     * @type {CleanActivity}
     * @memberof PackActivity
     */
    clean: CleanActivity;

    /**
     * test activity.
     *
     * @type {TestActivity}
     * @memberof PackActivity
     */
    test: TestActivity;

    /**
     * serve activity.
     *
     * @type {ServeActivity}
     * @memberof IPackActivity
     */
    serve: ServeActivity;
}


/**
 * inject package token.
 *
 * @export
 * @class InjectPackToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectPackToken<T extends IPackActivity> extends Registration<T> {
    constructor(desc: string) {
        super('PackActivity', desc);
    }
}

/**
 * pack build activity token
 */
export const PackToken = new InjectPackToken<IPackActivity>('');

/**
 * is Pack class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isPackClass(target: any): target is Type<IPackActivity> {
    return isAcitvityClass(target, meta => meta.decorType === 'Pack');
}
