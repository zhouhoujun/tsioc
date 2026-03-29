import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type TransformFunction = (input: any, context: ActivityContext) => any;

export interface TransformActivityContext extends ActivityContext {
    input?: any;
}

@Directive({ selector: 'transform' })
export class TransformActivity extends Activity {

    @Attribute()
    transform!: TransformFunction | string;

    @Attribute()
    input?: any;

    @Attribute()
    outputKey?: string;

    @Attribute()
    chain: TransformFunction[] = [];

    async execute(context: TransformActivityContext): Promise<ActivityResult> {
        try {
            let data = this.input ?? context.input;

            if (typeof this.transform === 'function') {
                data = await this.transform(data, context);
            }

            for (const fn of this.chain) {
                data = await fn(data, context);
            }

            if (this.outputKey) {
                (context as any)[this.outputKey] = data;
            }

            return {
                success: true,
                data: {
                    input: this.input ?? context.input,
                    output: data,
                    transformed: true
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: { input: this.input }
            };
        }
    }
}

@Directive({ selector: 'map' })
export class MapActivity extends Activity {

    @Attribute()
    items: any[] = [];

    @Attribute()
    mapper!: (item: any, index: number) => any;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const results = await Promise.all(
                this.items.map(async (item, index) => {
                    return await this.mapper(item, index);
                })
            );

            return {
                success: true,
                data: { results, count: results.length }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }
}

@Directive({ selector: 'filter' })
export class FilterActivity extends Activity {

    @Attribute()
    items: any[] = [];

    @Attribute()
    predicate!: (item: any, index: number) => boolean;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const results = this.items.filter(this.predicate);

            return {
                success: true,
                data: { 
                    results, 
                    originalCount: this.items.length,
                    filteredCount: results.length 
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }
}

@Directive({ selector: 'reduce' })
export class ReduceActivity extends Activity {

    @Attribute()
    items: any[] = [];

    @Attribute()
    reducer!: (accumulator: any, currentValue: any, index: number) => any;

    @Attribute()
    initialValue?: any;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            const result = this.items.reduce(this.reducer, this.initialValue);

            return {
                success: true,
                data: { result, itemCount: this.items.length }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }
}