import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

@Directive({ selector: 'http-request' })
export class HttpRequestActivity extends Activity {
    @Attribute()
    url!: string;

    @Attribute()
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';

    @Attribute()
    headers?: Record<string, string>;

    @Attribute()
    body?: any;

    @Attribute()
    timeout: number = 30000;

    @Attribute()
    responseType: 'json' | 'text' | 'blob' | 'arraybuffer' = 'json';

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.url) {
            return {
                success: false,
                error: new Error('URL is required')
            };
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(this.url, {
                method: this.method,
                headers: this.headers,
                body: this.body ? JSON.stringify(this.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            let data: any;
            if (this.responseType === 'text') {
                data = await response.text();
            } else if (this.responseType === 'blob') {
                data = await response.blob();
            } else if (this.responseType === 'arraybuffer') {
                data = await response.arrayBuffer();
            } else {
                data = await response.json();
            }

            return {
                success: response.ok,
                data: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    body: data
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
