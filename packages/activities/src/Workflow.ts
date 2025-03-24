import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './activities/Activity';

export interface WorkflowDefinition {
    name: string;
    activities: Activity[];
    transitions: WorkflowTransition[];
    initialState: string;
    finalStates: string[];
}

export interface WorkflowTransition {
    from: string;
    to: string;
    condition?: (context: ActivityContext) => boolean;
}

export interface WorkflowState {
    name: string;
    activity: Activity;
}

@Injectable()
export class WorkflowInstance {
    private definition: WorkflowDefinition;
    private currentState: string;
    private context: ActivityContext;

    constructor(definition: WorkflowDefinition) {
        this.definition = definition;
        this.currentState = definition.initialState;
        this.context = {};
    }

    async start(initialContext: ActivityContext = {}): Promise<ActivityResult> {
        this.context = { ...initialContext };
        return this.executeState(this.currentState);
    }

    private async executeState(stateName: string): Promise<ActivityResult> {
        const activity = this.findActivityByState(stateName);
        if (!activity) {
            throw new Error(`No activity found for state: ${stateName}`);
        }

        try {
            const result = await activity.execute(this.context);
            
            if (result.success) {
                const nextState = this.getNextState(stateName);
                if (nextState && !this.definition.finalStates.includes(stateName)) {
                    this.currentState = nextState;
                    return this.executeState(nextState);
                }
            }

            return result;
        } catch (error) {
            await this.compensate();
            throw error;
        }
    }

    private async compensate(): Promise<void> {
        const executedActivities = this.getExecutedActivities();
        for (const activity of executedActivities.reverse()) {
            if (activity.compensate) {
                await activity.compensate(this.context);
            }
        }
    }

    private findActivityByState(stateName: string): Activity | undefined {
        return this.definition.activities.find(a => a.name === stateName);
    }

    private getNextState(currentState: string): string | undefined {
        const transition = this.definition.transitions.find(t => 
            t.from === currentState && 
            (!t.condition || t.condition(this.context))
        );
        return transition?.to;
    }

    private getExecutedActivities(): Activity[] {
        const activities: Activity[] = [];
        let state = this.definition.initialState;
        
        while (state && state !== this.currentState) {
            const activity = this.findActivityByState(state);
            if (activity) {
                activities.push(activity);
            }
            state = this.getNextState(state) as string;
        }

        return activities;
    }
} 