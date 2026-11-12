import{n as s}from"./chunk-P2CAQ4IW.js";import{a as e,na as a}from"./chunk-SPMG5PJO.js";import"./chunk-U6UJE3IR.js";var t=class{constructor(o){this.state=o}};Reflect.metadata("design:paramtypes",[s])(t);e(t,[[a({selector:"gateway-admin-routes",template:`
    <section class="ga-page ga-page-routes">
        <div class="ga-page-actions">
            <div class="ga-search">
                <span>\u2315</span>
                <input [value]="state.routeQuery" placeholder="{{state.t('routes.filter')}}"
                    @input="state.searchRoutes($event)" />
            </div>
            <div class="ga-actions">
                <button class="ga-btn ga-add-route" type="button" @click="state.addRoute">{{state.t('routes.add')}}</button>
                <button class="ga-btn ga-btn-primary ga-apply-routes" type="button" @click="state.applyRoutes">{{state.t('routes.apply')}}</button>
            </div>
        </div>

        <article class="ga-card ga-table-card">
            <table class="ga-route-table">
                <thead>
                    <tr>
                        <th>{{state.t('table.path')}}</th>
                        <th>{{state.t('table.service')}}</th>
                        <th>{{state.t('table.upstream')}}</th>
                        <th>{{state.t('table.methods')}}</th>
                        <th>{{state.t('table.status')}}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="ga-route-row" v-for="route in state.filteredRoutes">
                        <td><code>{{route.path}}</code></td>
                        <td>{{route.service || state.t('common.none')}}</td>
                        <td class="ga-cell-muted">{{route.targetUrl || route.targetPath || state.t('table.discovery')}}</td>
                        <td><span class="ga-pill">{{state.routeMethods(route) || state.t('common.any')}}</span></td>
                        <td>
                            <span class="ga-pill" [class]="route.enabled === false ? 'ga-pill is-off' : 'ga-pill is-on'">
                                {{route.enabled === false ? state.t('status.disabled') : state.t('status.enabled')}}
                            </span>
                        </td>
                        <td class="ga-cell-actions">
                            <button class="ga-link-btn" type="button" @click="state.editRoute(route)">{{state.t('action.edit')}}</button>
                            <button class="ga-link-btn is-danger" type="button" @click="state.removeRoute(route)">{{state.t('action.remove')}}</button>
                        </td>
                    </tr>
                    <tr v-if="!state.filteredRoutes.length">
                        <td colspan="6"><div class="ga-empty">{{state.t('routes.noneFiltered')}}</div></td>
                    </tr>
                </tbody>
            </table>
        </article>
    </section>`}),0]]);export{t as GatewayAdminRoutesPageComponent};
