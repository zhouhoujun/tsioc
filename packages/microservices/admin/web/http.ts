import { Injectable } from '@tsdi/ioc';
import { HttpClient } from '@tsdi/common/http';
import { lastValueFrom } from 'rxjs';

export interface AdminHttpResult<T = any> {
    ok: boolean;
    status: number;
    body?: T;
    error?: any;
}

/**
 * Thin typed wrapper around `@tsdi/common/http` for the admin API.
 *
 * Keeps URL/status/cookie handling in one place and lets the UI route guard
 * and rule store share the same HTTP backend.
 */
@Injectable()
export class GatewayAdminHttp {
    constructor(private http: HttpClient) { }

    state(): Promise<AdminHttpResult<any>> {
        return this.request('GET', '/api/gateway-admin/state');
    }

    updateRoutes(routes: any[]): Promise<AdminHttpResult<any>> {
        return this.request('PUT', '/api/gateway-admin/routes', { routes });
    }

    listRules(): Promise<AdminHttpResult<any>> {
        return this.request('GET', '/api/gateway-admin/rules');
    }

    getRule(id: string): Promise<AdminHttpResult<any>> {
        return this.request('GET', `/api/gateway-admin/rules/${encodeURIComponent(id)}`);
    }

    saveRule(definition: any): Promise<AdminHttpResult<any>> {
        return this.request('PUT', `/api/gateway-admin/rules/${encodeURIComponent(definition.id)}`, definition);
    }

    removeRule(id: string): Promise<AdminHttpResult<any>> {
        return this.request('DELETE', `/api/gateway-admin/rules/${encodeURIComponent(id)}`);
    }

    async request<T = any>(method: string, url: string, body?: any): Promise<AdminHttpResult<T>> {
        try {
            const response = await lastValueFrom(this.http.request(method as any, url, {
                body,
                observe: 'response',
                responseType: 'json',
                withCredentials: true
            } as any)) as any;
            return {
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
                body: response.body as T
            };
        } catch (error: any) {
            return {
                ok: false,
                status: Number(error?.status) || 0,
                body: error?.error,
                error
            };
        }
    }
}
