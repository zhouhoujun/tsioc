import { Abstract } from '@tsdi/ioc';

export interface ActivityContext {

}

export interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
}

@Abstract()
export abstract class Activity {

    abstract execute(context: ActivityContext): Promise<ActivityResult>;

    compensate?(context: ActivityContext): Promise<void>;

}
