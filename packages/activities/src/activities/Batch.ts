import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface BatchActivityContext extends ActivityContext {
    batchResults?: any[];
}

@Component({ selector: 'batch' })
export class BatchActivity extends Activity {

    @Attribute()
    items: any[] = [];

    @Attribute()
    body!: Activity;

    @Attribute()
    batchSize: number = 10;

    @Attribute()
    continueOnError: boolean = false;

    @Attribute()
    delayBetweenBatches: number = 0;

    async execute(context: BatchActivityContext): Promise<ActivityResult> {
        if (!this.items || this.items.length === 0) {
            return {
                success: true,
                data: { processed: 0, batches: 0 }
            };
        }

        if (!this.body) {
            return {
                success: false,
                error: new Error('BatchActivity requires a body activity')
            };
        }

        const batches = this.createBatches();
        const results: any[] = [];
        const errors: Error[] = [];
        let processedCount = 0;

        context.batchResults = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            try {
                const batchContext: BatchActivityContext = {
                    ...context,
                    batchResults: results
                };

                for (const item of batch) {
                    const result = await this.body.execute({
                        ...batchContext,
                        currentItem: item,
                        currentIndex: this.items.indexOf(item)
                    });
                    
                    results.push(result);
                    processedCount++;

                    if (!result.success && !this.continueOnError) {
                        return {
                            success: false,
                            error: result.error,
                            data: {
                                processed: processedCount,
                                batches: i + 1,
                                results,
                                failedBatch: i,
                                failedItem: item
                            }
                        };
                    }
                }

                if (this.delayBetweenBatches > 0 && i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
                }
            } catch (error) {
                errors.push(error as Error);
                
                if (!this.continueOnError) {
                    return {
                        success: false,
                        error: error as Error,
                        data: {
                            processed: processedCount,
                            batches: i + 1,
                            results,
                            errors
                        }
                    };
                }
            }
        }

        context.batchResults = results;

        return {
            success: errors.length === 0,
            data: {
                processed: processedCount,
                batches: batches.length,
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    private createBatches(): any[][] {
        const batches: any[][] = [];
        for (let i = 0; i < this.items.length; i += this.batchSize) {
            batches.push(this.items.slice(i, i + this.batchSize));
        }
        return batches;
    }
}

@Component({ selector: 'merge' })
export class MergeActivity extends Activity {

    @Attribute()
    sources: any[] = [];

    @Attribute()
    strategy: 'object' | 'array' | 'concat' = 'object';

    @Attribute()
    deep: boolean = false;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            let result: any;

            switch (this.strategy) {
                case 'object':
                    result = this.mergeObjects();
                    break;
                case 'array':
                    result = this.mergeArrays();
                    break;
                case 'concat':
                    result = this.concatAll();
                    break;
                default:
                    result = this.mergeObjects();
            }

            return {
                success: true,
                data: {
                    merged: result,
                    sourceCount: this.sources.length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    private mergeObjects(): any {
        if (this.deep) {
            return this.sources.reduce((acc, src) => this.deepMerge(acc, src), {});
        }
        return Object.assign({}, ...this.sources);
    }

    private deepMerge(target: any, source: any): any {
        const output = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }
        
        return output;
    }

    private mergeArrays(): any[] {
        return this.sources.flat();
    }

    private concatAll(): any {
        if (this.sources.every(s => typeof s === 'string')) {
            return this.sources.join('');
        }
        if (this.sources.every(s => Array.isArray(s))) {
            return this.sources.flat();
        }
        return this.sources;
    }
}

@Component({ selector: 'split' })
export class SplitActivity extends Activity {

    @Attribute()
    input!: string | any[];

    @Attribute()
    delimiter: string = ',';

    @Attribute()
    chunkSize?: number;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        try {
            let result: any[];

            if (typeof this.input === 'string') {
                result = this.input.split(this.delimiter);
            } else if (Array.isArray(this.input)) {
                if (this.chunkSize) {
                    result = [];
                    for (let i = 0; i < this.input.length; i += this.chunkSize) {
                        result.push(this.input.slice(i, i + this.chunkSize));
                    }
                } else {
                    result = this.input;
                }
            } else {
                throw new Error('Input must be a string or array');
            }

            return {
                success: true,
                data: {
                    parts: result,
                    count: result.length
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