import { Abstract } from '@tsdi/ioc';
import { ActivityContext } from './ActivityContext';

@Abstract()
export abstract class Activity<T = any> {
    static diCT = 'activity';
    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    abstract get name(): string;
    /**
     * execute activity.
     * @param ctx 
     */
    abstract execute(ctx: ActivityContext): Promise<T>;
}
