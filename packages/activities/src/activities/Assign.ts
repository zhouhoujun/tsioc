import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface AssignActivityContext extends ActivityContext {
    variables?: Record<string, any>;
}

@Component({ selector: 'assign' })
export class AssignActivity extends Activity {

    @Attribute()
    values: Record<string, any> = {};

    @Attribute()
    merge: boolean = false;

    @Attribute()
    overwrite: boolean = true;

    async execute(context: AssignActivityContext): Promise<ActivityResult> {
        try {
            const currentVars = context.variables || {};
            
            if (this.merge) {
                context.variables = this.overwrite 
                    ? { ...currentVars, ...this.values }
                    : { ...this.values, ...currentVars };
            } else {
                if (this.overwrite) {
                    context.variables = { ...this.values };
                } else {
                    context.variables = { ...this.values, ...currentVars };
                }
            }

            return {
                success: true,
                data: {
                    variables: context.variables,
                    assigned: Object.keys(this.values)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: { values: this.values }
            };
        }
    }
}