import { IActivity } from './IActivity';
import { Token } from '@ts-ioc/core';
import { IHandleActivity } from './IHandleActivity';
import { HandleConfigure } from './ActivityConfigure';

/**
 * chain activity.
 *
 * @export
 * @interface IChainActivity
 * @extends {IActivity}
 */
export interface IChainActivity extends IActivity {
    /**
     * use activies.
     *
     * @param {...IActivity[]} activities
     * @memberof IChainActivity
     */
    use(...activities: (IHandleActivity | Token<IHandleActivity> | HandleConfigure)[]): void;
}
