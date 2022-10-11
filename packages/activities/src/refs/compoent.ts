import { Abstract } from '@tsdi/ioc';
import { Runner } from '@tsdi/core';
import { ComponentRef, ComponentState } from '@tsdi/components';
import { RunState } from './state';



@Abstract()
export abstract class ActivityRef<T = any> extends ComponentRef<T> {
    abstract get result(): any;

    abstract state: RunState;

    /**
     * runable interface.
     * @param context 
     * @returns 
     */
    @Runner()
    run() {
        const state = this.injector.get(ComponentState);
        if (state.componentTypes.indexOf(this.type) < 0) {
            state.componentTypes.push(this.type);
        }
        state.components.push(this);
        this.execute();
    }

    /**
     * execute activity.
     */
    abstract execute(): Promise<T>;

    /**
     * render the activity component.
     */
    abstract render(): void;

    abstract stop(): Promise<void>;

    abstract pause(): Promise<void>;
}


