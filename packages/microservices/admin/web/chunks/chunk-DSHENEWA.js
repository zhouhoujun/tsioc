import{$ as Ko,A as Mo,B as Po,C as Ut,E as We,F as zo,G as Ce,H as xt,I as _o,J as jo,K as Zo,L as ie,M as Fo,N as ue,O as j,P as Wo,Q as qt,R as Jt,S as Bt,T as $o,U as Vo,V as Ho,W as Uo,X as qo,Y as Jo,Z as Bo,_ as fe,a as Ze,aa as z,b as To,ba as Kt,c as No,ca as Xo,d as Ao,da as pe,e as Fe,f as vt,g as Ft,h as Wt,ha as p,i as $t,ia as Ct,j as rt,ja as St,k as st,ka as T,l as Vt,m as Eo,n as Lo,na as Xt,o as Oo,p as P,pa as Go,q as h,qa as he,r as Ht,ra as $e,s as U,sa as Gt,t as q,ta as Yt,u as J,ua as Qt,v as O,va as Yo,w as S,wa as Qo,x as b,xa as er,y as Do,z as it}from"./chunk-RZJZBS7C.js";var eo=P("ROUTES"),to=P("ROUTER_INITIAL_URL");function Se(s){let o=String(s||"/").trim().split("#")[0].split("?")[0];return(o.startsWith("/")?o:`/${o}`).replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/"}function tr(s){let e=Se(s);return e==="/"?[]:e.slice(1).split("/").filter(Boolean)}function or(s,e){let t=(Array.isArray(s)?s:[s]).map(i=>String(i??"").trim()).filter(Boolean),o=Se(t.join("/")),r=Object.entries(e?.queryParams||{}).filter(([,i])=>i!=null).map(([i,n])=>`${encodeURIComponent(i)}=${encodeURIComponent(String(n))}`);return r.length&&(o+=`?${r.join("&")}`),e?.fragment&&(o+=`#${e.fragment}`),o}var Y=class{constructor(e=[],t="/",o){this.events=new Bo,this.routes=[],this._url="/",this._activeRoute=null,this._navigating=!1,this.injector=o,this.resetConfig(e),this._url=Se(t);let r=this.match(this.routes,tr(this._url));this._activeRoute=r?.snapshot||null}get url(){return this._url}get activeRoute(){return this._activeRoute}get activeLeaf(){return this.leafRoute()}get rootRoute(){return this._activeRoute}get params(){return this.leafRoute()?.params||{}}get data(){return this.leafRoute()?.data||{}}get navigating(){return this._navigating}resetConfig(e=[]){this.routes=Array.isArray(e)?e:[]}async navigate(e,t){return this.navigateByUrl(or(e,t),t)}async navigateByUrl(e,t){let o=Se(e),r=String(e||"/").trim(),i=r.startsWith("/")?r:`/${r}`,n=this._url;if(this._navigating)return!1;this._navigating=!0,this.events.emit({type:"NavigationStart",url:o,previousUrl:n});try{let a=await this.resolveUrl(o,0);if(!a)return this.events.emit({type:"NavigationCancel",url:o,previousUrl:n}),!1;let l=a.snapshot;return await this.resolveSnapshotLazy(l),this.events.emit({type:"RoutesRecognized",url:o,previousUrl:n,snapshot:l}),await this.runGuards(l)?(this._url=a.resolvedUrl||i,this._activeRoute=l,this.events.emit({type:"NavigationEnd",url:o,previousUrl:n,snapshot:l}),!0):(this.events.emit({type:"NavigationCancel",url:o,previousUrl:n,snapshot:l}),!1)}catch(a){return this.events.emit({type:"NavigationError",url:o,previousUrl:n,error:a}),!1}finally{this._navigating=!1}}isActive(e,t=!1){let o=Se(this._url),r=Se(e);return t?o===r:o===r||o.startsWith(`${r}/`)}async resolveSnapshotLazy(e){let t=e.route;if(!t.component&&t.loadComponent){let o=await t.loadComponent();t.component=typeof o=="function"?o:o?.component}for(let o of e.children)await this.resolveSnapshotLazy(o)}async resolveUrl(e,t){if(t>20)throw new Error("Router redirect loop detected");let o=this.match(this.routes,tr(e));if(!o)return;let r=o.snapshot.route;if(r.loadChildren&&!r.children?.length){let i=await r.loadChildren(),n=Array.isArray(i)?i:i?.routes;if(!Array.isArray(n))throw new Error(`Route '${r.path}' loadChildren must resolve to routes`);r.children=n;let a=await this.resolveUrl(e,t+1);return a?{consumed:o.consumed,redirectTo:a.redirectTo,resolvedUrl:a.resolvedUrl,snapshot:{...o.snapshot,children:[a.snapshot]}}:void 0}if(r.loadComponent&&!r.component){let i=await r.loadComponent(),n=typeof i=="function"?i:i?.component;if(r.component=n,!n)throw new Error(`Route '${r.path}' loadComponent did not resolve a component`)}if(o.redirectTo!==void 0){let i=or(o.redirectTo);this.events.emit({type:"NavigationStart",url:i,previousUrl:e});let n=await this.resolveUrl(i,t+1);return n&&(n.resolvedUrl=n.resolvedUrl||i),n}return o}match(e,t,o=""){for(let r of e){if(!r||typeof r.path!="string")continue;let i=r.path;if(i==="**"){let u=o||"/";return{consumed:t.length,snapshot:{url:u,path:"**",params:{},data:{...r.data||{}},route:r,children:[]}}}let n=i===""?[]:i.split("/").filter(Boolean);if(n.length>t.length)continue;let a={},l=!0;for(let u=0;u<n.length;u++){let c=n[u],m=t[u];if(c.startsWith(":"))a[c.slice(1)]=decodeURIComponent(m);else if(c!==m){l=!1;break}}if(!l)continue;let d=Se(`${o}/${n.map((u,c)=>u.startsWith(":")?t[c]:u).join("/")}`),f=t.slice(n.length);if(f.length&&!r.children?.length){if(r.loadChildren&&r.pathMatch!=="full")return{consumed:n.length,snapshot:{url:d,path:i,params:a,data:{...r.data||{}},route:r,children:[]}};continue}if(!(r.pathMatch==="full"&&f.length)){if(r.children?.length){let u=this.match(r.children,f,d);if(u)return{consumed:t.length,redirectTo:u.redirectTo,snapshot:{url:d,path:i,params:a,data:{...r.data||{}},route:r,children:[u.snapshot]}}}if(!(f.length&&r.pathMatch!=="full"))return{consumed:t.length,redirectTo:r.redirectTo,snapshot:{url:d,path:i,params:a,data:{...r.data||{}},route:r,children:[]}}}}}async runGuards(e){let t=e.route.canActivate||[];for(let o of t)if(!await this.invokeGuard(o,e))return!1;for(let o of e.children)if(!await this.runGuards(o))return!1;return!0}invokeGuard(e,t){return e&&typeof e.prototype?.canActivate=="function"?(this.injector?this.injector.get(e):new e).canActivate(t):e(t)}leafRoute(e=this._activeRoute){if(!e)return null;let t=e;for(;t.children.length;)t=t.children[t.children.length-1];return t}};Reflect.metadata("design:paramtypes",[Object,Object,q])(Y);h(Y,[[S(),3,void 0,2],[O(to),3,void 0,1],[S(),3,void 0,1],[O(eo),3,void 0,0],[S(),3,void 0,0],[b(),0]]);var me=class{constructor(e,t){this.viewContainer=e,this.router=t}onInit(){this.subscription=this.router.events.subscribe(e=>{e?.type==="NavigationEnd"&&this.activate()}),this.activate()}onDestroy(){this.subscription?.unsubscribe(),this.componentRef?.destroy(),this.componentRef=void 0,this.activeComponent=void 0,this.activeUrl=void 0}clearAnchor(){let e=this.viewContainer?.element?.nativeElement;if(!(!e||typeof e.removeChild!="function"))for(;e.firstChild;)e.removeChild(e.firstChild)}activate(){let e=this.router.activeLeaf,t=e?.route?.component,o=e?.url,r=this.viewContainer?.element?.nativeElement;if(!(t&&r?.getAttribute?.("data-route-url")===o)&&(t&&r?.setAttribute?r.setAttribute("data-route-url",String(o||"")):r?.removeAttribute&&r.removeAttribute("data-route-url"),!(t&&this.componentRef&&this.activeComponent===t&&this.activeUrl===o))){if(this.activeUrl=o,this.componentRef?.destroy(),this.componentRef=void 0,!t){this.activeComponent=void 0,this.clearAnchor(),this.viewContainer.clear();return}this.clearAnchor(),this.viewContainer.clear(),this.activeComponent=t,this.componentRef=this.viewContainer.createComponent(t,{injector:this.viewContainer.injector})}}};Reflect.metadata("design:paramtypes",[Xo,Y])(me);h(me,[[b(),0],[Ct({selector:"router-outlet, [routerOutlet]"}),0]]);var B=class{constructor(e,t){this.elementRef=e,this.router=t,this.commands="/",this.activeClass="",this.handleClick=o=>{o.defaultPrevented||o.button!==0||o.metaKey||o.ctrlKey||o.shiftKey||o.altKey||(o.preventDefault?.(),this.router.navigate(this.commands,this.extras))},this.elementRef?.nativeElement?.addEventListener?.("click",this.handleClick),this.subscription=t.events.subscribe(()=>this.syncActive())}set routerLink(e){this.commands=e??"/",this.syncHref(),this.syncActive()}get routerLink(){return this.commands}set routerLinkActive(e){this.activeClass=String(e||"").trim(),this.syncActive()}get routerLinkActive(){return this.activeClass}set queryParams(e){this.extras={...this.extras||{},queryParams:e}}set fragment(e){this.extras={...this.extras||{},fragment:e}}onDestroy(){this.subscription?.unsubscribe(),this.elementRef?.nativeElement?.removeEventListener?.("click",this.handleClick)}syncHref(){let e=this.elementRef?.nativeElement,t=Array.isArray(this.commands)?this.commands.join("/"):this.commands,o=String(t||"/").startsWith("/")?String(t||"/"):`/${t}`;e?.setAttribute?.("href",o)}syncActive(){if(!this.activeClass)return;let e=this.elementRef?.nativeElement,t=Array.isArray(this.commands)?this.commands.join("/"):this.commands;this.router.isActive(t)?e?.classList?.add?.(this.activeClass):e?.classList?.remove?.(this.activeClass)}};Reflect.metadata("design:paramtypes",[pe,Y])(B);Reflect.metadata("design:paramtypes",[Object])(B.prototype,"routerLink");Reflect.metadata("design:paramtypes",[String])(B.prototype,"routerLinkActive");Reflect.metadata("design:paramtypes",[Object])(B.prototype,"queryParams");Reflect.metadata("design:paramtypes",[Object])(B.prototype,"fragment");h(B,[[p(),1,"routerLink"],[p(),1,"routerLinkActive"],[p(),1,"queryParams"],[p(),1,"fragment"],[Ct({selector:"[routerLink]"}),0]]);var oo=class s{static forRoot(e=[],t="/"){return{module:s,providers:[{provide:eo,useValue:e},{provide:to,useValue:t}]}}static withRoutes(e=[],t="/"){return s.forRoot(e,t)}};h(oo,[[J({providers:[Y,me,B],declarations:[me,B],exports:[Y,me,B]}),0]]);var E=class{};h(E,[[U(),0]]);var Ve=P("I18N_OPTIONS"),Vr=P("I18N_LOCALE"),_i=P("I18N_TRANSLATIONS"),nt=P("TRANSLATION_LOADERS");var we=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(we);h(we,[[S(),3,void 0,0],[O(Ve),3,void 0,0],[b(),0]]);var Rt=class{format(e,t,o){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,o):this.interpolate(e,t)}interpolate(e,t){let o=e;return"#"in t&&(o=o.replace(/#/g,String(t["#"]))),o=o.replace(/\{(\w+)\}/g,(r,i)=>{if(i in t){let n=t[i];return String(n)}return r}),o}formatICU(e,t,o){let r=e,i=/\{(\w+),\s*(plural|select),\s*/g,n;for(;(n=i.exec(e))!==null;){let a=n.index,l=n[1],d=n[2],f=a+n[0].length,u=this.findMatchingBrace(e,a);if(u===-1)continue;let c=e.substring(f,u),m=e.substring(a,u+1),y=this.parseChoices(c);if(d==="plural"){let k=t[l];if(typeof k=="number"){let v=this.getPluralForm(k,o),x=y[v]||y.other||"",C=this.interpolate(x,{"#":k,...t});r=r.replace(m,C)}}else if(d==="select"){let k=t[l];if(k!==void 0){let v=y[String(k)]||y.other||"",x=this.interpolate(v,t);r=r.replace(m,x)}}}return this.interpolate(r,t)}findMatchingBrace(e,t){let o=1;for(let r=t+1;r<e.length;r++)if(e[r]==="{")o++;else if(e[r]==="}"&&(o--,o===0))return r;return-1}parseChoices(e){let t={},o=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,r;for(;(r=o.exec(e))!==null;){let i=r[1],n=r.index+r[0].length,a=this.findMatchingBrace(e,r.index+r[0].length-1);if(a!==-1){let l=e.substring(n,a);t[i]=l.trim()}}return t}getPluralForm(e,t){let o=t.split("-")[0];return o==="zh"||o==="ja"||o==="ko"?"other":o==="en"||o==="de"||o==="nl"?e===1?"one":"other":o==="ru"||o==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":o==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var Re=class extends E{constructor(e,t,o){super(),this.injector=e,this.options=t,this.localeService=o,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new Rt,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(nt,[]);for(let t of e){let o=await t.load(this.options.basePath,this.options.locales||[]);for(let r of o)this._translations.set(r.locale,r),this.localeService.registerBundle(r.locale,r)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,o){let r=typeof t=="string"?t:this._currentLocale,i=typeof t=="string"?o:t,n=this._translations.get(r);if(!n)return e;let a=this.getMessage(n,e);return a?this._formatter.format(a,i||{},r):e}getMessage(e,t){let o=t.split("."),r=e.messages;for(let i of o)if(r&&typeof r=="object"&&i in r)r=r[i];else return;return typeof r=="string"?r:void 0}has(e,t){let o=t||this._currentLocale,r=this._translations.get(o);return r?this.getMessage(r,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[q,Object,we])(Re);h(Re,[[O(),3,void 0,2],[S(),3,void 0,1],[O(Ve),3,void 0,1],[O(),3,void 0,0],[b(),0]]);var at=class{};h(at,[[U(),0]]);var Ie=class extends at{constructor(e){super(),this.fileAdapter=e}async load(e,t){let o=[];for(let r of t)try{let i=await this.loadLocale(e,r);o.push(i)}catch{}return o}async loadLocale(e,t){let o=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(o))throw new Error(`Translation file not found: ${o}`);let i=await this.fileAdapter.readJSON(o);return{locale:t,messages:i}}};Reflect.metadata("design:paramtypes",[Jo])(Ie);h(Ie,[[O(),3,void 0,0],[b(),0]]);var Te=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let o,r;return t.length>0&&(typeof t[0]=="object"?o=t[0]:typeof t[0]=="string"&&(r=t[0])),t.length>1&&typeof t[1]=="object"&&(o=t[1]),r?this.translator.translate(e,r,o||{}):this.translator.translate(e,o||{})}};Reflect.metadata("design:paramtypes",[E])(Te);h(Te,[[b(),0],[Po("translate"),0]]);var Hr=[we,Re,{provide:E,useClass:Re},Ie,{provide:nt,useClass:Ie,multi:!0},Te],He=class s{static withOptions(e){let t=[{provide:Ve,useValue:e}];return e.loader&&t.push({provide:nt,useClass:e.loader,multi:!0}),{module:s,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};h(He,[[J({providers:Hr,exports:[Te]}),0]]);var ro=class{format(e,t,o){return new Intl.NumberFormat(t,o).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,o){return this.format(e,t,{minimumFractionDigits:o,maximumFractionDigits:o})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};h(ro,[[b(),0]]);var so=class{format(e,t,o){let r=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,o).format(r)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};h(so,[[b(),0]]);var io=class{format(e,t,o,r){let i={style:"currency",...r};return o&&(i.currency=o),new Intl.NumberFormat(t,i).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};h(io,[[b(),0]]);var It=class{constructor(e){this.translator=e}intercept(e,t,o){let r=t.handle(e,o);return typeof r=="string"&&r.startsWith("i18n:")?this.translator.translate(r.substring(5)):r&&typeof r=="object"?this.translateObject(r):r}translateObject(e){if(Array.isArray(e))return e.map(o=>this.translateObject(o));let t={};for(let[o,r]of Object.entries(e))typeof r=="string"&&r.startsWith("i18n:")?t[o]=this.translator.translate(r.substring(5)):typeof r=="object"?t[o]=this.translateObject(r):t[o]=r;return t}};Reflect.metadata("design:paramtypes",[E])(It);h(It,[[b(),0]]);var Ur={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",logTitle:"Execution log",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",language:"Language",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},inject:{payload:"Payload"},trigger:{delay:"Delay (ms)",payload:"Payload"},function:{code:"Code",timeout:"Timeout (ms)"},template:{template:"Template",target:"Target field"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout (ms)"},command:{command:"Command",args:"Args",timeout:"Timeout (ms)"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Expected value"},loop:{iterations:"Iterations",delay:"Delay (ms)"},delay:{delay:"Delay (ms)"},log:{message:"Message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",logTitle:"\u6267\u884C\u65E5\u5FD7",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",language:"\u8BED\u8A00",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},inject:{payload:"\u6570\u636E"},trigger:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},template:{template:"\u6A21\u677F",target:"\u76EE\u6807\u5B57\u6BB5"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u671F\u671B\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},delay:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},log:{message:"\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},Ue=class{};h(Ue,[[J({imports:[He.withLocales(Ur,"zh-CN")],exports:[He]}),0]]);function R(s,e,t,o,r){if(!s)return o;try{if(s.has(t,e))return s.translate(t,e,r);let i=s.translate(t,e,r);if(i&&i!==t)return i}catch{}return o}function no(s,e,t,o="",r){return t?t.startsWith("workflow.")?R(s,e,t,o||t,r):t:o}var rr={trigger:{en:"Triggers",zh:"\u89E6\u53D1\u5668"},flow:{en:"Flow control",zh:"\u6D41\u7A0B\u63A7\u5236"},action:{en:"Actions",zh:"\u6267\u884C\u52A8\u4F5C"},data:{en:"Data",zh:"\u6570\u636E\u5904\u7406"},error:{en:"Error handling",zh:"\u5F02\u5E38\u5904\u7406"},advanced:{en:"Advanced",zh:"\u9AD8\u7EA7"}};function w(s,e,t,o){return{id:s,name:e,type:t,label:o}}function g(s){return{...s}}var qr=184,Jr=64;function $(s,e,t){return s==="zh-CN"&&t||e}var Br=[{type:"start",label:"Start",labelZh:"\u5F00\u59CB",description:"Entry point of the workflow",descriptionZh:"\u5DE5\u4F5C\u6D41\u5165\u53E3",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[w("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",labelZh:"\u7ED3\u675F",description:"Finish the workflow",descriptionZh:"\u7ED3\u675F\u5DE5\u4F5C\u6D41",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[w("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",labelZh:"\u6CE8\u5165",description:"Start with a fixed payload",descriptionZh:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[w("out","out","output","Payload")],fields:[g({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{}})],defaultConfig:{payload:{}}},{type:"task",label:"Task",labelZh:"\u4EFB\u52A1",description:"Run a named action or return a fixed result",descriptionZh:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"action",label:"Action",labelZh:"\u52A8\u4F5C",type:"text",placeholder:"actions.fetch",placeholderZh:"actions.fetch",description:"Function name in context.actions.",descriptionZh:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\u3002"}),g({key:"result",label:"Mock result",labelZh:"\u6A21\u62DF\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set.",descriptionZh:"\u672A\u914D\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u8BE5\u7ED3\u679C\u3002"}),g({key:"fail",label:"Fail this step",labelZh:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",type:"boolean",defaultValue:!1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),g({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Automatic retries before the step fails.",descriptionZh:"\u6B65\u9AA4\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002"}),g({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),g({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"function",label:"Function",labelZh:"\u51FD\u6570",description:"Run trusted JavaScript against the workflow context",descriptionZh:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"code",label:"Code",labelZh:"\u4EE3\u7801",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions.",descriptionZh:"\u53D7\u4FE1\u4EFB\u4EE3\u7801\u3002`context` \u662F\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\uFF0C`input` \u662F\u4E0A\u4E00\u6B65\u7ED3\u679C\u3002\u6309 Ctrl+Space \u83B7\u53D6\u4E0A\u4E0B\u6587\u548C\u53D8\u91CF\u63D0\u793A\u3002"}),g({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",labelZh:"\u6761\u4EF6",description:"Branch on a context field",descriptionZh:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("true","true","output","True"),w("false","false","output","False")],fields:[g({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.approved",description:"Path to the value to test.",descriptionZh:"\u8981\u5224\u65AD\u7684\u503C\u8DEF\u5F84\u3002"}),g({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),g({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",labelZh:"\u591A\u8DEF\u5206\u652F",description:"Route by a context value",descriptionZh:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Matched"),w("default","default","output","Default"),w("error","error","output","Error")],fields:[g({key:"field",label:"Value field",labelZh:"\u53D6\u503C\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.type",description:"Path to the value used for routing.",descriptionZh:"\u7528\u4E8E\u5206\u652F\u5224\u65AD\u7684\u53D6\u503C\u8DEF\u5F84\u3002"}),g({key:"value",label:"Expected value",labelZh:"\u671F\u671B\u503C",type:"text",required:!0,placeholder:"approved",description:"Routes to the matched output when the value is equal.",descriptionZh:"\u503C\u76F8\u7B49\u65F6\u8DEF\u7531\u5230 Matched \u8F93\u51FA\u3002"})],defaultConfig:{}},{type:"parallel",label:"Parallel",labelZh:"\u5E76\u884C",description:"Run all outgoing branches concurrently",descriptionZh:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",labelZh:"\u6C47\u805A",description:"Wait for all incoming branches before continuing",descriptionZh:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],defaultConfig:{}},{type:"loop",label:"Loop",labelZh:"\u5FAA\u73AF",description:"Repeat the node body",descriptionZh:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Done"),w("error","error","output","Error")],fields:[g({key:"iterations",label:"Iterations",labelZh:"\u8FED\u4EE3\u6B21\u6570",type:"number",defaultValue:1,min:1,max:1e4,step:1}),g({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Options",groupZh:"\u9009\u9879"})],defaultConfig:{iterations:1}},{type:"trigger",label:"Trigger",labelZh:"\u89E6\u53D1",description:"Emit a payload after an optional delay",descriptionZh:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100}),g({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'})],defaultConfig:{delay:0,payload:{}}},{type:"delay",label:"Delay",labelZh:"\u5EF6\u8FDF",description:"Wait before continuing",descriptionZh:"\u7B49\u5F85\u540E\u7EE7\u7EED",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:500,min:0,max:6e5,step:100,description:"Pause before continuing.",descriptionZh:"\u7EE7\u7EED\u6267\u884C\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002"})],defaultConfig:{delay:500}},{type:"log",label:"Log",labelZh:"\u65E5\u5FD7",description:"Record a message",descriptionZh:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Workflow step completed",required:!0,placeholder:"Workflow step completed",description:"Message written to the execution log.",descriptionZh:"\u5199\u5165\u6267\u884C\u65E5\u5FD7\u7684\u6D88\u606F\u3002"}),g({key:"level",label:"Level",labelZh:"\u7EA7\u522B",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"http-request",label:"HTTP request",labelZh:"HTTP \u8BF7\u6C42",description:"Call an HTTP endpoint",descriptionZh:"\u8C03\u7528 HTTP \u63A5\u53E3",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Response"),w("error","error","output","Error")],fields:[g({key:"url",label:"URL",labelZh:"\u5730\u5740",type:"text",required:!0,placeholder:"https://api.example.com",group:"Request",groupZh:"\u8BF7\u6C42",description:"Absolute endpoint or a path resolved by the host.",descriptionZh:"\u7EDD\u5BF9\u5730\u5740\u6216\u7531\u5BBF\u4E3B\u89E3\u6790\u7684\u8DEF\u5F84\u3002"}),g({key:"method",label:"Method",labelZh:"\u65B9\u6CD5",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(s=>({label:s,value:s})),group:"Request",groupZh:"\u8BF7\u6C42"}),g({key:"headers",label:"Headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request",groupZh:"\u8BF7\u6C42"}),g({key:"body",label:"Body",labelZh:"\u8BF7\u6C42\u4F53",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",groupZh:"\u8BF7\u6C42",visibleWhen:{key:"method",notEquals:"GET"}}),g({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),g({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),g({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",labelZh:"\u8D4B\u503C",description:"Merge values into workflow variables",descriptionZh:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"values",label:"Values",labelZh:"\u503C",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",labelZh:"\u8F6C\u6362",description:"Map the previous result",descriptionZh:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"mapping",label:"Mapping",labelZh:"\u6620\u5C04",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result.",descriptionZh:"\u5C06\u4E0A\u4E0B\u6587\u8DEF\u5F84\u6620\u5C04\u5230\u65B0\u7684\u7ED3\u679C\u3002"}),g({key:"result",label:"Fixed result",labelZh:"\u56FA\u5B9A\u7ED3\u679C",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",labelZh:"\u6A21\u677F",description:"Render a message template",descriptionZh:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"template",label:"Template",labelZh:"\u6A21\u677F",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",description:"Use {{path.to.value}} placeholders.",descriptionZh:"\u4F7F\u7528 {{path.to.value}} \u5360\u4F4D\u7B26\u3002"}),g({key:"target",label:"Target field",labelZh:"\u76EE\u6807\u5B57\u6BB5",type:"text",defaultValue:"message",placeholder:"message",description:"Context field that receives the rendered text.",descriptionZh:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u6587\u5B57\u6BB5\u3002"})],defaultConfig:{template:"{{value}}",target:"message"}},{type:"json",label:"JSON",labelZh:"JSON",description:"Parse or stringify JSON",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),g({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the value to parse or stringify.",descriptionZh:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u503C\u8DEF\u5F84\u3002"}),g({key:"pretty",label:"Pretty print",labelZh:"\u683C\u5F0F\u5316\u8F93\u51FA",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",labelZh:"CSV",description:"Parse or stringify CSV",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),g({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the CSV text or array.",descriptionZh:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u8DEF\u5F84\u3002"}),g({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns.",descriptionZh:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002"}),g({key:"header",label:"First row is header",labelZh:"\u9996\u884C\u4E3A\u8868\u5934",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",labelZh:"\u4FEE\u6539\u5C5E\u6027",description:"Set, delete or append a context field",descriptionZh:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"action",label:"Action",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"set",options:[{label:"Set",labelZh:"\u8BBE\u7F6E",value:"set"},{label:"Delete",labelZh:"\u5220\u9664",value:"delete"},{label:"Append",labelZh:"\u8FFD\u52A0",value:"append"}]}),g({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"variables.name",description:"Context path to modify.",descriptionZh:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"}),g({key:"value",label:"Value",labelZh:"\u503C",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append.",descriptionZh:"\u65B0\u503C\u6216\u8981\u8FFD\u52A0\u7684\u5185\u5BB9\u3002"})],defaultConfig:{action:"set"}},{type:"statistics",label:"Statistics",labelZh:"\u7EDF\u8BA1",description:"Aggregate an array (count/sum/avg/min/max)",descriptionZh:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Result")],fields:[g({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items",description:"Path to the array to aggregate.",descriptionZh:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"}),g({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",placeholder:"value",description:"Numeric property of each item.",descriptionZh:"\u6BCF\u4E2A\u5143\u7D20\u7684\u6570\u503C\u5C5E\u6027\u3002"}),g({key:"operation",label:"Operation",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"count",options:[{label:"Count",labelZh:"\u8BA1\u6570",value:"count"},{label:"Sum",labelZh:"\u6C42\u548C",value:"sum"},{label:"Average",labelZh:"\u5E73\u5747",value:"avg"},{label:"Min",labelZh:"\u6700\u5C0F",value:"min"},{label:"Max",labelZh:"\u6700\u5927",value:"max"}]}),g({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",labelZh:"\u5408\u5E76",description:"Merge objects or concatenate arrays",descriptionZh:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"fields",label:"Fields",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second",descriptionZh:"\u9017\u53F7\u5206\u9694\u7684\u8DEF\u5F84\uFF0C\u4F8B\u5982 first, second\u3002"}),g({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"object",options:[{label:"Object merge",labelZh:"\u5BF9\u8C61\u5408\u5E76",value:"object"},{label:"Array concat",labelZh:"\u6570\u7EC4\u62FC\u63A5",value:"array"}]}),g({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",labelZh:"\u53D1\u9001\u4E8B\u4EF6",description:"Emit an event through the workflow event bus",descriptionZh:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output")],fields:[g({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to publish.",descriptionZh:"\u8981\u53D1\u5E03\u7684\u4E8B\u4EF6\u540D\u3002"}),g({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload.",descriptionZh:"\u53EF\u9009\u7684\u4E8B\u4EF6\u6570\u636E\u3002"})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",labelZh:"\u7B49\u5F85\u4E8B\u4EF6",description:"Wait for a workflow event",descriptionZh:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Event"),w("error","error","output","Timeout")],fields:[g({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to wait for.",descriptionZh:"\u8981\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u3002"}),g({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:3e4,min:0,step:1e3,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Route to the timeout port after this delay.",descriptionZh:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",labelZh:"\u547D\u4EE4",description:"Run a host-provided command executor",descriptionZh:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"command",label:"Command",labelZh:"\u547D\u4EE4",type:"text",required:!0,placeholder:"context.exec"}),g({key:"args",label:"Args",labelZh:"\u53C2\u6570",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command.",descriptionZh:"\u4F20\u7ED9\u547D\u4EE4\u7684\u53C2\u6570\u6570\u7EC4\u3002"}),g({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"split",label:"Split",labelZh:"\u62C6\u5206",description:"Split a string or array into items",descriptionZh:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Items")],fields:[g({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"items",description:"Text or array to split.",descriptionZh:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u3002"}),g({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text.",descriptionZh:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002"})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",labelZh:"\u6620\u5C04",description:"Map each array item",descriptionZh:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Items")],fields:[g({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),g({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name",descriptionZh:"\u4F8B\u5982 value \u6216 user.name\u3002"})],defaultConfig:{}},{type:"filter",label:"Filter",labelZh:"\u8FC7\u6EE4",description:"Keep array items that match a condition",descriptionZh:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Items")],fields:[g({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),g({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:""}),g({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),g({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",labelZh:"\u6392\u5E8F",description:"Sort an array by a field",descriptionZh:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Items")],fields:[g({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),g({key:"path",label:"Sort path",labelZh:"\u6392\u5E8F\u8DEF\u5F84",type:"text",placeholder:"value",description:"Property of each item used for ordering.",descriptionZh:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002"}),g({key:"order",label:"Order",labelZh:"\u987A\u5E8F",type:"select",defaultValue:"asc",options:[{label:"Ascending",labelZh:"\u5347\u5E8F",value:"asc"},{label:"Descending",labelZh:"\u964D\u5E8F",value:"desc"}]})],defaultConfig:{order:"asc"}},{type:"range",label:"Range",labelZh:"\u533A\u95F4",description:"Generate a numeric range",descriptionZh:"\u751F\u6210\u6570\u503C\u533A\u95F4",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Items")],fields:[g({key:"from",label:"From",labelZh:"\u8D77\u59CB",type:"number",defaultValue:0}),g({key:"to",label:"To",labelZh:"\u7ED3\u675F",type:"number",defaultValue:10}),g({key:"step",label:"Step",labelZh:"\u6B65\u957F",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",labelZh:"\u6279\u5904\u7406",description:"Split an array into chunks",descriptionZh:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Batches")],fields:[g({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),g({key:"size",label:"Batch size",labelZh:"\u6279\u5927\u5C0F",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch.",descriptionZh:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002"})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",labelZh:"\u5F02\u5E38\u6355\u83B7",description:"Route failures to an error branch",descriptionZh:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",labelZh:"\u5B50\u6D41\u7A0B",description:"Execute another workflow",descriptionZh:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"workflow",label:"Workflow JSON",labelZh:"\u5DE5\u4F5C\u6D41 JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute.",descriptionZh:"\u8981\u6267\u884C\u7684\u5185\u8054\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u3002"})],defaultConfig:{}},{type:"comment",label:"Comment",labelZh:"\u6CE8\u91CA",description:"Canvas note; not executed",descriptionZh:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[g({key:"text",label:"Text",labelZh:"\u6587\u672C",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",labelZh:"\u81EA\u5B9A\u4E49",description:"Run a custom activity or handler",descriptionZh:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[w("in","in","input","Input")],outputs:[w("out","out","output","Output"),w("error","error","output","Error")],fields:[g({key:"result",label:"Result",labelZh:"\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node.",descriptionZh:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"})],defaultConfig:{}}],sr=0;function Kr(s){if(s===null||typeof s!="object")return s;try{return JSON.parse(JSON.stringify(s))}catch{return s}}var D=class{constructor(){this.definitions=new Map,this._revision=0,Br.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(o=>({...o})),outputs:(e.outputs||[]).map(o=>({...o})),fields:(e.fields||[]).map(o=>({...o})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let o={...t.defaultConfig||{}};return(t.fields||[]).forEach(r=>{r.defaultValue!==void 0&&o[r.key]===void 0&&(o[r.key]=Kr(r.defaultValue))}),o}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let o of this.definitions.values())e.has(o.category)||(e.add(o.category),t.push(o.category));return t}palette(e="zh-CN",t){return this.categories().map(o=>({id:o,label:R(t,e,`workflow.category.${o}`,$(e,rr[o].en,rr[o].zh)),items:this.list().filter(r=>r.category===o).map(r=>this.paletteItem(r,e,t))}))}paletteItem(e,t="zh-CN",o){return{type:e.type,label:this.nodeLabel(e.type,t,o),description:this.nodeDescription(e.type,t,o),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",o){let r=this.get(e);return r?R(o,t,`workflow.node.${e}.label`,$(t,r.label,r.labelZh)):e}nodeDescription(e,t="zh-CN",o){let r=this.get(e);return r?R(o,t,`workflow.node.${e}.description`,$(t,r.description||r.label,r.descriptionZh)):""}createNode(e,t,o={}){let r=this.get(e);if(!r)throw new Error(`Unknown workflow node type: ${e}`);return{id:o.id||this.nextId(e),name:o.name||$("zh-CN",r.label,r.labelZh),type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:qr,height:Jr},description:r.description,inputs:r.inputs.map(n=>({...n})),outputs:r.outputs.map(n=>({...n})),config:{...r.defaultConfig||{},...o.config||{}},style:{backgroundColor:r.color,textColor:r.textColor||"#ffffff",borderColor:r.color,borderRadius:e==="start"||e==="end"?50:10,icon:r.icon},activityType:r.activityType,pluginId:r.pluginId,requiresServer:r.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return sr+=1,`${e}_${sr}`}};Reflect.metadata("design:paramtypes",[])(D);h(D,[[b(),0]]);function Z(s,e){if(typeof s=="function")return s(e);if(s==null||typeof s!="string")return s;let t=s.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let o=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),r=e;for(let i of o){if(r==null)return;r=r[i]}return r}function ir(s,e,t){switch(e){case"equals":return s==t;case"not-equals":return s!=t;case"gt":return Number(s)>Number(t);case"lt":return Number(s)<Number(t);case"gte":return Number(s)>=Number(t);case"lte":return Number(s)<=Number(t);case"truthy":default:return!!s}}function Xr(s,e){let t=s?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!Z(t.condition,e);if(t.field!==void 0){let o=Z(t.field,e);return ir(o,String(t.operator||"truthy"),t.value)}return!0}function Gr(s,e){let t=s?.config||{};if(t.field!==void 0)return Z(t.field,e);if(t.value!==void 0)return Z(t.value,e)}function K(s){if(typeof s!="string")return s;try{return JSON.parse(s)}catch{return s}}function lt(s,e){if(!e)return s;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),o=s;for(let r of t){if(o==null)return;o=o[r]}return o}function dt(s,e){let t=e?Z(e,s):s.items??s.value;return Array.isArray(t)?t:[]}function Yr(s,e){return String(s??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,o)=>String(Z(o,e)??""))}function Qr(s){return String(s||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function es(s,e,t,o){let r=Qr(e);if(!r.length)return t==="set"&&o&&typeof o=="object"?(Object.assign(s,o),o):void 0;let i=s;for(let a=0;a<r.length-1;a++){let l=r[a];(i[l]===void 0||i[l]===null)&&(i[l]={}),i=i[l]}let n=r[r.length-1];if(t==="delete"){let a=i[n];return delete i[n],a}if(t==="append"){let a=i[n];return Array.isArray(a)?(a.push(o),a):(i[n]=a==null?[o]:`${a}${o}`,i[n])}return i[n]=o,o}function ts(s,e,t){let o=[],r=[],i="",n=!1,a=String(s??"");for(let d=0;d<a.length;d++){let f=a[d];n?f==='"'?a[d+1]==='"'?(i+='"',d++):n=!1:i+=f:f==='"'?n=!0:f===e?(r.push(i),i=""):f===`
`?(r.push(i),o.push(r),r=[],i=""):f!=="\r"&&(i+=f)}if((i||r.length)&&(r.push(i),o.push(r)),!t||!o.length)return o;let l=o[0];return o.slice(1).map(d=>{let f={};return l.forEach((u,c)=>{f[u]=d[c]??""}),f})}function os(s,e){let t=Array.isArray(s)?s:[];if(!t.length)return"";let o=r=>{let i=r==null?"":String(r);return/["\n\r]/.test(i)||i.includes(e)?`"${i.replace(/"/g,'""')}"`:i};if(!Array.isArray(t[0])){let r=Object.keys(t[0]||{});return[r.map(o).join(e),...t.map(i=>r.map(n=>o(i?.[n])).join(e))].join(`
`)}return t.map(r=>r.map(o).join(e)).join(`
`)}function rs(s){let e=s.activityType;if(e)try{let t=new e;return Object.assign(t,s.config||{}),t}catch{return}}async function ss(s,e){let t=s.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${s.name}" failed`)),data:{nodeId:s.id,failed:!0}};let o=t.action,r=e.actions||{};if(typeof o=="function")return{success:!0,data:{nodeId:s.id,result:await o(e)}};if(typeof o=="string"&&o&&typeof r[o]=="function")return{success:!0,data:{nodeId:s.id,result:await r[o](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:s.id,result:await t.execute(e)}};if(t.result!==void 0){let i=K(t.result);return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:i}}}return{success:!0,data:{nodeId:s.id,config:t}}}async function is(s,e){let t=s.config||{},o=Z(t.url,e);if(!o)return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No URL configured"}};let r=globalThis.fetch;if(typeof r!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:s.id}};try{let i=await r(String(o),{method:String(t.method||"GET").toUpperCase(),headers:K(t.headers)||void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),n=await i.text(),a=n;try{a=n?JSON.parse(n):null}catch{a=n}return{success:i.ok,error:i.ok?void 0:new Error(`HTTP ${i.status}`),data:{nodeId:s.id,status:i.status,body:a}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}}async function ct(s,e,t){let o=s.config||{};if(t?.executeNode){let i=await t.executeNode(s,e);if(i)return i}let r=rs(s);if(r)return r.execute(e);switch(s.type){case"start":return{success:!0,data:{nodeId:s.id,started:!0}};case"end":return{success:!0,data:{nodeId:s.id,completed:!0}};case"task":return ss(s,e);case"condition":return{success:!0,data:{nodeId:s.id,condition:Xr(s,e)}};case"switch":return{success:!0,data:{nodeId:s.id,condition:Gr(s,e)}};case"delay":{let i=Math.max(0,Number(o.delay??o.duration??0)||0);return await new Promise(n=>setTimeout(n,i)),{success:!0,data:{nodeId:s.id,delayed:i}}}case"loop":{let i=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0));return{success:!0,data:{nodeId:s.id,iterations:i}}}case"log":{let i=String(o.level||"info"),n=Z(o.message,e),a=e.logger;return a&&typeof a[i]=="function"&&a[i](n),{success:!0,data:{nodeId:s.id,level:i,message:n}}}case"http-request":return is(s,e);case"inject":{let i=K(o.payload??{});return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,payload:i}}}case"trigger":{let i=Math.max(0,Number(o.delay)||0);await new Promise(a=>setTimeout(a,i));let n=K(o.payload??{});return n&&typeof n=="object"&&!Array.isArray(n)?{success:!0,data:{...n,nodeId:s.id,triggered:!0}}:{success:!0,data:{nodeId:s.id,triggered:!0,payload:n}}}case"function":try{let i=String(o.code||"return input;"),a=await new Function("context","input","msg",`"use strict"; return (async () => { ${i}
 })();`)(e,e,{...e});return a&&typeof a=="object"&&!Array.isArray(a)?{success:!0,data:{...a,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:a}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"template":{let i=Yr(String(o.template??""),e),n=String(o.target||"message");return{success:!0,data:{nodeId:s.id,[n]:i,value:i}}}case"json":{let i=Z(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let a=JSON.stringify(i,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:s.id,value:a,json:a}}}try{let a=typeof i=="string"?JSON.parse(i):i;return{success:!0,data:a&&typeof a=="object"&&!Array.isArray(a)?{...a,nodeId:s.id,value:a}:{nodeId:s.id,value:a}}}catch(a){return{success:!1,error:a,data:{nodeId:s.id}}}}case"csv":{let i=Z(o.field||"value",e),n=String(o.delimiter??",");try{if(String(o.mode||"parse")==="stringify"){let l=os(i,n);return{success:!0,data:{nodeId:s.id,value:l}}}let a=ts(String(i??""),n,o.header!==!1);return{success:!0,data:{nodeId:s.id,value:a,items:a,count:a.length}}}catch(a){return{success:!1,error:a,data:{nodeId:s.id}}}}case"change":try{let i=K(o.value),n=es(e,o.field,String(o.action||"set"),i);return{success:!0,data:{nodeId:s.id,field:o.field,value:n,changed:!0}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"statistics":{let i=dt(e,o.field),n=i.map(u=>lt(u,o.path)).filter(u=>u!=null),a=n.map(Number).filter(u=>Number.isFinite(u)),l=String(o.operation||"count"),d=n.length;l==="sum"?d=a.reduce((u,c)=>u+c,0):l==="avg"?d=a.length?a.reduce((u,c)=>u+c,0)/a.length:0:l==="min"?d=a.length?Math.min(...a):0:l==="max"&&(d=a.length?Math.max(...a):0);let f=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[f]:d,value:d,count:i.length}}}case"merge":{let n=String(o.fields||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>Z(d,e)),a=String(o.mode||"object")==="array"?n.reduce((d,f)=>d.concat(Array.isArray(f)?f:[f]),[]):Object.assign({},...n.filter(d=>d&&typeof d=="object"&&!Array.isArray(d))),l=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[l]:a,value:a}}}case"event-emit":{let i=String(o.event||"workflow.event"),n=K(o.payload),a=e.eventBus||e.events;return a&&typeof a.emit=="function"?(a.emit(i,n),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:n}}):typeof e.emit=="function"?(e.emit(i,n),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:n}}):{success:!0,data:{nodeId:s.id,event:i,emitted:!1,payload:n}}}case"event-wait":{let i=String(o.event||"workflow.event"),n=Math.max(0,Number(o.timeout)||0),a=e.eventBus||e.events;try{if(a&&typeof a.wait=="function"){let l=await a.wait(i,n);return{success:!0,data:{nodeId:s.id,event:i,value:l,waited:!0}}}if(typeof e.waitEvent=="function"){let l=n?await Promise.race([Promise.resolve(e.waitEvent(i)),new Promise(d=>setTimeout(()=>d(void 0),n))]):await e.waitEvent(i);return{success:!0,data:{nodeId:s.id,event:i,value:l,waited:!0}}}return{success:!0,data:{nodeId:s.id,event:i,waited:!1}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id,event:i}}}}case"command":{let i=String(o.command||""),n=K(o.args),a=e.exec||e.runCommand||e.commands?.[i];if(typeof a=="function")try{let l=await a(i,n,e);return{success:!0,data:l&&typeof l=="object"?{...l,nodeId:s.id,command:i}:{nodeId:s.id,command:i,result:l}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id,command:i}}}return{success:!0,data:{nodeId:s.id,command:i,skipped:!0,args:n}}}case"split":{let i=Z(o.field||"items",e),n=Array.isArray(i)?i:typeof i=="string"?i.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:s.id,items:n,count:n.length}}}case"map":{let n=dt(e,o.field).map(a=>lt(a,o.path));return{success:!0,data:{nodeId:s.id,items:n,count:n.length}}}case"filter":{let n=dt(e,o.field).filter(a=>{let l=lt(a,o.path);return ir(l,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:s.id,items:n,count:n.length}}}case"sort":{let i=dt(e,o.field).slice(),n=String(o.order||"asc")==="desc"?-1:1;return i.sort((a,l)=>{let d=lt(a,o.path),f=lt(l,o.path);return typeof d=="number"&&typeof f=="number"?(d-f)*n:String(d??"").localeCompare(String(f??""))*n}),{success:!0,data:{nodeId:s.id,items:i,count:i.length}}}case"range":{let i=Number(o.from??0),n=Number(o.to??10),a=Math.max(1,Math.abs(Number(o.step??1))||1),l=[];for(let d=i;d<n;d+=a)l.push(d);return{success:!0,data:{nodeId:s.id,items:l,count:l.length}}}case"batch":{let i=dt(e,o.field),n=Math.max(1,Number(o.size)||10),a=[];for(let l=0;l<i.length;l+=n)a.push(i.slice(l,l+n));return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"comment":return{success:!0,data:{nodeId:s.id,comment:!0}};case"assign":{let i=K(o.values??o.data??{}),n={...e.variables||{},...i&&typeof i=="object"?i:{}};return e.variables=n,{success:!0,data:{nodeId:s.id,variables:n}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:s.id,result:K(o.result)}};let i=K(o.mapping);if(i&&typeof i=="object"){let n={};return Object.keys(i).forEach(a=>{n[a]=Z(i[a],e)}),{success:!0,data:{nodeId:s.id,result:n}}}return{success:!0,data:{nodeId:s.id,result:e}}}case"parallel":return{success:!0,data:{nodeId:s.id,parallel:!0}};case"join":return{success:!0,data:{nodeId:s.id,joined:!0}};case"trycatch":return{success:!0,data:{nodeId:s.id,guarded:!0}};case"subprocess":{let i=K(o.workflow);if(i&&t?.executeDefinition){let n=await t.executeDefinition(i,e);return{success:n.success,data:{nodeId:s.id,subprocess:n.data},error:n.error}}return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:s.id,result:await o.execute(e)}}:s.requiresServer?{success:!1,error:new Error(`Node type "${s.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:s.id,type:s.type,pluginId:s.pluginId}}:{success:!0,data:{nodeId:s.id,type:s.type,result:K(o.result)}}}}function Ne(s){let e=[];if(s?.id||e.push("Workflow ID is required"),s?.name||e.push("Workflow name is required"),!s?.nodes||s.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,o=[];for(let n of s.nodes)n.id?t.has(n.id)&&o.push(n.id):e.push("Every node requires an id"),t.add(n.id);o.length&&e.push(`Duplicate node IDs found: ${[...new Set(o)].join(", ")}`);let r=s.nodes.filter(n=>n.type==="start"),i=s.nodes.filter(n=>n.type==="inject");r.length===0&&i.length===0?e.push("Workflow must have at least one start node"):r.length>1&&e.push("Workflow should have only one start node");for(let n of s.connections||[])t.has(n.sourceNodeId)||e.push(`Connection references non-existent source node: ${n.sourceNodeId}`),t.has(n.targetNodeId)||e.push(`Connection references non-existent target node: ${n.targetNodeId}`),n.sourceNodeId===n.targetNodeId&&e.push(`Connection cannot link a node to itself: ${n.sourceNodeId}`);return ao(s)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function ao(s){let e=new Set,t=new Set,o=new Map;for(let i of s.nodes||[])o.set(i.id,[]);for(let i of s.connections||[]){let n=o.get(i.sourceNodeId);n&&n.push(i.targetNodeId)}let r=i=>{if(e.has(i))return!0;if(t.has(i))return!1;e.add(i);for(let n of o.get(i)||[])if(r(n))return!0;return e.delete(i),t.add(i),!1};for(let i of o.keys())if(r(i))return!0;return!1}function nr(s){let e=(s.nodes||[]).find(o=>o.type==="start");if(e)return e;let t=(s.nodes||[]).find(o=>o.type==="inject");return t||(s.nodes||[]).find(o=>!(s.connections||[]).some(r=>r.targetNodeId===o.id))}function ut(s){let e=Ne(s),t=new Map,o=new Map,r=new Map,i=(s?.connections||[]).slice();for(let d of s?.nodes||[])t.set(d.id,d),o.set(d.id,[]),r.set(d.id,[]);for(let d of i)o.get(d.sourceNodeId)?.push(d),r.get(d.targetNodeId)?.push(d);let n=nr(s),a=[],l=new Set;if(n){let d=[n.id];for(l.add(n.id);d.length;){let f=d.shift();a.push(f);for(let u of o.get(f)||[])!l.has(u.targetNodeId)&&t.has(u.targetNodeId)&&(l.add(u.targetNodeId),d.push(u.targetNodeId))}}for(let d of t.keys())l.has(d)||a.push(d);return{definition:s,entry:n,nodes:t,outgoing:o,incoming:r,edges:i,order:a,reachable:l,valid:e.valid,errors:e.errors}}function ar(s,e={}){let t=ut(s),o=e.originX??80,r=e.originY??80,i=e.columnGap??240,n=e.rowGap??140,a=new Map,l=[],d=t.entry?[t.entry.id]:[],f=[...d];for(d.forEach(c=>a.set(c,0));f.length;){let c=f.shift(),m=a.get(c)||0;for(let y of t.outgoing.get(c)||[]){let k=y.targetNodeId;if(!t.nodes.has(k))continue;let v=m+1,x=a.get(k);(x===void 0||x<v)&&(x===void 0&&f.push(k),a.set(k,v))}}for(let c of t.order){a.has(c)||a.set(c,ns(a,0));let m=a.get(c)||0;l[m]||(l[m]=[]),l[m].push(c)}let u={};return l.forEach((c,m)=>{c.forEach((y,k)=>{u[y]={x:o+m*i,y:r+k*n}})}),u}function ns(s,e){let t=e;return s.forEach(o=>{t=Math.max(t,o)}),t+1}var as=100,ls=.35,ds=2.5;function cs(s){return JSON.parse(JSON.stringify(s))}function us(s){return`${s}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function lo(s,e="zh-CN",t){let o=(c,m)=>R(t,e,`workflow.demo.${c}`,m),r=(c,m,y,k,v,x)=>s.createNode(c,{x:k,y:v},{id:m,name:y,config:x}),i=r("start","start_1",o("start",e==="zh-CN"?"\u5F00\u59CB":"Start"),80,220),n=r("task","task_1",o("loadInput",e==="zh-CN"?"\u8BFB\u53D6\u8F93\u5165":"Load input"),330,220,{action:"loadInput",result:{approved:!0}}),a=r("condition","condition_1",o("approved",e==="zh-CN"?"\u662F\u5426\u901A\u8FC7":"Approved?"),590,220,{field:"approved",operator:"truthy"}),l=r("task","task_2",o("approve",e==="zh-CN"?"\u901A\u8FC7\u5904\u7406":"Approve"),850,120,{result:{approved:!0}}),d=r("task","task_3",o("reject",e==="zh-CN"?"\u62D2\u7EDD\u5904\u7406":"Reject"),850,320,{result:{approved:!1}}),f=r("end","end_1",o("end",e==="zh-CN"?"\u7ED3\u675F":"End"),1110,220),u=(c,m,y,k)=>({id:c,sourceNodeId:m,sourcePort:y,targetNodeId:k,targetPort:"in"});return{id:"workflow_demo",name:o("name",e==="zh-CN"?"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B":"Approval workflow"),description:o("description",e==="zh-CN"?"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002":"Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[i,n,a,l,d,f],connections:[u("conn_1","start_1","out","task_1"),u("conn_2","task_1","out","condition_1"),u("conn_3","condition_1","true","task_2"),u("conn_4","condition_1","false","task_3"),u("conn_5","task_2","out","end_1"),u("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function lr(s="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||(s==="zh-CN"?"\u65B0\u5EFA\u6D41\u7A0B":"New workflow"),description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var ge=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new D,this.service=e.service,this.definition=e.definition||lo(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,o={}){let r=this.registry.get(e);if(!r){this.setError("workflow.error.unknownType",{type:e});return}if(r.singleton&&this.definition.nodes.some(n=>n.type===e)){this.setError("workflow.error.singleton",{label:r.label});return}let i=this.registry.createNode(e,t,{id:this.nextNodeId(e),...o});return this.commit(n=>({...n,nodes:[...n.nodes,i],metadata:{...n.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:i.id},this.clearError(),this.setMessage("workflow.message.added",{name:i.name}),i}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(o=>o.id!==e),connections:t.connections.filter(o=>o.sourceNodeId!==e&&o.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let o=Number.isFinite(t?.x)?t.x:0,r=Number.isFinite(t?.y)?t.y:0,i=this.definition.nodes.find(a=>a.id===e);if(!i)return!1;let n=this.snapPosition({x:o,y:r});return i.position.x===n.x&&i.position.y===n.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(a=>a.id===e?{...a,position:n}:a)}),!0)}updateNode(e,t){return this.definition.nodes.find(r=>r.id===e)?(this.commit(r=>({...r,nodes:r.nodes.map(i=>i.id===e?{...i,...t,id:i.id}:i),metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?this.updateNode(e,{config:{...o.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(o=>o.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,o,r){let i=this.definition.nodes.find(c=>c.id===e),n=this.definition.nodes.find(c=>c.id===o);if(!i||!n){this.setError("workflow.error.endpoints");return}if(e===o){this.setError("workflow.error.selfLink");return}let a=t||i.outputs?.[0]?.id||"out",l=r||n.inputs?.[0]?.id||"in";if(i.outputs?.length&&!i.outputs.some(c=>c.id===a)){this.setError("workflow.error.unknownOutput",{port:a});return}if(n.inputs?.length&&!n.inputs.some(c=>c.id===l)){this.setError("workflow.error.unknownInput",{port:l});return}let d=this.definition.connections.find(c=>c.sourceNodeId===e&&c.sourcePort===a&&c.targetNodeId===o&&c.targetPort===l);if(d)return this.selection={connectionId:d.id},d;let f={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:a,targetNodeId:o,targetPort:l},u={...this.definition,connections:[...this.definition.connections,f]};if(ao(u)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...u,metadata:{...u.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:f.id},this.clearError(),this.setMessage("workflow.message.connected"),f}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(o=>o.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?(this.selection={nodeId:e},this.drag={nodeId:e,startX:o.position.x,startY:o.position.y,offsetX:t.x-o.position.x,offsetY:t.y-o.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),o=Math.round(e.y-this.drag.offsetY),r=this.snapPosition({x:t,y:o});r.x===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.x&&r.y===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(i=>i.id===this.drag.nodeId?{...i,position:r}:i)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,o,r="output"){let i=this.definition.nodes.find(a=>a.id===e),n=r==="input"?i?.inputs:i?.outputs;return!i||!(n||[]).some(a=>a.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:r,x:o.x,y:o.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let o=this.connectionDraft;if(o)return this.connectionDraft=void 0,o.sourceSide==="input"?this.addConnection(e,t,o.sourceNodeId,o.sourcePort):this.addConnection(o.sourceNodeId,o.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(ls,Math.min(ds,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return ut(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=ar(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(o=>({...o,position:e[o.id]||o.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(o=>({...o,nodes:[...o.nodes,t],metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(o=>o.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let o;try{o=typeof e=="string"?JSON.parse(e):cs(e)}catch(i){return this.setError(i.message),!1}let r=Ne(o);return!o||!Array.isArray(o.nodes)||!Array.isArray(o.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=o,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(r.valid?"":r.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let o=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(o={...o,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let r=await e.save(o);return this.definition=o,this.normalize(),this.dirty=!1,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:o.name}),r}async openFrom(e,t){let o=await e.get(t);return o?this.load(o,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){return Ne(this.definition)}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let o=new Error("workflow.error.noService");return this.setError(o.message),{success:!1,error:o}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let o=await this.service.execute(this.definition,e.context||{},{...e,onEvent:i=>{this.activeExecutionId=i.executionId,this.execution=i.snapshot,e.onEvent?.(i)},onCheckpoint:i=>{i.status==="running"&&(this.checkpoint=i),e.onCheckpoint?.(i)}}),r=o.data?.executionState;return r&&(this.execution=r,this.recordExecution(r)),o.success&&(this.checkpoint=void 0),this.activeExecutionId=o.data?.executionId,this.running=!1,this.setMessage(o.success?"workflow.message.completed":"workflow.message.failed"),o.success||this.setError(o.error?.message||"workflow.message.failed"),o}catch(o){return this.running=!1,this.setError(o.message),this.setMessage("workflow.message.failed"),{success:!1,error:o}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=us("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),o=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(r=>({...r})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(r=>({...r})),config:{...o||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>as&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(o=>o&&o.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,o=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(o)};let r=this.gridSize;return{x:Math.round(t/r)*r,y:Math.round(o/r)*r}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(r=>r.id)),o=1;for(;t.has(`${e}_${o}`);)o++;return`${e}_${o}`}nextConnectionId(){let e=new Set(this.definition.connections.map(o=>o.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var ye=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};h(ye,[[b(),0]]);var qe=class{constructor(){this.listeners=new Set}emit(e){for(let t of[...this.listeners])t(e)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}};h(qe,[[b(),0]]);var Tt=new qe;function dr(s){return{id:s.id,name:s.name,description:s.description,version:s.version,nodes:(s.nodes||[]).map(e=>{let{execute:t,activityType:o,...r}=e;return JSON.parse(JSON.stringify(r))})}}var ne=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>dr(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let n of e.nodes||[])n?.type&&(this.nodes.register({...n,pluginId:e.id,requiresServer:n.requiresServer!==!1}),t.push(n.type));let o=typeof e.services=="function"?e.services():e.services,r=[];Object.entries(o||{}).forEach(([n,a])=>{this.services.set(n,a),r.push(n)});let i={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(i)}catch(n){throw t.forEach(a=>this.nodes.unregister(a)),r.forEach(a=>this.services.remove(a)),n}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:r}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let o={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(o)}finally{t.nodeTypes.forEach(r=>this.nodes.unregister(r));for(let r of t.serviceNames){let i=this.services.get(r);try{await i?.dispose?.()}finally{this.services.remove(r)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[D,ye])(ne);h(ne,[[b(),0]]);var cr,ur,fs;function ft(s){return{id:s.id,name:s.name,description:s.description,nodeCount:s.nodes?.length||0,connectionCount:s.connections?.length||0,updatedAt:s.metadata?.updatedAt||new Date().toISOString()}}function co(s){return JSON.parse(JSON.stringify(s))}var uo=class{constructor(){this[cr]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(ft).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?co(t):void 0}async save(e){let t={...co(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),ft(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};cr=fe;var fo=class{constructor(e="tsdi.workflow.definitions.v1",t=fr()){this.key=e,this.storage=t,this[ur]=!0}async list(){return this.readAll().map(ft).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(r=>r.id!==e.id),o={...co(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(o),this.writeAll(t),ft(o)}async remove(e){let t=this.readAll(),o=t.filter(r=>r.id!==e);return o.length===t.length?!1:(this.writeAll(o),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};ur=fe;function fr(){try{return globalThis.localStorage}catch{return}}function pr(){return fr()?new fo:new uo}fs=fe;function qa(s){return ft(s)}var X=class{};h(X,[[U(),0]]);var oe=class extends X{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return ct(this.node,e,this.runtimeHost)}};var po=class extends Mo{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return oe}getBackend(){return e=>ct(e.node,e.context,e.host)}handleNode(e){return Promise.resolve(this.handle(e,Ht(this.injector)))}};function hr(s,e){let t=s.get(it,null);if(t)return e.forEach(r=>t.addInterceptor(oe,r)),new po(s);let o=new Do(r=>ct(r.node,r.context,r.host),()=>e);return{handleNode:r=>Promise.resolve(o.handle(r,Ht(s)))}}function ps(s){return{nodeId:s,status:"pending"}}var Nt=class{intercept(e,t,o){let{node:r,state:i,emit:n}=e,a=i.nodeStates?.get(r.id)||ps(r.id);return a.status="running",a.startedAt=Date.now(),i.nodeStates?.set(r.id,a),i.currentNodeId=r.id,i.activeNodeIds=[...i.activeNodeIds||[],r.id],n({type:"node-start",nodeId:r.id,status:"running"}),Promise.resolve(t.handle(e,o)).then(l=>(this.finish(e,a,l),l),l=>{let d={success:!1,error:l,data:{nodeId:r.id}};return this.finish(e,a,d),d})}finish(e,t,o){let{node:r,state:i,emit:n}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=o.success?"success":"failed",t.result=o,t.error=o.error?.message,i.nodeStates?.set(r.id,t),i.nodeResults.set(r.id,o),i.activeNodeIds=(i.activeNodeIds||[]).filter(a=>a!==r.id),n({type:"node-end",nodeId:r.id,status:t.status,result:o})}};function hs(s){return s>0?new Promise(e=>setTimeout(e,s)):Promise.resolve()}var ho=class{constructor(e={}){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(0,Number(this.options.retries??1)||0),i=Math.max(0,Number(this.options.delayMs??0)||0),n=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,a=this.options.shouldRetry||((d,f)=>f?!0:d?.success===!1),l=async d=>{try{let f=await t.handle(e,o);if(d>=r||!a(f,void 0,e,d))return f}catch(f){if(d>=r||!a(void 0,f,e,d))throw f}return await hs(i*Math.pow(n,d)),l(d+1)};return l(0)}},At=class{intercept(e,t,o){let r=e.node.config||{},i=Math.max(0,Math.min(20,Number(r.retry??r.retries)||0)),n=Math.max(0,Number(r.retryDelay)||0),a=Math.max(0,Number(r.timeout)||0);if(!i&&!a)return Promise.resolve(t.handle(e,o));let l={handle:(d,f)=>t.handle(d,f)};if(a>0){let d=new mo({timeoutMs:a}),f=l;l={handle:(u,c)=>d.intercept(u,f,c)}}if(i>0){let d=new ho({retries:i,delayMs:n}),f=l;l={handle:(u,c)=>d.intercept(u,f,c)}}return Promise.resolve(l.handle(e,o))}},mo=class{constructor(e){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(i=>{let n=!1,a=setTimeout(()=>{n||(n=!0,i({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${r}ms`),data:{nodeId:e.node.id,timeoutMs:r}}))},r);Promise.resolve(t.handle(e,o)).then(l=>{n||(n=!0,clearTimeout(a),i(l))},l=>{n||(n=!0,clearTimeout(a),i({success:!1,error:l,data:{nodeId:e.node.id}}))})})}};var ms=184;var yr=20,br=48,mr={idle:{en:"",zh:""},pending:{en:"Pending",zh:"\u7B49\u5F85"},running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},success:{en:"Done",zh:"\u6210\u529F"},failed:{en:"Failed",zh:"\u5931\u8D25"},skipped:{en:"Skipped",zh:"\u8DF3\u8FC7"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"}};function kr(s,e,t){let o=mr[s]||mr.idle;return R(t,e,`workflow.status.${s}`,$(e,o.en,o.zh))}function wo(s,e,t){let o=s||"idle",r={running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},completed:{en:"Completed",zh:"\u5DF2\u5B8C\u6210"},failed:{en:"Failed",zh:"\u5931\u8D25"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"},pending:{en:"Pending",zh:"\u7B49\u5F85"},idle:{en:"Idle",zh:"\u7A7A\u95F2"}},i=r[o]||r.idle;return R(t,e,`workflow.status.${o}`,$(e,i.en,i.zh))}function go(s){let e=s.dimension?.width||ms,t=Math.max(s.inputs?.length||0,s.outputs?.length||0,1),o=Math.max(s.dimension?.height||64,br+t*yr+10);return{width:e,height:o}}function ws(s){let{width:e,height:t}=go(s),o=(r,i)=>(r||[]).map((n,a)=>({id:n.id,label:n.label||n.name||n.id,type:n.type,x:i,y:s.position.y+br+a*yr-5}));return{width:e,height:t,inputs:o(s.inputs,s.position.x),outputs:o(s.outputs,s.position.x+e)}}function wr(s,e){let t=Math.max(48,Math.abs(e.x-s.x)/2);return`M ${s.x} ${s.y} C ${s.x+t} ${s.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function gs(s){return{class:["workflow-node",s.selected?"is-selected":""].filter(Boolean).join(" "),"data-node-id":s.id,"data-node-type":s.type,"data-status":s.status,role:"button",tabindex:"0","aria-label":s.name,style:[`left:${s.x}px`,`top:${s.y}px`,`width:${s.width}px`,`min-height:${s.height}px`].join(";")}}function vr(s,e,t="zh-CN",o){let r=[],i=new Map,n=s.execution;for(let u of s.nodes){let c=ws(u);i.set(u.id,c);let m=n?.nodeStates?.[u.id]?.status||"idle",y={id:u.id,name:u.name,type:u.type,typeLabel:e.nodeLabel(u.type,t,o),description:u.description||e.nodeDescription(u.type,t,o),x:u.position.x,y:u.position.y,width:c.width,height:c.height,icon:u.style?.icon||e.get(u.type)?.icon||"\u25C6",color:u.style?.backgroundColor||e.get(u.type)?.color||"#64748b",textColor:u.style?.textColor||e.get(u.type)?.textColor||"#ffffff",selected:s.selection.nodeId===u.id,status:m,statusLabel:kr(m,t,o),inputs:c.inputs,outputs:c.outputs};r.push({...y,attrs:gs(y)})}let a=s.connections.map(u=>{let c=s.nodes.find(xe=>xe.id===u.sourceNodeId),m=s.nodes.find(xe=>xe.id===u.targetNodeId),y=c?i.get(c.id):void 0,k=m?i.get(m.id):void 0,v=y?.outputs.find(xe=>xe.id===u.sourcePort)||y?.outputs[0],x=k?.inputs.find(xe=>xe.id===u.targetPort)||k?.inputs[0],C=n?.edgeStates?.[u.id]?.status||"idle",N=s.selection.connectionId===u.id,ce=v&&x?wr(v,x):"M 0 0",je=v&&x?(v.x+x.x)/2:0,Wr=v&&x?(v.y+x.y)/2:0,$r={class:`workflow-edge workflow-edge-${C}${N?" is-selected":""}`,"data-edge-id":u.id,"data-status":C,d:ce,"marker-end":`url(#wf-arrow-${C})`};return{id:u.id,sourceNodeId:u.sourceNodeId,targetNodeId:u.targetNodeId,sourcePort:u.sourcePort,targetPort:u.targetPort,label:u.label||"",d:ce,status:C,selected:N,attrs:$r,hitAttrs:{class:"workflow-edge-hit","data-edge-id":u.id,d:ce},labelAttrs:{x:String(je),y:String(Wr-6),class:"workflow-edge-label"}}}),l;if(s.connectionDraft){let u=s.nodes.find(k=>k.id===s.connectionDraft.sourceNodeId),c=u?i.get(u.id):void 0,y=(s.connectionDraft.sourceSide==="input"?c?.inputs:c?.outputs)?.find(k=>k.id===s.connectionDraft.sourcePort);y&&(l={d:wr(y,{x:s.connectionDraft.x,y:s.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=r.reduce((u,c)=>Math.max(u,c.x+c.width),0),f=r.reduce((u,c)=>Math.max(u,c.y+c.height),0);return{nodes:r,edges:a,draft:l,connecting:!!s.connectionDraft,connectingSide:s.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,f+240),zoom:s.zoom,pan:{...s.pan},gridStyle:{"--wf-grid-size":`${24*s.zoom}px`,"--wf-grid-x":`${s.pan.x}px`,"--wf-grid-y":`${s.pan.y}px`}}}function xr(s,e="zh-CN",t){return s.palette(e,t)}function ys(s,e){return e.equals!==void 0?String(s)===String(e.equals):e.notEquals!==void 0?String(s)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(s)):e.truthy!==void 0?e.truthy?!!s:!s:e.falsy!==void 0?e.falsy?!s:!!s:!0}function bs(s){let e=s.defaultValue;return s.type==="json"?typeof e=="string"?e:JSON.stringify(e??{},null,2):s.type==="boolean"?e===!0:e==null?"":String(e)}function Cr(s,e,t="zh-CN",o){let r=s.selectedNode;if(!r)return{hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let i=e.get(r.type),n=s.execution?.nodeStates?.[r.id],a=n?.status||"idle",l={};(i?.fields||[]).forEach(c=>{l[c.key]=r.config?.[c.key]!==void 0?r.config[c.key]:c.defaultValue});let d=(i?.fields||[]).map(c=>{let m=l[c.key];return{key:c.key,label:R(o,t,`workflow.field.${r.type}.${c.key}`,$(t,c.label,c.labelZh)),type:c.type,value:m,displayValue:c.type==="json"?typeof m=="string"?m:JSON.stringify(m??{},null,2):m==null?"":String(m),checked:m===!0,options:(c.options||[]).map(y=>({label:R(o,t,`workflow.option.${y.value}`,$(t,y.label,y.labelZh)),value:y.value})),placeholder:$(t,c.placeholder||"",c.placeholderZh),description:$(t,c.description||"",c.descriptionZh),group:$(t,c.group||"",c.groupZh),visible:c.visibleWhen?ys(l[c.visibleWhen.key],c.visibleWhen):!0,min:c.min,max:c.max,step:c.step,rows:c.rows||(c.type==="json"?4:c.type==="code"?8:3),required:c.required===!0,readonly:c.readonly===!0,pattern:c.pattern,language:c.language,hasDefault:c.defaultValue!==void 0,resetValue:bs(c)}}),f="";if(n?.result?.data!==void 0)try{f=JSON.stringify(n.result.data,null,2)}catch{f=String(n.result.data)}let u=n?.durationMs||0;return{hasSelection:!0,nodeId:r.id,name:r.name,description:r.description||"",typeLabel:e.nodeLabel(r.type,t,o),status:a,statusLabel:kr(a,t,o),durationLabel:u?`${u} ms`:"",fields:d,resultText:f,errorText:n?.error||""}}function Sr(s,e="zh-CN",t){let o=s.execution;return{name:s.definition.name,nodeCount:s.nodes.length,connectionCount:s.connections.length,hasSelection:!!s.selection?.nodeId||!!s.selection?.connectionId,canUndo:s.canUndo,canRedo:s.canRedo,canResume:s.canResume,running:s.running,zoomLabel:`${Math.round(s.zoom*100)}%`,statusLabel:wo(o?.status,e,t)}}function Rr(s,e="zh-CN",t){let o=s.selectedNode,r=s.execution,i=o?s.registry.nodeLabel(o.type,e,t):"";return{message:no(t,e,s.message,"",s.messageParams),error:no(t,e,s.error,"",s.errorParams),running:s.running,nodeCount:s.nodes.length,selectedLabel:o?`${o.name} \xB7 ${i}`:R(t,e,"workflow.ui.noSelection",$(e,"No node selected","\u672A\u9009\u62E9\u8282\u70B9")),zoomLabel:`${Math.round(s.zoom*100)}%`,executionLabel:wo(r?.status,e,t)}}function gr(s){if(!s)return"";let e=new Date(s),t=o=>String(o).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function ks(s,e){if(!s||!e||e<s)return"";let t=e-s;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function Ir(s,e="zh-CN",t){return(s.executionHistory||[]).filter(Boolean).map(o=>{let r=o.status==="completed"?"success":o.status==="failed"?"failed":o.status==="cancelled"?"cancelled":o.status==="running"?"running":"idle";return{executionId:o.executionId,label:gr(o.startTime),status:o.status,statusLabel:wo(o.status,e,t),timeLabel:gr(o.startTime),durationLabel:ks(o.startTime,o.endTime),nodeCount:Object.keys(o.nodeStates||{}).length,tone:r,active:s.selectedExecutionId===o.executionId}})}var hl=P("VISUAL_NODE"),M=class extends X{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(M.prototype,"id");Reflect.metadata("design:type",String)(M.prototype,"name");Reflect.metadata("design:type",Object)(M.prototype,"type");Reflect.metadata("design:type",Object)(M.prototype,"position");Reflect.metadata("design:type",String)(M.prototype,"description");Reflect.metadata("design:type",Array)(M.prototype,"inputs");Reflect.metadata("design:type",Array)(M.prototype,"outputs");Reflect.metadata("design:type",Object)(M.prototype,"config");Reflect.metadata("design:type",Object)(M.prototype,"style");h(M,[[p(),1,"id"],[p(),1,"name"],[p(),1,"type"],[p(),1,"position"],[p(),1,"description"],[p(),1,"inputs"],[p(),1,"outputs"],[p(),1,"config"],[p(),1,"style"],[U(),0]]);var Et=class extends M{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(Et);h(Et,[[T({selector:"start-node"}),0]]);var Lt=class extends M{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(Lt);h(Lt,[[T({selector:"end-node"}),0]]);var Je=class extends M{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(Je.prototype,"action");Reflect.metadata("design:type",String)(Je.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(Je);h(Je,[[p(),1,"action"],[p(),1,"taskName"],[T({selector:"task-node"}),0]]);var pt=class extends M{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(pt.prototype,"condition");Reflect.metadata("design:paramtypes",[])(pt);h(pt,[[p(),1,"condition"],[T({selector:"condition-node"}),0]]);var Ae=class extends M{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=[],r=[...this.branches],i=[];for(;r.length>0||i.length>0;){for(;r.length>0&&i.length<this.maxConcurrent;){let a=r.shift().execute(e).then(l=>{t.push(l),!l.success&&l.error&&o.push(l.error)});i.push(a)}i.length>0&&(await Promise.race(i),i.splice(0,i.findIndex(n=>!r.includes(n))))}return{success:o.length===0,data:{results:t,errors:o.length>0?o:void 0,nodeId:this.id},error:o.length>0?o[0]:void 0}}};Reflect.metadata("design:type",Array)(Ae.prototype,"branches");Reflect.metadata("design:type",Object)(Ae.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(Ae.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(Ae);h(Ae,[[p(),1,"branches"],[p(),1,"maxConcurrent"],[p(),1,"waitAll"],[T({selector:"parallel-node"}),0]]);var ht=class extends M{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(ht.prototype,"delay");Reflect.metadata("design:paramtypes",[])(ht);h(ht,[[p(),1,"delay"],[T({selector:"delay-node"}),0]]);var Ee=class extends M{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=0;for(;o<this.maxIterations&&await this.condition(e,o);){let i=await this.body.execute(e);t.push(i),o++}return{success:!0,data:{iterations:o,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",X)(Ee.prototype,"body");Reflect.metadata("design:type",Function)(Ee.prototype,"condition");Reflect.metadata("design:type",Object)(Ee.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(Ee);h(Ee,[[p(),1,"body"],[p(),1,"condition"],[p(),1,"maxIterations"],[T({selector:"loop-node"}),0]]);var Le=class extends M{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),o=this.cases.get(t)||this.defaultCase;if(!o)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let r=await o.execute(e);return{success:r.success,data:{value:t,caseResult:r.data,nodeId:this.id},error:r.error}}};Reflect.metadata("design:type",Function)(Le.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(Le.prototype,"cases");Reflect.metadata("design:type",X)(Le.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(Le);h(Le,[[p(),1,"value"],[p(),1,"cases"],[p(),1,"defaultCase"],[T({selector:"switch-node"}),0]]);var Oe=class extends M{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,o;try{t=await this.tryActivity.execute(e)}catch(r){o=r,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:o,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:o,nodeId:this.id}}}};Reflect.metadata("design:type",X)(Oe.prototype,"tryActivity");Reflect.metadata("design:type",X)(Oe.prototype,"catchActivity");Reflect.metadata("design:type",X)(Oe.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(Oe);h(Oe,[[p(),1,"tryActivity"],[p(),1,"catchActivity"],[p(),1,"finallyActivity"],[T({selector:"trycatch-node"}),0]]);var mt=class extends M{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(mt.prototype,"workflow");Reflect.metadata("design:paramtypes",[])(mt);h(mt,[[p(),1,"workflow"],[T({selector:"subprocess-node"}),0]]);var Tr=30,Nr=300;function wt(s){let e={};s.nodeStates?.forEach((o,r)=>{e[r]={...o,result:o.result?{success:o.result.success,data:o.result.data,error:o.result.error?.message}:void 0}});let t={};return s.edgeStates?.forEach((o,r)=>{t[r]={...o}}),{executionId:s.executionId,workflowId:s.workflowId,status:s.status,currentNodeId:s.currentNodeId,startTime:s.startTime,endTime:s.endTime,error:s.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...s.activeNodeIds||[]],logs:[...s.logs||[]]}}var ae=class{constructor(e,t,o){this.injector=e,this.plugins=o,this.executions=new Map,this.pathInterceptor=new Nt,this.policyInterceptor=new At,this.interceptors=[],this.registry=t||new D;let r=this.injector.get(it,null);r&&(r.addInterceptor(oe,this.pathInterceptor),r.addInterceptor(oe,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get(it,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(oe,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(oe,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},o={}){let r=o.executionId||o.resumeFrom?.executionId||this.generateExecutionId(),i=this.withPluginServices(t),n=o.resumeFrom?this.createStateFromCheckpoint(e,o.resumeFrom,r):this.createState(e,r);this.executions.set(r,n),this.trimHistory(o.maxHistory),this.emit(o,n,{type:"workflow-start",status:"running"}),this.checkpoint(o,n);try{let a=ut(e),l=a.entry;if(!l)throw new Error("No start node found in workflow");let d={executeDefinition:(k,v)=>this.execute(k,v,{...o,executionId:void 0}),executeNode:async(k,v)=>{let x=this.registry.executor(k.type);return x?x(k,v):void 0}},f=new Set,u=new Set,c=hr(this.injector,this.nodeInterceptors()),m=await this.executeFromNode(l,a,i,n,o,d,f,c,!!o.resumeFrom,u);n.status==="cancelled"||this.isCancelled(n)?(n.status="cancelled",this.finishPendingNodes(n,"skipped"),this.emit(o,n,{type:"workflow-cancelled",status:"cancelled"})):(n.status=m.success?"completed":"failed",!m.success&&m.error&&(n.error=m.error),this.finishPendingNodes(n,(m.success,"skipped")),this.finishIdleEdges(n,"skipped"),this.emit(o,n,{type:m.success?"workflow-end":"workflow-error",status:n.status,error:m.error})),n.endTime=Date.now(),n.currentNodeId=void 0,this.checkpoint(o,n);let y=wt(n);return{success:n.status==="completed",data:{executionId:r,workflowId:e.id,status:n.status,nodeResults:Object.fromEntries(n.nodeResults),executionState:y,...m.data||{}},error:m.error||n.error}}catch(a){return n.status="failed",n.endTime=Date.now(),n.currentNodeId=void 0,n.error=a,this.finishPendingNodes(n,"skipped"),this.finishIdleEdges(n,"skipped"),this.emit(o,n,{type:"workflow-error",status:"failed",error:a}),this.checkpoint(o,n),{success:!1,error:a,data:{executionId:r,workflowId:e?.id,status:n.status,executionState:wt(n)}}}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let o=e?.services||{};return{...e,services:{...t,...o}}}createState(e,t){let o=new Map;(e.nodes||[]).forEach(i=>{o.set(i.id,{nodeId:i.id,status:"pending"})});let r=new Map;return(e.connections||[]).forEach(i=>{r.set(i.id,{connectionId:i.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:o,edgeStates:r,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,o){let r=this.createState(e,o);r.status="running",r.startTime=t.startTime||r.startTime,r.endTime=void 0,r.currentNodeId=void 0,r.activeNodeIds=[],r.logs=[...t.logs||[]];let i=t.nodeStates||{};for(let a of e.nodes||[]){let l=i[a.id];l&&(r.nodeStates?.set(a.id,{...l}),l.result&&r.nodeResults.set(a.id,{success:l.result.success,data:l.result.data,error:l.error?new Error(String(l.error)):void 0}))}let n=t.edgeStates||{};for(let a of e.connections||[]){let l=n[a.id];l&&r.edgeStates?.set(a.id,{...l})}return r}existingNodeResult(e,t,o){return o.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(wt(t))}catch{}}async executeFromNode(e,t,o,r,i,n,a,l,d=!1,f=new Set){if(r.status==="cancelled"||this.isCancelled(r))return r.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(a.has(e.id))return r.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};let u=r.nodeStates?.get(e.id),c=u&&(u.status==="success"||u.status==="failed"||u.status==="skipped"||u.status==="cancelled"),m;if(c&&d&&(u.status==="success"||u.status==="failed")){if(f.has(e.id))return this.existingNodeResult(e.id,u,r);f.add(e.id),a.add(e.id),m=this.existingNodeResult(e.id,u,r)}else{if(c)return a.add(e.id),this.existingNodeResult(e.id,u,r);if(e.type==="join"&&!this.isJoinReady(t,r,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};a.add(e.id),m=await l.handleNode({node:e,context:o,host:n,state:r,options:i,emit:v=>this.emit(i,r,v)}),this.checkpoint(i,r)}if(!m.success){let v=t.outgoing.get(e.id)||[],x=v.filter(N=>N.sourcePort==="error");if(!x.length)return m;for(let N of v)N.sourcePort!=="error"&&this.markEdgeSkipped(r,N.id,i);let C={...o,error:m.error,errorMessage:m.error?.message,failedNodeId:e.id,failedResult:m};for(let N of x){let ce=t.nodes.get(N.targetNodeId);if(!ce)continue;this.markEdgeTraversed(r,N,i);let je=await this.executeFromNode(ce,t,C,r,i,n,a,l,d,f);if(!je.success)return je}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return m;let y=this.selectNextConnections(e,t,o,m),k=new Set(y.map(v=>v.id));for(let v of t.outgoing.get(e.id)||[])k.has(v.id)||this.markEdgeSkipped(r,v.id,i);if(e.type==="parallel"&&y.length>1)return(await Promise.all(y.map(C=>{let N=t.nodes.get(C.targetNodeId);return N?(this.markEdgeTraversed(r,C,i),this.executeFromNode(N,t,this.mergeContext(o,m,C),r,i,n,a,l,d,f)):Promise.resolve({success:!1,error:new Error(`Missing node ${C.targetNodeId}`)})}))).find(C=>!C.success)||m;for(let v of y){let x=t.nodes.get(v.targetNodeId);if(!x)continue;this.markEdgeTraversed(r,v,i);let C=await this.executeFromNode(x,t,this.mergeContext(o,m,v),r,i,n,a,l,d,f);if(!C.success)return C}return m}mergeContext(e,t,o){return{...e,...t.data||{}}}isJoinReady(e,t,o){let r=e.incoming.get(o)||[];if(!r.length)return!0;let i=r.map(a=>t.nodeStates?.get(a.sourceNodeId)?.status);return i.every(a=>a==="success"||a==="failed"||a==="skipped"||a==="cancelled")&&i.some(a=>a==="success")}selectNextConnections(e,t,o,r){let i=t.outgoing.get(e.id)||[];if(!i.length)return[];if(e.type==="condition"){let n=r.data?.condition?"true":"false",a=i.filter(l=>l.sourcePort===n);return a.length?a:i.filter(l=>l.sourcePort!=="true"&&l.sourcePort!=="false")}if(e.type==="switch"){let n=r.data?.condition,a=n==null?"":String(n),l=i.filter(f=>f.sourcePort===a);if(l.length)return l;let d=i.filter(f=>f.sourcePort==="default");return d.length?d:i.filter(f=>f.sourcePort==="out")}return i.filter(n=>n.sourcePort==="error"?!1:n.condition===void 0||n.condition===null?!0:typeof n.condition=="function"?!!n.condition(o):typeof n.condition=="boolean"?n.condition:!!Z(n.condition,o))}markEdgeTraversed(e,t,o){let r=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};r.status!=="traversed"&&(r.status="traversed",r.traversedAt=Date.now(),r.count=(r.count||0)+1,e.edgeStates?.set(t.id,r),this.emit(o,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"}))}markEdgeSkipped(e,t,o){let r=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};r.status!=="traversed"&&(r.status="skipped",e.edgeStates?.set(t,r),this.emit(o,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((o,r)=>{(o.status==="pending"||o.status==="idle")&&(o.status=t,e.nodeStates?.set(r,o))})}finishIdleEdges(e,t){e.edgeStates?.forEach((o,r)=>{(o.status==="idle"||o.status==="active")&&(o.status=t,e.edgeStates?.set(r,o))})}emit(e,t,o){let r=Date.now(),i={...o,executionId:t.executionId,workflowId:t.workflowId,timestamp:r,snapshot:wt(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:r,level:this.logLevelFor(o.type,o.status),event:o.type,message:this.logMessageFor(t,o),nodeId:o.nodeId,connectionId:o.connectionId}),t.logs.length>Nr&&t.logs.splice(0,t.logs.length-Nr)),e.onEvent)try{e.onEvent(i)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let o=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return o?.success===!1?`Node ${t.nodeId} failed: ${o.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=Tr){let t=Math.max(1,Number(e)||Tr),o=Array.from(this.executions.values()).filter(r=>r.status!=="running").sort((r,i)=>(r.endTime||0)-(i.endTime||0));for(;o.length>t;){let r=o.shift();r&&this.executions.delete(r.executionId)}}validate(e){return Ne(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?wt(t):void 0}getExecutions(){return Array.from(this.executions.values())}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[q,D,ne])(ae);h(ae,[[S(),3,void 0,2],[S(),3,void 0,1],[b(),0]]);var Be=class s{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,o){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,o){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,o){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,o){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:o||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,o){let r={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:o?.sourcePort||"out",targetNodeId:t,targetPort:o?.targetPort||"in",label:o?.label,condition:o?.condition};return this.connections.push(r),this}connectNodes(e,t,o="out",r="in"){return this.connect(e,t,{sourcePort:o,targetPort:r})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new s}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};h(Be,[[b(),0]]);var vs={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},A=class{constructor(e){this.translator=e,this.model=vs,this.locale="zh-CN",this.theme="light",this.hiddenActions=[]}visible(e){return!(Array.isArray(this.hiddenActions)?this.hiddenActions:[]).includes(e)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,o){return R(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,o)}get runLabel(){return this.t("run","Run")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}run(){(this.runAction||(()=>this.action?.("run")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(A.prototype,"model");Reflect.metadata("design:type",Object)(A.prototype,"locale");Reflect.metadata("design:type",Object)(A.prototype,"theme");Reflect.metadata("design:type",Function)(A.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(A.prototype,"runAction");Reflect.metadata("design:type",Function)(A.prototype,"resumeAction");Reflect.metadata("design:type",Function)(A.prototype,"cancelAction");Reflect.metadata("design:type",Function)(A.prototype,"undoAction");Reflect.metadata("design:type",Function)(A.prototype,"redoAction");Reflect.metadata("design:type",Function)(A.prototype,"deleteAction");Reflect.metadata("design:type",Function)(A.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(A.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(A.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(A.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(A.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(A.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(A.prototype,"saveAction");Reflect.metadata("design:type",Function)(A.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(A.prototype,"clearAction");Reflect.metadata("design:type",Function)(A.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(A.prototype,"action");Reflect.metadata("design:type",Array)(A.prototype,"hiddenActions");Reflect.metadata("design:paramtypes",[E])(A);h(A,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"runAction"],[p(),1,"resumeAction"],[p(),1,"cancelAction"],[p(),1,"undoAction"],[p(),1,"redoAction"],[p(),1,"deleteAction"],[p(),1,"zoomInAction"],[p(),1,"zoomOutAction"],[p(),1,"resetViewAction"],[p(),1,"autoLayoutAction"],[p(),1,"duplicateAction"],[p(),1,"toggleLogsAction"],[p(),1,"saveAction"],[p(),1,"openLibraryAction"],[p(),1,"clearAction"],[p(),1,"toggleJsonAction"],[p(),1,"action"],[p(),1,"hiddenActions"],[S(),3,void 0,0],[T({selector:"workflow-toolbar",template:`
    <div class="workflow-toolbar">
        <span class="workflow-toolbar-title">{{model.name}}</span>
        <span class="workflow-toolbar-meta">{{nodeLabel}} \xB7 {{connectionLabel}}</span>
        <span class="workflow-toolbar-status">{{model.statusLabel}}</span>
        <span class="workflow-status-spacer"></span>
        <button v-if="visible('run')" class="workflow-btn workflow-btn-primary" [disabled]="model.running || !model.nodeCount" @click="run">{{runLabel}}</button>
        <button v-if="visible('resume')" class="workflow-btn" [disabled]="!model.canResume" @click="resume">{{resumeLabel}}</button>
        <button v-if="visible('cancel')" class="workflow-btn" [disabled]="!model.running" @click="cancel">{{stopLabel}}</button>
        <button v-if="visible('undo')" class="workflow-btn" [disabled]="!model.canUndo" @click="undo">{{undoLabel}}</button>
        <button v-if="visible('redo')" class="workflow-btn" [disabled]="!model.canRedo" @click="redo">{{redoLabel}}</button>
        <button v-if="visible('delete')" class="workflow-btn workflow-btn-danger" [disabled]="!model.hasSelection" @click="remove">{{deleteLabel}}</button>
        <button v-if="visible('zoom')" class="workflow-btn" @click="zoomOut">\u2212</button>
        <span v-if="visible('zoom')" class="workflow-toolbar-zoom">{{model.zoomLabel}}</span>
        <button v-if="visible('zoom')" class="workflow-btn" @click="zoomIn">+</button>
        <button v-if="visible('reset-view')" class="workflow-btn" @click="resetView">{{resetLabel}}</button>
        <button v-if="visible('auto-layout')" class="workflow-btn" @click="autoLayout">{{layoutLabel}}</button>
        <button v-if="visible('duplicate')" class="workflow-btn" [disabled]="!model.hasSelection" @click="duplicate">{{duplicateLabel}}</button>
        <button v-if="visible('toggle-logs')" class="workflow-btn" @click="toggleLogs">{{logsLabel}}</button>
        <button v-if="visible('save')" class="workflow-btn" @click="save">{{saveLabel}}</button>
        <button v-if="visible('open-library')" class="workflow-btn" @click="openLibrary">{{libraryLabel}}</button>
        <button v-if="visible('toggle-json')" class="workflow-btn" @click="toggleJson">JSON</button>
        <button v-if="visible('clear')" class="workflow-btn" [disabled]="!model.nodeCount" @click="clear">{{clearLabel}}</button>
    </div>`}),0]]);var Ar=["light","dark","solarized","high-contrast"],Er={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},W=class{constructor(e){this.translator=e,this.model=Er,this.locale="zh-CN",this.theme="light",this.actionBus=Tt,this.menuSelect=t=>{if(globalThis.__workflowMenuHandled=t,t.startsWith("language:")){let o=t.slice(9);(o==="en"||o==="zh-CN")&&(!this.actionBus&&this.localeChangeAction?this.localeChangeAction(o):this.dispatch(t));return}if(t.startsWith("theme:")){let o=t.slice(6);Ar.includes(o)&&(!this.actionBus&&this.themeChangeAction?this.themeChangeAction(o):this.dispatch(t));return}this.dispatch(t)}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get themeName(){return he(this.theme)?this.theme:"light"}t(e,t){return R(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get menuLabel(){return this.t("menu","Menu")}get menuGroups(){let e=this.model||Er,t=this.cache;if(t&&t.model===e&&t.theme===this.theme&&t.locale===this.locale)return t.groups;let o=(i,n)=>this.t(i,n),r=[{items:[{id:"save",label:o("save","Save"),shortcut:"Ctrl+S"},{id:"open-library",label:o("library","Workflows")},{id:"toggle-json",label:o("jsonMenu","Import / Export JSON")}]},{items:[{id:"run",label:o("run","Run"),icon:"\u25B6",disabled:e.running||!e.nodeCount},{id:"resume",label:o("resume","Resume"),icon:"\u23F5",disabled:!e.canResume},{id:"cancel",label:o("stop","Stop"),icon:"\u25A0",disabled:!e.running}]},{items:[{id:"undo",label:o("undo","Undo"),shortcut:"Ctrl+Z",disabled:!e.canUndo},{id:"redo",label:o("redo","Redo"),shortcut:"Ctrl+Y",disabled:!e.canRedo},{id:"duplicate",label:o("duplicate","Duplicate"),shortcut:"Ctrl+D",disabled:!e.hasSelection},{id:"delete",label:o("delete","Delete"),shortcut:"Del",disabled:!e.hasSelection,danger:!0},{id:"clear",label:o("clear","Clear"),disabled:!e.nodeCount}]},{items:[{id:"reset-view",label:o("fit","Fit")},{id:"auto-layout",label:o("layout","Auto layout")},{id:"toggle-logs",label:o("logs","Logs")},{id:"theme",label:o("themeMenu","Theme"),icon:"\u25D0",children:Ar.map(i=>({id:`theme:${i}`,label:this.themeOptionLabel(i),checked:this.themeName===i}))}]},{items:[{id:"language",label:o("language","Language"),icon:"\u6587",children:[{id:"language:en",label:"English",checked:!this.isZh},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.isZh}]},{id:"shortcuts",label:o("shortcuts","Keyboard shortcuts"),shortcut:"?"}]}];return this.cache={model:e,theme:this.theme,locale:this.locale,groups:r},r}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}dispatch(e){this.actionBus?this.actionBus.emit(e):this.action?.(e)}};Reflect.metadata("design:type",Object)(W.prototype,"model");Reflect.metadata("design:type",Object)(W.prototype,"locale");Reflect.metadata("design:type",Object)(W.prototype,"theme");Reflect.metadata("design:type",Function)(W.prototype,"action");Reflect.metadata("design:type",Function)(W.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(W.prototype,"localeChangeAction");Reflect.metadata("design:type",Object)(W.prototype,"cache");Reflect.metadata("design:paramtypes",[E])(W);h(W,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"action"],[p(),1,"themeChangeAction"],[p(),1,"localeChangeAction"],[z(),1,"cache"],[S(),3,void 0,0],[T({selector:"workflow-management-menu",template:`
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="\u2630" label="" caret="\u25BE" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var Q=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return R(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes",this.isZh?"\u641C\u7D22\u8282\u70B9\u2026":"Search nodes\u2026")}get noMatchesLabel(){return R(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches",this.isZh?"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9":"No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(o=>this.matches(o,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(o=>String(o).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(Q.prototype,"groups");Reflect.metadata("design:type",Object)(Q.prototype,"locale");Reflect.metadata("design:type",Function)(Q.prototype,"addAction");Reflect.metadata("design:type",Function)(Q.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[E])(Q);h(Q,[[p(),1,"groups"],[p(),1,"locale"],[p(),1,"addAction"],[p(),1,"dragStartAction"],[S(),3,void 0,0],[T({selector:"workflow-palette",template:`
    <div class="workflow-palette">
        <div class="workflow-palette-search">
            <input class="workflow-palette-search-input" type="search"
                placeholder="{{searchPlaceholder}}"
                aria-label="{{searchPlaceholder}}"
                [value]="query"
                @input="search($event)"
                @keydown="searchKeydown($event)" />
        </div>
        <div class="workflow-palette-empty" v-if="query && !visibleGroups.length">{{noMatchesLabel}}</div>
        <div class="workflow-palette-group" v-for="group in visibleGroups">
            <div class="workflow-palette-title">{{group.label}}</div>
            <div class="workflow-palette-item"
                 v-for="entry in group.items"
                 draggable="true"
                 [title]="entry.description"
                 data-node-type="{{entry.type}}"
                 @click="add(entry)"
                 @dragstart="dragStart($event, entry)">
                <span class="workflow-palette-icon" data-node-type="{{entry.type}}">{{entry.icon}}</span>
                <span class="workflow-palette-text">
                    <span class="workflow-palette-label">{{entry.label}}</span>
                    <span class="workflow-palette-desc">{{entry.description}}</span>
                </span>
            </div>
        </div>
    </div>`}),0]]);var xs={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},ee=class{constructor(e){this.elementRef=e,this.model=xs,this.locale="zh-CN"}get emptyHint(){return String(this.locale||"").toLowerCase().startsWith("zh")?"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0":"Drag a component from the palette, or click one to add it"}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,o){return{class:`workflow-node-port workflow-node-port-${o}`,"data-port-id":t.id,"data-port-side":o,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,o=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,o-this.panStart.clientY),this.panStart={clientX:t,clientY:o}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,o,r){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}portUp(e,t,o,r){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,o=this.model.pan||{x:0,y:0},r=this.elementRef?.nativeElement,i=r?.querySelector?.(".workflow-canvas")||r,n=i?.getBoundingClientRect?.()||{left:0,top:0},a=Number(e?.clientX),l=Number(e?.clientY),d=(Number.isFinite(a)?a:0)-(n.left||0)+(i?.scrollLeft||0),f=(Number.isFinite(l)?l:0)-(n.top||0)+(i?.scrollTop||0);return{x:(d-o.x)/t,y:(f-o.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)(ee.prototype,"model");Reflect.metadata("design:type",Object)(ee.prototype,"locale");Reflect.metadata("design:type",Function)(ee.prototype,"pointerAction");Reflect.metadata("design:type",Function)(ee.prototype,"panAction");Reflect.metadata("design:paramtypes",[pe])(ee);h(ee,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"pointerAction"],[p(),1,"panAction"],[S(),3,void 0,0],[T({selector:"workflow-canvas",template:`
    <div class="workflow-canvas"
         tabindex="0"
         data-connecting="{{model.connecting}}"
         data-connecting-side="{{model.connectingSide}}"
         [style]="canvasStyle"
         @mousedown="backgroundDown($event)"
         @mousemove="pointerMove($event)"
         @mouseup="pointerUp($event)"
         @mouseleave="pointerLeave($event)"
         @dragover="dragOver($event)"
         @drop="drop($event)"
         @keydown="keyDown($event)"
         @wheel="wheel($event)">
        <div class="workflow-canvas-empty" v-if="!model.nodes.length">{{emptyHint}}</div>
        <div class="workflow-canvas-content" [style]="contentStyle">
            <svg class="workflow-canvas-edges" v-bind="svgAttrs">
                <defs>
                    <marker id="wf-arrow-idle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-idle"/></marker>
                    <marker id="wf-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-active"/></marker>
                    <marker id="wf-arrow-traversed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-traversed"/></marker>
                    <marker id="wf-arrow-skipped" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-skipped"/></marker>
                </defs>
                <path v-for="edge in model.edges" v-bind="edge.attrs"></path>
                <path v-for="edge in model.edges" v-bind="edge.hitAttrs"
                      @mousedown="edgeDown($event)"
                      @click="edgeClick($event, edge)"></path>
                <text v-for="edge in model.edges" v-if="edge.label" v-bind="edge.labelAttrs">{{edge.label}}</text>
                <g v-if="model.draft">
                    <path v-bind="model.draft ? model.draft.attrs : {}"></path>
                </g>
            </svg>
            <div class="workflow-canvas-nodes">
                <div v-for="node in model.nodes"
                     v-bind="node.attrs"
                     @mousedown="nodeDown($event, node)"
                     @mouseup="nodeUp($event, node)">
                    <div class="workflow-node-header">
                        <span class="workflow-node-icon">{{node.icon}}</span>
                        <span class="workflow-node-title">{{node.name}}</span>
                        <span class="workflow-node-status" v-if="node.statusLabel">{{node.statusLabel}}</span>
                    </div>
                    <div class="workflow-node-body">
                        <span class="workflow-node-type">{{node.typeLabel}}</span>
                        <span class="workflow-node-desc">{{node.description}}</span>
                    </div>
                    <span v-for="port in node.inputs"
                          v-bind="portAttrs(node, port, 'input')"
                          @mousedown="portDown($event, node, port, 'input')"
                          @mouseup="portUp($event, node, port, 'input')"></span>
                    <span v-for="port in node.outputs"
                          v-bind="portAttrs(node, port, 'output')"
                          @mousedown="portDown($event, node, port, 'output')"
                          @mouseup="portUp($event, node, port, 'output')"></span>
                </div>
            </div>
        </div>
    </div>`}),0]]);var Lr={hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function Cs(s){return s.hasSelection?JSON.stringify([s.nodeId,s.name,s.description,s.typeLabel,s.status,s.statusLabel,s.durationLabel,s.resultText,s.errorText,s.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var F=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=Lr,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let o=this.changeType(t.field);if(o==="code"){this.queueChange(t.key,t.value,o);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,o,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||Lr,o=Cs(t);o!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=o,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return R(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage",this.isZh?"\u5FC5\u586B\u9879":"Required")}get numberMessage(){return this.t("numberMessage",this.isZh?"\u6570\u503C\u8D85\u51FA\u8303\u56F4":"Number out of range")}get patternMessage(){return this.t("patternMessage",this.isZh?"\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid format")}get jsonMessage(){return this.t("jsonMessage",this.isZh?"JSON \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid JSON")}get emailMessage(){return this.t("invalidEmail",this.isZh?"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid email address")}get urlMessage(){return this.t("invalidUrl",this.isZh?"URL \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid URL")}get integerMessage(){return this.t("integerMessage",this.isZh?"\u8BF7\u8F93\u5165\u6574\u6570":"Must be an integer")}get formSchema(){let e=[];return this._model.hasSelection?(e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),this._model.fields.forEach(t=>{e.push({key:t.key,type:this.dynamicType(t),label:t.label,placeholder:t.placeholder,description:t.description,group:t.group,options:t.options.map(o=>({label:o.label,value:o.value})),defaultValue:t.hasDefault?t.resetValue:void 0,rows:t.rows,min:t.min,max:t.max,step:t.step,required:t.required,readonly:t.readonly,pattern:t.pattern,language:t.language,suggestions:this.codeSuggestions,hidden:t.visible===!1})}),{fields:e}):{fields:e}}get formValue(){let e={name:this._model.name,description:this._model.description};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){switch(e.type){case"code":return"code";case"json":return"json";case"textarea":return"textarea";case"boolean":return"checkbox";case"select":return"radio";case"number":return"number";default:return"text"}}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"code":return"code";default:return"text"}}queueChange(e,t,o){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:o,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let r=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),r)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(F.prototype,"locale");Reflect.metadata("design:type",Object)(F.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(F.prototype,"changeAction");Reflect.metadata("design:type",Function)(F.prototype,"restoreAction");Reflect.metadata("design:type",Array)(F.prototype,"codeSuggestions");Reflect.metadata("design:type",Yt)(F.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[E])(F);Reflect.metadata("design:paramtypes",[])(F.prototype,"model");Reflect.metadata("design:returntype",Object)(F.prototype,"model");h(F,[[p(),1,"locale"],[p(),1,"codeChangeDelay"],[p(),1,"changeAction"],[p(),1,"restoreAction"],[p(),1,"codeSuggestions"],[St("nodeForm",Yt),1,"nodeForm"],[S(),3,void 0,0],[p(),1,"model"],[T({selector:"workflow-inspector",template:`
    <div class="workflow-inspector">
        <div class="workflow-inspector-title">{{titleLabel}}</div>
        <div class="workflow-inspector-empty" v-if="!model.hasSelection">{{emptyLabel}}</div>
        <div v-if="model.hasSelection">
            <div class="workflow-inspector-head">
                <span class="workflow-inspector-type">{{model.typeLabel}}</span>
                <span class="workflow-inspector-id" v-if="model.nodeId">{{model.nodeId}}</span>
                <span class="workflow-inspector-status" v-if="model.statusLabel">{{model.statusLabel}}</span>
                <span class="workflow-inspector-duration" v-if="model.durationLabel">{{model.durationLabel}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-inspector-restore" v-if="model.fields.length" type="button"
                    @click="restoreDefaults">{{restoreLabel}}</button>
            </div>
            <dynamic-form #nodeForm classPrefix="workflow" :schema="formSchema" :value="formValue"
                :contextKey="model.nodeId" :messages="formMessages" :emptyLabel="noPropertiesLabel"
                :resetFieldLabel="resetFieldLabel" :changeAction="formChange" :blurAction="formBlur">
            </dynamic-form>
            <div class="workflow-no-fields" v-if="!model.fields.length">{{noPropertiesLabel}}</div>
            <div class="workflow-result" v-if="model.resultText">
                <div class="workflow-result-title">{{resultLabel}}</div>
                <pre class="workflow-result-pre">{{model.resultText}}</pre>
            </div>
            <div class="workflow-error" v-if="model.errorText">{{model.errorText}}</div>
        </div>
    </div>`}),0]]);var le=class{constructor(){this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return this.isZh?"\u8FD0\u884C\u5386\u53F2":"Runs"}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(le.prototype,"items");Reflect.metadata("design:type",Object)(le.prototype,"locale");Reflect.metadata("design:type",Function)(le.prototype,"selectAction");h(le,[[p(),1,"items"],[p(),1,"locale"],[p(),1,"selectAction"],[T({selector:"workflow-run-history",template:`
    <div class="workflow-run-history" v-show="items.length">
        <span class="workflow-run-history-title">{{title}}</span>
        <button class="workflow-run-chip"
                v-for="item in items"
                [class]="chipClass(item)"
                data-execution-id="{{item.executionId}}"
                [title]="item.statusLabel + ' \xB7 ' + item.durationLabel"
                @click="select(item)">
            <span class="workflow-run-chip-dot"></span>
            <span class="workflow-run-chip-time">{{item.label}}</span>
            <span class="workflow-run-chip-status">{{item.statusLabel}}</span>
            <span class="workflow-run-chip-duration" v-if="item.durationLabel">{{item.durationLabel}}</span>
        </button>
    </div>`}),0]]);var te=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return R(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle",this.isZh?"\u6267\u884C\u65E5\u5FD7":"Execution log")}get closeLabel(){return R(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close",this.isZh?"\u5173\u95ED":"Close")}levelLabel(e){let t={info:this.isZh?"\u4FE1\u606F":"INFO",success:this.isZh?"\u6210\u529F":"OK",warning:this.isZh?"\u544A\u8B66":"WARN",error:this.isZh?"\u9519\u8BEF":"ERROR"};return R(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),o=r=>String(r).padStart(2,"0");return`${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(te.prototype,"items");Reflect.metadata("design:type",Object)(te.prototype,"visible");Reflect.metadata("design:type",Object)(te.prototype,"locale");Reflect.metadata("design:type",Function)(te.prototype,"closeAction");Reflect.metadata("design:paramtypes",[E])(te);h(te,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"locale"],[p(),1,"closeAction"],[S(),3,void 0,0],[T({selector:"workflow-run-log",template:`
    <div class="workflow-run-log" v-show="visible && items.length">
        <div class="workflow-run-log-head">
            <span class="workflow-run-log-title">{{title}}</span>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-run-log-body">
            <div class="workflow-run-log-row" v-for="item in items" [class]="rowClass(item)">
                <span class="workflow-run-log-time">{{formatTime(item.timestamp)}}</span>
                <span class="workflow-run-log-level">{{levelLabel(item.level)}}</span>
                <span class="workflow-run-log-message">{{item.message}}</span>
            </div>
        </div>
    </div>`}),0]]);var _=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return R(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return R(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",this.isZh?`${e.nodeCount} \u4E2A\u8282\u70B9`:`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(_.prototype,"items");Reflect.metadata("design:type",Object)(_.prototype,"visible");Reflect.metadata("design:type",Object)(_.prototype,"currentId");Reflect.metadata("design:type",Object)(_.prototype,"locale");Reflect.metadata("design:type",Object)(_.prototype,"error");Reflect.metadata("design:type",Function)(_.prototype,"saveAction");Reflect.metadata("design:type",Function)(_.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(_.prototype,"openAction");Reflect.metadata("design:type",Function)(_.prototype,"removeAction");Reflect.metadata("design:type",Function)(_.prototype,"closeAction");Reflect.metadata("design:paramtypes",[E])(_);h(_,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"currentId"],[p(),1,"locale"],[p(),1,"error"],[p(),1,"saveAction"],[p(),1,"saveAsAction"],[p(),1,"openAction"],[p(),1,"removeAction"],[p(),1,"closeAction"],[S(),3,void 0,0],[T({selector:"workflow-library",template:`
    <div class="workflow-library-panel" v-show="visible">
        <div class="workflow-library-head">
            <span class="workflow-library-title">{{title}}</span>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn workflow-btn-primary" @click="save">{{saveLabel}}</button>
            <button class="workflow-btn" @click="saveAs">{{saveAsLabel}}</button>
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-library-list">
            <div class="workflow-library-empty" v-if="!items.length">{{emptyLabel}}</div>
            <div class="workflow-library-row" v-for="item in items" [class]="rowClass(item)">
                <span class="workflow-library-row-main">
                    <span class="workflow-library-row-name">{{item.name}}</span>
                    <span class="workflow-library-row-meta">{{nodeLabel(item)}} \xB7 {{item.updatedAt}}</span>
                </span>
                <button class="workflow-btn" @click="open(item)">{{openLabel}}</button>
                <button class="workflow-btn workflow-btn-danger" @click="remove(item)">{{removeLabel}}</button>
            </div>
        </div>
        <div class="workflow-library-error" v-if="error">{{error}}</div>
    </div>`}),0]]);var Or="tsdi-workflow-designer-styles",Ss=`
.workflow-designer {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 420px;
    background: #f8fafc;
    color: #0f172a;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --workspace-splitter: #e2e8f0;
    --workspace-splitter-hover: #93c5fd;
    --workspace-pane-bg: transparent;
    --workspace-collapse-bg: #ffffff;
    --workspace-collapse-color: #475569;
    --workspace-collapse-border: #e2e8f0;
    --workspace-collapse-hover-color: #2563eb;
    --workspace-collapse-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
    --workspace-scrollbar-size: 10px;
    --workspace-scrollbar-track: transparent;
    --workspace-scrollbar-thumb: #cbd5e1;
    --workspace-scrollbar-thumb-hover: #94a3b8;
    scrollbar-color: var(--workspace-scrollbar-thumb) var(--workspace-scrollbar-track);
    scrollbar-width: thin;
}

/* The designer owns every scroll surface (layout panes, canvas, inspector,
   run log and nested CodeMirror scrollers), so theme their scrollbars too. */
.workflow-designer *::-webkit-scrollbar {
    width: var(--workspace-scrollbar-size, 10px);
    height: var(--workspace-scrollbar-size, 10px);
}

.workflow-designer *::-webkit-scrollbar-track {
    background: var(--workspace-scrollbar-track, transparent);
}

.workflow-designer *::-webkit-scrollbar-thumb {
    background: var(--workspace-scrollbar-thumb, #cbd5e1);
    border-radius: 999px;
}

.workflow-designer *::-webkit-scrollbar-thumb:hover {
    background: var(--workspace-scrollbar-thumb-hover, #94a3b8);
}

.workflow-designer *::-webkit-scrollbar-corner {
    background: transparent;
}

.workflow-designer .is-hidden,
.workflow-designer [hidden] {
    display: none !important;
}

/* Global management bar: workflow tabs + host-level management menu */
.workflow-global-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    background: var(--wf-theme-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
}

.workflow-global-bar .workflow-tabs {
    flex: 1;
    min-width: 0;
    padding: 0;
    border-bottom: 0;
}

.workflow-management-menu {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    padding-right: 2px;
}

/* Open workflow tabs */
.workflow-tabs {
    display: block;
    padding: 0 8px;
    background: var(--wf-theme-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--wf-theme-border, #e2e8f0);
}

.workflow-tabs .tab-bar {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 32px;
    margin: 0;
    padding: 6px 0 0;
    overflow-x: auto;
}

.workflow-tabs .tab {
    display: inline-flex;
    align-items: center;
    max-width: 220px;
    padding: 6px 10px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    color: var(--wf-theme-muted, #64748b);
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
}

.workflow-tabs .tab:hover {
    background: var(--wf-theme-surface, #ffffff);
}

.workflow-tabs .tab[aria-selected="true"] {
    background: var(--wf-theme-surface, #ffffff);
    border-color: var(--wf-theme-border, #e2e8f0);
    color: var(--wf-theme-text, #0f172a);
    font-weight: 600;
}

.workflow-tabs .tab-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-tabs .tab-close {
    margin-left: 8px;
    color: var(--wf-theme-muted, #64748b);
    cursor: pointer;
}

.workflow-tabs .tab[aria-selected="true"] .tab-close:hover {
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-tabs .tab-new {
    padding: 6px 8px;
    color: var(--wf-theme-primary, #2563eb);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
}

.workflow-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #ffffff;
}

.workflow-toolbar-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    margin-right: 4px;
}

.workflow-toolbar-meta,
.workflow-toolbar-zoom {
    font-size: 11px;
    color: #64748b;
}

.workflow-toolbar-zoom {
    min-width: 42px;
    text-align: center;
}

.workflow-toolbar-status {
    font-size: 11px;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 999px;
    padding: 2px 8px;
}

.workflow-save-state {
    font-size: 10px;
    line-height: 1.4;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 999px;
    padding: 2px 7px;
}

.workflow-save-state.is-dirty {
    color: #b45309;
    background: #fffbeb;
}

.workflow-save-state.is-saving {
    color: #2563eb;
    background: #eff6ff;
}

.workflow-save-state.is-saved {
    color: #15803d;
    background: #f0fdf4;
}

.workflow-save-state.is-error {
    color: #dc2626;
    background: #fef2f2;
}

.workflow-shortcuts {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.42);
    padding: 24px;
}

.workflow-shortcuts-panel {
    width: min(460px, 100%);
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
}

.workflow-shortcuts-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.workflow-shortcuts-title {
    font-size: 13px;
    font-weight: 700;
}

.workflow-shortcuts-head .workflow-btn {
    margin-left: auto;
}

.workflow-shortcuts-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #334155;
}

.workflow-shortcuts-row kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #334155;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-bottom-width: 2px;
    border-radius: 5px;
    padding: 2px 6px;
    white-space: nowrap;
}

.workflow-menu {
    margin-left: auto;
}

.workflow-menu .menu-bar-trigger {
    padding: 6px 7px;
}

.workflow-btn {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    background: #ffffff;
    color: #334155;
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
}

.workflow-btn:hover:not(:disabled) {
    background: #f1f5f9;
}

.workflow-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.workflow-btn-primary {
    border: 0;
    background: #2563eb;
    color: #ffffff;
}

.workflow-btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
}

.workflow-btn-danger {
    border-color: #fecaca;
    color: #dc2626;
}

workflow-designer-preview {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

.workflow-designer > workflow-designer-preview {
    flex: 1 1 auto;
    min-height: 0;
}

.workflow-designer-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
}

.workflow-designer > .workflow-designer-preview {
    height: auto;
    min-height: 0;
    flex: 1;
}

.workflow-designer > workspace-layout,
.workflow-designer-preview > workspace-layout {
    flex: 1 1 auto;
    min-height: 0;
}

.workflow-designer workspace-left,
.workflow-designer workspace-center,
.workflow-designer workspace-right,
.workflow-designer workspace-bottom {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.workflow-designer workspace-left > workflow-palette,
.workflow-designer workspace-center > workflow-canvas,
.workflow-designer workspace-right > workflow-inspector {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

workflow-canvas {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
}

/* Palette */
.workflow-palette {
    width: 100%;
    flex: 1 1 auto;
    border-right: 1px solid #e2e8f0;
    background: #f8fafc;
    overflow: visible;
    padding: 10px;
    box-sizing: border-box;
}

.workflow-palette-search {
    position: sticky;
    top: -10px;
    z-index: 2;
    padding: 2px 0 8px;
    background: #f8fafc;
}

.workflow-palette-search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 7px 9px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #0f172a;
    font-size: 12px;
    outline: none;
}

.workflow-palette-search-input:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.workflow-palette-empty {
    padding: 8px 2px;
    font-size: 11px;
    color: #64748b;
}

.workflow-palette-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin: 10px 2px 6px;
}

.workflow-palette-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    margin-bottom: 6px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    cursor: grab;
    user-select: none;
}

.workflow-palette-item:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}

.workflow-palette-item:active {
    cursor: grabbing;
}

.workflow-palette-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 13px;
    flex: 0 0 24px;
    background: var(--wf-accent, #64748b);
}

.workflow-palette-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.workflow-palette-label {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
}

.workflow-palette-desc {
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Canvas */
.workflow-canvas {
    position: relative;
    overflow: auto;
    flex: 1;
    min-height: 0;
    min-width: 0;
    outline: none;
    background-color: #f8fafc;
    background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
    background-size: var(--wf-grid-size, 24px) var(--wf-grid-size, 24px);
    background-position: var(--wf-grid-x, 0) var(--wf-grid-y, 0);
    cursor: grab;
}

.workflow-canvas:focus-visible {
    box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
}

.workflow-canvas-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #94a3b8;
    font-size: 13px;
    text-align: center;
    pointer-events: none;
    z-index: 1;
}

.workflow-canvas-content {
    position: relative;
    transform-origin: 0 0;
}

.workflow-canvas-edges {
    position: absolute;
    left: 0;
    top: 0;
    overflow: visible;
    pointer-events: none;
}

.workflow-canvas-nodes {
    position: absolute;
    left: 0;
    top: 0;
}

/* Nodes */
.workflow-node {
    position: absolute;
    background: #ffffff;
    border: 2px solid var(--wf-status, var(--wf-theme-border, #cbd5e1));
    border-radius: 10px;
    box-sizing: border-box;
    cursor: grab;
    user-select: none;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.10);
    transition: box-shadow 120ms ease, border-color 120ms ease, opacity 120ms ease;
}

.workflow-node:active {
    cursor: grabbing;
}

.workflow-node.is-selected {
    border-width: 3px;
    border-color: var(--wf-theme-primary, #2563eb);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}

.workflow-node[data-status="pending"] { --wf-status: #94a3b8; }
.workflow-node[data-status="running"] {
    --wf-status: #2563eb;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.16);
}
.workflow-node[data-status="success"] { --wf-status: #16a34a; }
.workflow-node[data-status="failed"] {
    --wf-status: #dc2626;
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
}
.workflow-node[data-status="skipped"],
.workflow-node[data-status="cancelled"] {
    --wf-status: #94a3b8;
    opacity: 0.55;
}

.workflow-node[data-node-type="start"],
.workflow-palette-icon[data-node-type="start"] { --wf-accent: #22c55e; }
.workflow-node[data-node-type="end"],
.workflow-palette-icon[data-node-type="end"] { --wf-accent: #ef4444; }
.workflow-node[data-node-type="task"],
.workflow-palette-icon[data-node-type="task"] { --wf-accent: #3b82f6; }
.workflow-node[data-node-type="inject"],
.workflow-palette-icon[data-node-type="inject"] { --wf-accent: #0ea5e9; }
.workflow-node[data-node-type="function"],
.workflow-palette-icon[data-node-type="function"] { --wf-accent: #10b981; }
.workflow-node[data-node-type="template"],
.workflow-palette-icon[data-node-type="template"] { --wf-accent: #0891b2; }
.workflow-node[data-node-type="json"],
.workflow-palette-icon[data-node-type="json"] { --wf-accent: #eab308; }
.workflow-node[data-node-type="csv"],
.workflow-palette-icon[data-node-type="csv"] { --wf-accent: #0e7490; }
.workflow-node[data-node-type="change"],
.workflow-palette-icon[data-node-type="change"] { --wf-accent: #f43f5e; }
.workflow-node[data-node-type="statistics"],
.workflow-palette-icon[data-node-type="statistics"] { --wf-accent: #6d28d9; }
.workflow-node[data-node-type="merge"],
.workflow-palette-icon[data-node-type="merge"] { --wf-accent: #059669; }
.workflow-node[data-node-type="event-emit"],
.workflow-palette-icon[data-node-type="event-emit"] { --wf-accent: #db2777; }
.workflow-node[data-node-type="event-wait"],
.workflow-palette-icon[data-node-type="event-wait"] { --wf-accent: #9333ea; }
.workflow-node[data-node-type="command"],
.workflow-palette-icon[data-node-type="command"] { --wf-accent: #334155; }
.workflow-node[data-node-type="split"],
.workflow-palette-icon[data-node-type="split"] { --wf-accent: #65a30d; }
.workflow-node[data-node-type="map"],
.workflow-palette-icon[data-node-type="map"] { --wf-accent: #22c55e; }
.workflow-node[data-node-type="filter"],
.workflow-palette-icon[data-node-type="filter"] { --wf-accent: #84cc16; }
.workflow-node[data-node-type="sort"],
.workflow-palette-icon[data-node-type="sort"] { --wf-accent: #0d9488; }
.workflow-node[data-node-type="range"],
.workflow-palette-icon[data-node-type="range"] { --wf-accent: #7c3aed; }
.workflow-node[data-node-type="batch"],
.workflow-palette-icon[data-node-type="batch"] { --wf-accent: #4f46e5; }
.workflow-node[data-node-type="trigger"],
.workflow-palette-icon[data-node-type="trigger"] { --wf-accent: #ea580c; }
.workflow-node[data-node-type="comment"],
.workflow-palette-icon[data-node-type="comment"] { --wf-accent: #94a3b8; }
.workflow-node[data-node-type="condition"],
.workflow-palette-icon[data-node-type="condition"] { --wf-accent: #f59e0b; }
.workflow-node[data-node-type="switch"],
.workflow-palette-icon[data-node-type="switch"] { --wf-accent: #f97316; }
.workflow-node[data-node-type="parallel"],
.workflow-palette-icon[data-node-type="parallel"] { --wf-accent: #a855f7; }
.workflow-node[data-node-type="join"],
.workflow-palette-icon[data-node-type="join"] { --wf-accent: #0ea5e9; }
.workflow-node[data-node-type="loop"],
.workflow-palette-icon[data-node-type="loop"] { --wf-accent: #b45309; }
.workflow-node[data-node-type="delay"],
.workflow-palette-icon[data-node-type="delay"] { --wf-accent: #64748b; }
.workflow-node[data-node-type="log"],
.workflow-palette-icon[data-node-type="log"] { --wf-accent: #06b6d4; }
.workflow-node[data-node-type="http-request"],
.workflow-palette-icon[data-node-type="http-request"] { --wf-accent: #6366f1; }
.workflow-node[data-node-type="assign"],
.workflow-palette-icon[data-node-type="assign"] { --wf-accent: #8b5cf6; }
.workflow-node[data-node-type="transform"],
.workflow-palette-icon[data-node-type="transform"] { --wf-accent: #14b8a6; }
.workflow-node[data-node-type="trycatch"],
.workflow-palette-icon[data-node-type="trycatch"] { --wf-accent: #ec4899; }
.workflow-node[data-node-type="subprocess"],
.workflow-palette-icon[data-node-type="subprocess"] { --wf-accent: #0f766e; }
.workflow-node[data-node-type="custom"],
.workflow-palette-icon[data-node-type="custom"] { --wf-accent: #6b7280; }

.workflow-node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 8px 8px 0 0;
    background: var(--wf-accent, #64748b);
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    box-sizing: border-box;
}

.workflow-node-icon {
    font-size: 13px;
    line-height: 1;
}

.workflow-node-title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-node-status {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    white-space: nowrap;
}

.workflow-node-body {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.workflow-node-type {
    font-size: 10px;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.workflow-node-desc {
    font-size: 10px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-node-port {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    cursor: crosshair;
    user-select: none;
    touch-action: none;
    z-index: 3;
}

/* Keep a 12px visual dot while the 24px element provides a forgiving hit area. */
.workflow-node-port::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--wf-theme-surface, #ffffff);
    border: 2px solid var(--wf-theme-muted, #64748b);
    box-sizing: border-box;
    transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
}

.workflow-node-port-output::after {
    border-color: var(--wf-theme-primary, #2563eb);
}

.workflow-node-port:hover::after {
    background: #dbeafe;
    transform: translate(-50%, -50%) scale(1.18);
}

/* While a wire is active, make valid target ports obvious. */
.workflow-canvas[data-connecting="true"],
.workflow-canvas[data-connecting="true"] .workflow-node {
    cursor: crosshair;
}

.workflow-canvas[data-connecting="true"][data-connecting-side="output"] .workflow-node-port-input::after,
.workflow-canvas[data-connecting="true"][data-connecting-side="input"] .workflow-node-port-output::after {
    background: #dcfce7;
    border-color: #16a34a;
    transform: translate(-50%, -50%) scale(1.25);
}

.workflow-canvas[data-connecting="true"] .workflow-node:hover {
    border-color: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16), 0 8px 24px rgba(15, 23, 42, 0.16);
}

/* Edges */
.workflow-edge {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 6 6;
    pointer-events: none;
}

.workflow-edge-hit {
    fill: none;
    stroke: transparent;
    stroke-width: 14;
    pointer-events: stroke;
    cursor: pointer;
}

.workflow-edge[data-status="active"] {
    stroke: #2563eb;
    stroke-width: 2.5;
    stroke-dasharray: none;
}

.workflow-edge[data-status="traversed"] {
    stroke: #16a34a;
    stroke-width: 2.5;
    stroke-dasharray: none;
}

.workflow-edge[data-status="skipped"] {
    stroke: #94a3b8;
}

.workflow-edge.is-selected {
    stroke: #2563eb;
    stroke-width: 3;
}

.workflow-edge-draft {
    fill: none;
    stroke: #8b5cf6;
    stroke-width: 2;
    stroke-dasharray: 5 5;
    pointer-events: none;
}

.workflow-edge-label {
    fill: #475569;
    font-size: 11px;
    text-anchor: middle;
    pointer-events: none;
}

.workflow-arrow-idle { fill: #94a3b8; }
.workflow-arrow-active { fill: #2563eb; }
.workflow-arrow-traversed { fill: #16a34a; }
.workflow-arrow-skipped { fill: #94a3b8; }

/* Inspector */
.workflow-inspector {
    width: 100%;
    flex: 1 1 auto;
    border-left: 1px solid #e2e8f0;
    background: #ffffff;
    overflow: visible;
    padding: 12px;
    box-sizing: border-box;
}

.workflow-inspector-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
}

.workflow-inspector-empty {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
}

.workflow-inspector-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
}

.workflow-inspector-type {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-inspector-status {
    font-size: 10px;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 999px;
    padding: 2px 7px;
}

.workflow-inspector-duration {
    font-size: 10px;
    color: #64748b;
}

.workflow-inspector-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #94a3b8;
}

.workflow-inspector-restore {
    margin-left: auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    color: #64748b;
    font-size: 10px;
    padding: 3px 8px;
    cursor: pointer;
}

.workflow-inspector-restore:hover {
    color: #2563eb;
    border-color: #93c5fd;
}

.workflow-field {
    margin-bottom: 10px;
}

.workflow-field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 3px;
}

.workflow-field-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 3px;
}

.workflow-field-label-row .workflow-field-label {
    margin-bottom: 0;
}

.workflow-field-required {
    margin-left: 2px;
    color: #dc2626;
}

.workflow-field-reset {
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

.workflow-field-reset:hover {
    color: #2563eb;
}

.workflow-field-group-title {
    margin: 14px 0 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
}

.workflow-inspector-no-fields,
.workflow-no-fields {
    padding: 6px 0;
    font-size: 11px;
    color: #94a3b8;
}

.workflow-input,
.workflow-select,
.workflow-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
    color: #0f172a;
    background: #ffffff;
}

.workflow-textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    resize: vertical;
}

.workflow-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #334155;
}

.workflow-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.workflow-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #ffffff;
    color: #334155;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}

.workflow-option.is-selected {
    border-color: #2563eb;
    background: #eff6ff;
    color: #1d4ed8;
}

.workflow-option.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.workflow-option input {
    margin: 0;
    accent-color: #2563eb;
}

.workflow-field-hint {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 2px;
}

.workflow-field-error {
    margin-top: 3px;
    font-size: 10px;
    color: #dc2626;
}

.workflow-input.is-invalid,
.workflow-textarea.is-invalid,
.workflow-select.is-invalid,
.workflow-input[aria-invalid="true"],
.workflow-textarea[aria-invalid="true"],
.workflow-select[aria-invalid="true"] {
    border-color: #dc2626;
    background: #fef2f2;
}

.workflow-designer[data-theme="dark"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-input[aria-invalid="true"],
.workflow-designer[data-theme="dark"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-textarea[aria-invalid="true"],
.workflow-designer[data-theme="dark"] .workflow-select[aria-invalid="true"],
.workflow-designer[data-theme="solarized"] .workflow-select[aria-invalid="true"],
.workflow-designer[data-theme="high-contrast"] .workflow-select[aria-invalid="true"] {
    background: rgba(220, 38, 38, 0.14);
    border-color: var(--wf-theme-danger, #f87171);
}

.workflow-code-editor {
    min-height: 150px;
}

.workflow-inspector .CodeMirror {
    height: auto;
    min-height: 150px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    background: #ffffff;
    color: #0f172a;
}

.workflow-inspector .CodeMirror-scroll {
    min-height: 150px;
}

.workflow-inspector .CodeMirror-gutters {
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
}

.workflow-inspector .CodeMirror-linenumber {
    color: #94a3b8;
}

.workflow-inspector .CodeMirror-cursor {
    border-left-color: #0f172a;
}

.CodeMirror-hints {
    z-index: 120;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.2);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
}

.CodeMirror-hint {
    padding: 4px 8px;
    color: #334155;
}

li.CodeMirror-hint-active {
    background: #2563eb;
    color: #ffffff;
}

html[data-theme="dark"] .CodeMirror-hints,
html[data-theme="solarized"] .CodeMirror-hints,
html[data-theme="high-contrast"] .CodeMirror-hints {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
}

html[data-theme="dark"] .CodeMirror-hint,
html[data-theme="solarized"] .CodeMirror-hint,
html[data-theme="high-contrast"] .CodeMirror-hint {
    color: var(--wf-theme-text);
}

html[data-theme="dark"] li.CodeMirror-hint-active,
html[data-theme="solarized"] li.CodeMirror-hint-active,
html[data-theme="high-contrast"] li.CodeMirror-hint-active {
    background: var(--wf-theme-primary);
    color: var(--wf-theme-primary-text, #ffffff);
}

.workflow-designer[data-theme="dark"] .workflow-inspector .CodeMirror,
.workflow-designer[data-theme="solarized"] .workflow-inspector .CodeMirror,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector .CodeMirror {
    background: var(--wf-theme-input);
    color: var(--wf-theme-text);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-inspector .CodeMirror-gutters,
.workflow-designer[data-theme="solarized"] .workflow-inspector .CodeMirror-gutters,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector .CodeMirror-gutters {
    background: var(--wf-theme-surface-alt);
    border-right-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-inspector .CodeMirror-cursor,
.workflow-designer[data-theme="solarized"] .workflow-inspector .CodeMirror-cursor,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector .CodeMirror-cursor {
    border-left-color: var(--wf-theme-text);
}

.workflow-result {
    margin-top: 14px;
}

.workflow-result-title {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    margin-bottom: 4px;
}

.workflow-result-pre {
    margin: 0;
    padding: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 10px;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 180px;
    overflow: auto;
}

.workflow-error {
    margin-top: 10px;
    padding: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 11px;
    color: #b91c1c;
    white-space: pre-wrap;
}

/* Status and JSON panels */
.workflow-run-history {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 6px 12px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
}

.workflow-run-history-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #64748b;
    margin-right: 4px;
}

.workflow-run-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 3px 8px;
    background: #ffffff;
    color: #475569;
    font-size: 10px;
    cursor: pointer;
}

.workflow-run-chip:hover {
    border-color: #93c5fd;
    background: #eff6ff;
}

.workflow-run-chip.is-active {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.workflow-run-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
}

.workflow-run-chip-success .workflow-run-chip-dot { background: #16a34a; }
.workflow-run-chip-failed .workflow-run-chip-dot { background: #dc2626; }
.workflow-run-chip-running .workflow-run-chip-dot { background: #2563eb; }
.workflow-run-chip-cancelled .workflow-run-chip-dot { background: #f97316; }

.workflow-run-chip-status {
    font-weight: 600;
}

.workflow-run-chip-duration {
    color: #94a3b8;
}

.workflow-run-log {
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.workflow-run-log-body {
    overflow: visible;
    min-height: 0;
}

.workflow-run-log-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.workflow-run-log-title {
    font-size: 11px;
    font-weight: 700;
    color: #334155;
}

.workflow-run-log-row {
    display: grid;
    grid-template-columns: 62px 54px minmax(0, 1fr);
    gap: 8px;
    align-items: baseline;
    padding: 2px 0;
    font-size: 10px;
    color: #475569;
}

.workflow-run-log-time {
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
}

.workflow-run-log-level {
    font-weight: 700;
    color: #2563eb;
}

.workflow-run-log-success .workflow-run-log-level { color: #16a34a; }
.workflow-run-log-warning .workflow-run-log-level { color: #d97706; }
.workflow-run-log-error .workflow-run-log-level { color: #dc2626; }

.workflow-run-log-message {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.workflow-statusbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 6px 12px;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    font-size: 11px;
    color: #64748b;
}

.workflow-status-error {
    color: #dc2626;
}

.workflow-status-spacer {
    flex: 1;
}

.workflow-json-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(560px, calc(100vw - 36px));
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    padding: 12px;
    z-index: 30;
}

.workflow-json-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.workflow-json-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-json-text {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    color: #334155;
    background: #f8fafc;
    resize: vertical;
}

.workflow-json-error {
    margin-top: 6px;
    font-size: 11px;
    color: #dc2626;
}

/* Workflow library */
.workflow-library-panel {
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: min(620px, calc(100vw - 36px));
    max-height: min(520px, calc(100vh - 80px));
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
    padding: 12px;
    z-index: 31;
}

.workflow-library-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.workflow-library-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
}

.workflow-library-list {
    overflow: auto;
    min-height: 0;
}

.workflow-library-empty {
    font-size: 12px;
    color: #94a3b8;
    padding: 10px 2px;
}

.workflow-library-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 2px;
    border-top: 1px solid #f1f5f9;
}

.workflow-library-row.is-active .workflow-library-row-name {
    color: #2563eb;
}

.workflow-library-row-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.workflow-library-row-name {
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.workflow-library-row-meta {
    font-size: 10px;
    color: #94a3b8;
}

.workflow-library-error {
    margin-top: 8px;
    font-size: 11px;
    color: #dc2626;
}

/* Themes */
.workflow-designer[data-theme="dark"] {
    --wf-theme-bg: #0b1220;
    --wf-theme-surface: #111827;
    --wf-theme-surface-alt: #0f172a;
    --wf-theme-border: #1e293b;
    --wf-theme-text: #e2e8f0;
    --wf-theme-muted: #94a3b8;
    --wf-theme-input: #0b1220;
    --wf-theme-canvas: #0b1220;
    --wf-theme-grid: #334155;
    --wf-theme-splitter: #334155;
    --wf-theme-splitter-hover: #60a5fa;
    --wf-theme-primary: #3b82f6;
    --wf-theme-primary-text: #ffffff;
    --wf-theme-danger: #f87171;
    --menu-bar-surface: var(--wf-theme-surface);
    --menu-bar-border: var(--wf-theme-border);
    --menu-bar-text: var(--wf-theme-text);
    --menu-bar-muted: var(--wf-theme-muted);
    --menu-bar-hover: #1e293b;
    --menu-bar-separator: var(--wf-theme-border);
    --menu-bar-accent: #60a5fa;
    --menu-bar-danger: var(--wf-theme-danger);
    --menu-bar-shadow: rgba(0, 0, 0, 0.5);
    --workspace-scrollbar-thumb: #334155;
    --workspace-scrollbar-thumb-hover: #60a5fa;
}

.workflow-designer[data-theme="solarized"] {
    --wf-theme-bg: #002b36;
    --wf-theme-surface: #073642;
    --wf-theme-surface-alt: #002b36;
    --wf-theme-border: #586e75;
    --wf-theme-text: #93a1a1;
    --wf-theme-muted: #839496;
    --wf-theme-input: #002b36;
    --wf-theme-canvas: #002b36;
    --wf-theme-grid: #586e75;
    --wf-theme-splitter: #586e75;
    --wf-theme-splitter-hover: #268bd2;
    --wf-theme-primary: #268bd2;
    --wf-theme-primary-text: #ffffff;
    --wf-theme-danger: #dc322f;
    --menu-bar-surface: var(--wf-theme-surface);
    --menu-bar-border: var(--wf-theme-border);
    --menu-bar-text: var(--wf-theme-text);
    --menu-bar-muted: var(--wf-theme-muted);
    --menu-bar-hover: #0b4f5c;
    --menu-bar-separator: var(--wf-theme-border);
    --menu-bar-accent: #268bd2;
    --menu-bar-danger: var(--wf-theme-danger);
    --menu-bar-shadow: rgba(0, 0, 0, 0.5);
    --workspace-scrollbar-thumb: #586e75;
    --workspace-scrollbar-thumb-hover: #268bd2;
}

.workflow-designer[data-theme="high-contrast"] {
    --wf-theme-bg: #000000;
    --wf-theme-surface: #000000;
    --wf-theme-surface-alt: #000000;
    --wf-theme-border: #ffffff;
    --wf-theme-text: #ffffff;
    --wf-theme-muted: #ffffff;
    --wf-theme-input: #000000;
    --wf-theme-canvas: #000000;
    --wf-theme-grid: #444444;
    --wf-theme-splitter: #ffffff;
    --wf-theme-splitter-hover: #ffff00;
    --wf-theme-primary: #ffff00;
    --wf-theme-primary-text: #000000;
    --wf-theme-danger: #ff5555;
    --menu-bar-surface: #000000;
    --menu-bar-border: #ffffff;
    --menu-bar-text: #ffffff;
    --menu-bar-muted: #ffffff;
    --menu-bar-hover: #333333;
    --menu-bar-separator: #ffffff;
    --menu-bar-accent: #ffff00;
    --menu-bar-danger: #ff5555;
    --menu-bar-shadow: rgba(255, 255, 255, 0.25);
    --workspace-scrollbar-thumb: #ffffff;
    --workspace-scrollbar-thumb-hover: #ffff00;
}

.workflow-designer[data-theme="dark"],
.workflow-designer[data-theme="solarized"],
.workflow-designer[data-theme="high-contrast"] {
    background: var(--wf-theme-bg);
    color: var(--wf-theme-text);
    --workspace-splitter: var(--wf-theme-splitter);
    --workspace-splitter-hover: var(--wf-theme-splitter-hover);
    --workspace-pane-bg: var(--wf-theme-surface);
    --workspace-collapse-bg: var(--wf-theme-surface);
    --workspace-collapse-color: var(--wf-theme-text);
    --workspace-collapse-border: var(--wf-theme-border);
    --workspace-collapse-hover-color: var(--wf-theme-primary);
    --workspace-collapse-shadow: var(--menu-bar-shadow);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar,
.workflow-designer[data-theme="solarized"] .workflow-toolbar,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar,
.workflow-designer[data-theme="dark"] .workflow-statusbar,
.workflow-designer[data-theme="solarized"] .workflow-statusbar,
.workflow-designer[data-theme="high-contrast"] .workflow-statusbar,
.workflow-designer[data-theme="dark"] .workflow-run-history,
.workflow-designer[data-theme="solarized"] .workflow-run-history,
.workflow-designer[data-theme="high-contrast"] .workflow-run-history,
.workflow-designer[data-theme="dark"] .workflow-run-log,
.workflow-designer[data-theme="solarized"] .workflow-run-log,
.workflow-designer[data-theme="high-contrast"] .workflow-run-log,
.workflow-designer[data-theme="dark"] .workflow-inspector,
.workflow-designer[data-theme="solarized"] .workflow-inspector,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector,
.workflow-designer[data-theme="dark"] .workflow-library-panel,
.workflow-designer[data-theme="solarized"] .workflow-library-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-library-panel,
.workflow-designer[data-theme="dark"] .workflow-json-panel,
.workflow-designer[data-theme="solarized"] .workflow-json-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-json-panel {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-palette,
.workflow-designer[data-theme="solarized"] .workflow-palette,
.workflow-designer[data-theme="high-contrast"] .workflow-palette {
    background: var(--wf-theme-surface-alt);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-palette-search,
.workflow-designer[data-theme="solarized"] .workflow-palette-search,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-search {
    background: var(--wf-theme-surface-alt);
}

.workflow-designer[data-theme="dark"] .workflow-palette-search-input,
.workflow-designer[data-theme="solarized"] .workflow-palette-search-input,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-search-input {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-palette-empty,
.workflow-designer[data-theme="solarized"] .workflow-palette-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-empty {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-canvas-empty,
.workflow-designer[data-theme="solarized"] .workflow-canvas-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-canvas-empty {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-palette-item,
.workflow-designer[data-theme="solarized"] .workflow-palette-item,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-item,
.workflow-designer[data-theme="dark"] .workflow-run-chip,
.workflow-designer[data-theme="solarized"] .workflow-run-chip,
.workflow-designer[data-theme="high-contrast"] .workflow-run-chip {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar-title,
.workflow-designer[data-theme="solarized"] .workflow-toolbar-title,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar-title,
.workflow-designer[data-theme="dark"] .workflow-palette-label,
.workflow-designer[data-theme="solarized"] .workflow-palette-label,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-label,
.workflow-designer[data-theme="dark"] .workflow-inspector-type,
.workflow-designer[data-theme="solarized"] .workflow-inspector-type,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-type,
.workflow-designer[data-theme="dark"] .workflow-json-title,
.workflow-designer[data-theme="solarized"] .workflow-json-title,
.workflow-designer[data-theme="high-contrast"] .workflow-json-title,
.workflow-designer[data-theme="dark"] .workflow-library-title,
.workflow-designer[data-theme="solarized"] .workflow-library-title,
.workflow-designer[data-theme="high-contrast"] .workflow-library-title,
.workflow-designer[data-theme="dark"] .workflow-library-row-name,
.workflow-designer[data-theme="solarized"] .workflow-library-row-name,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row-name,
.workflow-designer[data-theme="dark"] .workflow-node-title,
.workflow-designer[data-theme="solarized"] .workflow-node-title,
.workflow-designer[data-theme="high-contrast"] .workflow-node-title {
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-toolbar-meta,
.workflow-designer[data-theme="solarized"] .workflow-toolbar-meta,
.workflow-designer[data-theme="high-contrast"] .workflow-toolbar-meta,
.workflow-designer[data-theme="dark"] .workflow-palette-desc,
.workflow-designer[data-theme="solarized"] .workflow-palette-desc,
.workflow-designer[data-theme="high-contrast"] .workflow-palette-desc,
.workflow-designer[data-theme="dark"] .workflow-inspector-id,
.workflow-designer[data-theme="solarized"] .workflow-inspector-id,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-id,
.workflow-designer[data-theme="dark"] .workflow-field-label,
.workflow-designer[data-theme="solarized"] .workflow-field-label,
.workflow-designer[data-theme="high-contrast"] .workflow-field-label,
.workflow-designer[data-theme="dark"] .workflow-field-group-title,
.workflow-designer[data-theme="solarized"] .workflow-field-group-title,
.workflow-designer[data-theme="high-contrast"] .workflow-field-group-title,
.workflow-designer[data-theme="dark"] .workflow-field-reset,
.workflow-designer[data-theme="solarized"] .workflow-field-reset,
.workflow-designer[data-theme="high-contrast"] .workflow-field-reset,
.workflow-designer[data-theme="dark"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="solarized"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-no-fields,
.workflow-designer[data-theme="dark"] .workflow-no-fields,
.workflow-designer[data-theme="solarized"] .workflow-no-fields,
.workflow-designer[data-theme="high-contrast"] .workflow-no-fields,
.workflow-designer[data-theme="dark"] .workflow-checkbox-row,
.workflow-designer[data-theme="solarized"] .workflow-checkbox-row,
.workflow-designer[data-theme="high-contrast"] .workflow-checkbox-row,
.workflow-designer[data-theme="dark"] .workflow-inspector-empty,
.workflow-designer[data-theme="solarized"] .workflow-inspector-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-empty,
.workflow-designer[data-theme="dark"] .workflow-library-empty,
.workflow-designer[data-theme="solarized"] .workflow-library-empty,
.workflow-designer[data-theme="high-contrast"] .workflow-library-empty,
.workflow-designer[data-theme="dark"] .workflow-library-row-meta,
.workflow-designer[data-theme="solarized"] .workflow-library-row-meta,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row-meta,
.workflow-designer[data-theme="dark"] .workflow-node-type,
.workflow-designer[data-theme="solarized"] .workflow-node-type,
.workflow-designer[data-theme="high-contrast"] .workflow-node-type,
.workflow-designer[data-theme="dark"] .workflow-node-desc,
.workflow-designer[data-theme="solarized"] .workflow-node-desc,
.workflow-designer[data-theme="high-contrast"] .workflow-node-desc {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-btn,
.workflow-designer[data-theme="solarized"] .workflow-btn,
.workflow-designer[data-theme="high-contrast"] .workflow-btn {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-restore,
.workflow-designer[data-theme="solarized"] .workflow-inspector-restore,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-restore {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-save-state,
.workflow-designer[data-theme="solarized"] .workflow-save-state,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state {
    background: var(--wf-theme-surface-alt);
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-saved,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-saved,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-saved {
    color: #86efac;
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-dirty,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-dirty,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-dirty {
    color: #fcd34d;
}

.workflow-designer[data-theme="dark"] .workflow-save-state.is-error,
.workflow-designer[data-theme="solarized"] .workflow-save-state.is-error,
.workflow-designer[data-theme="high-contrast"] .workflow-save-state.is-error {
    color: var(--wf-theme-danger);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-panel,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-panel,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-panel {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-row,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-row,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-row {
    color: var(--wf-theme-text);
    border-top-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-shortcuts-row kbd,
.workflow-designer[data-theme="solarized"] .workflow-shortcuts-row kbd,
.workflow-designer[data-theme="high-contrast"] .workflow-shortcuts-row kbd {
    background: var(--wf-theme-surface-alt);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-option,
.workflow-designer[data-theme="solarized"] .workflow-option,
.workflow-designer[data-theme="high-contrast"] .workflow-option {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-option.is-selected,
.workflow-designer[data-theme="solarized"] .workflow-option.is-selected,
.workflow-designer[data-theme="high-contrast"] .workflow-option.is-selected {
    border-color: var(--wf-theme-primary);
    background: rgba(59, 130, 246, 0.18);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-btn-primary,
.workflow-designer[data-theme="solarized"] .workflow-btn-primary,
.workflow-designer[data-theme="high-contrast"] .workflow-btn-primary {
    background: var(--wf-theme-primary);
    border-color: var(--wf-theme-primary);
    color: var(--wf-theme-primary-text);
}

.workflow-designer[data-theme="dark"] .workflow-btn-danger,
.workflow-designer[data-theme="solarized"] .workflow-btn-danger,
.workflow-designer[data-theme="high-contrast"] .workflow-btn-danger {
    color: var(--wf-theme-danger);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-input,
.workflow-designer[data-theme="solarized"] .workflow-input,
.workflow-designer[data-theme="high-contrast"] .workflow-input,
.workflow-designer[data-theme="dark"] .workflow-select,
.workflow-designer[data-theme="solarized"] .workflow-select,
.workflow-designer[data-theme="high-contrast"] .workflow-select,
.workflow-designer[data-theme="dark"] .workflow-textarea,
.workflow-designer[data-theme="solarized"] .workflow-textarea,
.workflow-designer[data-theme="high-contrast"] .workflow-textarea,
.workflow-designer[data-theme="dark"] .workflow-json-text,
.workflow-designer[data-theme="solarized"] .workflow-json-text,
.workflow-designer[data-theme="high-contrast"] .workflow-json-text {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-canvas,
.workflow-designer[data-theme="solarized"] .workflow-canvas,
.workflow-designer[data-theme="high-contrast"] .workflow-canvas {
    background-color: var(--wf-theme-canvas);
    background-image: radial-gradient(circle, var(--wf-theme-grid) 1px, transparent 1px);
}

.workflow-designer[data-theme="dark"] .workflow-node,
.workflow-designer[data-theme="solarized"] .workflow-node,
.workflow-designer[data-theme="high-contrast"] .workflow-node {
    background: var(--wf-theme-surface);
}

.workflow-designer[data-theme="dark"] .workflow-edge-label,
.workflow-designer[data-theme="solarized"] .workflow-edge-label,
.workflow-designer[data-theme="high-contrast"] .workflow-edge-label {
    fill: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-result-pre,
.workflow-designer[data-theme="solarized"] .workflow-result-pre,
.workflow-designer[data-theme="high-contrast"] .workflow-result-pre {
    background: var(--wf-theme-input);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workflow-library-row,
.workflow-designer[data-theme="solarized"] .workflow-library-row,
.workflow-designer[data-theme="high-contrast"] .workflow-library-row {
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workspace-collapse,
.workflow-designer[data-theme="solarized"] .workspace-collapse,
.workflow-designer[data-theme="high-contrast"] .workspace-collapse {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-text);
}

.workflow-designer[data-theme="dark"] .workspace-collapse:hover,
.workflow-designer[data-theme="solarized"] .workspace-collapse:hover,
.workflow-designer[data-theme="high-contrast"] .workspace-collapse:hover {
    color: var(--wf-theme-primary);
}
`;function Ot(s){if(!s||typeof s.createElement!="function"||!s.head||s.getElementById&&s.getElementById(Or))return;let e=s.createElement("style");e.setAttribute("id",Or),e.textContent=Ss,s.head.appendChild(e)}var I=class{constructor(e,t,o){this.translator=t,this.elementRef=o,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.saveState="saved",this.hiddenActions=[],this.showRunHistory=!0,this.showStatusbar=!0,this.showRunLogs=!0,this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.jsonText="",this.jsonError="",this.notifyChange=()=>{this.autosaveAction?.()},this.handleToolbarAction=r=>{let i=this.selfRef||this;switch(r){case"run":this.designer.run({context:this.runContext});break;case"resume":i.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":i.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":i.showLogs=!i.showLogs;break;case"save":i.hostAction?.("save");break;case"open-library":i.hostAction?.("open-library");break;case"clear":this.designer.clear();break;case"toggle-json":i.toggleJson();break;case"shortcuts":i.toggleShortcuts();break;default:break}i.notifyChange()},this.fitView=()=>{let r=this.canvasViewport(),i=this.designer.nodes;if(!r||!i.length){this.designer.resetView();return}let n=48,a=1/0,l=1/0,d=-1/0,f=-1/0;i.forEach(C=>{let N=go(C);a=Math.min(a,C.position.x),l=Math.min(l,C.position.y),d=Math.max(d,C.position.x+N.width),f=Math.max(f,C.position.y+N.height)});let u=Math.max(1,d-a),c=Math.max(1,f-l),m=Math.max(.25,Math.min(1.25,Math.min((r.width-n*2)/u,(r.height-n*2)/c)));this.designer.setZoom(m);let y=this.designer.zoom||1;this.designer.pan={x:Math.round((r.width-u*y)/2-a*y),y:Math.round((r.height-c*y)/2-l*y)};let k=this.elementRef?.nativeElement,v=globalThis.document,x=k?.querySelector?.(".workflow-canvas")||v?.querySelector?.(".workflow-canvas");x&&(x.scrollLeft=0,x.scrollTop=0)},this.addFromPalette=r=>{let i=this.selfRef||this;this.designer.addNode(r.type,this.nextAddPosition()),i.notifyChange()},this.paletteDragStart=(r,i)=>{this.pendingNodeType=i.type,this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:i.label}},this.handlePan=(r,i)=>{this.designer.panBy(r,i)},this.selectRun=r=>{this.designer.selectExecution(r)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let r=this.selfRef||this;r.showLogs=!1},this.handleCanvas=r=>{let i=this.designer;switch(r.type){case"background-down":i.connectionDraft?i.cancelConnection():i.clearSelection();break;case"pointer-move":r.world&&(i.drag?i.dragNodeTo(r.world):i.connectionDraft&&i.updateConnectionDraft(r.world));break;case"pointer-up":i.drag?i.endNodeDrag():i.connectionDraft&&i.cancelConnection();break;case"pointer-leave":i.drag?i.endNodeDrag():i.connectionDraft&&i.cancelConnection();break;case"node-down":i.connectionDraft&&r.nodeId?this.connectToNode(r.nodeId):r.nodeId&&r.world&&i.beginNodeDrag(r.nodeId,r.world);break;case"node-up":i.drag?i.endNodeDrag():i.connectionDraft&&r.nodeId&&this.connectToNode(r.nodeId);break;case"edge-click":r.connectionId&&i.selectConnection(r.connectionId);break;case"port-down":{let n=r.portType==="input"?"input":"output";if(!r.nodeId||!r.portId||!r.world)break;let a=i.connectionDraft;if(a){if((a.sourceSide||"output")!==n){i.completeConnection(r.nodeId,r.portId);break}i.cancelConnection()}i.beginConnection(r.nodeId,r.portId,r.world,n);break}case"port-up":{let n=i.connectionDraft;if(!n||!r.nodeId||!r.portId)break;let a=r.portType==="input"?"input":"output",l=n.sourceSide||"output";a!==l?i.completeConnection(r.nodeId,r.portId):(r.nodeId!==n.sourceNodeId||r.portId!==n.sourcePort)&&i.cancelConnection();break}case"drop":{let n=r.nodeType||this.pendingNodeType;this.pendingNodeType=void 0,n&&r.world&&i.addNode(n,{x:Math.round(r.world.x-92),y:Math.round(r.world.y-32)});break}case"key-down":this.handleKey(r);break;case"wheel":{let n=this.canvasRect();if(r.ctrlKey||r.metaKey)this.zoomAtPoint(r,n);else{let a=!!r.shiftKey,l=Number(r.deltaX)||0,d=Number(r.deltaY)||0,f=a&&!l?d:l,u=a&&!l?0:d;i.panBy(-f,-u)}break}default:break}(r.type==="pointer-up"||r.type==="node-up"||r.type==="drop"||r.type==="port-down"||r.type==="port-up"||r.type==="key-down")&&this.notifyChange()},this.inspectorRestore=()=>{let r=this.designer.selectedNode;r&&(this.designer.resetNodeConfig(r.id),this.notifyChange())},this.inspectorChange=(r,i,n,a)=>{let l=a?this.designer.nodes.find(f=>f.id===a):this.designer.selectedNode;if(!l)return;if(r==="name"){this.designer.renameNode(l.id,String(i)),this.notifyChange();return}if(r==="description"){this.designer.updateNode(l.id,{description:String(i)}),this.notifyChange();return}let d=i;if(n==="json")if(String(i??"").trim()==="")d=void 0;else try{d=JSON.parse(String(i))}catch(f){this.designer.error=`Invalid JSON: ${f.message}`;return}else if(n==="number"){if(d=i===""||i===void 0||i===null?void 0:Number(i),typeof d=="number"&&!Number.isFinite(d)){this.designer.error="Invalid number";return}}else n==="boolean"?d=!!i:d=String(i??"");this.designer.updateNodeConfig(l.id,{[r]:d}),this.notifyChange()},Go(o),this.documentRef=e;try{e&&(e[fe]=!0)}catch{}Ot(e),Qo(e),er(e),Yo(e),$e(e,this.themeName)}onInit(){this.selfRef=this,this.registry||(this.registry=new D),this.autoRun&&this.designer&&this.designer.run({context:this.runContext})}onDestroy(){}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return he(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}setTheme(e){this.theme=he(e)?e:"light";let t=this.documentRef||globalThis.document;$e(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return R(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get visibleActions(){return Array.isArray(this.hiddenActions)?this.hiddenActions:[]}visibleAction(e){return!this.visibleActions.includes(e)}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let o=xr(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:o},o}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let o=vr(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:o},o}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,o=this.localeValue,r=this.registry.revision,i=e?.id||"",n=e?.name||"",a=e?.description||"",l=e?.type||"",d=e?.config,f=this.inspectorModelCache;if(f&&f.nodeId===i&&f.name===n&&f.description===a&&f.type===l&&f.config===d&&f.execution===t&&f.locale===o&&f.revision===r)return f.model;let u=Cr(this.designer,this.registry,o,this.translator);return this.inspectorModelCache={nodeId:i,name:n,description:a,type:l,config:d,execution:t,locale:o,revision:r,model:u},u}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let o=Sr(this.designer,this.localeValue,this.translator);return this.toolbarModelCache={key:e,model:o},o}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let o=Rr(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:o},o}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,o=this.localeValue,r=this.runHistoryCache;if(r&&r.history===e&&r.selected===t&&r.locale===o)return r.model;let i=Ir(this.designer,o,this.translator);return this.runHistoryCache={history:e,selected:t,locale:o,model:i},i}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let o=e?.logs||[];return this.runLogsCache={execution:e,logs:o},o}get codeSuggestions(){let e=this.designer.nodes.map(n=>[n.id,n.type,n.config?.action||"",n.config?.field||"",n.config?.target||"",JSON.stringify(n.config?.values||""),JSON.stringify(n.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let o=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),r=n=>{typeof n=="string"&&n.trim()&&o.add(n.trim())};this.designer.nodes.forEach(n=>{let a=n.config||{};if(typeof a.action=="string"){let l=a.action.replace(/^actions\./,"");r(`context.actions.${l}`),r(`input.actions.${l}`)}typeof a.field=="string"&&(r(a.field),a.field.includes(".")||r(`variables.${a.field}`)),typeof a.target=="string"&&r(a.target.includes(".")?a.target:`variables.${a.target}`),a.values&&typeof a.values=="object"&&Object.keys(a.values).forEach(l=>r(`variables.${l}`)),a.result&&typeof a.result=="object"&&Object.keys(a.result).forEach(l=>r(`input.${l}`)),typeof a.event=="string"&&r(`context.events.${a.event}`)});let i=Array.from(o).slice(0,240);return this.codeSuggestionCache={key:e,values:i},i}canvasModelKey(){let e=this.designer,t=e.execution,o=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],r=e.connectionDraft;return o.push(r?`draft:${r.sourceNodeId}:${r.sourcePort}:${r.sourceSide||"output"}:${r.x}:${r.y}`:""),(e.nodes||[]).forEach(i=>{o.push([i.id,i.name,i.type,i.description||"",i.position?.x,i.position?.y,i.dimension?.width||"",i.dimension?.height||"",i.style?.icon||"",i.style?.backgroundColor||"",i.style?.textColor||"",(i.inputs||[]).map(n=>`${n.id}:${n.label||""}:${n.name||""}:${n.type||""}`).join(","),(i.outputs||[]).map(n=>`${n.id}:${n.label||""}:${n.name||""}:${n.type||""}`).join(","),t?.nodeStates?.[i.id]?.status||""].join(":"))}),(e.connections||[]).forEach(i=>{o.push([i.id,i.sourceNodeId,i.sourcePort,i.targetNodeId,i.targetPort,i.label||"",t?.edgeStates?.[i.id]?.status||""].join(":"))}),o.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},o=this.viewportBounds(),r=t;return o&&(t.x>=o.left&&t.x+184<=o.right&&t.y>=o.top&&t.y+64<=o.bottom||(r={x:Math.round((o.left+o.right)/2-92),y:Math.round((o.top+o.bottom)/2-32)})),this.findFreePosition(r)}canvasViewport(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{width:r.width,height:r.height}}canvasRect(){let e=this.elementRef?.nativeElement,o=(e?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{left:o.left,top:o.top,width:o.width,height:o.height}}zoomAtPoint(e,t){let o=Number(e.deltaY)||0;if(!o)return;let r=this.designer,i=r.zoom||1,n=o<0?1.1:.9,a=Math.max(.2,Math.min(2.5,i*n)),l=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),f=r.pan||{x:0,y:0},u=(l-f.x)/i,c=(d-f.y)/i;r.setZoom(a);let m=r.zoom||a;r.pan={x:Math.round(l-u*m),y:Math.round(d-c*m)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,o=this.designer.pan||{x:0,y:0};return{left:-o.x/t,top:-o.y/t,right:(e.width-o.x)/t,bottom:(e.height-o.y)/t}}findFreePosition(e){let r=[0,1,-1,2,-2,3,-3];for(let i=0;i<30;i++)for(let n of r){let a={x:e.x+n*220,y:e.y+i*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-a.x)<184&&Math.abs(d.position.y-a.y)<64))return a}return e}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let o=this.designer.nodes.find(i=>i.id===e);if(!o){this.designer.cancelConnection();return}let r=t.sourceSide==="input"?o.outputs:o.inputs;if(!r?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,r[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.notifyChange()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",ge)(I.prototype,"designer");Reflect.metadata("design:type",D)(I.prototype,"registry");Reflect.metadata("design:type",Object)(I.prototype,"locale");Reflect.metadata("design:type",Object)(I.prototype,"theme");Reflect.metadata("design:type",Function)(I.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(I.prototype,"runContext");Reflect.metadata("design:type",Object)(I.prototype,"autoRun");Reflect.metadata("design:type",Object)(I.prototype,"saveState");Reflect.metadata("design:type",Array)(I.prototype,"hiddenActions");Reflect.metadata("design:type",Object)(I.prototype,"showRunHistory");Reflect.metadata("design:type",Object)(I.prototype,"showStatusbar");Reflect.metadata("design:type",Object)(I.prototype,"showRunLogs");Reflect.metadata("design:type",Function)(I.prototype,"hostAction");Reflect.metadata("design:type",Function)(I.prototype,"autosaveAction");Reflect.metadata("design:type",Object)(I.prototype,"documentRef");Reflect.metadata("design:type",Object)(I.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(I.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(I.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(I.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(I.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(I.prototype,"paletteCache");Reflect.metadata("design:type",Object)(I.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(I.prototype,"codeSuggestionCache");Reflect.metadata("design:paramtypes",[Object,E,pe])(I);h(I,[[p(),1,"designer"],[p(),1,"registry"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"runContext"],[p(),1,"autoRun"],[p(),1,"saveState"],[p(),1,"hiddenActions"],[p(),1,"showRunHistory"],[p(),1,"showStatusbar"],[p(),1,"showRunLogs"],[p(),1,"hostAction"],[p(),1,"autosaveAction"],[z(),1,"documentRef"],[z(),1,"canvasModelCache"],[z(),1,"toolbarModelCache"],[z(),1,"inspectorModelCache"],[z(),1,"runHistoryCache"],[z(),1,"statusModelCache"],[z(),1,"paletteCache"],[z(),1,"runLogsCache"],[z(),1,"codeSuggestionCache"],[S(),3,void 0,2],[S(),3,void 0,1],[O(ue),3,void 0,0],[S(),3,void 0,0],[T({selector:"workflow-designer-preview",template:`
    <div class="workflow-designer-preview workflow-designer" data-theme="{{themeName}}">
        <workflow-toolbar :model="toolbarModel" :locale="locale" :action="handleToolbarAction"
            :theme="themeName" :themeChangeAction="themeSelectAction"
            :hiddenActions="hiddenActions"></workflow-toolbar>
        <workspace-layout class="workflow-workspace">
            <workspace-left>
                <workflow-palette :groups="paletteGroups" :locale="locale"
                    :addAction="addFromPalette" :dragStartAction="paletteDragStart"></workflow-palette>
            </workspace-left>
            <workspace-center>
                <workflow-canvas :model="canvasModel" :locale="locale"
                    :pointerAction="handleCanvas" :panAction="handlePan"></workflow-canvas>
            </workspace-center>
            <workspace-right>
                <workflow-inspector :model="inspectorModel" :locale="locale"
                    :changeAction="inspectorChange" :restoreAction="inspectorRestore"
                    :codeSuggestions="codeSuggestions"></workflow-inspector>
            </workspace-right>
            <workspace-bottom>
                <workflow-run-history v-if="showRunHistory" :items="runHistory" :locale="locale"
                    :selectAction="selectRun"></workflow-run-history>
                <div class="workflow-statusbar" v-if="showStatusbar">
                    <span class="workflow-status-message">{{statusModel.message}}</span>
                    <span class="workflow-status-error" v-if="statusModel.error">{{statusModel.error}}</span>
                    <span class="workflow-status-spacer"></span>
                    <span class="workflow-save-state" [class]="saveStateClass">{{saveStateLabel}}</span>
                    <span class="workflow-status-selected">{{statusModel.selectedLabel}}</span>
                    <span>{{statusModel.nodeCount}} {{nodeWord}}</span>
                    <span>{{statusModel.executionLabel}}</span>
                    <span>{{statusModel.zoomLabel}}</span>
                </div>
                <workflow-run-log v-if="showRunLogs" :items="runLogs" :visible="showLogs" :locale="locale"
                    :closeAction="closeLogs"></workflow-run-log>
            </workspace-bottom>
        </workspace-layout>
        <div class="workflow-json-panel" v-if="showJson">
            <div class="workflow-json-head">
                <span class="workflow-json-title">{{jsonTitle}}</span>
                <span class="workflow-status-spacer"></span>
                <button class="workflow-btn workflow-btn-primary" @click="applyJson">{{applyLabel}}</button>
                <button class="workflow-btn" @click="toggleJson">{{closeLabel}}</button>
            </div>
            <textarea class="workflow-json-text" v-model="jsonText" rows="16"></textarea>
            <div class="workflow-json-error" v-if="jsonError">{{jsonError}}</div>
        </div>
        <div class="workflow-shortcuts" v-if="showShortcuts" @click="closeShortcuts">
            <div class="workflow-shortcuts-panel" @click="stopShortcutClick">
                <div class="workflow-shortcuts-head">
                    <span class="workflow-shortcuts-title">{{shortcutsLabel}}</span>
                    <button class="workflow-btn" type="button" @click="closeShortcuts">{{closeLabel}}</button>
                </div>
                <div class="workflow-shortcuts-row" v-for="row in shortcutRows">
                    <span>{{row.action}}</span>
                    <kbd>{{row.keys}}</kbd>
                </div>
            </div>
        </div>
    </div>`}),0]]);var L=class{constructor(e,t,o,r,i,n){this.translator=r,this.elementRef=n,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=pr(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.previewHiddenActions=["save","open-library"],this.showLibrary=!1,this.libraryError="",this.libraryItems=[],this.autosaveInFlight=!1,this.changeLocale=l=>{this.locale=l,this.localeChangeAction?.(l)},this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let l=this.selfRef||this;l.designer?.dirty&&(l.saveState!=="saving"&&(l.saveState="dirty"),l.autosave&&(l.clearAutosaveTimer(),l.autosaveTimer=setTimeout(()=>{l.autosaveTimer=void 0,l.performAutosave()},Math.max(0,Number(l.autosaveDelay)||0))))},this.toolbarAction=l=>{if(l==="save"){this.saveWorkflow();return}if(l==="open-library"){this.openLibrary();return}this.preview?.handleToolbarAction(l)},this.previewHostAction=l=>{this.toolbarAction(l)},this.fitView=()=>{this.preview?.fitView()},this.openLibrary=async()=>{let l=this.selfRef||this;try{l.libraryItems=await l.designer.listSaved(l.store),l.libraryError=""}catch(d){l.libraryError=d.message}l.showLibrary=!0},this.saveWorkflow=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store);let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.saveWorkflowAs=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store,{as:!0,name:`${l.designer.definition.name} copy`});let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.loadWorkflow=async l=>{let d=this.selfRef||this,f=d.workflowTabs.find(c=>c.id===l);if(f){try{let c=await d.store.get(l);if(!c){d.libraryError=`${d.t("notFound","Workflow not found")}: ${l}`;return}f.designer.load(c),d.setActiveTab(f),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(c){d.libraryError=c.message}return}await d.openWorkflowTab(l)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async l=>{let d=this.selfRef||this;try{d.workflowTabs.some(f=>f.id===l)&&await d.closeWorkflowTab(l),await d.designer.removeSaved(d.store,l),await d.refreshLibrary()}catch(f){d.libraryError=f.message}},this.closeLibrary=()=>{let l=this.selfRef||this;l.showLibrary=!1},this.documentRef=o;try{o&&(o[fe]=!0)}catch{}this.registry=e||new D,this.service=t,this.reactiveEffect=i,Ot(o),$e(o,this.themeName);let a=new ge({registry:this.registry,service:t,definition:lo(this.registry,this.localeValue,r)});this.designer=i?Kt(a,i):a,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,Tt.subscribe(t=>this.toolbarAction(t));let e=globalThis.document;e?.addEventListener&&(this.menuClickHandler=t=>{let r=t?.target?.closest?.("[data-menu-id]")?.getAttribute?.("data-menu-id");r&&setTimeout(()=>{globalThis.__workflowMenuHandled!==r&&this.toolbarAction(r)},0)},e.addEventListener("click",this.menuClickHandler,!0)),this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=globalThis.document;this.menuClickHandler&&e?.removeEventListener&&e.removeEventListener("click",this.menuClickHandler,!0);let t=this.documentRef;t?.removeEventListener&&this.keyHandler&&t.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return he(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get toolbarModel(){return this.preview?.toolbarModel}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=lr(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let o=e.createTab(t);e.workflowTabs.push(o),e.setActiveTab(o),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(r=>r.id===e))return await t.activateWorkflowTab(e),!0;try{let r=await t.store.get(e);if(!r)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let i=t.createTab(r,!0);return t.workflowTabs.push(i),t.setActiveTab(i),t.emitTabs(),!0}catch(r){return t.libraryError=r.message,!1}}async restoreWorkflowTabs(e,t){let o=this.selfRef||this,r=[],i;try{i=new Set((await o.store.list()).map(a=>a.id))}catch{i=new Set(e||[])}for(let a of Array.from(new Set(e||[])))if(!(!a||!i.has(a)))try{let l=await o.store.get(a);l&&r.push(o.createTab(l,!0))}catch{}if(!r.length)return!1;o.workflowTabs=r;let n=r.find(a=>a.id===t)||r[0];return o.setActiveTab(n),o.emitTabs(),!0}createTab(e,t=!1){let o=new ge({registry:this.registry,service:this.service,definition:e}),r=this.reactiveEffect?Kt(o,this.reactiveEffect):o;return{id:r.definition.id,designer:r,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.find(r=>r.id===e);!o||o.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(o),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.findIndex(i=>i.id===e);if(o<0)return;let[r]=t.workflowTabs.splice(o,1);if(t.autosave&&r.designer.dirty)try{await t.saveTab(r)}catch{}if(t.activeTabId===e){let i=t.workflowTabs[Math.min(o,t.workflowTabs.length-1)];i?t.setActiveTab(i):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,o=e.id,r=e.designer.definition.id;o!==r&&(e.id=r,t.activeTabId===o&&(t.activeTabId=r),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(r=>r.persisted),o=e.activeTab();e.tabChangeAction?.({openIds:t.map(r=>r.id),activeId:o?.persisted?o.id:t[0]?.id})}setTheme(e){this.theme=he(e)?e:"light";let t=this.documentRef||globalThis.document;$e(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return R(this.translator,this.localeValue,`workflow.ui.${e}`,t)}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,o=String(e?.key||""),r=!!(e?.ctrlKey||e?.metaKey),i=e?.target,n=String(i?.tagName||"").toLowerCase(),a=n==="input"||n==="textarea"||n==="select"||!!i?.isContentEditable;if(r&&(o==="s"||o==="S")){e.preventDefault(),t.saveWorkflow();return}if(r&&(o==="o"||o==="O")){e.preventDefault(),t.openLibrary();return}if(r&&o==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!a&&(o==="?"||o==="F1")){e.preventDefault(),t.preview?.toggleShortcuts();return}o==="Escape"&&t.preview?.showShortcuts&&(e.preventDefault(),t.preview?.closeShortcuts())}get canvasModel(){return this.preview?.canvasModel}get inspectorModel(){return this.preview?.inspectorModel}get statusModel(){return this.preview?.statusModel}get codeSuggestions(){return this.preview?.codeSuggestions??[]}get saveStateLabel(){return this.preview?.saveStateLabel??""}get showLogs(){return!!this.preview?.showLogs}set showLogs(e){this.preview&&(this.preview.showLogs=e)}get jsonText(){return this.preview?.jsonText??""}set jsonText(e){this.preview&&(this.preview.jsonText=e)}toggleJson(){this.preview?.toggleJson()}handleCanvas(e){this.preview?.handleCanvas(e)}toggleShortcuts(){this.preview?.toggleShortcuts()}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await e.designer.listSaved(e.store)}};Reflect.metadata("design:type",Object)(L.prototype,"locale");Reflect.metadata("design:type",Object)(L.prototype,"theme");Reflect.metadata("design:type",Function)(L.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(L.prototype,"localeChangeAction");Reflect.metadata("design:type",ge)(L.prototype,"designer");Reflect.metadata("design:type",Object)(L.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(L.prototype,"runContext");Reflect.metadata("design:type",Object)(L.prototype,"autoRun");Reflect.metadata("design:type",Object)(L.prototype,"store");Reflect.metadata("design:type",Object)(L.prototype,"autosave");Reflect.metadata("design:type",Object)(L.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(L.prototype,"tabChangeAction");Reflect.metadata("design:type",I)(L.prototype,"preview");Reflect.metadata("design:type",Object)(L.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(L.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(L.prototype,"keyHandler");Reflect.metadata("design:type",Object)(L.prototype,"documentRef");Reflect.metadata("design:paramtypes",[D,ae,Object,E,Ko,pe])(L);h(L,[[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"localeChangeAction"],[p(),1,"designer"],[p(),1,"initialDefinition"],[p(),1,"runContext"],[p(),1,"autoRun"],[p(),1,"store"],[p(),1,"autosave"],[p(),1,"autosaveDelay"],[p(),1,"tabChangeAction"],[St("preview",I),1,"preview"],[z(),1,"autosaveTimer"],[z(),1,"autosaveInFlight"],[z(),1,"keyHandler"],[z(),1,"documentRef"],[S(),3,void 0,5],[S(),3,void 0,4],[S(),3,void 0,3],[O(ue),3,void 0,2],[S(),3,void 0,2],[S(),3,void 0,1],[S(),3,void 0,0],[T({selector:"workflow-designer",template:`
    <div class="workflow-designer" data-theme="{{themeName}}">
        <div class="workflow-global-bar">
            <tab-bar class="workflow-tabs" :source="workflowTabSource"></tab-bar>
            <workflow-management-menu :model="toolbarModel" :locale="locale" :theme="themeName"
                :action="toolbarAction" :themeChangeAction="themeSelectAction"
                :localeChangeAction="changeLocale"></workflow-management-menu>
        </div>
        <workflow-designer-preview #preview
            :designer="designer"
            :registry="registry"
            :locale="locale"
            :theme="themeName"
            :runContext="runContext"
            :saveState="saveState"
            :themeChangeAction="themeSelectAction"
            :hostAction="previewHostAction"
            :hiddenActions="previewHiddenActions"
            :autosaveAction="scheduleAutosave"></workflow-designer-preview>
        <workflow-library :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
    </div>`}),0]]);var yo=class{};h(yo,[[J({imports:[Ut,Xt,Qt,Gt,Ue],providers:[ae,Be,D,ye,qe,ne],declarations:[A,Q,ee,F,le,te,_,I,W,L],exports:[Ut,Xt,Qt,Gt,Ue,ae,Be,D,ye,ne,A,Q,ee,F,le,te,_,I,W,L]}),0]]);function Gc(s){let e=String(s||"").replace(/^#\/?/,"").split(/[/?]/)[0];return e==="routes"||e==="rules"?e:"dashboard"}function Yc(s){return`#/${s}`}function Rs(s,e="/admin/"){let t=String(s||"");return!t.startsWith("/admin/")||t.startsWith("//")?e:t}function Is(s,e="/admin/login.html"){let t=Rs(s);return`${e}?redirect=${encodeURIComponent(t)}`}function Dr(s){let t=(s??globalThis.window)?.location;if(!t)return;let o="/admin/login.html";try{o=new URL("login.html",t.href).pathname}catch{}let r=`${t.pathname||"/admin/"}${t.search||""}${t.hash||""}`,i=Is(r,o);try{t.replace(i)}catch{t.href=i}}var De=class{};h(De,[[U(),0]]);var de=class{};h(de,[[U(),0]]);var gt=class{};h(gt,[[U(),0]]);var V;(function(s){s[s.Sent=0]="Sent",s[s.UploadProgress=1]="UploadProgress",s[s.ResponseHeader=2]="ResponseHeader",s[s.DownloadProgress=3]="DownloadProgress",s[s.Response=4]="Response",s[s.User=5]="User"})(V||(V={}));var yt=class{get statusText(){return this._message}get statusMessage(){return this._message}get ok(){return this.status>=200&&this.status<300}constructor(e,t=200,o="OK"){this.headers=e.headers instanceof j?e.headers:new j(e.headers),this.status=e.status!==void 0?e.status:t,this._message=e.statusText||o,this.url=e.url||null}},Ke=class s extends yt{constructor(e={}){super(e),this.type=V.ResponseHeader}clone(e={}){return new s({headers:e.headers||this.headers,status:e.status!==void 0?e.status:this.status,statusText:e.statusText||this.statusText,url:e.url||this.url||void 0})}},re=class s extends yt{get payload(){return this.body}constructor(e={}){super(e),this.type=V.Response,this.body=e.body!==void 0?e.body:null}clone(e={}){return new s({body:e.body!==void 0?e.body:this.body,headers:e.headers||this.headers,status:e.status!==void 0?e.status:this.status,statusText:e.statusText||this.statusText,url:e.url||this.url||void 0})}},H=class extends yt{constructor(e){super(e,0,"Unknown Error"),this.name="HttpErrorResponse",this.body=null,this.status>=200&&this.status<300?this.message=`Http failure during parsing for ${e.url||"(unknown url)"}`:this.message=`Http failure response for ${e.url||"(unknown url)"}: ${e.status} ${e.statusText}`,this.error=e.error||null}};var Ts=/^\)\]\}',?\n/;function Ns(s){return"responseURL"in s&&s.responseURL?s.responseURL:/^X-Request-URL:/m.test(s.getAllResponseHeaders())?s.getResponseHeader("X-Request-URL"):null}var Me=class{constructor(e){this.xhrFactory=e}handle(e,t){if(e.method===ie)throw new Lo("Attempted to construct Jsonp request without HttpClientJsonpModule installed.");return new Ze(o=>{let r=this.xhrFactory.build();if(r.open(e.method,e.urlWithParams),e.withCredentials&&(r.withCredentials=!0),e.headers.forEach((m,y)=>r.setRequestHeader(m,Eo(y)?y.join(","):String(y))),e.headers.has("Accept")||r.setRequestHeader("Accept","application/json, text/plain, */*"),!e.headers.has("Content-Type")){let m=e.detectContentTypeHeader();m!==null&&r.setRequestHeader("Content-Type",m)}if(e.responseType){let m=e.responseType.toLowerCase();r.responseType=m!=="json"?m:"text"}let i=e.serializeBody(),n=null,a=()=>{if(n!==null)return n;let m=r.status===1223?204:r.status,y=r.statusText??Vo[m]??"OK",k=new j(r.getAllResponseHeaders()),v=Ns(r)||e.url;return n=new Ke({headers:k,status:m,statusText:y,url:v}),n},l=()=>{let{headers:m,status:y,statusText:k,url:v}=a(),x=y,C=null;x!==204&&(C=st(r.response)?r.responseText:r.response),x===0&&(x=C?200:0);let N=x>=200&&x<300;if(e.responseType==="json"&&rt(C)){let ce=C;C=C.replace(Ts,"");try{C=C!==""?JSON.parse(C):null}catch(je){C=ce,N&&(N=!1,C={error:je,text:C})}}N?(o.next(new re({body:C,headers:m,status:x,statusText:k,url:v||void 0})),o.complete()):o.error(new H({error:C,headers:m,status:x,statusText:k,url:v||void 0}))},d=m=>{let{url:y}=a(),k=new H({error:m,status:r.status||0,statusText:r.statusText||"Unknown Error",url:y||void 0});o.error(k)},f=!1,u=m=>{f||(o.next(a()),f=!0);let y={type:V.DownloadProgress,loaded:m.loaded};m.lengthComputable&&(y.total=m.total),e.responseType==="text"&&r.responseText&&(y.partialText=r.responseText),o.next(y)},c=m=>{let y={type:V.UploadProgress,loaded:m.loaded};m.lengthComputable&&(y.total=m.total),o.next(y)};return r.addEventListener("load",l),r.addEventListener("error",d),r.addEventListener("timeout",d),r.addEventListener("abort",d),e.reportProgress&&(r.addEventListener("progress",u),i!==null&&r.upload&&r.upload.addEventListener("progress",c)),r.send(i),o.next({type:V.Sent}),()=>{r.removeEventListener("error",d),r.removeEventListener("abort",d),r.removeEventListener("load",l),r.removeEventListener("timeout",d),e.reportProgress&&(r.removeEventListener("progress",u),i!==null&&r.upload&&r.upload.removeEventListener("progress",c)),r.readyState!==r.DONE&&r.abort()}})}};Reflect.metadata("design:paramtypes",[gt])(Me);h(Me,[[b(),0]]);var bt=P("XSRF_COOKIE_NAME"),kt=P("XSRF_HEADER_NAME"),Pe=class{},be=class{constructor(e,t,o){this.doc=e,this.platform=t,this.cookieName=o,this.lastCookieString="",this.lastToken=null,this.parseCount=0}getToken(){if(this.platform==="server")return null;let e=this.doc.cookie||"";return e!==this.lastCookieString&&(this.parseCount++,this.lastToken=As(e,this.cookieName),this.lastCookieString=e),this.lastToken}};Reflect.metadata("design:paramtypes",[Object,String,String])(be);h(be,[[O(bt),3,void 0,2],[O(Fo),3,void 0,1],[O(ue),3,void 0,0],[b(),0]]);var G=class{constructor(e,t){this.tokenService=e,this.headerName=t}intercept(e,t,o){let r=e.url.toLowerCase();if(e.method===Ce||e.method===We||r.startsWith("http://")||r.startsWith("https://"))return t.handle(e,o);let i=this.tokenService.getToken();return i!==null&&!e.headers.has(this.headerName)&&(e=e.clone({headers:e.headers.set(this.headerName,i)})),t.handle(e,o)}};Reflect.metadata("design:paramtypes",[Pe,String])(G);h(G,[[O(kt),3,void 0,1],[b(),0]]);function As(s,e){e=encodeURIComponent(e);for(let t of s.split(";")){let o=t.indexOf("="),[r,i]=o==-1?[t,""]:[t.slice(0,o),t.slice(o+1)];if(r.trim()===e)return decodeURIComponent(i)}return null}var Dt=P("HTTP_COMMON_INTERCEPTORS"),Mt=P("HTTP_FEATURE_INTERCEPTORS"),Pt=P("HTTP_INCLUDE_LEGACY_INTERCEPTORS"),Xe=class extends Uo{constructor(e,t){super(e,()=>{let o=t.get(Mt,[]);return t.get(Pt,!1)&&o.push(...t.get(Dt,[])),o})}};Reflect.metadata("design:paramtypes",[de,q])(Xe);h(Xe,[[b(),0]]);var ze=class{intercept(e,t,o){return t.handle(e,o)}};h(ze,[[b(),0]]);var Es=0,Ls="JSONP injected script did not invoke callback.",Os="JSONP requests must use JSONP request method.",Ds="JSONP requests must use Json response type.",Ge=class{},ke=class{constructor(e,t){this.callbackMap=e,this.document=t,this.resolvedPromise=Promise.resolve()}nextCallback(){return`tsioc_jsonp_callback_${Es++}`}handle(e){if(e.method!==ie)throw new Error(Os);if(e.responseType!=="json")throw new Error(Ds);return new Ze(t=>{let o=this.nextCallback(),r=e.urlWithParams.replace(/=JSONP_CALLBACK(&|$)/,`=${o}$1`),i=this.document.createElement("script");i.src=r;let n=null,a=!1,l=!1;this.callbackMap[o]=c=>{delete this.callbackMap[o],!l&&(n=c,a=!0)};let d=()=>{i.parentNode&&i.parentNode.removeChild(i),delete this.callbackMap[o]},f=c=>{l||this.resolvedPromise.then(()=>{if(d(),!a){t.error(new H({url:r,status:0,statusText:"JSONP Error",error:new Error(Ls)}));return}t.next(new re({body:n,status:200,statusText:"OK",url:r})),t.complete()})},u=c=>{l||(d(),t.error(new H({error:c,status:0,statusText:"JSONP Error",url:r})))};return i.addEventListener("load",f),i.addEventListener("error",u),this.document.body.appendChild(i),t.next({type:V.Sent}),()=>{l=!0,i.removeEventListener("load",f),i.removeEventListener("error",u),d()}})}};Reflect.metadata("design:paramtypes",[Ge,Object])(ke);h(ke,[[O(ue),3,void 0,1],[b(),0]]);var _e=class{constructor(e){this.jsonp=e}intercept(e,t,o){return e.method===ie?this.jsonp.handle(e):t.handle(e,o)}};Reflect.metadata("design:paramtypes",[ke])(_e);h(_e,[[b(),0]]);var bo=class{encodeKey(e){return Mr(e)}encodeValue(e){return Mr(e)}decodeKey(e){return decodeURIComponent(e)}decodeValue(e){return decodeURIComponent(e)}},Ms=/%(\d[a-f0-9])/gi,Ps={40:"@","3A":":",24:"$","2C":",","3B":";","2B":"+","3D":"=","3F":"?","2F":"/"};function Mr(s){return encodeURIComponent(s).replace(Ms,(e,t)=>Ps[t]??e)}var se=class extends Wo{constructor(e={}){e.encoder=e.encoder??new bo,super(e)}};function zs(s){switch(s){case xt:case Ce:case We:case zo:case ie:return!1;default:return!0}}var Ye=class s{get body(){return this.payload}constructor(e,t,o,r){this.url=t,this.reportProgress=!1,this.withCredentials=!1,this.responseType="json",this.method=e.toUpperCase();let i;zs(this.method)||r?(this.payload=o!==void 0?o:null,i=r):(i=o,this.payload=null),this.observe=i.observe||"body",this.forceJson=i.responseType==="json",this.reportProgress=!!i.reportProgress,this.withCredentials=!!i.withCredentials,i.responseType&&(this.responseType=i.responseType),i.headers&&(this.headers=new j(i.headers)),i.params&&(this.params=i.params),this.timeout=i.timeout,this.headers||(this.headers=new j),this.params||(this.params=new se),this.urlWithParams=this.getUrlWithParams()}getUrlWithParams(){return qo(this.url,this.params)}attachId(e){this.id=e}serializeBody(){return Vt(this.body)?null:qt(this.body)||Jt(this.body)||Bt(this.body)||$o(this.body)||rt(this.body)?this.body:this.body instanceof se?this.body.toString():typeof this.body=="object"||typeof this.body=="boolean"||Array.isArray(this.body)?JSON.stringify(this.body):this.body.toString()}detectContentTypeHeader(){if(this.body===null||Bt(this.body))return null;if(Jt(this.body))return this.body.type||null;if(qt(this.body))return null;if(rt(this.body))return"text/plain";if(this.body instanceof se)return"application/x-www-form-urlencoded;charset=UTF-8";let e=typeof this.body;return e==="object"||e==="number"||e==="boolean"?"application/json":null}clone(e={}){let t=e.method||this.method,o=e.url||this.url,r=st(e.body)?e.payload:e.body;st(r)&&(r=this.body);let i=this.cloneOpts(e);return new s(t,o,r,i)}cloneOpts(e){let t=e.responseType??(!this.forceJson&&this.responseType=="json"?void 0:this.responseType),o=e.withCredentials!==void 0?e.withCredentials:this.withCredentials,r=e.reportProgress!==void 0?e.reportProgress:this.reportProgress,i;e.headers instanceof j?i=e.headers:(i=this.headers,e.headers&&i.setHeaders(e.headers));let n=e.params||this.params;return e.setParams&&(n=Object.keys(e.setParams).reduce((a,l)=>a.set(l,e.setParams[l]),n)),{params:n,headers:i,reportProgress:r,responseType:t,withCredentials:o}}toJson(e){let t={};return this.id&&(t.id=this.id),this.headers.size&&(t.headers=this.headers.getHeaders()),Vt(this.payload)||(t[e?.payloadKey??"body"]=this.payload),this.method&&(t.method=this.method),t.url=this.urlWithParams,t}};var ve=class{constructor(e,t){this.injector=e,this.handler=t}request(e,t,o={}){let r;if(e instanceof Ye)r=e;else{let l=e,d;o.headers instanceof j?d=o.headers:d=new j(o.headers);let f;o.params&&(o.params instanceof se?f=o.params:f=new se({params:o.params})),r=new Ye(l??Ce,t,o.body!==void 0?o.body:null,{headers:d,params:f,reportProgress:o.reportProgress,responseType:o.responseType||"json",withCredentials:o.withCredentials})}let i=o.context??Ho(this.injector),n=To(r).pipe(Wt(l=>this.handler.handle(l,i)));if(e instanceof Ye||o.observe==="events")return n;let a=n.pipe($t(()=>i.onDestroy()),vt(l=>l instanceof re));switch(o.observe||"body"){case"body":switch(r.responseType){case"arraybuffer":return a.pipe(Fe(l=>{if(l.body!==null&&!(l.body instanceof ArrayBuffer))throw new Error("Response is not an ArrayBuffer.");return l.body}));case"blob":return a.pipe(Fe(l=>{if(l.body!==null&&!(l.body instanceof Blob))throw new Error("Response is not a Blob.");return l.body}));case"text":return a.pipe(Fe(l=>{if(l.body!==null&&typeof l.body!="string")throw new Error("Response is not a string.");return l.body}));case"json":default:return a.pipe(Fe(l=>l.body))}case"response":return a;default:throw new Error(`Unreachable: unhandled observe type ${o.observe}}`)}}delete(e,t={}){return this.request(xt,e,t)}get(e,t={}){return this.request(Ce,e,t)}head(e,t={}){return this.request(We,e,t)}jsonp(e,t){return this.request(ie,e,{params:new se().append(t,"JSONP_CALLBACK"),observe:"body",responseType:"json"})}options(e,t={}){return this.request("OPTIONS",e,t)}patch(e,t,o={}){return this.request(_o,e,ko(o,t))}post(e,t,o={}){return this.request(jo,e,ko(o,t))}put(e,t,o={}){return this.request(Zo,e,ko(o,t))}};Reflect.metadata("design:paramtypes",[q,De])(ve);h(ve,[[b(),0]]);function ko(s,e){return{body:e,headers:s.headers,context:s.context,observe:s.observe,params:s.params,reportProgress:s.reportProgress,responseType:s.responseType,withCredentials:s.withCredentials}}var Qe=class{handle(e,t){return new Ze(o=>{let r=new AbortController;return this.doRequest(e,r.signal,o).then(xo,i=>o.error(new H({error:i}))),()=>r.abort()})}async doRequest(e,t,o){let r=this.createRequestInit(e),i;try{let c=fetch(e.urlWithParams,{signal:t,...r});_s(c),o.next({type:V.Sent}),i=await c}catch(c){o.error(new H({error:c,status:c.status??0,statusText:c.statusText,url:e.urlWithParams,headers:c.headers}));return}let n=new j(i.headers),a=i.statusText,l=Pr(i)??e.urlWithParams,d=i.status,f=null;if(e.reportProgress&&o.next(new Ke({headers:n,status:d,statusText:a,url:l})),i.body){let c=i.headers.get("content-length"),m=[],y=i.body.getReader(),k=0,v,x;for(;;){let N=await y.read();if(N.done)break;m.push(N.value),k+=N.value.length,e.reportProgress&&(x=e.responseType==="text"?(x??"")+(v??(v=new TextDecoder)).decode(N.value,{stream:!0}):void 0,o.next({type:V.DownloadProgress,total:c?+c:void 0,loaded:k,partialText:x}))}let C=this.concatChunks(m,k);try{let N=i.headers.get(vo)??"";f=this.parseBody(e,C,N)}catch(N){o.error(new H({error:N,headers:new j(i.headers),status:i.status,statusText:i.statusText,url:Pr(i)??e.urlWithParams}));return}}d===0&&(d=f?200:0),d>=200&&d<300?(o.next(new re({body:f,headers:n,status:d,statusText:a,url:l})),o.complete()):o.error(new H({error:f,headers:n,status:d,statusText:a,url:l}))}parseBody(e,t,o){switch(e.responseType){case"json":let r=new TextDecoder().decode(t).replace(js,"");return r===""?null:JSON.parse(r);case"text":return new TextDecoder().decode(t);case"blob":return new Blob([t],{type:o});case"arraybuffer":return t.buffer}}createRequestInit(e){let t={},o=e.withCredentials?"include":void 0;if(e.headers.forEach((r,i)=>{t[r]=Array.isArray(i)?i.join(","):String(i)}),e.headers.has(zr)||(t[zr]=$s),!e.headers.has(vo)){let r=e.detectContentTypeHeader();r!==null&&(t[vo]=r)}return{body:e.serializeBody(),method:e.method,headers:t,credentials:o}}concatChunks(e,t){let o=new Uint8Array(t),r=0;for(let i of e)o.set(i,r),r+=i.length;return o}};h(Qe,[[b(),0]]);function xo(){}function _s(s){s.then(xo,xo)}function Pr(s){if(s.url)return s.url;let e=Zs.toLocaleLowerCase();return s.headers.get(e)}var js=/^\)\]\}',?\n/,Zs="X-Request-URL",vo="Content-Type",zr="Accept",Fs="text/plain",Ws="application/json",$s=`${Ws}, ${Fs}, */*`;function Vs(s,e){return new Xe(s,e)}function et(s,e,t=[]){return{kind:s,config:e,providers:t}}function Hs(s){return[...s].sort((e,t)=>e.kind-t.kind)}function Co(s={}){let e=[];return s.backend==="fetch"?e.push(_r()):s.backend==="xhr"&&e.push(jr()),s.xsrf===!1?e.push(Zr()):s.xsrf&&e.push(zt(s.xsrf)),e.sort((t,o)=>t.kind-o.kind)}function Us(){return{config:{backend:"xhr",xsrf:{cookieName:"XSRF-TOKEN",headerName:"X-XSRF-TOKEN"},legacyInterceptors:!1},providers:[]}}function qs(s,e){switch(s.providers.push(...e.providers),e.kind){case 0:e.config.backend&&(s.config.backend=e.config.backend);break;case 1:e.config.xsrf===!1?s.config.xsrf=!1:e.config.xsrf&&(s.config.xsrf={cookieName:e.config.xsrf.cookieName??(s.config.xsrf===!1?"XSRF-TOKEN":s.config.xsrf.cookieName),headerName:e.config.xsrf.headerName??(s.config.xsrf===!1?"X-XSRF-TOKEN":s.config.xsrf.headerName)});break;case 4:e.config.legacyInterceptors&&(s.config.legacyInterceptors=!0);break}return s}function Js(s){return s.reduce(qs,Us())}function Bs(s){return s===!1?[{provide:G,useClass:ze}]:[G,{provide:Mt,useExisting:G,multi:!0},{provide:Pe,useClass:be},{provide:bt,useValue:s.cookieName},{provide:kt,useValue:s.headerName}]}function Ks(s){if(s==="fetch")return[Qe,{provide:de,useExisting:Qe}];if(s==="xhr")return[Me,{provide:de,useExisting:Me}];throw new Oo(`Unsupported http client backend: ${s}`)}function _r(){return et(0,{backend:"fetch"})}function jr(){return et(0,{backend:"xhr"})}function Zr(){return et(1,{xsrf:!1})}function zt(s={}){return et(1,{xsrf:{cookieName:s.cookieName,headerName:s.headerName}})}function Xs(s){return et(3,{interceptors:s},s.map(e=>({provide:Mt,useValue:e,multi:!0})))}function _t(){return et(4,{legacyInterceptors:!0},[{provide:Pt,useValue:!0}])}function jt(...s){let e=Hs(s),t=Js(e);return[ve,{provide:Pt,useValue:t.config.legacyInterceptors},{provide:De,useFactory:Vs,deps:[de,q]},...t.providers,...Bs(t.config.xsrf),...Ks(t.config.backend)]}function Fr(s={}){return[G,{provide:Dt,useExisting:G,multi:!0},{provide:Pe,useClass:be},{provide:bt,useValue:s.cookieName??"XSRF-TOKEN"},{provide:kt,useValue:s.headerName??"X-XSRF-TOKEN"}]}function Gs(){return[{provide:G,useClass:ze}]}function Ys(){return typeof window=="object"?window:{}}function Qs(){return[ke,{provide:Ge,useFactory:Ys},{provide:Dt,useClass:_e,multi:!0}]}var So=class s{static disable(){return{module:s,providers:[...Gs()]}}static withOptions(e={}){return{module:s,providers:[...Fr(e)]}}};h(So,[[J({providers:[...Fr()]}),0]]);var Ro=class s{static withOptions(e={}){let t=[...Co(e),_t()];return{module:s,providers:[...jt(...t)]}}};h(Ro,[[J({providers:[...jt(_t(),zt({cookieName:"XSRF-TOKEN",headerName:"X-XSRF-TOKEN"}))]}),0]]);var Io=class{};h(Io,[[J({providers:[...Qs()]}),0]]);var eg=(s,e,t)=>e(s,t).pipe(Ft(o=>(Number(o?.status)===401&&Dr(),No(()=>o)))),Zt=class{constructor(e){this.http=e}state(){return this.request("GET","/api/gateway-admin/state")}session(){return this.request("GET","/api/gateway-admin/session")}updateRoutes(e){return this.request("PUT","/api/gateway-admin/routes",{routes:e})}listRules(){return this.request("GET","/api/gateway-admin/rules")}getRule(e){return this.request("GET",`/api/gateway-admin/rules/${encodeURIComponent(e)}`)}saveRule(e){return this.request("PUT",`/api/gateway-admin/rules/${encodeURIComponent(e.id)}`,e)}removeRule(e){return this.request("DELETE",`/api/gateway-admin/rules/${encodeURIComponent(e)}`)}async request(e,t,o){try{let r=await Ao(this.http.request(e,t,{body:o,observe:"response",responseType:"json",withCredentials:!0}));return{ok:r.status>=200&&r.status<300,status:r.status,body:r.body}}catch(r){return{ok:!1,status:Number(r?.status)||0,body:r?.error,error:r}}}};Reflect.metadata("design:paramtypes",[ve])(Zt);h(Zt,[[b(),0]]);var ot={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function tt(s,e,t,o){return{id:s,name:e,type:t,label:o}}var ti=[{type:ot.route,label:"Gateway route",labelZh:"\u7F51\u5173\u8DEF\u7531",description:"Forward matching requests to a microservice or static upstream",descriptionZh:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[tt("in","in","input","Input")],outputs:[tt("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",labelZh:"\u5165\u53E3\u8DEF\u5F84",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value.",descriptionZh:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002"},{key:"service",label:"Service",labelZh:"\u670D\u52A1\u540D",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",labelZh:"\u4E0A\u6E38\u5730\u5740",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",labelZh:"\u4E0A\u6E38\u8DEF\u5F84",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",labelZh:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",min:0,step:100},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"headers",label:"Request headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",labelZh:"\u54CD\u5E94\u5934",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",labelZh:"\u9650\u6D41",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",labelZh:"\u7F13\u5B58",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",labelZh:"\u7194\u65AD",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",labelZh:"\u9694\u79BB\u8231",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:ot.condition,label:"Gateway condition",labelZh:"\u7F51\u5173\u6761\u4EF6",description:"Match path, method, host, header or query values",descriptionZh:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[tt("in","in","input","Input")],outputs:[tt("true","true","output","True"),tt("false","false","output","False")],fields:[{key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"select",defaultValue:"path",options:[{label:"Path",labelZh:"\u8DEF\u5F84",value:"path"},{label:"Method",labelZh:"\u65B9\u6CD5",value:"method"},{label:"Host",labelZh:"\u4E3B\u673A",value:"host"},{label:"Header",labelZh:"\u8BF7\u6C42\u5934",value:"header"},{label:"Query",labelZh:"\u67E5\u8BE2\u53C2\u6570",value:"query"}]},{key:"name",label:"Header / query name",labelZh:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"equals",options:[{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"prefix",labelZh:"\u524D\u7F00",value:"prefix"},{label:"not prefix",labelZh:"\u975E\u524D\u7F00",value:"not-prefix"},{label:"exists",labelZh:"\u5B58\u5728",value:"exists"},{label:"not exists",labelZh:"\u4E0D\u5B58\u5728",value:"not-exists"}]},{key:"value",label:"Value",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:ot.deny,label:"Gateway deny",labelZh:"\u7F51\u5173\u62D2\u7EDD",description:"Reject matching requests at the gateway",descriptionZh:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[tt("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",labelZh:"\u72B6\u6001\u7801",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"body",label:"Body",labelZh:"\u54CD\u5E94\u4F53",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function oi(s){return ti.forEach(e=>s.register(e)),s}function ri(){return oi(new D)}function rg(s="zh-CN"){let e=s==="zh-CN",t=ri(),o=(f,u,c,m,y,k)=>t.createNode(f,{x:m,y},{id:u,name:c,config:k}),r=o("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),i=o(ot.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),n=o(ot.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),a=o(ot.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),l=(f,u,c,m)=>({id:f,sourceNodeId:u,sourcePort:c,targetNodeId:m,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[r,i,n,a],connections:[l("conn_1","start_1","out","condition_1"),l("conn_2","condition_1","true","route_1"),l("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}export{Y as a,oo as b,D as c,qa as d,ge as e,yo as f,_r as g,Zr as h,Xs as i,jt as j,Gc as k,Yc as l,Dr as m,eg as n,Zt as o,oi as p,rg as q};
