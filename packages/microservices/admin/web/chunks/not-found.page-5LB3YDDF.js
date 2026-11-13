import{n as e}from"./chunk-RKKWND3U.js";import{a,na as o}from"./chunk-FBKL2VCR.js";import"./chunk-U6UJE3IR.js";var t=class{constructor(s){this.state=s}};Reflect.metadata("design:paramtypes",[e])(t);a(t,[[o({selector:"gateway-admin-not-found",template:`
    <section class="ga-page ga-page-not-found">
        <article class="ga-card">
            <div class="ga-not-found">
                <div class="ga-not-found-code">404</div>
                <h2 class="ga-section-title">{{state.t('page.notFound.title')}}</h2>
                <p class="ga-muted">{{state.t('notFound.desc')}}</p>
                <button class="ga-btn ga-btn-primary" type="button" @click="state.goDashboard">{{state.t('notFound.back')}}</button>
            </div>
        </article>
    </section>`}),0]]);export{t as GatewayAdminNotFoundPageComponent};
