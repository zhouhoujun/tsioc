import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type EventHandler = (eventData: any, context: ActivityContext) => Promise<any> | any;

export interface EmitActivityContext extends ActivityContext {
    events?: Map<string, any[]>;
}

@Directive({ selector: 'emit' })
export class EmitActivity extends Activity {

    @Attribute()
    event!: string;

    @Attribute()
    data?: any;

    @Attribute()
    bubble: boolean = true;

    async execute(context: EmitActivityContext): Promise<ActivityResult> {
        try {
            const eventData = {
                type: this.event,
                data: this.data,
                timestamp: Date.now(),
                source: 'EmitActivity'
            };

            if (!context.events) {
                context.events = new Map();
            }

            if (!context.events.has(this.event)) {
                context.events.set(this.event, []);
            }

            context.events.get(this.event)!.push(eventData);

            return {
                success: true,
                data: {
                    emitted: true,
                    event: this.event,
                    eventData
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

@Directive({ selector: 'wait' })
export class WaitActivity extends Activity {

    @Attribute()
    event!: string;

    @Attribute()
    timeout?: number;

    @Attribute()
    handler?: EventHandler;

    private eventListeners: Map<string, (data: any) => void> = new Map();

    async execute(context: EmitActivityContext): Promise<ActivityResult> {
        return new Promise((resolve) => {
            let timeoutId: NodeJS.Timeout | null = null;
            let resolved = false;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                this.eventListeners.delete(this.event);
            };

            const resolveOnce = (result: ActivityResult) => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(result);
                }
            };

            if (this.timeout) {
                timeoutId = setTimeout(() => {
                    resolveOnce({
                        success: false,
                        error: new Error(`Timeout waiting for event: ${this.event}`),
                        data: { event: this.event, timedOut: true }
                    });
                }, this.timeout);
            }

            const checkEvent = async () => {
                if (context.events?.has(this.event)) {
                    const events = context.events.get(this.event)!;
                    if (events.length > 0) {
                        const eventData = events.shift()!;
                        
                        if (this.handler) {
                            try {
                                const handlerResult = await this.handler(eventData.data, context);
                                resolveOnce({
                                    success: true,
                                    data: { event: this.event, eventData, handlerResult }
                                });
                            } catch (error) {
                                resolveOnce({
                                    success: false,
                                    error: error as Error,
                                    data: { event: this.event, eventData }
                                });
                            }
                        } else {
                            resolveOnce({
                                success: true,
                                data: { event: this.event, eventData }
                            });
                        }
                    }
                }
            };

            this.eventListeners.set(this.event, async () => {
                await checkEvent();
            });

            checkEvent();
        });
    }

    async compensate(context: ActivityContext): Promise<void> {
        this.eventListeners.clear();
    }
}

@Directive({ selector: 'on' })
export class OnActivity extends Activity {

    @Attribute()
    event!: string;

    @Attribute()
    handler!: EventHandler;

    @Attribute()
    once: boolean = false;

    async execute(context: EmitActivityContext): Promise<ActivityResult> {
        if (!context.events) {
            context.events = new Map();
        }

        const wrappedHandler = async (data: any) => {
            return await this.handler(data, context);
        };

        context.events.set(this.event, context.events.get(this.event) || []);
        
        return {
            success: true,
            data: {
                registered: true,
                event: this.event,
                once: this.once
            }
        };
    }
}