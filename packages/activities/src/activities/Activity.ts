import { Abstract, Injectable, Token } from '@tsdi/ioc';

export interface ActivityContext {
    [key: string]: any;
}

export interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
}

@Abstract()
export abstract class Activity<TContext extends ActivityContext = ActivityContext> {

    abstract execute(context: TContext): Promise<ActivityResult>;
    
    compensate?(context: ActivityContext): Promise<void>;
} 