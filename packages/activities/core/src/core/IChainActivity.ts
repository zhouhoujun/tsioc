import { IActivity } from './IActivity';

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
    use(...activities: IActivity[]): void;
}
