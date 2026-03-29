import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface ForEachActivityContext extends ActivityContext {
    items?: any[];
    currentIndex?: number;
    currentItem?: any;
}

@Directive({ selector: 'foreach' })
export class ForEachActivity extends Activity {

    @Attribute()
    items: any[] = [];

    @Attribute()
    body!: Activity;

    @Attribute()
    parallel: boolean = false;

    @Attribute()
    maxConcurrency: number = 5;

    @Attribute()
    continueOnError: boolean = false;

    async execute(context: ForEachActivityContext): Promise<ActivityResult> {
        if (!this.items || this.items.length === 0) {
            return {
                success: true,
                data: { processed: 0, results: [] }
            };
        }

        if (!this.body) {
            return {
                success: false,
                error: new Error('ForEachActivity requires a body activity')
            };
        }

        const results: ActivityResult[] = [];
        const errors: Error[] = [];

        if (this.parallel) {
            const batches = this.createBatches(this.items, this.maxConcurrency);
            
            for (const batch of batches) {
                const batchResults = await Promise.all(
                    batch.map(async (item, index) => {
                        const itemContext: ForEachActivityContext = {
                            ...context,
                            currentItem: item,
                            currentIndex: this.items.indexOf(item)
                        };
                        
                        try {
                            return await this.body.execute(itemContext);
                        } catch (error) {
                            return {
                                success: false,
                                error: error as Error,
                                data: { item, index: this.items.indexOf(item) }
                            };
                        }
                    })
                );

                results.push(...batchResults);

                if (!this.continueOnError) {
                    const failedResult = batchResults.find(r => !r.success);
                    if (failedResult) {
                        return {
                            success: false,
                            error: failedResult.error,
                            data: { processed: results.length, results, errors }
                        };
                    }
                }
            }
        } else {
            for (let i = 0; i < this.items.length; i++) {
                const itemContext: ForEachActivityContext = {
                    ...context,
                    currentItem: this.items[i],
                    currentIndex: i
                };

                try {
                    const result = await this.body.execute(itemContext);
                    results.push(result);

                    if (!result.success && !this.continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: { processed: i + 1, results, failedIndex: i }
                        };
                    }
                } catch (error) {
                    const errorResult: ActivityResult = {
                        success: false,
                        error: error as Error,
                        data: { item: this.items[i], index: i }
                    };
                    results.push(errorResult);
                    errors.push(error as Error);

                    if (!this.continueOnError) {
                        return {
                            success: false,
                            error: error as Error,
                            data: { processed: i + 1, results, failedIndex: i }
                        };
                    }
                }
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
            success: failCount === 0,
            data: {
                processed: results.length,
                successCount,
                failCount,
                results
            }
        };
    }

    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
}