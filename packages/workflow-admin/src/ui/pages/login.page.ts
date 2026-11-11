import { Component, OnInit } from '@tsdi/components';
import { HttpClient } from '@tsdi/common/http';
import { Router } from '@tsdi/components/router';
import { firstValue } from '../http';

interface LoginConfig {
    enabled?: boolean;
    startOidcService?: boolean;
    local?: boolean;
    provider?: boolean;
    allowRegistration?: boolean;
    loginUrl?: string;
}

@Component({
    selector: 'workflow-admin-login',
    template: `
    <div class="wa-login">
        <form class="wa-login-card" (submit)="submit($event)">
            <h1>TSDI Workflow Admin</h1>
            <p>Sign in to manage workflow definitions.</p>
            <div class="wa-provider" *ngIf="config?.provider || config?.loginUrl">
                <button type="button" class="wa-primary" (click)="oauthLogin()">Continue with OAuth2 / OIDC</button>
                <div class="wa-divider">or</div>
            </div>
            <div *ngIf="config?.local">
                <label for="wa-username">Username</label>
                <input id="wa-username" name="username" [(ngModel)]="username" autocomplete="username" />
                <label for="wa-password">Password</label>
                <input id="wa-password" name="password" type="password" [(ngModel)]="password" autocomplete="current-password" />
                <button type="submit" class="wa-primary">Sign in</button>
                <button type="button" *ngIf="config?.allowRegistration" (click)="register()">Create local account</button>
            </div>
            <div class="wa-error">{{error}}</div>
        </form>
    </div>`
})
export class WorkflowAdminLoginPageComponent implements OnInit {
    config?: LoginConfig;
    username = '';
    password = '';
    error = '';

    constructor(private readonly http: HttpClient, private readonly router: Router) { }

    async onInit(): Promise<void> {
        try {
            this.config = await firstValue(this.http.get<LoginConfig>('/auth/config'));
        } catch {
            this.error = 'The authentication service is unavailable.';
            return;
        }
        if (!this.config?.enabled) {
            await this.router.navigateByUrl(this.redirectTarget());
        }
    }

    async oauthLogin(): Promise<void> {
        this.error = '';
        if (this.config?.loginUrl) {
            location.href = this.config.loginUrl;
            return;
        }
        try {
            const result = await firstValue(this.http.get<{ url?: string; error?: string }>('/auth/login'));
            if (!result?.url) {
                this.error = result?.error || 'OAuth2 login is unavailable.';
                return;
            }
            location.href = result.url;
        } catch {
            this.error = 'OAuth2 login is unavailable.';
        }
    }

    async submit(event: Event): Promise<void> {
        event.preventDefault();
        this.error = '';
        try {
            const result = await firstValue(this.http.post<any>('/auth/login', {
                username: this.username,
                password: this.password
            }, { withCredentials: true }));
            if (result?.authenticated === false) {
                this.error = result.error || 'Invalid username or password.';
                return;
            }
            await this.router.navigateByUrl(this.redirectTarget());
        } catch (error) {
            this.error = (error as any)?.error?.error || 'Invalid username or password.';
        }
    }

    async register(): Promise<void> {
        this.error = '';
        try {
            const result = await firstValue(this.http.post<any>('/auth/register', {
                username: this.username,
                password: this.password
            }, { withCredentials: true }));
            if (result?.authenticated === false) {
                this.error = result.error || 'Registration failed.';
                return;
            }
            await this.router.navigateByUrl(this.redirectTarget());
        } catch (error) {
            this.error = (error as any)?.error?.error || 'Registration failed.';
        }
    }

    private redirectTarget(): string {
        if (typeof location === 'undefined') {
            return '/';
        }
        const hashQuery = String(location.hash || '').split('?')[1] || '';
        const params = new URLSearchParams(hashQuery || location.search.slice(1));
        return params.get('redirect') || '/';
    }
}
