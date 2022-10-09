import { Abstract } from '@tsdi/ioc';
import { ElementRef } from '@tsdi/components';
import { RunState } from './state';



@Abstract()
export abstract class ActivityRef<T = any> extends ElementRef<T> {
    abstract get result(): any;

    abstract state: RunState;

    abstract run(data?: any): Promise<void>;

    abstract stop(): Promise<void>;

    abstract pause(): Promise<void>;
}


