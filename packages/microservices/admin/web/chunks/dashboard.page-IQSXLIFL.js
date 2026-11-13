import{n as e}from"./chunk-4ZLLAW4Y.js";import{a as s,na as t}from"./chunk-SPMG5PJO.js";import"./chunk-U6UJE3IR.js";var a=class{constructor(c){this.state=c}};Reflect.metadata("design:paramtypes",[e])(a);s(a,[[t({selector:"gateway-admin-dashboard",template:`
    <section class="ga-page">
        <div class="ga-metrics">
            <article class="ga-metric">
                <span class="ga-metric-label">{{state.t('metric.routes')}}</span>
                <strong>{{state.routes.length}}</strong>
                <span class="ga-metric-foot">{{state.t('metric.enabled', { count: state.enabledRoutes })}}</span>
            </article>
            <article class="ga-metric">
                <span class="ga-metric-label">{{state.t('metric.services')}}</span>
                <strong>{{state.services.length}}</strong>
                <span class="ga-metric-foot">{{state.t('metric.discoveryTargets')}}</span>
            </article>
            <article class="ga-metric">
                <span class="ga-metric-label">{{state.t('metric.rules')}}</span>
                <strong>{{state.rules.length}}</strong>
                <span class="ga-metric-foot">{{state.t('metric.compiled')}}</span>
            </article>
            <article class="ga-metric">
                <span class="ga-metric-label">{{state.t('metric.runtime')}}</span>
                <strong class="ga-metric-ok">{{state.t('metric.healthy')}}</strong>
                <span class="ga-metric-foot">{{state.t('metric.localAdmin')}}</span>
            </article>
        </div>

        <div class="ga-dashboard-grid">
            <article class="ga-card">
                <div class="ga-card-head">
                    <div>
                        <h2>{{state.t('card.services')}}</h2>
                        <p>{{state.t('card.servicesDesc')}}</p>
                    </div>
                </div>
                <div class="ga-compact-list">
                    <div class="ga-compact-row ga-service-row" v-for="service in state.serviceSummaries">
                        <code>{{service.name}}</code>
                        <span class="ga-service-endpoints">{{state.endpointSummary(service.name) || state.t('card.noEndpoints')}}</span>
                        <span class="ga-pill is-on">{{service.enabled}}/{{service.routes}}</span>
                    </div>
                    <div class="ga-empty" v-if="!state.serviceSummaries.length">{{state.t('card.noServices')}}</div>
                </div>
            </article>

            <article class="ga-card">
                <div class="ga-card-head">
                    <div>
                        <h2>{{state.t('card.runtimeStatus')}}</h2>
                        <p>{{state.t('card.runtimeStatusDesc')}}</p>
                    </div>
                </div>
                <div class="ga-compact-list">
                    <div class="ga-compact-row ga-runtime-row">
                        <span>{{state.t('runtime.activeRequests')}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.diagnostics?.activeRequests ?? 0}}</span>
                    </div>
                    <div class="ga-compact-row ga-runtime-row">
                        <span>{{state.t('runtime.cacheEntries')}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.diagnostics?.cacheEntries ?? 0}}</span>
                    </div>
                    <div class="ga-compact-row ga-runtime-row">
                        <span>{{state.t('runtime.openCircuits')}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.openCircuitCount}}</span>
                    </div>
                </div>
            </article>

            <article class="ga-card">
                <div class="ga-card-head">
                    <div>
                        <h2>{{state.t('card.policies')}}</h2>
                        <p>{{state.t('card.policiesDesc')}}</p>
                    </div>
                </div>
                <div class="ga-compact-list">
                    <div class="ga-compact-row ga-policy-row" v-for="policy in state.policyRows">
                        <span>{{policy.label}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{policy.value}}</span>
                    </div>
                    <div class="ga-compact-row ga-policy-row">
                        <span>{{state.t('runtime.auth')}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.authModeLabel}}</span>
                    </div>
                    <div class="ga-compact-row ga-policy-row">
                        <span>{{state.t('runtime.dynamicRoutes')}}</span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.dynamicRoutes ? state.t('common.yes') : state.t('common.no')}}</span>
                    </div>
                </div>
            </article>
        </div>

        <div class="ga-dashboard-grid">
            <article class="ga-card">
                <div class="ga-card-head">
                    <div>
                        <h2>{{state.t('card.routeTable')}}</h2>
                        <p>{{state.t('card.routeTableDesc')}}</p>
                    </div>
                    <button class="ga-btn" type="button" @click="state.goRoutes">{{state.t('card.manageRoutes')}}</button>
                </div>
                <div class="ga-compact-list">
                    <div class="ga-compact-row" v-for="route in state.routes.slice(0, 6)">
                        <code>{{route.path}}</code>
                        <span>{{route.service || state.t('table.staticUpstream')}}</span>
                        <span class="ga-pill">{{state.routeMethods(route) || state.t('common.any')}}</span>
                    </div>
                    <div class="ga-empty" v-if="!state.routes.length">{{state.t('card.noRoutes')}}</div>
                </div>
            </article>

            <article class="ga-card">
                <div class="ga-card-head">
                    <div>
                        <h2>{{state.t('card.rules')}}</h2>
                        <p>{{state.t('card.rulesDesc')}}</p>
                    </div>
                    <button class="ga-btn" type="button" @click="state.goRules">{{state.t('card.manageRules')}}</button>
                </div>
                <div class="ga-compact-list">
                    <div class="ga-compact-row" v-for="rule in state.rules.slice(0, 6)">
                        <span [class]="state.ruleTone(rule)"></span>
                        <code>{{rule.name || rule.id}}</code>
                        <span class="ga-pill">{{state.ruleActionLabel(rule)}}</span>
                        <span class="ga-muted">{{state.t('card.conditions', { count: state.ruleConditionCount(rule) })}}</span>
                    </div>
                    <div class="ga-empty" v-if="!state.rules.length">{{state.t('card.noRules')}}</div>
                </div>
            </article>
        </div>
    </section>`}),0]]);export{a as GatewayAdminDashboardPageComponent};
