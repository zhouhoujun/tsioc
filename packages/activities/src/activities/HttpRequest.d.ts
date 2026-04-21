import { Activity, ActivityContext, ActivityResult } from './Activity';
export declare class HttpRequestActivity extends Activity {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: any;
    timeout: number;
    responseType: 'json' | 'text' | 'blob' | 'arraybuffer';
    execute(context: ActivityContext): Promise<ActivityResult>;
}
