import { Component } from '@tsdi/components';
import { Router } from '@tsdi/components/router';

@Component({
    selector: 'workflow-admin-not-found',
    template: `
    <div class="wa-not-found">
        <div class="wa-not-found-card">
            <div class="wa-not-found-code">404</div>
            <h1>Page not found</h1>
            <p>The page you requested does not exist in the workflow admin.</p>
            <div class="wa-not-found-actions">
                <button type="button" class="wa-primary" (click)="goHome()">Back to workflows</button>
                <button type="button" (click)="goLogin()">Sign in</button>
            </div>
        </div>
    </div>`
})
export class WorkflowAdminNotFoundPageComponent {
    constructor(private readonly router: Router) { }

    goHome(): void {
        void this.router.navigateByUrl('/');
    }

    goLogin(): void {
        void this.router.navigateByUrl('/login');
    }
}
