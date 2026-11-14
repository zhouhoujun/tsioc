import { Component } from '@tsdi/components';
import { GatewayAdminState } from '../admin.state';

/** Wildcard (`**`) route page rendered for unknown admin URLs. */
@Component({
    selector: 'gateway-admin-not-found',
    template: `
    <section class="ga-page ga-page-not-found">
        <article class="ga-card">
            <div class="ga-not-found">
                <div class="ga-not-found-code">404</div>
                <h2 class="ga-section-title">{{state.t('page.notFound.title')}}</h2>
                <p class="ga-muted">{{state.t('notFound.desc')}}</p>
                <button class="ga-btn ga-btn-primary" type="button" @click="state.goDashboard"><icon name="arrow-up" size="xs" stroke-width="2"></icon>{{state.t('notFound.back')}}</button>
            </div>
        </article>
    </section>`
})
export class GatewayAdminNotFoundPageComponent {
    constructor(public readonly state: GatewayAdminState) { }
}
