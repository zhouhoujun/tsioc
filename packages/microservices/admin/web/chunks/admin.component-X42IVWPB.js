import{a as R,c as w,d as T,e as k,f as S,k as d,l as E,m as A,o as L,p as C,q as c}from"./chunk-DSHENEWA.js";import{$ as v,N as p,_ as m,ba as b,ka as f,q as g,v as h,va as y,w as o}from"./chunk-RZJZBS7C.js";import"./chunk-U6UJE3IR.js";var l=class{constructor(e){this.http=e}async list(){let e=await this.http.listRules();if(!e.ok)return[];let t=e.body;return Array.isArray(t)?t:Array.isArray(t?.items)?t.items:[]}async get(e){let t=await this.http.getRule(e);if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return t.body}}async save(e){let t=await this.http.saveRule(e);if(!t.ok)throw new Error(t.body?.message||t.body?.error||`Failed to apply gateway rules: HTTP ${t.status}`);return t.body?.summary??T(e)}async remove(e){let t=await this.http.removeRule(e);return t.ok||t.status===404}async clear(){let e=await this.list();await Promise.all(e.map(t=>this.remove(t.id)))}};var P={en:{"brand.name":"Gateway","brand.subtitle":"Microservice control","nav.overview":"Overview","nav.routes":"Routes","nav.rules":"Rules","sidebar.live":"Live gateway runtime","sidebar.sso":"SSO protected","sidebar.signOut":"Sign out","top.refresh":"Refresh","top.language":"Language","top.theme":"Theme","top.menu":"Menu","theme.light":"Light","theme.dark":"Dark","page.overview.title":"Overview","page.overview.subtitle":"Live operational view of the gateway runtime.","page.routes.title":"Routes","page.routes.subtitle":"Manage discovered and static gateway routes.","page.rules.title":"Rules","page.rules.subtitle":"Visual workflows compiled into gateway decisions.","metric.routes":"Routes","metric.enabled":"{count} enabled","metric.services":"Services","metric.discoveryTargets":"discovery targets","metric.rules":"Gateway rules","metric.compiled":"compiled from visual workflows","metric.runtime":"Runtime","metric.healthy":"Healthy","metric.localAdmin":"local/admin service","card.routeTable":"Route table","card.routeTableDesc":"Traffic is matched in table order.","card.manageRoutes":"Manage routes","card.noRoutes":"No routes configured.","card.rules":"Gateway rules","card.rulesDesc":"Evaluated before the route table.","card.manageRules":"Manage rules","card.noRules":"No rules configured.","card.conditions":"{count} condition(s)","routes.filter":"Filter by path, service or upstream","routes.add":"+ Add route","routes.apply":"Apply changes","table.path":"Path","table.service":"Service","table.upstream":"Upstream","table.discovery":"discovery","table.staticUpstream":"static upstream","table.methods":"Methods","table.status":"Status","table.actions":"Actions","status.enabled":"enabled","status.disabled":"disabled","action.edit":"Edit","action.remove":"Remove","routes.noneFiltered":"No routes match this filter.","common.any":"ANY","common.none":"\u2014","rules.title":"Gateway rules","rules.desc":"Rules are stored as visual workflow documents and compiled into the live gateway runtime.","rules.configure":"Configure rules","rules.compiled":"Compiled rule set","rules.count":"{count} rule(s) \xB7 evaluated by priority before routes.","rules.matchesEvery":"matches every request","rules.priority":"priority {value}","rules.empty":"No compiled rules yet. Open the visual designer to add conditions, route and deny actions.","rule.route":"route","rule.deny":"deny","editor.editTitle":"Edit route","editor.addTitle":"Add route","editor.desc":"Routes are matched in the order shown in the table.","editor.path":"Path","editor.service":"Service","editor.targetUrl":"Target URL","editor.targetPath":"Target path","editor.methods":"Methods","editor.timeout":"Timeout (ms)","editor.stripPrefix":"Strip inbound prefix","editor.enabled":"Route enabled","editor.cancel":"Cancel","editor.save":"Save route","designer.title":"Visual rule designer","designer.desc":"Conditions, route and deny actions compile to gateway rules. The designer is only opened while editing.","designer.cancel":"Cancel","designer.apply":"Apply rules","login.title":"Sign in to Gateway Admin","login.desc":"The gateway management API is protected. Use your organization account to continue.","login.button":"Sign in with SSO","status.loading":"Loading\u2026","status.ready":"Ready \xB7 {routes} route(s) \xB7 {rules} rule(s)","status.offline":"Offline","status.signInRequired":"Sign in required","status.routesApplied":"Routes applied \xB7 {count} route(s)","status.routeStaged":"Route staged \xB7 {count} route(s). Apply changes to publish.","status.routeRemoved":"Route removed locally \xB7 {count} route(s). Apply changes to publish.","status.rulesApplied":"Rules applied \xB7 {count} node(s)","error.routeRequired":"Route requires a path and either service or targetUrl.","error.applyRoutes":"Failed to apply routes: HTTP {status}","error.apiUnavailable":"Gateway admin API unavailable: HTTP {status}"},"zh-CN":{"brand.name":"\u7F51\u5173","brand.subtitle":"\u5FAE\u670D\u52A1\u63A7\u5236\u53F0","nav.overview":"\u6982\u89C8","nav.routes":"\u8DEF\u7531","nav.rules":"\u89C4\u5219","sidebar.live":"\u7F51\u5173\u8FD0\u884C\u65F6","sidebar.sso":"SSO \u5DF2\u4FDD\u62A4","sidebar.signOut":"\u9000\u51FA\u767B\u5F55","top.refresh":"\u5237\u65B0","top.language":"\u8BED\u8A00","top.theme":"\u4E3B\u9898","top.menu":"\u83DC\u5355","theme.light":"\u6D45\u8272","theme.dark":"\u6DF1\u8272","page.overview.title":"\u6982\u89C8","page.overview.subtitle":"\u7F51\u5173\u8FD0\u884C\u65F6\u5B9E\u65F6\u89C6\u56FE\u3002","page.routes.title":"\u8DEF\u7531","page.routes.subtitle":"\u7BA1\u7406\u670D\u52A1\u53D1\u73B0\u4E0E\u9759\u6001\u7F51\u5173\u8DEF\u7531\u3002","page.rules.title":"\u89C4\u5219","page.rules.subtitle":"\u5C06\u53EF\u89C6\u5316\u6D41\u7A0B\u7F16\u8BD1\u4E3A\u7F51\u5173\u51B3\u7B56\u3002","metric.routes":"\u8DEF\u7531","metric.enabled":"{count} \u4E2A\u542F\u7528","metric.services":"\u670D\u52A1","metric.discoveryTargets":"\u4E2A\u53D1\u73B0\u76EE\u6807","metric.rules":"\u7F51\u5173\u89C4\u5219","metric.compiled":"\u7531\u53EF\u89C6\u5316\u6D41\u7A0B\u7F16\u8BD1","metric.runtime":"\u8FD0\u884C\u65F6","metric.healthy":"\u5065\u5EB7","metric.localAdmin":"\u672C\u5730/\u7BA1\u7406\u670D\u52A1","card.routeTable":"\u8DEF\u7531\u8868","card.routeTableDesc":"\u6309\u8868\u683C\u987A\u5E8F\u5339\u914D\u6D41\u91CF\u3002","card.manageRoutes":"\u7BA1\u7406\u8DEF\u7531","card.noRoutes":"\u5C1A\u672A\u914D\u7F6E\u8DEF\u7531\u3002","card.rules":"\u7F51\u5173\u89C4\u5219","card.rulesDesc":"\u5728\u8DEF\u7531\u8868\u4E4B\u524D\u6267\u884C\u3002","card.manageRules":"\u7BA1\u7406\u89C4\u5219","card.noRules":"\u5C1A\u672A\u914D\u7F6E\u89C4\u5219\u3002","card.conditions":"{count} \u4E2A\u6761\u4EF6","routes.filter":"\u6309\u8DEF\u5F84\u3001\u670D\u52A1\u6216\u4E0A\u6E38\u8FC7\u6EE4","routes.add":"+ \u6DFB\u52A0\u8DEF\u7531","routes.apply":"\u5E94\u7528\u66F4\u6539","table.path":"\u8DEF\u5F84","table.service":"\u670D\u52A1","table.upstream":"\u4E0A\u6E38","table.discovery":"\u670D\u52A1\u53D1\u73B0","table.staticUpstream":"\u9759\u6001\u4E0A\u6E38","table.methods":"\u65B9\u6CD5","table.status":"\u72B6\u6001","table.actions":"\u64CD\u4F5C","status.enabled":"\u542F\u7528","status.disabled":"\u505C\u7528","action.edit":"\u7F16\u8F91","action.remove":"\u5220\u9664","routes.noneFiltered":"\u6CA1\u6709\u7B26\u5408\u8FC7\u6EE4\u6761\u4EF6\u7684\u8DEF\u7531\u3002","common.any":"\u4EFB\u610F","common.none":"\u2014","rules.title":"\u7F51\u5173\u89C4\u5219","rules.desc":"\u89C4\u5219\u4EE5\u53EF\u89C6\u5316\u6D41\u7A0B\u6587\u6863\u5B58\u50A8\uFF0C\u5E76\u7F16\u8BD1\u5230\u8FD0\u884C\u4E2D\u7684\u7F51\u5173\u3002","rules.configure":"\u914D\u7F6E\u89C4\u5219","rules.compiled":"\u5DF2\u7F16\u8BD1\u89C4\u5219","rules.count":"{count} \u6761\u89C4\u5219 \xB7 \u6309\u4F18\u5148\u7EA7\u5728\u8DEF\u7531\u524D\u6267\u884C\u3002","rules.matchesEvery":"\u5339\u914D\u6240\u6709\u8BF7\u6C42","rules.priority":"\u4F18\u5148\u7EA7 {value}","rules.empty":"\u5C1A\u65E0\u7F16\u8BD1\u89C4\u5219\u3002\u6253\u5F00\u53EF\u89C6\u5316\u8BBE\u8BA1\u5668\u6DFB\u52A0\u6761\u4EF6\u3001\u8DEF\u7531\u548C\u62D2\u7EDD\u52A8\u4F5C\u3002","rule.route":"\u8DEF\u7531","rule.deny":"\u62D2\u7EDD","editor.editTitle":"\u7F16\u8F91\u8DEF\u7531","editor.addTitle":"\u6DFB\u52A0\u8DEF\u7531","editor.desc":"\u8DEF\u7531\u6309\u8868\u683C\u4E2D\u7684\u987A\u5E8F\u5339\u914D\u3002","editor.path":"\u8DEF\u5F84","editor.service":"\u670D\u52A1","editor.targetUrl":"\u4E0A\u6E38\u5730\u5740","editor.targetPath":"\u4E0A\u6E38\u8DEF\u5F84","editor.methods":"\u65B9\u6CD5","editor.timeout":"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09","editor.stripPrefix":"\u53BB\u6389\u5165\u53E3\u524D\u7F00","editor.enabled":"\u542F\u7528\u8DEF\u7531","editor.cancel":"\u53D6\u6D88","editor.save":"\u4FDD\u5B58\u8DEF\u7531","designer.title":"\u53EF\u89C6\u5316\u89C4\u5219\u8BBE\u8BA1\u5668","designer.desc":"\u6761\u4EF6\u3001\u8DEF\u7531\u4E0E\u62D2\u7EDD\u52A8\u4F5C\u4F1A\u7F16\u8BD1\u4E3A\u7F51\u5173\u89C4\u5219\u3002\u4EC5\u5728\u7F16\u8F91\u65F6\u6253\u5F00\u8BBE\u8BA1\u5668\u3002","designer.cancel":"\u53D6\u6D88","designer.apply":"\u5E94\u7528\u89C4\u5219","login.title":"\u767B\u5F55\u7F51\u5173\u7BA1\u7406\u53F0","login.desc":"\u7F51\u5173\u7BA1\u7406 API \u5DF2\u542F\u7528\u4FDD\u62A4\uFF0C\u8BF7\u4F7F\u7528\u7EC4\u7EC7\u8D26\u53F7\u7EE7\u7EED\u3002","login.button":"\u4F7F\u7528 SSO \u767B\u5F55","status.loading":"\u52A0\u8F7D\u4E2D\u2026","status.ready":"\u5C31\u7EEA \xB7 {routes} \u6761\u8DEF\u7531 \xB7 {rules} \u6761\u89C4\u5219","status.offline":"\u79BB\u7EBF","status.signInRequired":"\u9700\u8981\u767B\u5F55","status.routesApplied":"\u8DEF\u7531\u5DF2\u5E94\u7528 \xB7 {count} \u6761","status.routeStaged":"\u8DEF\u7531\u5DF2\u6682\u5B58 \xB7 {count} \u6761\u3002\u5E94\u7528\u66F4\u6539\u540E\u53D1\u5E03\u3002","status.routeRemoved":"\u8DEF\u7531\u5DF2\u672C\u5730\u5220\u9664 \xB7 {count} \u6761\u3002\u5E94\u7528\u66F4\u6539\u540E\u53D1\u5E03\u3002","status.rulesApplied":"\u89C4\u5219\u5DF2\u5E94\u7528 \xB7 {count} \u4E2A\u8282\u70B9","error.routeRequired":"\u8DEF\u7531\u9700\u8981\u8DEF\u5F84\uFF0C\u4EE5\u53CA service \u6216 targetUrl\u3002","error.applyRoutes":"\u5E94\u7528\u8DEF\u7531\u5931\u8D25\uFF1AHTTP {status}","error.apiUnavailable":"\u7F51\u5173\u7BA1\u7406 API \u4E0D\u53EF\u7528\uFF1AHTTP {status}"}};function N(u,e,t){let s=P[u]?.[e]??P.en[e]??e;return t?s.replace(/\{(\w+)\}/g,(a,r)=>String(t[r]??`{${r}}`)):s}var O=["run","resume","cancel","toggle-logs","save","open-library","clear","menu"],n=class{constructor(e,t,s,a){this.documentRef=t,this.router=s,this.http=a,this.page="dashboard",this.routes=[],this.services=[],this.rules=[],this.status="",this.locale="en",this.theme="light",this.error="",this.routeQuery="",this.routeEditorOpen=!1,this.editingRoute={},this.editingIndex=-1,this.designerOpen=!1,this.designerHiddenActions=O,this.authEnabled=!1,this.needsLogin=!1,this.loaded=!1,this.globalMenuSelect=i=>{if(i==="language:en"||i==="language:zh-CN"){this.setLocale(i.slice(9));return}(i==="theme:light"||i==="theme:dark")&&this.setTheme(i.slice(6))},this.store=new l(this.http);try{t&&(t[m]=!0)}catch{}y(t),this.registry=C(new w);let r=new k({registry:this.registry,definition:c("zh-CN")});this.designer=e?b(r,e):r}onInit(){this.selfRef=this;try{let e=this.storage()?.getItem("tsdi-gateway-admin-locale");e==="zh-CN"||e==="en"?this.locale=e:String(globalThis.navigator?.language||"").toLowerCase().startsWith("zh")&&(this.locale="zh-CN");let t=this.storage()?.getItem("tsdi-gateway-admin-theme");(t==="dark"||t==="light")&&(this.theme=t)}catch{}this.status=this.t("status.loading"),this.applyTheme()}async onAfterViewInit(){if(this.loaded)return;this.loaded=!0,this.applyTheme();let e=this.documentRef?.defaultView;e?.location&&(this.page=d(e.location.hash)),this.router&&(this.routerSub=this.router.events.subscribe(t=>this.handleRouterEvent(t)),e?.addEventListener&&(this.hashHandler=()=>this.handleHashChange(),e.addEventListener("hashchange",this.hashHandler)),await this.router.navigateByUrl(`/${this.page}`)),await this.reload()}onDestroy(){let e=this.documentRef?.defaultView;e?.removeEventListener&&this.hashHandler&&e.removeEventListener("hashchange",this.hashHandler),this.hashHandler=void 0,this.routerSub?.unsubscribe(),this.routerSub=void 0}t(e,t){return N(this.locale,e,t)}storage(){try{return this.documentRef?.defaultView?.localStorage??globalThis.localStorage}catch{return}}applyTheme(){let e=this.documentRef??globalThis.document;e?.documentElement&&e.documentElement.setAttribute("data-theme",this.theme)}get globalMenuGroups(){let e=this.globalMenuCache;if(e&&e.locale===this.locale&&e.theme===this.theme)return e.groups;let t=[{items:[{id:"menu:language",label:this.t("top.language"),icon:"\u{1F310}",children:[{id:"language:en",label:"English",checked:this.locale==="en"},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.locale==="zh-CN"}]},{id:"menu:theme",label:this.t("top.theme"),icon:"\u25D0",children:[{id:"theme:light",label:this.t("theme.light"),checked:this.theme==="light"},{id:"theme:dark",label:this.t("theme.dark"),checked:this.theme==="dark"}]}]}];return this.globalMenuCache={locale:this.locale,theme:this.theme,groups:t},t}setLocale(e){let t=this.self();if(t.locale!==e){t.locale=e,t.globalMenuCache=void 0;try{t.storage()?.setItem("tsdi-gateway-admin-locale",e),(t.documentRef??globalThis.document)?.documentElement?.setAttribute("lang",e)}catch{}t.loaded&&t.reload()}}setTheme(e){let t=this.self();t.theme=e==="dark"?"dark":"light",t.applyTheme(),t.globalMenuCache=void 0;try{t.storage()?.setItem("tsdi-gateway-admin-theme",t.theme)}catch{}}self(){return this.selfRef??this}get pageTitle(){switch(this.page){case"routes":return this.t("page.routes.title");case"rules":return this.t("page.rules.title");default:return this.t("page.overview.title")}}get pageSubtitle(){switch(this.page){case"routes":return this.t("page.routes.subtitle");case"rules":return this.t("page.rules.subtitle");default:return this.t("page.overview.subtitle")}}get enabledRoutes(){return this.routes.filter(e=>e.enabled!==!1).length}get filteredRoutes(){let e=String(this.routeQuery||"").trim().toLowerCase();return e?this.routes.filter(t=>[t.path,t.service,t.targetUrl,t.targetPath].some(s=>String(s||"").toLowerCase().includes(e))):this.routes}get dashboardNavClass(){return`ga-nav-item${this.page==="dashboard"?" is-active":""}`}get routesNavClass(){return`ga-nav-item${this.page==="routes"?" is-active":""}`}get rulesNavClass(){return`ga-nav-item${this.page==="rules"?" is-active":""}`}goDashboard(){this.navigate("dashboard")}goRoutes(){this.navigate("routes")}goRules(){this.navigate("rules")}navigate(e){let t=this.self();if(t.needsLogin){t.redirectToLogin();return}if(t.router){t.router.navigateByUrl(`/${e}`);return}t.page=e}handleHashChange(){let e=this.self();if(e.needsLogin){e.redirectToLogin();return}let t=e.documentRef?.defaultView,s=d(t?.location?.hash);s!==e.page&&(e.router?e.router.navigateByUrl(`/${s}`):e.page=s)}handleRouterEvent(e){let t=this.self();if(e.type!=="NavigationEnd"||!e.snapshot)return;let s=this.router?.data?.page||e.snapshot.data?.page;s&&(t.page=s);let a=t.documentRef?.defaultView;try{let r=E(t.page);a?.history?.replaceState&&a.location?.hash!==r&&a.history.replaceState(null,"",r)}catch{}}redirectToLogin(){let e=this.documentRef?.defaultView??globalThis.window;A(e)}searchRoutes(e){this.self().routeQuery=e.target.value}conditionSummary(e){let t=e?.when??[];return t.length?t.map(s=>[s.field,s.name?`(${s.name})`:"",s.operator||"equals",s.value??""].filter(Boolean).join(" ")).join(" \xB7 "):this.t("rules.matchesEvery")}routeMethods(e){return(e.methods??[]).join(", ")}ruleActionType(e){return e?.action?.type||"route"}ruleActionLabel(e){return this.t(this.ruleActionType(e)==="deny"?"rule.deny":"rule.route")}ruleTone(e){return e?.action?.type==="deny"?"ga-status-dot is-danger":"ga-status-dot"}rulePriority(e){return e?.priority??0}ruleConditionCount(e){return e?.when?.length||0}async reload(){let e=this.self();e.error="";try{let t=await fetch("/api/gateway-admin/state");if(t.status===401){e.requireLogin();return}if(!t.ok)throw new Error(this.t("error.apiUnavailable",{status:t.status}));let s=await t.json();e.authEnabled=s.auth?.enabled===!0,e.needsLogin=!1,e.routes=(s.routes??[]).map(a=>({...a})),e.services=s.services??[],e.rules=s.rules??[],e.status=e.t("status.ready",{routes:e.routes.length,rules:e.rules.length})}catch(t){e.status=e.t("status.offline"),e.error=t.message}}requireLogin(){let e=this.self();e.needsLogin=!0,e.authEnabled=!0,e.status=e.t("status.signInRequired"),e.redirectToLogin()}async fetchState(){if(!this.http)throw new Error("Gateway admin HTTP client is unavailable");let e=await this.http.state();if(e.status===401)return this.requireLogin(),{};if(!e.ok)throw new Error(this.t("error.apiUnavailable",{status:e.status}));return e.body}addRoute(){let e=this.self();e.editingIndex=-1,e.editingRoute={path:"/api/new",service:"my-service",stripPrefix:!0,enabled:!0},e.routeEditorOpen=!0}editRoute(e){let t=this.self();t.editingIndex=t.routes.indexOf(e),t.editingRoute={...e},t.routeEditorOpen=!0}closeRouteEditor(){let e=this.self();e.routeEditorOpen=!1,e.editingRoute={},e.editingIndex=-1}editRouteField(e){let t=this.self(),s=e.target,a=s.getAttribute("data-field")||"";if(!a)return;let r=s.checked;a!=="stripPrefix"&&a!=="enabled"&&(r=s.value),a==="timeout"&&(r=s.value?Number(s.value):void 0),a==="methods"&&(r=String(s.value||"").split(",").map(i=>i.trim().toUpperCase()).filter(Boolean)),t.editingRoute[a]=r,t.editingRoute={...t.editingRoute}}saveRouteEditor(){let e=this.self(),t=e.editingRoute;if(!t.path||!t.service&&!t.targetUrl){e.error=e.t("error.routeRequired");return}if(e.error="",e.editingIndex>=0){let s=e.routes.slice();s[e.editingIndex]={...t},e.routes=s}else e.routes=[...e.routes,{...t}];e.closeRouteEditor(),e.status=e.t("status.routeStaged",{count:e.routes.length})}removeRoute(e){let t=this.self();t.routes=t.routes.filter(s=>s!==e),t.status=t.t("status.routeRemoved",{count:t.routes.length})}async applyRoutes(){let e=this.self();e.error="";try{if(!e.http)throw new Error("Gateway admin HTTP client is unavailable");let t=await e.http.updateRoutes(e.routes);if(t.status===401){e.requireLogin();return}if(!t.ok)throw new Error(e.t("error.applyRoutes",{status:t.status}));let s=t.body;e.routes=(s.routes??[]).map(a=>({...a})),e.services=s.services??[],e.status=e.t("status.routesApplied",{count:e.routes.length})}catch(t){e.error=t.message}}async editRules(){let e=this.self();e.error="",await e.loadRuleDocument(),e.designerOpen=!0}async loadRuleDocument(){let e=this.self(),t=await e.store.list().catch(()=>[]),s;t.length&&(s=await e.store.get(t[0].id)),e.designer.load(s??c("zh-CN"))}closeDesigner(){this.self().designerOpen=!1}async applyRules(){let e=this.self();e.error="";try{let t=await e.store.save(e.designer.definition);e.designerOpen=!1,e.status=e.t("status.rulesApplied",{count:t.nodeCount});let s=await e.fetchState();e.rules=s.rules??[],e.services=s.services??[]}catch(t){e.error=t.message}}};Reflect.metadata("design:paramtypes",[v,Object,R,L])(n);g(n,[[o(),3,void 0,3],[o(),3,void 0,2],[h(p),3,void 0,1],[o(),3,void 0,1],[o(),3,void 0,0],[f({selector:"gateway-admin",imports:[S],template:`
    <div class="ga-shell">
        <aside class="ga-sidebar">
            <div class="ga-brand">
                <div class="ga-brand-mark">TS</div>
                <div>
                    {{t('brand.name')}}
                    {{t('brand.subtitle')}}
                </div>
            </div>
            <nav class="ga-nav">
                <button class="ga-nav-item" [class]="dashboardNavClass" type="button" @click="goDashboard">
                    <span class="ga-nav-icon">\u25EB</span>{{t('nav.overview')}}
                </button>
                <button class="ga-nav-item" [class]="routesNavClass" type="button" @click="goRoutes">
                    <span class="ga-nav-icon">\u21C4</span>{{t('nav.routes')}}
                </button>
                <button class="ga-nav-item" [class]="rulesNavClass" type="button" @click="goRules">
                    <span class="ga-nav-icon">\u2442</span>{{t('nav.rules')}}
                </button>
            </nav>
            <div class="ga-sidebar-foot">
                <span class="ga-env-dot"></span>
                <span>{{authEnabled ? t('sidebar.sso') : t('sidebar.live')}}</span>
                <a v-if="authEnabled" class="ga-signout" href="/admin/auth/logout">{{t('sidebar.signOut')}}</a>
            </div>
        </aside>

        <main class="ga-main">
            <header class="ga-topbar">
                <div class="ga-topbar-title">
                    <h1>{{pageTitle}}</h1>
                    <span>{{pageSubtitle}}</span>
                </div>
                <div class="ga-topbar-right">
                    <span class="ga-status">{{status}}</span>
                    <span class="ga-error" v-if="error">{{error}}</span>
                    <menu-bar class="ga-global-menu" icon="\u2630" label="" caret="\u25BE"
                        :triggerTitle="t('top.menu')" :groups="globalMenuGroups"
                        :selectAction="globalMenuSelect"></menu-bar>
                    <button class="ga-btn" type="button" @click="reload">{{t('top.refresh')}}</button>
                </div>
            </header>

            <div class="ga-content">
                <section class="ga-login" v-if="needsLogin">
                    <div class="ga-login-card">
                        <div class="ga-login-mark">TS</div>
                        <h2>{{t('login.title')}}</h2>
                        <p>{{t('login.desc')}}</p>
                        <a class="ga-btn ga-btn-primary" href="/admin/auth/login?redirect=/admin/">{{t('login.button')}}</a>
                    </div>
                </section>

                <section class="ga-page" v-if="!needsLogin && page === 'dashboard'">
                    <div class="ga-metrics">
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.routes')}}</span>
                            <strong>{{routes.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.enabled', { count: enabledRoutes })}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.services')}}</span>
                            <strong>{{services.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.discoveryTargets')}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.rules')}}</span>
                            <strong>{{rules.length}}</strong>
                            <span class="ga-metric-foot">{{t('metric.compiled')}}</span>
                        </article>
                        <article class="ga-metric">
                            <span class="ga-metric-label">{{t('metric.runtime')}}</span>
                            <strong class="ga-metric-ok">{{t('metric.healthy')}}</strong>
                            <span class="ga-metric-foot">{{t('metric.localAdmin')}}</span>
                        </article>
                    </div>

                    <div class="ga-dashboard-grid">
                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>{{t('card.routeTable')}}</h2>
                                    <p>{{t('card.routeTableDesc')}}</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRoutes">{{t('card.manageRoutes')}}</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="route in routes.slice(0, 6)">
                                    <code>{{route.path}}</code>
                                    <span>{{route.service || t('table.staticUpstream')}}</span>
                                    <span class="ga-pill">{{routeMethods(route) || t('common.any')}}</span>
                                </div>
                                <div class="ga-empty" v-if="!routes.length">{{t('card.noRoutes')}}</div>
                            </div>
                        </article>

                        <article class="ga-card">
                            <div class="ga-card-head">
                                <div>
                                    <h2>{{t('card.rules')}}</h2>
                                    <p>{{t('card.rulesDesc')}}</p>
                                </div>
                                <button class="ga-btn" type="button" @click="goRules">{{t('card.manageRules')}}</button>
                            </div>
                            <div class="ga-compact-list">
                                <div class="ga-compact-row" v-for="rule in rules.slice(0, 6)">
                                    <span class="ga-status-dot" [class]="ruleTone(rule)"></span>
                                    <code>{{rule.name || rule.id}}</code>
                                    <span class="ga-pill">{{ruleActionLabel(rule)}}</span>
                                    <span class="ga-muted">{{t('card.conditions', { count: ruleConditionCount(rule) })}}</span>
                                </div>
                                <div class="ga-empty" v-if="!rules.length">{{t('card.noRules')}}</div>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="ga-page ga-page-routes" v-if="!needsLogin && page === 'routes'">
                    <div class="ga-page-actions">
                        <div class="ga-search">
                            <span>\u2315</span>
                            <input [value]="routeQuery" placeholder="{{t('routes.filter')}}"
                                @input="searchRoutes($event)" />
                        </div>
                        <div class="ga-actions">
                            <button class="ga-btn ga-add-route" type="button" @click="addRoute">{{t('routes.add')}}</button>
                            <button class="ga-btn ga-btn-primary ga-apply-routes" type="button" @click="applyRoutes">{{t('routes.apply')}}</button>
                        </div>
                    </div>

                    <article class="ga-card ga-table-card">
                        <table class="ga-route-table">
                            <thead>
                                <tr>
                                    <th>{{t('table.path')}}</th>
                                    <th>{{t('table.service')}}</th>
                                    <th>{{t('table.upstream')}}</th>
                                    <th>{{t('table.methods')}}</th>
                                    <th>{{t('table.status')}}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="ga-route-row" v-for="route in filteredRoutes">
                                    <td><code>{{route.path}}</code></td>
                                    <td>{{route.service || t('common.none')}}</td>
                                    <td class="ga-cell-muted">{{route.targetUrl || route.targetPath || t('table.discovery')}}</td>
                                    <td><span class="ga-pill">{{routeMethods(route) || t('common.any')}}</span></td>
                                    <td>
                                        <span class="ga-pill" [class]="route.enabled === false ? 'ga-pill is-off' : 'ga-pill is-on'">
                                            {{route.enabled === false ? t('status.disabled') : t('status.enabled')}}
                                        </span>
                                    </td>
                                    <td class="ga-cell-actions">
                                        <button class="ga-link-btn" type="button" @click="editRoute(route)">{{t('action.edit')}}</button>
                                        <button class="ga-link-btn is-danger" type="button" @click="removeRoute(route)">{{t('action.remove')}}</button>
                                    </td>
                                </tr>
                                <tr v-if="!filteredRoutes.length">
                                    <td colspan="6"><div class="ga-empty">{{t('routes.noneFiltered')}}</div></td>
                                </tr>
                            </tbody>
                        </table>
                    </article>
                </section>

                <section class="ga-page ga-page-rules" v-if="!needsLogin && page === 'rules'">
                    <div class="ga-page-actions">
                        <div>
                            <h2 class="ga-section-title">{{t('rules.title')}}</h2>
                            <p class="ga-muted">{{t('rules.desc')}}</p>
                        </div>
                        <button class="ga-btn ga-btn-primary ga-edit-rules" type="button" @click="editRules">{{t('rules.configure')}}</button>
                    </div>

                    <article class="ga-card">
                        <div class="ga-card-head">
                            <div>
                                <h2>{{t('rules.compiled')}}</h2>
                                <p>{{t('rules.count', { count: rules.length })}}</p>
                            </div>
                        </div>
                        <div class="ga-rule-list">
                            <div class="ga-rule-item" v-for="(rule, index) in rules">
                                <span class="ga-rule-index">{{index + 1}}</span>
                                <div class="ga-rule-main">
                                    <strong>{{rule.name || rule.id}}</strong>
                                    <span class="ga-muted">{{conditionSummary(rule)}}</span>
                                </div>
                                <span class="ga-pill" [class]="ruleActionType(rule) === 'deny' ? 'ga-pill is-danger' : 'ga-pill is-on'">{{ruleActionLabel(rule)}}</span>
                                <span class="ga-pill">{{t('rules.priority', { value: rulePriority(rule) })}}</span>
                            </div>
                            <div class="ga-empty" v-if="!rules.length">
                                {{t('rules.empty')}}
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </main>

        <div class="ga-modal" v-if="routeEditorOpen">
            <div class="ga-modal-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{editingIndex >= 0 ? t('editor.editTitle') : t('editor.addTitle')}}</h2>
                        <p>{{t('editor.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="closeRouteEditor">\u2715</button>
                </header>
                <div class="ga-form-grid">
                    <label class="ga-field">
                        <span>{{t('editor.path')}}</span>
                        <input data-field="path" [value]="editingRoute.path" placeholder="/api/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.service')}}</span>
                        <input data-field="service" [value]="editingRoute.service" placeholder="users-service"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.targetUrl')}}</span>
                        <input data-field="targetUrl" [value]="editingRoute.targetUrl" placeholder="http://127.0.0.1:3001"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.targetPath')}}</span>
                        <input data-field="targetPath" [value]="editingRoute.targetPath" placeholder="/users"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.methods')}}</span>
                        <input data-field="methods" [value]="routeMethods(editingRoute)" placeholder="GET, POST"
                            @input="editRouteField($event)" />
                    </label>
                    <label class="ga-field">
                        <span>{{t('editor.timeout')}}</span>
                        <input data-field="timeout" type="number" [value]="editingRoute.timeout"
                            @input="editRouteField($event)" />
                    </label>
                </div>
                <div class="ga-form-row">
                    <label class="ga-check">
                        <input type="checkbox" data-field="stripPrefix" [checked]="editingRoute.stripPrefix === true"
                            @change="editRouteField($event)" />
                        <span>{{t('editor.stripPrefix')}}</span>
                    </label>
                    <label class="ga-check">
                        <input type="checkbox" data-field="enabled" [checked]="editingRoute.enabled !== false"
                            @change="editRouteField($event)" />
                        <span>{{t('editor.enabled')}}</span>
                    </label>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="closeRouteEditor">{{t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-route-save" type="button" @click="saveRouteEditor">{{t('editor.save')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-designer-page" v-if="designerOpen">
            <header class="ga-designer-head">
                <div>
                    <h2>{{t('designer.title')}}</h2>
                    <p>{{t('designer.desc')}}</p>
                </div>
                <div class="ga-actions">
                    <button class="ga-btn ga-rules-cancel" type="button" @click="closeDesigner">{{t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-rules-apply" type="button" @click="applyRules">{{t('designer.apply')}}</button>
                </div>
            </header>
            <div class="ga-designer-body">
                <workflow-designer-preview
                    :designer="designer"
                    :registry="registry"
                    :locale="locale"
                    :theme="theme"
                    :hiddenActions="designerHiddenActions"
                    :showRunHistory="false"
                    :showRunLogs="false"
                    :showStatusbar="true"></workflow-designer-preview>
            </div>
        </div>
    </div>`}),0]]);export{n as GatewayAdminComponent};
