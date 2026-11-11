import{a as Wr}from"./chunk-OHZ55BRH.js";import{A as ei,B as u,C as Yt,D as ti,E as oe,F as D,H as Gt,I as Je,J as Jt,K as ye,L as Ve,M as N,N as gs,O as L,P as bs,R as Qt,S as Zt,T as Ne,U as si,V as ii,W as vt,X as ri,a as Gs,c as Js,j as He,ja as ni,k as Ue,ka as oi,l as Qs,o as Lt,p as Ye,q as Zs,r as ke,t as Ut,u as Ge,v as Y,w as T,x as Xs,y as gt,z as bt}from"./chunk-V2FOODV7.js";var ge=class extends Js{constructor(e=!1){super(),this.async=e}emit(e){super.next(e)}subscribe(e){let t,s=o=>null,r=()=>null;if(e&&typeof e=="object"){let o=e;t=this.async?a=>{setTimeout(()=>o.next?.(a))}:a=>{o.next?.(a)},o.error&&(s=this.async?a=>{setTimeout(()=>o.error?.(a))}:a=>{o.error?.(a)}),o.complete&&(r=this.async?()=>{setTimeout(()=>o.complete?.())}:()=>{o.complete?.()})}else t=this.async?o=>{setTimeout(()=>e(o))}:o=>{e(o)};let n=super.subscribe({next:t,error:s,complete:r});return e instanceof Gs&&e.add(n),n}};var ai,x=Symbol("__noReact"),j=class{constructor(){this[ai]=!0}untrack(e){return e()}};ai=x;u(j,[[D(),0]]);var li=oe("NoReactive",{props:()=>({})});var Qe=Symbol("__REACT"),ui=Symbol("__SUBSCRIBABLE_NOTIFY"),It=new WeakMap,ci=new WeakMap,Xt=new WeakMap;function fi(i){return Ye(i)&&Object.prototype.hasOwnProperty.call(i,Qe)&&!!i[Qe]}function ws(i){return Xt.get(i)}function di(i){return fi(i)}function hi(i){return!(!i||!Ye(i)||i[x]||fi(i)||mi(i))}var vs=!1,es=null;function mi(i){return i instanceof Date||i instanceof Map||i instanceof Set||i instanceof WeakMap||i instanceof WeakSet||i instanceof Promise}function yi(i){return!!i&&He(i.subscribe)}function Fr(i,e){if(!yi(i))return;let t=ci.get(i);t||(t=new WeakMap,ci.set(i,t)),!t.has(e)&&t.set(e,i.subscribe(()=>{e.trigger(i,ui)}))}function be(i,e,t){let s=Xt.get(i);if(s)return s;if(!hi(i))return i;let r=ti(i?.constructor)?.getDefines(li)??[],n;if(r.length){let c=r.map(h=>h.propertyKey).filter(Boolean);if(!c.length)return i;n=new Set(c)}let o=t?.length?new Map(t.map(c=>[c.propertyKey,c])):void 0,a=new Proxy(i,{get(c,h,p){let f=Reflect.get(c,h,p),d=h!==Qe&&n!==void 0&&n.has(h);!d&&h!==Qe&&yi(c)&&(Fr(c,e),e.track(c,ui)),!d&&h!==Qe&&(vs&&es?o?.get(es)?.dependencies?.includes(h)&&e.track(c,h):e.track(c,h));let y=o?.get(h);if(y)return zr(c,y,e);if(He(f))mi(c)&&(f=f.bind(c));else if(hi(f)||Xt.has(f))return be(f,e);return f},set(c,h,p,f){if(h===Qe)return!0;let d=c[h],y=Reflect.set(c,h,p,f);return d!==p&&(e.trigger(c,h),t?.forEach(m=>{m.dependencies?.includes(h)&&pi(c,m.propertyKey)})),y},deleteProperty(c,h){let p=Zs(c,h),f=Reflect.deleteProperty(c,h);return p&&f&&(e.trigger(c,h),t?.forEach(d=>{d.dependencies?.includes(h)&&pi(c,d.propertyKey)})),f}});return Object.defineProperty(i,Qe,{value:!0,writable:!0,configurable:!1,enumerable:!1}),Xt.set(i,a),a}function zr(i,e,t){It.has(i)||It.set(i,new Map);let s=It.get(i),r=s.get(e.propertyKey);return r&&e?.cache!==!1&&!Array.from(r.deps).some(o=>Reflect.get(i,o)!==r.value)?r.value:t.run(()=>{vs=!0,es=e.propertyKey;try{let n;if(e?.compute?typeof e.compute=="function"?n=e.compute(i):n=new Function("ctx",`with(ctx){return ${e.compute}}`)(i):n=Reflect.get(i,e.propertyKey),e?.cache!==!1){let o=new Set;e?.dependencies&&e.dependencies.forEach(a=>o.add(a)),s.set(e.propertyKey,{value:n,deps:o})}return n}finally{vs=!1,es=null}})}function pi(i,e){if(!It.has(i))return;let t=It.get(i);e?t.delete(e):t.clear()}var Le=class{constructor(){this.monitored=new Map}monitor(e,t){let s=this.monitored.get(e);return s||(s=this.createEntry(e),this.monitored.set(e,s)),s.listeners.add(t),()=>{s?.listeners.delete(t),s&&s.listeners.size===0&&this.stopMonitoring(e)}}stopMonitoring(e){let t=this.monitored.get(e);t&&(t.cleanup(),this.monitored.delete(e))}focusVia(e,t="program"){let s=this.monitored.get(e);s&&(s.origin=t),e.focus?.()}createEntry(e){let t=new Set,s={listeners:t,origin:null,cleanup:()=>{}},r=p=>()=>{s.origin=p},n=r("keyboard"),o=r("mouse"),a=r("touch"),c=()=>{let p=s.origin||"program";s.origin=null,t.forEach(f=>f({focused:!0,origin:p}))},h=()=>{s.origin=null,t.forEach(p=>p({focused:!1,origin:null}))};return e.addEventListener?.("keydown",n,!0),e.addEventListener?.("mousedown",o,!0),e.addEventListener?.("touchstart",a,!0),e.addEventListener?.("focus",c,!0),e.addEventListener?.("blur",h,!0),s.cleanup=()=>{e.removeEventListener?.("keydown",n,!0),e.removeEventListener?.("mousedown",o,!0),e.removeEventListener?.("touchstart",a,!0),e.removeEventListener?.("focus",c,!0),e.removeEventListener?.("blur",h,!0)},s}};u(Le,[[L(),0]]);var xs=class{constructor(e,t){this.host=e,this.monitor=t,this.enabled=!0,this.onKeydown=s=>this.handleKeydown(s),e.addEventListener?.("keydown",this.onKeydown,!0)}focusInitialElement(){let e=this.query("[focusInitial],[focus-initial]")[0];return e?this.focus(e):this.focusFirstTabbableElement()}focusFirstTabbableElement(){let e=this.tabbableElements()[0];return e?this.focus(e):!1}focusLastTabbableElement(){let e=this.tabbableElements(),t=e[e.length-1];return t?this.focus(t):!1}destroy(){this.host.removeEventListener?.("keydown",this.onKeydown,!0)}handleKeydown(e){if(!this.enabled||String(e?.key||"").toLowerCase()!=="tab")return;let t=this.tabbableElements();if(!t.length)return;let s=this.host.ownerDocument?.activeElement,r=t.indexOf(s),n=e.shiftKey?t[r<=0?t.length-1:r-1]:t[r<0||r===t.length-1?0:r+1];e.preventDefault?.(),this.focus(n)}tabbableElements(){return this.query("input,textarea,select,button,a,[tabindex]").filter(e=>!e.hasAttribute?.("disabled")&&e.getAttribute?.("tabindex")!=="-1")}query(e){return Array.from(this.host.querySelectorAll?.(e)||[])}focus(e){return typeof e.focus!="function"?!1:(this.monitor.focusVia(e,"program"),!0)}},wt=class{constructor(e){this.monitor=e}create(e){return new xs(e,this.monitor)}};Reflect.metadata("design:paramtypes",[Le])(wt);u(wt,[[L(),0]]);var gi,te=class extends Qt{constructor(){super(...arguments),this[gi]=!0}};gi=x;u(te,[[D(),0]]);var Ie=class{};u(Ie,[[D(),0]]);var bi,je="\u01BFfac",w;(function(i){i[i.Normal=0]="Normal",i[i.Conditional=2]="Conditional",i[i.Iterable=4]="Iterable",i[i.Component=8]="Component"})(w||(w={}));var se=class extends Qt{constructor(){super(...arguments),this[bi]=!0}};bi=x;u(se,[[D(),0]]);var Ze=class{};u(Ze,[[D(),0]]);var vi,H=class{constructor(){this[vi]=!0}};vi=x;u(H,[[D(),0]]);var wi,g=class{constructor(e){this[wi]=!0,this.nativeElement=e}};wi=x;var xi,A=class{constructor(){this[xi]=!0}};xi=x;u(A,[[D(),0]]);var Ri,ts=class{constructor(){this[Ri]=!0}};Ri=x;u(ts,[[D(),0]]);var Rs=class extends ts{};u(Rs,[[D(),0]]);var O;(function(i){i[i.Element=1]="Element",i[i.Text=3]="Text",i[i.Comment=8]="Comment",i[i.Container=16]="Container",i[i.ElementContainer=32]="ElementContainer",i[i.Projection=64]="Projection",i[i.Template=128]="Template",i[i.AnyRNode=3]="AnyRNode",i[i.AnyContainer=48]="AnyContainer"})(O||(O={}));var ce=Symbol("__BINDINGS"),ie=Symbol("__DIRECTIVES"),re=Symbol("__COMPONENTDEF"),xt=Symbol("__CUSTOM_ELEMENTS"),he=Symbol("__LOCAL_REFS"),ss=Symbol("__TEMPLATE_FACTORY"),_e=Symbol("__PROJECTION_NODES");var Ei,Ci;(function(i){i[i.Important=1]="Important",i[i.DashCase=2]="DashCase"})(Ci||(Ci={}));var R=class{constructor(){this[Ei]=!0}};Ei=x;u(R,[[D(),0]]);var qr={name:"custom-elements"},Kr={name:"no-errors-schema"};var Hr=new Set(["a","article","aside","br","button","code","div","em","footer","form","h1","h2","h3","h4","h5","h6","header","img","input","label","li","main","nav","ol","option","p","pre","section","select","small","span","strong","table","tbody","td","textarea","th","thead","tr","ul"]);function _i(i,e){return Array.from(new Map([...i||[],...e||[]].map(t=>[t.name,t])).values())}function ki(i,e){return!!i?.some(t=>t?.name===e.name)}function Ur(i,e){return Hr.has(String(i||"").toLowerCase())||ki(e,Kr)?!0:ki(e,qr)&&String(i||"").includes("-")}function Si(i,e){if(!Ur(i,e))throw new Error(`Element <${i}> is not allowed by the component schemas.`)}var Ai=Y("TEMPLATE_SCHEMAS");var jt=class{};u(jt,[[D(),0]]);var Di,G=class{constructor(){this[Di]=!0}};Di=x;u(G,[[D(),0]]);var l=oe("Attribute",{props:(i,e)=>({alias:i,required:e,nullable:!0})});var is=oe("Computed",{props:(i,e=!0)=>Array.isArray(i)?{dependencies:i,cache:e}:i&&typeof i=="object"?i:{cache:e}});var rs=Y("CUSTOM_ELEMENTS"),Xe=Y("DIRECTIVES"),E=oe("Directive",{actionType:bt.declaration|bt.directive,appendProps:i=>{i.static=!1,i.dirType=i.dirType||0},def:{class:i=>{let e=i.classRef;e.type[Ut]=!0,e.assignAnnotation(i.define.metadata);let t=e.getAnnotation();t.selector||(t.selector=e.className);let s=i.define.metadata;s.providers&&t.providers.push(...s.providers),s.imports&&(t.imports=Jt(s.imports)),t.attributes=e.getDefines(l).map(d=>d.metadata),t.computeds=e.getDefines(is).map(d=>d.metadata),t.exportProviders.push({provide:Xe,useValue:t,multi:!0});let n=(t.selector||"").split(",").map(d=>d.trim()).filter(d=>d.length>0),o=[],a=[],c=[],h=["button","input","div","span","a","form","ul","li","p","h1","h2","h3","h4","h5","h6","table","tr","td","th","img","video","audio","select","option","textarea","label","link","meta","script","style","panel"];for(let d of n)if(d.startsWith("*")){let y=`[${d}]`;o.push(y),c.push(y)}else if(d.startsWith("[")&&d.endsWith("]"))o.push(d),c.push(d);else if(d.includes("=")){let y=`[${d}]`;o.push(y),c.push(y)}else if(d.includes("-"))a.push(d),c.push(d);else if(h.includes(d))a.push(d),c.push(d);else{let y=`[${d}]`;o.push(y),c.push(y)}t.selector=c.join(",");let p=o.join(","),f=a.join(",");p&&p!==t.selector&&t.exportProviders.push({provide:Xe,useValue:{...t,selector:p},multi:!0}),f&&t.exportProviders.push({provide:rs,useValue:{...t,selector:f},multi:!0}),t[je]||(t[je]=(d,y)=>{try{return e.createInvocation(d,y)}catch{return null}})}},factory:i=>i.get(Ze)});var et=oe("ViewChild",{props:(i,e)=>i&&typeof i=="object"&&!("prototype"in i)?i:{selector:i,read:e,nullable:!0}});var ns=Y("COMPONENTS"),C=oe("Component",{actionType:bt.declaration|bt.component,appendProps:i=>{i.static=!1},def:{class:i=>{let e=i.classRef;e.type[Ut]=!0,e.assignAnnotation(i.define.metadata);let t=e.getAnnotation();t.dirType=w.Component,t.selector||(t.selector=e.className);let s=i.define.metadata;if(s.providers&&t.providers.push(...s.providers),s.imports&&(t.imports=Jt(s.imports)),t.attributes=e.getDefines(l).map(r=>r.metadata),t.computeds=e.getDefines(is).map(r=>r.metadata),t.viewChilds=e.getDefines(et).map(r=>r.metadata),Cs.test(t.selector)){let r=t.selector.split(","),n=r.filter(a=>Cs.test(a)).join(","),o=r.filter(a=>!Cs.test(a)).join(",");n&&t.exportProviders.push({provide:Xe,useValue:{...t,selector:n},multi:!0}),o&&t.exportProviders.push({provide:ns,useValue:{...t,selector:o},multi:!0})}else t.exportProviders.push({provide:ns,useValue:t,multi:!0});t[je]||(t[je]=(r,n)=>r.get(Ie).create(e.type,{...n,injector:r}))}},factory:i=>i.get(Ie)}),Cs=/\[\w+\]/;var Ti,Es=class{constructor(e,t,s,r){this.rootNodes=e,this.context=t,this.injector=s,this[Ti]=!0,this._isDestroyed=!1,this._destroyCallbacks=[],this.computedCache=new Map,this.effect=r??s.get(j),s.onDestroy(this)}get destroyed(){return this._isDestroyed}destroy(){this._isDestroyed||(this._isDestroyed=!0,this.injector.detachNodes(this.rootNodes),this._destroyCallbacks.forEach(e=>e()),this._destroyCallbacks=[])}get localRefIndex(){if(!this._localRefIndex){this._localRefIndex=new Map;let e=t=>{for(let s of t){let r=s[he];r?.length&&r.forEach(o=>{let a=o.toLowerCase();this._localRefIndex.has(a)||this._localRefIndex.set(a,s)});let n=s?.childNodes;n?.length&&e(n)}};e(this.rootNodes)}return this._localRefIndex}onDestroy(e){if(e){this._destroyCallbacks.push(e);return}this.destroy()}query(e){return this.injector.query(e,this.rootNodes)}queryAll(e){return this.injector.queryAll(e,this.rootNodes)}};Ti=x;function Oi(i,e,t,s){return new Es(i,e,t,s)}var Vi,Mt=Symbol("__template_scope_parent");function Yr(i){if(i.nodeType&O.ElementContainer)return!0;let e=i.tagName;if(typeof e=="string"&&e.toLowerCase()==="v-container")return!0;let t=i.getAttribute;return typeof t=="function"&&t.call(i,"data-v-container")!==null}var ks=class{get rootNodes(){return this._rootNodes??[]}constructor(e,t,s){this.elementRef=t,this.options=s,this[Vi]=!0,typeof e=="function"?this._rootNodesFactory=e:this._rootNodes=e}createEmbeddedView(e,t,s){if(t=t||this.options?.injector,!t)throw new ke("NodeInjector is required");let r=t.get(R);s=s||t.get(j);let n=e;if(e){if(this.options?.context)if(typeof e=="object"&&e!==null){let c=this.options.context;c&&e!==c&&(n=Object.assign({},e),Object.defineProperty(n,Mt,{value:c,configurable:!0,enumerable:!1,writable:!0}),Object.setPrototypeOf(n,c))}else n=this.options.context}else n=this.options?.context??{};e=di(n)?n:be(n,s);let o;return this._rootNodesFactory?o=this._rootNodesFactory(r,t,e,s):(o=this.rootNodes.map(c=>this.clone(c,r)),o.forEach(c=>this.bindings(c,e,s,t))),Oi(o,e,t,s)}bindings(e,t,s,r){let n=e[ce];n?.length&&n.forEach(o=>{let a=o(e,t,s,r);a&&r.onDestroy(a)}),e.childNodes?.length&&!Yr(e)&&Array.from(e.childNodes).forEach(o=>{this.bindings(o,t,s,r)})}clone(e,t){let s=this.cloneNode(e,t);return s[ce]=e[ce]?.slice(0),s[ie]=e[ie]?.slice(0),s[xt]=e[xt]?.slice(0),s[re]=e[re],s[he]=e[he]?.slice(0),e.childNodes?.length&&e.childNodes.forEach(r=>{s.appendChild(this.clone(r,t))}),s}cloneNode(e,t){return e.nodeType===O.Text?t.createText(e.textContent||""):e.nodeType===O.Comment?t.createComment(e.textContent||""):this.cloneElementWithAttributes(e,t)}cloneElementWithAttributes(e,t){let s=e.tagName,r=e.namespaceURI,n=t.createElement(s,r&&r!=="http://www.w3.org/1999/xhtml"?r:void 0);try{n.nodeType=e.nodeType}catch{}let o=t.getAttributes(e);return o?.length&&o.forEach(a=>{a?.name&&t.setAttribute(n,a.name,a.value,a.namespace)}),n}};Vi=x;function tt(i,e,t){return new ks(i,e,t)}var Ni=new WeakMap;function Gr(i){let e=Ni.get(i);return e||(e=[],Ni.set(i,e)),e}function Jr(i,e){if(!e)return null;let t=Gr(e);if(i instanceof Se)return t.push({root:i,siblings:[],parentNode:e}),null;if(t.length===0)return null;let s=t[t.length-1];if(!s.root)return null;let r=s.siblings.length>0?s.siblings[s.siblings.length-1]:s.root;return i._rootDirective=s.root,i._prevDirective=r,r._nextDirective=i,s.siblings.push(i),s.root}var ve=class{constructor(e,t){this.viewContainer=e,this._hasView=!1,this._context=null,this._rootDirective=null,this._prevDirective=null,this._nextDirective=null,this._templateRef=t}set context(e){let t=this._context!==e;this._context=e,t&&this.updateView()}set template(e){let t=this._templateRef!==e;this._templateRef=e,t&&this.updateView()}createView(){this._templateRef&&(this.viewContainer.createEmbeddedView(this._templateRef,this._context),this._hasView=!0)}clearView(){this.viewContainer.clear(),this._hasView=!1}updateView(){this.viewContainer.injector.destroyed||(this.clearAllViews(),this.shouldShow()?this.createView():this.checkNextSibling())}clearAllViews(){this._hasView&&this.clearView();let e=this._nextDirective;for(;e;)e._hasView&&e.clearView(),e=e._nextDirective}checkNextSibling(){let e=this._nextDirective;for(;e;){if(e.shouldShow()){e.createView();return}e=e._nextDirective}}shouldShow(){return!1}onInit(){this.updateView()}onDestroy(){this.clearView(),this._prevDirective&&(this._prevDirective._nextDirective=this._nextDirective),this._nextDirective&&(this._nextDirective._prevDirective=this._prevDirective)}};Reflect.metadata("design:paramtypes",[Object])(ve.prototype,"context");Reflect.metadata("design:paramtypes",[A])(ve.prototype,"template");u(ve,[[l(),1,"context"],[l(),1,"template"]]);var Se=class extends ve{constructor(e,t){super(e,t),this._condition=!1,this.parentNode=null}set if(e){let t=this._condition!==e;this._condition=e,t&&this.updateView()}shouldShow(){return this._condition}};Reflect.metadata("design:paramtypes",[H,A])(Se);Reflect.metadata("design:paramtypes",[Boolean])(Se.prototype,"if");u(Se,[[l(),1,"if"],[E({selector:"[v-if],[*if]",dirType:w.Conditional,priority:10}),0]]);var st=class extends ve{constructor(e,t){super(e,t)}set elseIf(e){let t=this._condition!==e;this._condition=e,t&&this.updateView()}shouldShow(){if(this._condition!==!0)return!1;let e=this._rootDirective;if(!e||e._hasView)return!1;let t=this._prevDirective;for(;t&&t!==e;){if(t._hasView)return!1;t=t._prevDirective}return!0}};Reflect.metadata("design:paramtypes",[H,A])(st);Reflect.metadata("design:paramtypes",[Boolean])(st.prototype,"elseIf");u(st,[[l(),1,"elseIf"],[E({selector:"[v-else-if],[*else-if]",dirType:w.Conditional,priority:10}),0]]);var Rt=class extends ve{constructor(e,t){super(e,t)}shouldShow(){let e=this._rootDirective;if(!e||e._hasView)return!1;let t=this._prevDirective;for(;t&&t!==e;){if(t._hasView)return!1;t=t._prevDirective}return!0}};Reflect.metadata("design:paramtypes",[H,A])(Rt);u(Rt,[[E({selector:"[v-else],[*else]",dirType:w.Conditional,priority:10}),0]]);function Li(i,e){i instanceof Se&&(i.parentNode=e),Jr(i,e)}var Pt=new WeakMap;function it(i){let e=Pt.get(i);return e||(e={switchDirective:null,cases:[],defaults:[],parentNode:i},Pt.set(i,e)),e}var Ct=new WeakMap,Et=new WeakMap;function Qr(i,e){let t=Ct.get(i);t||(t=[],Ct.set(i,t)),t.push(e)}function Zr(i,e){let t=Et.get(i);t||(t=[],Et.set(i,t)),t.push(e)}function Mi(i,e){let t=Ct.get(i);t&&(t.forEach(s=>{s._switchDirective=e,e.registerCase(s)}),Ct.delete(i))}function Pi(i,e){let t=Et.get(i);t&&(t.forEach(s=>{s._switchDirective=e,e.registerDefault(s)}),Et.delete(i))}function os(i){return i._switchLookupNode??i.parentNode??null}function Ii(i,e){if(!i)return;let t=Ct.get(i);if(!t)return;let s=t.indexOf(e);s>-1&&t.splice(s,1),t.length||Ct.delete(i)}function ji(i,e){if(!i)return;let t=Et.get(i);if(!t)return;let s=t.indexOf(e);s>-1&&t.splice(s,1),t.length||Et.delete(i)}var pe=class{constructor(){this.parentNode=null}set switch(e){let t=this._value!=e;this._value=e,t&&this.updateCases()}registerCase(e){let t=it(this.parentNode);t.cases.indexOf(e)===-1&&(t.cases.push(e),this._value!==void 0&&e.updateView(this._value))}unregisterCase(e){if(!this.parentNode)return;let t=it(this.parentNode),s=t.cases.indexOf(e);s>-1&&t.cases.splice(s,1)}registerDefault(e){if(!this.parentNode)return;let t=it(this.parentNode);t.defaults.indexOf(e)===-1&&t.defaults.push(e),this._value!==void 0&&this.updateCases()}unregisterDefault(e){if(!this.parentNode)return;let t=it(this.parentNode),s=t.defaults.indexOf(e);s>-1&&t.defaults.splice(s,1)}updateCases(){if(!this.parentNode)return;let e=!1;for(let t of it(this.parentNode).cases)t.updateView(this._value)&&(e=!0);for(let t of it(this.parentNode).defaults)t.updateView(!e)}onInit(){this.parentNode&&(Mi(this.parentNode,this),Pi(this.parentNode,this)),this._value!==void 0&&this.updateCases()}onDestroy(){if(!this.parentNode)return;let e=Pt.get(this.parentNode);!e||e.switchDirective!==this||(e.cases.forEach(t=>t.clearView()),e.defaults.forEach(t=>t.clearView()),e.cases=[],e.defaults=[],e.switchDirective=null)}};Reflect.metadata("design:paramtypes",[])(pe);Reflect.metadata("design:paramtypes",[Object])(pe.prototype,"switch");u(pe,[[l(),1,"switch"],[E({selector:"[v-switch],[*switch]",priority:30}),0]]);function as(i,e){if(i.parentNode=e,e){let t=it(e),s=t.cases.slice(),r=t.defaults.slice();t.switchDirective&&t.switchDirective!==i&&(s.forEach(n=>n.clearView()),r.forEach(n=>n.clearView())),t.cases=[],t.defaults=[],t.switchDirective=i,s.forEach(n=>{n._switchDirective=i,i.registerCase(n)}),r.forEach(n=>{n._switchDirective=i,i.registerDefault(n)}),Mi(e,i),Pi(e,i)}}function $i(i){if(!i)return null;let e=i;for(;e;){let t=Pt.get(e);if(t?.switchDirective)return t.switchDirective;e=e.parentNode}return null}var ue=class{constructor(e,t,s){this.viewContainer=e,this._switchDirective=s,this._hasView=!1,this._context=null,this._template=t}set context(e){this._context=e}set case(e){this._caseValue=e,this._switchDirective&&this._switchDirective._value!==void 0&&this.updateView(this._switchDirective._value)}set template(e){this._template=e}onInit(){let e=os(this),t=$i(e);if(t){this.bindToSwitch(t),this._switchDirective&&this._switchDirective._value!==void 0&&this.updateView(this._switchDirective._value);return}Ii(e,this),e&&Qr(e,this),this._switchDirective&&typeof this._switchDirective.unregisterCase=="function"&&this._switchDirective.unregisterCase(this),this._switchDirective=null}bindToSwitch(e){this._switchDirective!==e&&(this._switchDirective&&typeof this._switchDirective.unregisterCase=="function"&&this._switchDirective.unregisterCase(this),this._switchDirective=e,e.registerCase(this))}updateView(e){let t=this._caseValue===e;return t&&!this._hasView?this.createView():!t&&this._hasView&&this.clearView(),t}createView(){!this._template||this.viewContainer.injector.destroyed||(this.viewContainer.createEmbeddedView(this._template,this._context),this._hasView=!0)}clearView(){this.viewContainer.clear(),this._hasView=!1}onDestroy(){this._switchDirective&&typeof this._switchDirective.unregisterCase=="function"&&this._switchDirective.unregisterCase(this),Ii(os(this),this),this.clearView()}};Reflect.metadata("design:paramtypes",[H,A,Object])(ue);Reflect.metadata("design:paramtypes",[Object])(ue.prototype,"context");Reflect.metadata("design:paramtypes",[Object])(ue.prototype,"case");Reflect.metadata("design:paramtypes",[A])(ue.prototype,"template");u(ue,[[gs(),3,void 0,2],[N(),3,void 0,2],[l(),1,"context"],[l(),1,"case"],[l(),1,"template"],[E({selector:"[v-case],[*case]",dirType:w.Conditional,priority:20}),0]]);var Me=class{constructor(e,t,s){this.viewContainer=e,this._switchDirective=s,this._hasView=!1,this._context=null,this._template=t}set context(e){this._context=e}set template(e){this._template=e}onInit(){let e=os(this),t=$i(e);if(t){this.bindToSwitch(t);return}ji(e,this),e&&Zr(e,this),this._switchDirective&&typeof this._switchDirective.unregisterDefault=="function"&&this._switchDirective.unregisterDefault(this),this._switchDirective=null}bindToSwitch(e){this._switchDirective!==e&&(this._switchDirective&&typeof this._switchDirective.unregisterDefault=="function"&&this._switchDirective.unregisterDefault(this),this._switchDirective=e,e.registerDefault(this))}updateView(e){e&&!this._hasView?this.createView():!e&&this._hasView&&this.clearView()}createView(){!this._template||this.viewContainer.injector.destroyed||(this.viewContainer.createEmbeddedView(this._template,this._context),this._hasView=!0)}clearView(){this.viewContainer.clear(),this._hasView=!1}canShowDefaultView(){if(!this._switchDirective)return!1;let e=Pt.get(this._switchDirective.parentNode);if(!e)return!0;for(let t of e.cases)if(t._caseValue===this._switchDirective._value)return!1;return!0}onDestroy(){this._switchDirective&&typeof this._switchDirective.unregisterDefault=="function"&&this._switchDirective.unregisterDefault(this),ji(os(this),this),this.clearView()}};Reflect.metadata("design:paramtypes",[H,A,Object])(Me);Reflect.metadata("design:paramtypes",[Object])(Me.prototype,"context");Reflect.metadata("design:paramtypes",[A])(Me.prototype,"template");u(Me,[[gs(),3,void 0,2],[N(),3,void 0,2],[l(),1,"context"],[l(),1,"template"],[E({selector:"[v-default],[*default]",dirType:w.Conditional,priority:20}),0]]);function Ts(i){return i.localName||i.tagName||""}var Xr="http://www.w3.org/1999/xhtml";function Os(i){let e=i.namespaceURI;return e&&e!==Xr?e:void 0}var ls=new WeakMap,_s=new WeakSet,Bi=new Map,en=/^[_$a-zA-Z][_$a-zA-Z0-9]*(?:\.[_$a-zA-Z][_$a-zA-Z0-9]*)*$/;function tn(i){return(i||[]).map(e=>e?.name||"").filter(e=>e.startsWith("#")).map(e=>e.slice(1)).filter(Boolean)}function Vs(i,e,t){let s=tn(e);s.length&&(i[he]=s,t?.registerLocalRefs(i,s))}function Gi(i,e,t,s,r){let n=ls.get(i);n||(n=new Map,ls.set(i,n)),n.get(e)?.unsubscribe(),n.set(e,t.subscribe(s)),!_s.has(i)&&(_s.add(i),r.onDestroy(()=>{let o=ls.get(i);o?.forEach(a=>a.unsubscribe()),o?.clear(),ls.delete(i),_s.delete(i)}))}function Ji(i,e,t,s){let r=i.map(n=>us(n,e,t,s));return(n,o,a,c)=>{let h=[];return r.forEach(p=>{let f=p(n,c,o,a);f&&h.push(f)}),h}}function Qi(i){let e=i.textContent||"",t=i[ce]||[];return t.length?(s,r,n,o)=>{let a=s.createText(e);return t.forEach(c=>{let h=c(a,o,r,n);h&&n.onDestroy(h)}),a}:s=>s.createText(e)}function Zi(i,e,t,s){let r=Ts(i),n=Os(i),o=e.getAttributes(i),a=i[ce]||[],c=i[ie]||[],h=i[re];if(h)return s.componentFactory(i,e,h,o,a,s.delimiter,t,s);if(r===(s.templateTag||""))return s.templateFactory(i,e,o,a,t,s);let p=c.some(y=>y.dirType===w.Iterable||y.dirType===w.Conditional),f=[];if(i.childNodes&&!p)for(let y of i.childNodes){let m=us(y,e,t,s);f.push(m)}let d=o.map(y=>s.attributeFactory(y));return(y,m,b,k)=>{let _=y.createElement(r,n);Vs(_,o,b);try{_.nodeType=i.nodeType}catch{}if(d.forEach(v=>{v(_,y)}),f.forEach(v=>{let Oe=v(y,m,b,k);Oe&&y.appendChild(_,Oe)}),c.forEach(v=>{s.bindDirective(_,v,o,m,b,k,s.delimiter)}),a.length>0){let v=[...a];Promise.resolve().then(()=>{v.forEach(Oe=>{let ae=Oe(_,k,m,b);ae&&b.onDestroy(ae)})})}return _}}function us(i,e,t,s){return i.nodeType===O.Text||i.nodeType===O.Comment?s.textFactory(i,t):s.elementFactory(i,e,t,s)}function fs(i){let{name:e,value:t,namespace:s}=i;return(r,n)=>{n.setAttribute(r,e,t,s)}}function Xi(i,e,t,s,r,n,o,a){let c=s.filter(({name:m,value:b})=>!m.startsWith("@")&&!m.startsWith(":")&&!m.startsWith("[")&&!m.startsWith("v-")&&!Ss(b,n)).map(m=>fs(m)),h=Ts(i),p=Os(i),f=i[ie]||[],d=s.filter(({name:m,value:b})=>m.startsWith("@")||m.startsWith(":")||m==="v-model"||Ss(b,n)).length,y=[];if(i.childNodes?.length)for(let m of i.childNodes){let b=us(m,e,o,a);b&&y.push(b)}return(m,b,k,_)=>{let v=m.createElement(h,p);Vs(v,s,k);try{v.nodeType=i.nodeType}catch{}c.forEach(P=>{P(v,m)});let Oe=k.getElementRef(v),ae=t.\u01BFfac?.(k,{elementRef:Oe});if(!ae)return v;if(s.forEach(({name:P,value:Ee})=>{if(!P.startsWith("@")&&!P.startsWith(":")&&!P.startsWith("[")&&!P.startsWith("v-")){let le=cs(ae.def?.attributes||[],P);le&&(ae.instance[le.propertyKey]=Ee)}}),k.attachComponent(ae),y.length){let P=[];y.forEach(Ee=>{let le=Ee(m,b,k,_);le&&P.push(le)}),P.length&&(v[_e]=P)}if(s.forEach(({name:P,value:Ee})=>{ar(ae,P,Ee,_,b,k,n)}),f.forEach(P=>{sn(v,P,s,b,k,_,n)}),ae.render(),d>0){let P=r.slice(0,d);Promise.resolve().then(()=>{P.forEach(Ee=>{let le=Ee(v,_,b,k);le&&k.onDestroy(le)})})}return v}}function er(i,e,t,s,r,n){let o=t.map(f=>fs(f)),a=Ts(i),c=Os(i),h=i.childNodes||[],p=[];for(let f of h){let d=us(f,e,r,n);p.push(d)}return(f,d,y,m)=>{let b=f.createElement(a,c);Vs(b,t,y);try{b.nodeType=O.Template}catch{}o.forEach(_=>{_(b,f)}),b[ss]=(_,v,Oe,ae)=>{let P=[];return p.forEach(Ee=>{let le=Ee(_,ae,v,Oe);le&&P.push(le)}),P};let k=y.getElementRef(b);return y.attachTemplate(tt(b[ss],k,{injector:y,context:m})),s.forEach(_=>{let v=_(b,null,d,y);v&&y.onDestroy(v)}),b}}function tr(i,e,t,s,r,n,o){let a=r.getElementRef(i),c=e.\u01BFfac?.(r,{elementRef:a,context:n});if(!c)return;r.attachDirective(c);let h=c.instance;h instanceof pe&&as(h,i),Ns(c,e,[],t,n,s,r,o),h.onInit&&h.onInit()}function sn(i,e,t,s,r,n,o){let a=r.getElementRef(i),c=e.\u01BFfac?.(r,{elementRef:a,context:n});if(!c)return;r.attachDirective(c);let h=c.instance;h instanceof pe&&as(h,i),Ns(c,e,e.selector.split(",").map(p=>p.replace(/^\[|\]$/g,"").trim()).filter(Boolean),t,n,s,r,o),h.onInit&&h.onInit()}function sr(i,e,t){for(let s of i)s[ce]=[],s.nodeType===O.Text||s.nodeType===O.Comment?nn(s,s.textContent,e,t):an(s,e,t)}function ir(i,e,t,s,r,n=sr,o=[]){let a=i,c=new Map;t.forEach(h=>{let p=h.selector;if(!p)return;let f=c.get(p);if(f){if(f.type===h.type)return;throw new ke(`has dup component selector: ${p}`)}c.set(p,h),s.querySelectorAll(a,h.selector)?.forEach(y=>{if(y[re]){if(y[re]?.type===h.type)return;throw new ke(`has dup component selector: ${h.selector}`)}y[re]=h})}),e.forEach(h=>{rn(a,h,s)?.forEach(f=>{if(f[re]?.type===h.type)return;let d=f[ie];d?d.push(h):f[ie]=[h]})}),o.forEach(h=>{s.querySelectorAll(a,h.selector)?.forEach(f=>{if(f[re]?.type===h.type)return;let d=f[xt];d?d.push(h):f[xt]=[h]})}),n(i,s,r)}function rn(i,e,t){let s=new Set(t.querySelectorAll(i,e.selector)||[]),r=e.selector.split(",").map(o=>o.trim()).filter(o=>o.startsWith("[")&&o.endsWith("]")).map(o=>o.slice(1,-1));if(!r.length)return s.size?[...s]:null;let n=o=>{(o.nodeType===O.Element||o.nodeType===O.Template)&&t.getAttributes(o).some(c=>dr(c.name,r))&&s.add(o),o.childNodes?.forEach(n)};return i.forEach(n),s.size?[...s]:null}function Pe(i,e){i[ce]?.push(e)}function rr(i,e){let t=i.matchAll(nr(e));return t?Array.from(t):null}function Ss(i,e){if(!i)return!1;let t=nr(e);return t.lastIndex=0,t.test(i)}function nr(i){let e=i.flags.includes("g")?i.flags:`${i.flags}g`;return new RegExp(i.source,e)}function nn(i,e,t,s){if(!e)return;let r=rr(e,s);if(!r?.length)return;Pe(i,(o,a,c,h)=>{if(h.destroyed)return;let p=o;return lr(e,a,c,r,f=>{p.textContent=f},h,s),()=>{p.textContent=e}});let n=t.getAttributes(i);n?.length&&or(i,n,t,s)}function on(i,e,t){let s=i.childNodes;i.childNodes=[],Pe(i,(r,n,o,a)=>{if(a.destroyed)return;let c=r,h=a.getElementRef(c),p=c[ss],f;if(c.hasAttribute(":templateOutletContext")){f=be({},o);let y=c.getAttribute(":templateOutletContext");o.run(()=>{let m=fe(y,n,a,t);Object.assign(f,m)})}else{let m=e.getAttributes(c).filter(b=>b.name.startsWith(":")).map(b=>[b.name.slice(1),b.value]);m.length?(f=be({},o),o.run(()=>{m.forEach(([b,k])=>{let _=fe(k,n,a,t);f[b]=_})})):f=void 0}let d=tt(p||s,h,{injector:a,context:f});d&&a.attachTemplate(d)})}function an(i,e,t){let s=e.getAttributes(i),r=i[ie];or(i,s,e,t),i.childNodes.length>0&&sr(i.childNodes,e,t);let n=i[re];n&&un(i,n,s,e,t),r&&r.length&&(r.sort((o,a)=>(a.priority??0)-(o.priority??0)),i[ie]=r,r.forEach(o=>{fn(i,o,s,e,t)})),i.nodeType===O.Template&&on(i,e,t)}function or(i,e,t,s){e.forEach(({name:r,value:n})=>{r.startsWith("@")?ln(i,r,n,t,s):r.startsWith(":")||r.startsWith("[")&&r.endsWith("]")?cn(i,r,n,t,s):r==="v-model"?pn(i,n,t,s):Ss(n,s)&&hn(i,r,n,t,s)})}function ln(i,e,t,s,r){let n=e.substring(1);Pe(i,(o,a,c,h)=>{if(h.destroyed)return;let p=o,f=bn(t,a,c,h,r);return p.addEventListener(n,f),()=>{p.removeEventListener?.(n,f)}})}function cn(i,e,t,s,r){let n=e.startsWith("[")?e.slice(1,-1):e.substring(1);Pe(i,(o,a,c,h)=>{if(h.destroyed)return;let p=o;if(!(n==="style"||n==="class"))return c.run(()=>{let f=fe(t,a,h,r);typeof p.setProperty=="function"?p.setProperty(n,f):s.setProperty(p,n,f)}),()=>p.removeAttribute(n)})}function hn(i,e,t,s,r){if(!t)return;let n=rr(t,r);n?.length&&Pe(i,(o,a,c,h)=>{if(h.destroyed)return;let p=o,f=(d,y)=>{let m=p;if(d==="value"&&"value"in m&&typeof m.value=="string"){p.value=y;return}p.setAttribute(d,y)};return lr(t,a,c,n,d=>{f(e,d)},h,r),()=>f(e,t)})}function pn(i,e,t,s){Pe(i,(r,n,o,a)=>{let c=r,h=()=>{n[e]=c.getAttribute("value")};return c.addEventListener("input",h),o.run(()=>{c.setAttribute("value",n[e])}),()=>{let p=r;p.removeAttribute("value"),p.removeEventListener?.("input",h)}})}function un(i,e,t,s,r){Pe(i,(n,o,a,c)=>{if(c.destroyed)return;let h=n,p=c.getElementRef(h),f=e.\u01BFfac?.(c,{elementRef:p});f&&(c.attachComponent(f),t.forEach(({name:d,value:y})=>{ar(f,d,y,o,a,c,r)}),f.render())})}function fn(i,e,t,s,r){let n=e.selector.split(",").map(o=>o.replace(/^\[|\]$/g,""));switch(e.dirType){case w.Conditional:e.selector.includes("v-switch")||e.selector.includes("*switch")?hs(i,e,n,t,s,r):(e.selector.includes("v-case")||e.selector.includes("*case"),Wi(i,e,n,t,s,r));break;case w.Iterable:dn(i,e,n,t,s,r);break;default:hs(i,e,n,t,s,r);break}}function ar(i,e,t,s,r,n,o){let a=i.def?.attributes||[];if(e.startsWith("@")){let c=e.substring(1),h=cs(a,c);h&&r.run(()=>{let p=fe(t,s,n,o),f=typeof p=="function"?p.bind(s):p;i.instance[h.propertyKey]instanceof ge?Gi(i.instance,`component:${h.propertyKey}:${c}`,i.instance[h.propertyKey],f,n):i.instance[h.propertyKey]||(i.instance[h.propertyKey]=f)})}else if(e.startsWith(":")){let c=e.substring(1),h=cs(a,c);h&&r.run(()=>{let p=fe(t,s,n,o);i.instance[h.propertyKey]=p})}else{let c=cs(a,e);c&&(i.instance[c.propertyKey]=t)}}function cs(i,e){let t=e.toLowerCase();return i.find(s=>{let r=s.alias==null?"":String(s.alias),n=s.propertyKey==null?"":String(s.propertyKey);return r.toLowerCase()===t||n.toLowerCase()===t})}function hs(i,e,t,s,r,n,o,a){Pe(i,(c,h,p,f)=>{if(f.destroyed)return;let d=f.getElementRef(c),y=o?tt(o,d,{injector:f,context:h}):void 0;y&&f.attachTemplate(y);let m=f.getViewContainerRef(c),b={templateRef:y,elementRef:d,viewContainerRef:m},k=c.parentNode||a;if(!k||a&&k===a){let v=f.getParentNode?.(c);v&&(k=v)}k&&f.setParentNode(c,k);let _=e.\u01BFfac?.(f,b);if(_&&_.instance){f.attachDirective(_);let v=_.instance;v.injector===void 0&&(v.injector=f),v.viewContainer===void 0&&m&&(v.viewContainer=m),v.context===void 0&&(v.context=h),v.template===void 0&&y&&(v.template=y),e.dirType===w.Conditional&&v instanceof ve&&Li(v,k??null),v instanceof pe&&as(v,c),(v instanceof ue||v instanceof Me)&&(v.parentNode=k??null,v._switchLookupNode=k??null),Ns(_,e,t,s,h,p,f,n),v.onInit&&v.onInit()}return()=>{let v=c[ie];Xs(v,e)}})}function Wi(i,e,t,s,r,n){let o=r.parentNode(i),a=hr(r,e.selector,o??void 0);a[ce]=[],o&&(r.insertBefore(o,a,i),r.removeChild(o,i)),t.forEach(c=>{r.removeAttribute(i,c)}),hs(a,e,t,s,r,n,[i],o)}function dn(i,e,t,s,r,n){let o=r.parentNode(i),a=hr(r,e.selector,o??void 0);a[ce]=[],o&&(r.insertBefore(o,a,i),r.removeChild(o,i)),t.forEach(c=>{r.removeAttribute(a,c)}),hs(a,e,t,s,r,n,[i],o)}function Ns(i,e,t,s,r,n,o,a){let c=e.attributes??[];if(!c?.length)return;let h=i.instance;c.forEach(p=>{let f=p.alias??p.propertyKey,d=p.propertyKey,y=Vn(f),m=On(s,y);if(!m){e.dirType===w.Conditional&&p.propertyKey==="context"&&(h[d]=r);return}if(m.name.startsWith("@"))n.run(()=>{let b=fe(m.value,r,o,a);h[d]instanceof ge?Gi(h,`directive:${d}:${m.name}`,h[d],b,o):h[d]||(h[d]=b)});else if(m.name.startsWith(":")||m.name.startsWith("[")&&m.name.endsWith("]"))Ue(m.value)?n.run(()=>{let b=fe(m.value,r,o,a);h[d]=b}):h[d]=m.value;else if(dr(m.name,t))if(Ue(m.value)){if(d==="templateOutlet"&&fr(m.value)){h[d]=m.value;return}if(e.dirType===w.Iterable)Rn(h,d,m.value,r,n,o,a);else if(mn(m.name,e.dirType)){let b=m.value,k=()=>{n.run(()=>{let _=fe(b,r,o,a);h[d]=_})};Tn(b,r,o)?Promise.resolve().then(k):k()}else h[d]=m.value}else h[d]=m.value})}function mn(i,e){return i.startsWith("v-")||i.startsWith("*")||i.startsWith("[")&&i.endsWith("]")||e===w.Conditional||e===w.Iterable}function lr(i,e,t,s,r,n,o){let a=[],c=0;s.forEach(h=>{a.push(i.slice(c,h.index)),a.push({expr:h[1].trim(),value:null}),c=h.index+h[0].length}),a.push(i.slice(c)),a.forEach(h=>{typeof h!="string"&&t.run(()=>{h.value=fe(h.expr,e,n,o);let p=a.map(f=>typeof f=="string"?f:f.value).join("");r(p)})})}function fe(i,e,t,s){let r=i.trim(),n=An(r,e,t);if(n!==F)return n;try{return Hi(r).evaluate(e,t)}catch(o){if(!yn(o))return""}try{return Hi(r).evaluate(Sn(e,t),t)}catch{return""}}function yn(i){return!!i&&(i instanceof ReferenceError||i.name==="ReferenceError")}var gn=/^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;function bn(i,e,t,s,r){let n=i.match(gn);if(!n){let h=i.trim().split(".");return t.run(()=>{let p=zi(e,h);return p.value.bind(Fi(e,p,h.join(".")))})}let[,o,a]=n,c=o.split(".");return t.run(()=>{let h=zi(e,c),p=h.value;if(typeof p!="function")throw new Error(`Event handler ${o} is not a function`);let f=Fi(e,h,o);return d=>{let m=_n(a,e,s,r).map(b=>b==="$event"?d:typeof b=="string"?b.split(".").reduce((k,_)=>k&&k[_],e)??b:b);return p.apply(f,m)}})}function Fi(i,e,t){let s=e.owner??i,r=h=>t.split(".").reduce((p,f)=>p?.[f],h),n=[],o=i,a=new Set;for(;o&&typeof o=="object"&&!a.has(o);){a.add(o);let h=o[Mt];if(!h)break;n.push(h),o=h}for(o=i&&typeof i=="object"?Object.getPrototypeOf(i):null;o&&o!==Object.prototype&&!a.has(o);)a.add(o),n.push(o),o=Object.getPrototypeOf(o);let c;for(let h of n)Object.prototype.hasOwnProperty.call(h,"constructor")||r(h)===e.value&&(c=h);return c?ws(c)??c:ws(s)??s}function zi(i,e){let t=i,s=i;for(let r=0;r<e.length;r++){let n=e[r];if(s==null)return{owner:s,value:void 0};if(r===e.length-1){let o=Object.prototype.hasOwnProperty.call(s,n)?s:cr(s,n)??(n in Object(s)?s:vn(s,n)??s);return{owner:o,value:o?.[n]}}s=s[n],t=s}return{owner:t,value:s}}function vn(i,e){let t=i;for(;t!=null;){if(Object.prototype.hasOwnProperty.call(t,e))return t;t=Object.getPrototypeOf(t)}return null}function cr(i,e){let t=i?.[Mt];for(;t!=null;){if(e in Object(t))return t;t=t?.[Mt]}return null}function hr(i,e,t){let s=t?.namespaceURI;if(s==="http://www.w3.org/2000/svg"){let n=i.createElement("g",s);return i.setAttribute(n,"data-v-container",""),n}let r=i.createElement("v-container");try{r.nodeType=O.ElementContainer}catch{}return r}var wn=/^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/,xn=/^\s*let\s+([^ ]+)\s+(?:of|in)\s+([^]+)(?:\s*;\s*([^ ]+)\s+as\s+([^ ]+))?$/;function Rn(i,e,t,s,r,n,o){let a=t.match(wn),c,h;if(a)return h=a[2].trim(),c=En(a[1]),qi(i,e,c,h,s,r,n,o);let p=t.match(xn);if(p)return h=p[2].trim(),c=[p[1].trim()],p[3]&&p[4]&&c.push(p[4].trim()),qi(i,e,c,h,s,r,n,o)}function qi(i,e,t,s,r,n,o,a){n.untrack(()=>{i.itemNames=t}),n.run(()=>{let c=fe(s,r,o,a);n.untrack(()=>{i[e]=c})})}var Cn=/^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/;function En(i){let e;if(i.trim().startsWith("(")){let t=i.trim().match(Cn);if(t)e=[t[1].trim(),t[2]?.trim()||""].filter(Boolean);else throw new ke("iterable expression invaild.")}else e=[i.trim()];return e}function kn(i){let e=i[0],t=[];for(let s=1;s<i.length;s++){let r=i[s],[n,...o]=pr(r,":").map(a=>a.trim()).filter(Boolean);n&&(t.push(n),e=`pipes['${n}'].transform(${e}${o.length?", "+o.join(", "):""})`)}return t.unshift(e),t}function _n(i,e,t,s){if(!i.trim())return[];let r=[],n="",o=null,a=0;for(let c of i)o?(c===o&&(o=null),n+=c):c==="("?(a++,n+=c):c===")"?(a--,n+=c):c===","&&a===0?(r.push(Ki(n.trim(),e,t,s)),n=""):((c==='"'||c==="'")&&(o=c),n+=c);return n.trim()&&r.push(Ki(n.trim(),e,t,s)),r}function Ki(i,e,t,s){if(i){if(i.startsWith('"')&&i.endsWith('"')||i.startsWith("'")&&i.endsWith("'"))return i.slice(1,-1);if(!isNaN(Number(i)))return Number(i);if(i==="true")return!0;if(i==="false")return!1;if(i==="null")return null;if(i!=="undefined")return i=="$event"?i:fe(i,e,t,s)}}function pr(i,e){let t=[],s="",r=null,n=!1,o=0,a=0,c=0;for(let h=0;h<i.length;h++){let p=i[h],f=i[h-1],d=i[h+1];if(n){s+=p,n=!1;continue}if(r){s+=p,p==="\\"?n=!0:p===r&&(r=null);continue}if(p==='"'||p==="'"){r=p,s+=p;continue}if(p==="("){o++,s+=p;continue}if(p===")"){o--,s+=p;continue}if(p==="{"){a++,s+=p;continue}if(p==="}"){a--,s+=p;continue}if(p==="["){c++,s+=p;continue}if(p==="]"){c--,s+=p;continue}if(o===0&&a===0&&c===0&&(e==="|"&&p==="|"&&f!=="|"&&d!=="|"||e===":"&&p===":")){t.push(s),s="";continue}s+=p}return t.push(s),t}var ur=[":","@","*","v-","["],F=Symbol("__UNRESOLVED_EXPRESSION_BINDING");function Hi(i){let e=Bi.get(i);if(e)return e;let t=pr(i,"|").map(s=>s.trim()).filter(Boolean);if(t.length<=1){let s=new Function("ctx",`with(ctx){return ${i}}`);e={evaluate(r){return s(r)}}}else{let[s,...r]=kn(t),n=new Function("ctx","pipes",`with(ctx){return ${s}}`);e={evaluate(o,a){let c=r.reduce((h,p)=>(h[p]=a.get(p),h),{});return n(o,c)}}}return Bi.set(i,e),e}function Sn(i,e){if(i==null||typeof i!="object"&&typeof i!="function")return i;let t=Object.create(i);return new Proxy(t,{has(s,r){return Reflect.has(s,r)||Ds(s,r)!==void 0?!0:Ui(s,r,e)!==F},get(s,r,n){if(Reflect.has(s,r))return Reflect.get(s,r,n);let o=Ds(s,r);if(o!==void 0)return Reflect.get(s,o,n);let a=Ui(s,r,e);return a!==F?a:Reflect.get(s,r,n)}})}function An(i,e,t){if(!i||!en.test(i))return F;let s=i.split("."),r=Dn(e,s[0],t);if(r===F)return F;let n=r;for(let o=1;o<s.length;o++){if(n==null)return F;let a=As(n,s[o]);if(a===F)return F;n=n[a]}return n}function Dn(i,e,t){if(i!=null&&(typeof i=="object"||typeof i=="function")){let s=As(i,e);if(s!==F)return i[s];let r=cr(i,e);if(r!=null){let n=As(r,e);if(n!==F)return r[n]}}return Ls(t,e)}function As(i,e){if(i==null)return F;if(Reflect.has(i,e))return e;let t=Ds(i,e);return t!==void 0?t:F}function Ui(i,e,t){if(typeof e!="string")return F;let s=Ls(t,e);return s===F?F:(i[e]=s,s)}function Ls(i,e){return i.getLocalRefValue(e)??F}function Ds(i,e){if(typeof e!="string")return;let t=e.toLowerCase(),s=i;for(;s&&s!==Object.prototype;){let n=Reflect.ownKeys(s).find(o=>typeof o=="string"&&o.toLowerCase()===t);if(n!==void 0)return n;s=Object.getPrototypeOf(s)}}function Tn(i,e,t){let s=i.trim();if(!fr(s)||Yi(e,s))return!1;let[r,...n]=s.split("."),o=Ls(t,r);return o===F?!0:n.length>0?!Yi(o,n.join(".")):!1}function fr(i){return/^[_$a-zA-Z][_$a-zA-Z0-9.]*$/.test(i)}function Yi(i,e){let t=e.split("."),s=i;for(let r of t){if(s==null||!(r in Object(s)))return!1;s=s[r]}return!0}function ps(i){i.startsWith("[")&&i.endsWith("]")&&(i=i.slice(1,-1));let e=ur.find(s=>i.startsWith(s))||"",t=e?i.slice(e.length):i;return`${e}${t.replace(/-/g,"").toLowerCase()}`}function On(i,e){let t=i.find(r=>e.includes(r.name));if(t)return t;let s=new Set(e.map(ps));return i.find(r=>s.has(ps(r.name)))}function dr(i,e){let t=i.startsWith(":")?i.slice(1):i.startsWith("[")&&i.endsWith("]")?i.slice(1,-1):i,s=ps(t);return e.some(r=>ps(r)===s)}function Vn(i){let e=[],t=Ln(i);t!==i&&e.push(t);for(let s of ur){let r=s==="["?"]":"";e.push(s+i+r),e.push(s+t+r)}return e}var Nn=/([a-z0-9])([A-Z])/g;function Ln(i){return i.replace(Nn,"$1-$2").toLowerCase()}var rt=class extends G{get delimiter(){if(!this._delimiter){let[e,t]=this.options.delimiters||["{{","}}"];this._delimiter=new RegExp(`${e}(.*?)${t}`,"g")}return this._delimiter}compile(e,t){let s=this.parser.parse(e);if(t.schemas?.length){let n=new Set([...t.components,...t.customElements||[]].flatMap(a=>String(a.selector||"").split(",")).map(a=>a.trim().toLowerCase()).filter(a=>/^[a-z][\w-]*$/.test(a))),o=a=>{if(a.nodeType===O.Element){let c=String(a.tagName||"").toLowerCase();c&&!n.has(c)&&Si(c,t.schemas)}a.childNodes?.forEach(o)};s.forEach(o)}ir(s,t.directives,t.components,this.renderer,this.delimiter,void 0,t.customElements);let r=Ji(s,this.renderer,t,{delimiter:this.delimiter,templateTag:this.options.templateTag||"v-template",textFactory:Qi,elementFactory:Zi,attributeFactory:fs,componentFactory:Xi,templateFactory:er,bindDirective:tr});return(n,o)=>tt(r,n,{injector:o})}};u(rt,[[D(),0]]);var mr,In=20,kt=class{constructor(e){this.depsMap=new WeakMap,this.activeEffects=new Set,this.pendingEffects=new Set,this.runningDepth=0,this.flushing=!1,this.isActive=!0,this[mr]=!0,this.scheduler=e?.scheduler}track(e,t){if(this.activeEffects.size===0)return;this.depsMap.has(e)||this.depsMap.set(e,new Map);let s=this.depsMap.get(e);if(!s)return;s.has(t)||s.set(t,new Set);let r=s.get(t);r&&this.activeEffects.forEach(n=>r.add(n))}trigger(e,t,s=!1){let r=this.depsMap.get(e);if(!r)return;let n=r.get(t);if(n){let o=()=>Array.from(n).forEach(a=>{this.activeEffects.has(a)?this.pendingEffects.add(a):this.run(a)});s?o():this.scheduler?this.scheduler(o):o()}}run(e){this.runningDepth+=1,this.activeEffects.add(e);try{return e()}finally{this.activeEffects.delete(e),this.runningDepth-=1,this.runningDepth===0&&!this.flushing&&this.pendingEffects.size>0&&this.flushPendingEffects()}}flushPendingEffects(){if(!this.flushing){this.flushing=!0;try{for(let e=0;e<In&&this.pendingEffects.size>0;e++){let t=Array.from(this.pendingEffects);this.pendingEffects.clear(),t.forEach(s=>{this.activeEffects.has(s)||this.run(s)})}this.pendingEffects.clear()}finally{this.flushing=!1}}}untrack(e){let t=Array.from(this.activeEffects.values());this.activeEffects.clear();try{return e()}finally{t.forEach(s=>this.activeEffects.add(s))}}cleanup(e){this.depsMap.delete(e)}cleanupAll(){this.depsMap=new WeakMap}stop(){this.isActive&&(this.cleanupAll(),this.isActive=!1)}get active(){return this.isActive}};mr=x;var yr,Is=class{get isElementContainer(){return this._isElementContainer===void 0&&(this._isElementContainer=(this.element.nativeElement.nodeType&O.ElementContainer)===O.ElementContainer),this._isElementContainer}constructor(e,t){this.element=e,this.injector=t,this[yr]=!0,this.views=[]}get renderer(){return this._renderer||(this._renderer=this.injector.get(R)),this._renderer}resolveContainerParent(){let e=this.element.nativeElement,t=this.injector.getParentNode(e);return e.parentNode||t||null}get length(){return this.views.length}clear(){for(;this.views.length>0;)this.remove(0)}get(e){return e>=0&&e<this.views.length?this.views[e]:null}createEmbeddedView(e,t,s){let r=Qs(s)?{index:s}:s,n=e.createEmbeddedView(t,r?.injector||this.injector,r?.effect),o=r?.index!==void 0?r.index:this.views.length;return this.insert(n,o),n}createComponent(e,t){let s=He(e)?Ge(e):e,r=t?.injector||this.injector,n=r.get(R,null)||void 0,o=r.get(G,null)||void 0,a=s.\u01BFfac(r,{renderer:n,compiler:o});t?.inputs&&Object.assign(a.instance,t.inputs);let c=t?.index!==void 0?t?.index:this.views.length;return a.render().then(()=>{let p=a.hostView;this.injector.destroyed||!p||p.destroyed||this.indexOf(p)>=0||this.insert(p,c)}).catch(p=>{if(t?.onError){t.onError(p);return}throw p}),a}insert(e,t){let s=t!==void 0?t:this.views.length;s=Math.max(0,Math.min(s,this.views.length));let r=this.getNextSibling(s);this.views.splice(s,0,e);let n=this.element.nativeElement,o=e.rootNodes;if(this.isElementContainer){let a=this.resolveContainerParent();if(a)if(r)o.forEach(c=>{a.insertBefore(c,r)});else if(s>0){let h=this.views[s-1].rootNodes,p=h[h.length-1];o.forEach(f=>{p.nextSibling?a.insertBefore(f,p.nextSibling):a.insertBefore(f,n)})}else o.forEach(c=>{a.insertBefore(c,n)})}else r?o.forEach(a=>{n.insertBefore(a,r)}):o.forEach(a=>{n.appendChild(a)});return e}move(e,t){let s=this.views.indexOf(e);if(s<0||s>=this.views.length||t<0||t>=this.views.length||s===t)return e;let r=this.getNextSibling(t);this.views.splice(s,1),this.views.splice(t,0,e);let n=this.element.nativeElement,o=e.rootNodes,a=this.resolveContainerParent();return this.isElementContainer&&a?o.forEach(c=>{c.parentNode===a&&a.removeChild(c)}):o.forEach(c=>{c.parentNode===n&&n.removeChild(c)}),this.isElementContainer?a&&(r?o.forEach(c=>{a.insertBefore(c,r)}):o.forEach(c=>{a.insertBefore(c,n)})):r?o.forEach(c=>{n.insertBefore(c,r)}):o.forEach(c=>{n.appendChild(c)}),e}indexOf(e){return this.views.indexOf(e)}remove(e){let t=e!==void 0?e:this.views.length-1;if(t<0||t>=this.views.length)return;let s=this.views[t],r=s.rootNodes,n=this.element.nativeElement,o=this.resolveContainerParent();this.injector.destroyed||(this.isElementContainer&&o?r.forEach(a=>{a.parentNode===o&&this.renderer.removeChild(o,a)}):r.forEach(a=>{a.parentNode===n&&this.renderer.removeChild(n,a)})),this.views.splice(t,1),"destroy"in s&&s.destroy()}getNextSibling(e){if(e>=this.views.length)return null;let s=this.views[e].rootNodes;return s.length>0?s[0]:null}};yr=x;function js(i,e){return new Is(i,e)}var gr,$e=Y("NODES_RESOLVERS"),jn=()=>{let i;return(e,t,s)=>{let r=s.getInjector(),n=e.provider??e.type;return r.getPayload()instanceof g&&r instanceof nt&&He(n)?(i||(i=ii(r.get($e)??[])),ei(()=>i.handle(e,s),a=>si(a)?a:t(e,s))):t(e,s)}},nt=class i extends ri{constructor(){super(...arguments),this[gr]=!0,this.componentRefs=new Map,this.directiveRefs=new Map,this.templateRefs=new Map,this.elementRefs=new Map,this.viewContainerRefs=new Map,this.localRefNodes=new Map,this.computedCache=new Map,this.parentNodes=new Map}get allDirectiveRefs(){if(!this._allDirectiveRefs){let e=this.getRootInjector();if(e&&e!==this)return e.allDirectiveRefs;this._allDirectiveRefs||(this._allDirectiveRefs=new Map)}return this._allDirectiveRefs}getRootInjector(){let e=this;for(;e?.getParentInjector();)e=e.getParentInjector();return e}initOptions(e){e.resolvers||(e.resolvers=[]),e.resolvers.push(jn()),e.payload&&(this._payload=e.payload)}setPayload(e){return this._payload=e,this}getPayload(){return this._payload}clear(){this.componentRefs.clear(),this.directiveRefs.clear(),this.templateRefs.clear(),this.computedCache.clear(),this.viewContainerRefs.clear(),this.localRefNodes.clear(),this.parentNodes.clear(),this.elementRefs.clear(),this._allDirectiveRefs?.clear(),this._payload=void 0,super.clear()}detachNodes(e){let t=new Set,s=[],r=n=>{if(!n||t.has(n))return;t.add(n);let o=this.componentRefs.get(n);o&&s.push(o),this.componentRefs.delete(n),this.directiveRefs.delete(n),this.templateRefs.delete(n),this.elementRefs.delete(n),this.viewContainerRefs.delete(n),this.parentNodes.delete(n),n?.[he]?.forEach(p=>{let f=p?.trim().toLowerCase();f&&this.localRefNodes.delete(f)}),this.allDirectiveRefs.get(n)&&this.allDirectiveRefs.delete(n);let h=n?.childNodes;h?.length&&h.forEach(p=>r(p))};e.forEach(n=>r(n));for(let n of s)try{n.hostView?.destroy()}catch{}}getParentInjector(){return this._parent instanceof i?this._parent:null}attachComponent(e){if(e&&e.elementRef&&e.elementRef.nativeElement){let t=e.elementRef.nativeElement;this.elementRefs.has(t)||this.elementRefs.set(t,e.elementRef),this.componentRefs.set(e.elementRef.nativeElement,e)}}attachDirective(e){if(e&&e.elementRef&&e.elementRef.nativeElement){let t=e.elementRef.nativeElement;this.elementRefs.has(t)||this.elementRefs.set(t,e.elementRef),this.directiveRefs.has(t)||this.directiveRefs.set(t,[]),this.directiveRefs.get(t).push(e),this.allDirectiveRefs.has(t)||this.allDirectiveRefs.set(t,[]),this.allDirectiveRefs.get(t).push(e)}}attachTemplate(e){if(e&&e.elementRef&&e.elementRef.nativeElement){let t=e.elementRef.nativeElement;this.elementRefs.has(t)||this.elementRefs.set(t,e.elementRef),this.templateRefs.set(t,e)}}registerLocalRefs(e,t){t?.length&&t.forEach(s=>{let r=s?.trim().toLowerCase();!r||this.localRefNodes.has(r)||this.localRefNodes.set(r,e)})}getLocalRefNode(e){let t=e.trim().toLowerCase();return this.localRefNodes.get(t)??this.getParentInjector()?.getLocalRefNode(e)??null}getLocalRefValue(e){let t=this.getLocalRefNode(e);return t?this.templateRefs.get(t)??this.componentRefs.get(t)?.instance??this.directiveRefs.get(t)?.[0]?.instance??this.elementRefs.get(t)??null:null}query(e,t){let s,r;if(Ue(e)?s=e:(r=Ge(e),s=r.selector),!s)return null;let n=this.get(R).querySelector(t,s);return n?r&&r.dirType?r.dirType===w.Component?this.getComponentRefByNode(n)??null:this.getDirectiveRefByNode(n)??null:this.getElementRef(n)??this.getTemplateRef(n):null}queryAll(e,t){let s,r;if(Ue(e)?s=e:(r=Ge(e),s=r.selector),!s)return[];let n=this.get(R).querySelectorAll(t,s);return n?n.map(o=>r&&r.dirType?r.dirType===w.Component?this.getComponentRefByNode(o)??null:this.getDirectiveRefByNode(o)??null:this.getElementRef(o)??this.getTemplateRef(o)):[]}getComponentRef(e,t=T.Default){let s=this.getParentInjector()?.getComponentRef(e)??[];return this.componentRefs.forEach(r=>{r.instance instanceof e&&s.push(r)}),s}getComponentRefByNode(e,t=T.Default){return this.componentRefs.get(e)??this.getParentInjector()?.getComponentRefByNode(e)??null}getDirectiveRef(e,t=T.Default){let s=[];if(t&T.SkipSelf){let r=this.getParentInjector()?.getDirectiveRef(e,t)??[];s.push(...r)}else if(this.directiveRefs.forEach(r=>{r.forEach(n=>{try{n.instance&&n.instance instanceof e&&s.push(n)}catch{}})}),s.length===0&&this.allDirectiveRefs.forEach(n=>{n.forEach(o=>{try{o.instance&&o.instance instanceof e&&s.push(o)}catch{}})}),!(t&T.Self)){let r=this.getParentInjector()?.getDirectiveRef(e,t)??[];s.push(...r)}return s}getDirectiveRefByNode(e,t=T.Default){if(t&T.SkipSelf)return this.getParentInjector()?.getDirectiveRefByNode(e,t)??null;let s=this.directiveRefs.get(e);if(s&&s.length>0)return s[0];let r=this.allDirectiveRefs.get(e);return r&&r.length>0?r[0]:t&T.Self?null:this.getParentInjector()?.getDirectiveRefByNode(e,t)??null}getDirectiveRefsByNode(e,t=T.Default){if(t&T.SkipSelf)return this.getParentInjector()?.getDirectiveRefsByNode(e,t)??null;let s=this.directiveRefs.get(e);if(s&&s.length>0)return s;let r=this.allDirectiveRefs.get(e);return r&&r.length>0?r:t&T.Self?null:this.getParentInjector()?.getDirectiveRefsByNode(e,t)??null}getTemplateRef(e,t=T.Default){if(t&T.SkipSelf)return this.getParentInjector()?.getTemplateRef(e,t)??null;let s=this.templateRefs.get(e);return s||(t&T.Self?null:this.getParentInjector()?.getTemplateRef(e,t)??null)}getElementRef(e,t=T.Default){if(t&T.SkipSelf){let n=this.getParentInjector()?.getElementRef(e,t);if(n)return n}let s=this.elementRefs.get(e);if(s)return s;if(!(t&T.Self)&&!(t&T.SkipSelf)){let n=this.getParentInjector()?.getElementRef(e,t);if(n)return n}let r=new g(e);return this.elementRefs.set(e,r),r}getViewContainerRef(e,t=T.Default){let s=e instanceof g?e.nativeElement:e;if(t&T.SkipSelf){let a=this.getParentInjector()?.getViewContainerRef(s,t);if(a)return a}let r=this.viewContainerRefs.get(s);if(r)return r;if(!(t&T.Self)&&!(t&T.SkipSelf)){let a=this.getParentInjector()?.getViewContainerRef(s,t);if(a)return a}let n=this.elementRefs.get(s);n||(n=new g(s),this.elementRefs.set(s,n));let o=js(n,this);return this.viewContainerRefs.set(s,o),o}createElementRef(e){let t=new g(e);return this.elementRefs.set(e,t),t}createViewContainerRef(e){let t=this.elementRefs.get(e);t||(t=new g(e),this.elementRefs.set(e,t));let s=js(t,this);return this.viewContainerRefs.set(e,s),s}setParentNode(e,t){this.parentNodes.set(e,t)}getParentNode(e){return this.parentNodes.get(e)??this.getParentInjector()?.getParentNode(e)??null}};gr=x;var br=new WeakMap,Ms=class extends te{constructor(e,t,s){super(e,t,s),this.initCalled=!1,this.afterViewInitCalled=!1,this._elementRef=s?.elementRef,t.setValue(te,this),t.onDestroy(this)}get elementRef(){return this._elementRef}get hostView(){return this._hostView}get def(){return this.classRef.getAnnotation()}get instance(){return this._inst||(this._inst=this.createInstance()),this._inst}async render(e){if(this.injector.destroyed)return;let t=this.classRef.getAnnotation();if(!/\[\w+\]/.test(t.selector||"")&&!t.template&&!t.templateUrl)throw new ke(this.classRef.className+" template or templateUrl is required.");if(!this._elementRef){let f=this.injector.get(R,null);if(!f){let d=this.injector.get(G,null);d&&d.renderer&&(f=d.renderer)}if(!f)throw new ke("Template module renderer not initialized. Verify TemplateModule is properly configured with deps.");this._elementRef=this.injector.getElementRef(f.createElement(t.selector??this.classRef.className)),this.injector.setValue(g,this._elementRef)}if(this.injector.setPayload(this._elementRef),!this.initCalled){this.initCalled=!0;let f=this.instance.onInit?.();if(f&&typeof f.then=="function"&&(await f,this.injector.destroyed))return}let s=this.injector.get(Xe)||[],r=this.injector.get(rs)||[],n=this.injector.get(ns)||[],o=this.injector.get(G),a=br.get(t);a||(a=new Map,br.set(t,a));let c=a.get(o);if(!c){let f=t.template||await Mn(t.templateUrl);if(this.injector.destroyed)return;c=o.compile(f,{directives:s,components:n,customElements:r,schemas:_i(this.injector.get(Ai,null),t.schemas)}),a.set(o,c)}this._hostView?.destroy();let h=this._elementRef,p=c(h,this.injector);if(this.injector.setValue(A,p),this._hostView=p.createEmbeddedView(this.instance,this.injector),this.attachHostViewToElement(),this.resolveViewChilds(t),!this.afterViewInitCalled){this.afterViewInitCalled=!0;let f=this.instance.onAfterViewInit?.();f&&typeof f.then=="function"&&await f}}attachHostViewToElement(){let e=this._elementRef?.nativeElement,t=this._hostView?.rootNodes||[];if(!e||!t.length||typeof e.appendChild!="function")return;(Array.isArray(e.childNodes)?e.childNodes.slice():[]).forEach(r=>{t.includes(r)||typeof e.removeChild=="function"&&e.removeChild(r)}),t.forEach(r=>{r&&r.parentNode!==e&&e.appendChild(r)})}resolveViewChilds(e){let t=e.viewChilds||[];t.length&&t.forEach(s=>{this.instance[s.propertyKey]=this.resolveViewChild(s)})}resolveViewChild(e){let t=e.type,s=e.selector??t;if(!s||!this._hostView)return;if(typeof s=="string"){let n=this.resolveViewChildNode(s);return n?this.readNodeValue(n,e,t):void 0}let r=this._hostView.query(s);return this.readResolvedValue(r,e,t)}resolveViewChildNode(e){let t=e.startsWith("#")?e.slice(1):e,s=this._hostView?.injector.getLocalRefNode(t)??this.findNodeByLocalRef(e);if(s)return s;if(this.isSelectorExpression(e)){let r=this._hostView?.query(e);return r instanceof g?r.nativeElement:r?.elementRef?.nativeElement||null}return null}isSelectorExpression(e){return/^[#.[\s>:*]/.test(e)||e.includes("[")||e.includes(" ")}findNodeByLocalRef(e){let t=e.startsWith("#")?e.slice(1):e,s=r=>{if(r[he]?.includes(t))return r;let o=r?.childNodes;if(!o?.length)return null;for(let a of o){let c=s(a);if(c)return c}return null};for(let r of this._hostView?.rootNodes||[]){let n=s(r);if(n)return n}return null}readNodeValue(e,t,s){let r=t.read;if(r===A||s===A)return this._hostView?.injector.getTemplateRef(e)??void 0;if(r===g||s===g)return this._hostView?.injector.getElementRef(e)??void 0;let n=this._hostView?.injector.getComponentRefByNode(e)??null;if(r===te||s===te)return n??void 0;let o=this._hostView?.injector.getDirectiveRefByNode(e)??null;return r===se||s===se?o??void 0:r&&n?.instance instanceof r?n.instance:r&&o?.instance instanceof r?o.instance:s&&n?.instance instanceof s?n.instance:s&&o?.instance instanceof s?o.instance:n?.instance??o?.instance??this._hostView?.injector.getTemplateRef(e)??this._hostView?.injector.getElementRef(e)??void 0}readResolvedValue(e,t,s){if(!e)return;let r=t.read;if(r===te||s===te||r===se||s===se)return e;if(r===g||s===g)return e instanceof g?e:e.elementRef??void 0;if(r===A||s===A){if(e instanceof A)return e;let n=e instanceof g?e.nativeElement:e?.elementRef?.nativeElement;return n?this._hostView?.injector.getTemplateRef(n)??void 0:void 0}return e instanceof g||e instanceof A?e:e.instance??e}clean(){this.instance?.onDestroy?.(),super.clean(),this.hostView?.destroy()}process(e,t){return this.render(this.options)}createInstance(e){let t=super.createInstance(e??Yt(this.injector).setPayload(this._elementRef)),s=this.classRef.getAnnotation();return be(t,this.injector.get(j),s.computeds)}},_t=class extends Zt{constructor(e){super(e)}getInjector(e,t){let s=super.getInjector(e,t),r=e.getAnnotation();return r.imports?.length&&(s=Gt(s,t?.providers),vt.use(s,r.imports)),s}createInstance(e,t,s){return new Ms(e,t,s)}mergeProviders(e,t){let s=super.mergeProviders(e,t);return t?.compiler&&s.push(bs(G,t.compiler)),t?.renderer&&s.push(bs(R,t.renderer)),s}createInjector(e,t,s){let r=new nt(t,s);if(vt.register(r,[e.type]),t.has(j)?r.setValue(j,t.get(j)):r.setValue(j,new kt(s)),!r.has(R)&&t.has(R)){let n=t.get(R);n&&r.setValue(R,n)}return r}create(e,t){return super.create(e,t)}};Reflect.metadata("design:paramtypes",[Je])(_t);u(_t,[[L(),0]]);async function Mn(i){return await(await fetch(i)).text()}var vr,we=class{constructor(e,t){this.viewContainer=e,this[vr]=!0,this._viewRefs=[],this._collection=null,this._prevCollection=null,this._itemNames=[],this._context=null,this._trackByFn=(s,r)=>r,this._templateRef=t,this._effect=e.injector.get(j)}set itemNames(e){this._itemNames=e}set template(e){this._templateRef=e}set for(e){this._collection=e,this.updateView()}set context(e){this._context=e,this.updateView()}set trackBy(e){e&&(this._trackByFn=this.createTrackByFunction(e))}isIterable(e){return e!=null&&typeof e[Symbol.iterator]=="function"}createTrackByFunction(e){return e==="$index"?(t,s)=>s:e==="$item"?t=>t:(t,s)=>{let r=e.split("."),n=t;for(let o of r){if(n==null)return;n=n[o]}return n!==void 0?n:s}}updateView(){let e=this._collection;if(!this.collectionEquals(e,this._prevCollection)){if(this._prevCollection=e,!e){this.clear();return}Array.isArray(e)?this.updateArrayView(e):e instanceof Map?this.updateMapView(e):e instanceof Set?this.updateSetView(e):this.isIterable(e)?this.updateIterableView(e):e!==null&&typeof e=="object"?this.updateObjectView(e):this.clear()}}updateIterableView(e){let s=Array.from(e).map((r,n)=>this.createContext(r,n));this.updateViewsWithTrackBy(s)}updateArrayView(e){let t=e.map((s,r)=>this.createContext(s,r));this.updateViewsWithTrackBy(t)}updateMapView(e){let s=Array.from(e.entries()).map(([r,n],o)=>this.createContext(n,o,r));this.updateViewsWithTrackBy(s)}updateSetView(e){let s=Array.from(e).map((r,n)=>this.createContext(r,n));this.updateViewsWithTrackBy(s)}updateObjectView(e){let s=Object.entries(e).map(([r,n],o)=>this.createContext(n,o,r));this.updateViewsWithTrackBy(s)}createContext(e,t,s){let r={$implicit:e,$item:e,$index:t,$first:t===0,$last:!1,$even:t%2===0,$odd:t%2===1,$key:s,$count:0};return this.setUserDefinedVariables(r,e,t,s),this._context&&Object.setPrototypeOf(r,this._context),r}setUserDefinedVariables(e,t,s,r){this._itemNames.length>0&&(e[this._itemNames[0]]=t),this._itemNames.length>1&&(e[this._itemNames[1]]=r!==void 0?r:s),this._itemNames.length>2&&(e[this._itemNames[2]]=s),this._itemNames.includes("item")||(e.item=t),this._itemNames.includes("index")||(e.index=s),r!==void 0&&!this._itemNames.includes("key")&&(e.key=r)}updateViewsWithTrackBy(e){if(this.viewContainer.injector.destroyed)return;let t=[],s=new Map(this._viewRefs.map((n,o)=>[this._trackByFn(n.context,o),n])),r=e.length;e.forEach((n,o)=>{n.$last=o===r-1,n.$count=r});for(let n=0;n<e.length;n++){let o=e[n],a=this._trackByFn(o.$implicit,n),c=s.get(a);if(c)Object.keys(c.context||{}).forEach(h=>{h in o||delete c.context[h]}),Object.assign(c.context,o),t.push(c),s.delete(a);else{let h=this.createView(o);t.push(h)}}for(let n of s.values()){if(!n)continue;let o=this.viewContainer.indexOf(n);o>=0?this.viewContainer.remove(o):typeof n.destroy=="function"&&n.destroy()}this._viewRefs=t}collectionEquals(e,t){if(e===t)return!0;if(e===null||t===null||typeof e!=typeof t)return!1;if(Array.isArray(e)&&Array.isArray(t)){if(e.length!==t.length)return!1;for(let s=0;s<e.length;s++)if(e[s]!==t[s])return!1;return!0}if(typeof e=="object"&&typeof t=="object"){if(e[Symbol.iterator]&&t[Symbol.iterator])return e===t;let s=Object.keys(e),r=Object.keys(t);if(s.length!==r.length)return!1;for(let n of s)if(e[n]!==t[n])return!1;return!0}return!1}createView(e){return this._templateRef?this.viewContainer.createEmbeddedView(this._templateRef,e,{effect:this._effect}):null}clear(){this.viewContainer.clear(),this._viewRefs.forEach(e=>{e&&typeof e.destroy=="function"&&e.destroy()}),this._viewRefs=[]}onInit(){this.updateView()}onDestroy(){this.clear()}onChanges(){this.updateView()}};vr=x;Reflect.metadata("design:paramtypes",[H,A])(we);Reflect.metadata("design:paramtypes",[A])(we.prototype,"template");Reflect.metadata("design:paramtypes",[Object])(we.prototype,"for");Reflect.metadata("design:paramtypes",[Object])(we.prototype,"context");Reflect.metadata("design:paramtypes",[String])(we.prototype,"trackBy");u(we,[[l(),1,"template"],[l(),1,"for"],[l(),1,"context"],[l(),1,"trackBy"],[E({selector:"[v-for],[*for]",dirType:w.Iterable,priority:20}),0]]);var Ps=class extends se{constructor(e,t,s){super(e,t,s),this._elementRef=s.elementRef,t.onDestroy(this)}get elementRef(){return this._elementRef}get instance(){return this._inst||(this._inst=this.createInstance()),this._inst}clean(){this.instance?.onDestroy?.(),super.clean()}process(e,t){}createInstance(e){let t=e??Yt(this.injector);t.setInjector(this.injector),t.setPayload(this._elementRef);let s=super.createInstance(t),r=this.classRef.getAnnotation();return be(s,this.injector.get(j),r.computeds)}},St=class extends Zt{constructor(e){super(e)}getInjector(e,t){let s=super.getInjector(e,t),r=e.getAnnotation();return r.imports?.length&&(s=Gt(s,t?.providers),vt.use(s,r.imports)),s}createInjector(e,t,s){let r=new nt(t,s);return vt.register(r,[e.type]),s.elementRef&&r.setPayload(s.elementRef),r}createInstance(e,t,s){return new Ps(e,t,s)}create(e,t){return super.create(e,t)}};Reflect.metadata("design:paramtypes",[Je])(St);u(St,[[L(),0]]);var ot=class{constructor(e,t){this.elementRef=e,this.renderer=t}set class(e){e!==void 0&&this.updateClass(e)}updateClass(e){let t=this.elementRef.nativeElement,s;Ye(e)?s=Object.keys(e).filter(r=>e[r]).join(" "):typeof e=="string"?s=e:e==null?s="":s=String(e),this.prvCss!==s&&(this.classTokens(this.prvCss).forEach(r=>this.renderer.removeClass(t,r)),this.classTokens(s).forEach(r=>this.renderer.addClass(t,r)),this.prvCss=s)}classTokens(e){return String(e||"").split(/\s+/).filter(Boolean).filter(t=>t.indexOf("{")<0&&t.indexOf("}")<0)}};Reflect.metadata("design:paramtypes",[g,R])(ot);Reflect.metadata("design:paramtypes",[Object])(ot.prototype,"class");u(ot,[[l(),1,"class"],[E({selector:"[v-class],[class]"}),0]]);var at=class{constructor(e,t){this.elementRef=e,this.renderer=t}set style(e){e!==void 0&&this.updateStyle(e)}updateStyle(e){let t=this.elementRef.nativeElement;this.clearStyles(),Ye(e)?Object.keys(e).forEach(s=>{let r=e[s];r!=null&&this.renderer.setStyle(t,this.camelToKebab(s),String(r))}):typeof e=="string"?this.renderer.setAttribute(t,"style",e):e==null&&this.renderer.removeAttribute(t,"style")}clearStyles(){let e=this.elementRef.nativeElement;this.renderer.removeAttribute(e,"style")}camelToKebab(e){return e.replace(/[A-Z]/g,t=>`-${t.toLowerCase()}`)}};Reflect.metadata("design:paramtypes",[g,R])(at);Reflect.metadata("design:paramtypes",[Object])(at.prototype,"style");u(at,[[l(),1,"style"],[E({selector:"[style]"}),0]]);var wr,Be=class{constructor(e){this.viewContainer=e,this[wr]=!0,this._viewRef=null,this._templateRef=null,this._context=null,this.updateVersion=0}set templateOutlet(e){this._templateRef===e&&this._viewRef||(this._templateRef=e)}set templateOutletContext(e){let t=this.normalizeContext(e);this.sameContext(this._context,t)&&this._viewRef||(this._context=t,this.updateView()||this.scheduleUpdate())}sameContext(e,t){return e===t?!0:!e||!t?!1:e.item===t.item&&e.$implicit===t.$implicit}normalizeContext(e){return e==null||typeof e!="object"?{item:e,$implicit:e}:"item"in e?e:Object.assign({item:e,$implicit:e},e)}scheduleUpdate(){let e=++this.updateVersion;Promise.resolve().then(()=>{e===this.updateVersion&&this.updateView()})}updateView(){let e=this.resolveTemplateRef();return e?(this._viewRef&&(this.viewContainer.clear(),this._viewRef=null),e&&(this._viewRef=this.viewContainer.createEmbeddedView(e,this._context||{})),!0):!1}resolveTemplateRef(){if(this._templateRef&&typeof this._templateRef!="string")return this._templateRef;if(typeof this._templateRef!="string")return null;let e=this.viewContainer.injector,t=this._templateRef.trim().toLowerCase(),s=e.getLocalRefNode(t);if(s){let r=e.getTemplateRef(s);if(r)return this._templateRef=r,r}return null}onDestroy(){this.updateVersion+=1,this._viewRef&&(this.viewContainer.clear(),this._viewRef=null)}};wr=x;Reflect.metadata("design:paramtypes",[H])(Be);Reflect.metadata("design:paramtypes",[Object])(Be.prototype,"templateOutlet");Reflect.metadata("design:paramtypes",[Object])(Be.prototype,"templateOutletContext");u(Be,[[l(),1,"templateOutlet"],[l(),1,"templateOutletContext"],[E({selector:"[v-templateOutlet],[*templateOutlet]"}),0]]);var lt=class{constructor(e,t){this.elementRef=e,this.renderer=t,this._hidden=!1}set vShow(e){let t=!!e;this.updateVisibility(t)}updateVisibility(e){let t=this.elementRef.nativeElement;e?(this.renderer.removeClass(t,"is-hidden"),this.renderer.removeAttribute(t,"hidden"),this._hidden=!1):(this.renderer.addClass(t,"is-hidden"),this.renderer.setAttribute(t,"hidden",""),this._hidden=!0)}get isHidden(){return this._hidden}};Reflect.metadata("design:paramtypes",[g,R])(lt);Reflect.metadata("design:paramtypes",[Object])(lt.prototype,"vShow");u(lt,[[l(),1,"vShow"],[E({selector:"[v-show]",dirType:w.Normal,priority:5}),0]]);var ct=class{constructor(e,t){this.elementRef=e,this.renderer=t}set vBind(e){let t=this.elementRef.nativeElement;e!=null&&typeof e=="object"&&Object.entries(e).forEach(([s,r])=>{this.renderer.setAttribute(t,s,String(r))})}};Reflect.metadata("design:paramtypes",[g,R])(ct);Reflect.metadata("design:paramtypes",[Object])(ct.prototype,"vBind");u(ct,[[l(),1,"vBind"],[E({selector:"[v-bind]",dirType:w.Normal,priority:3}),0]]);var ht=class{constructor(e){this.elementRef=e}set vOn(e){let t=this.elementRef.nativeElement;e!=null&&typeof e=="object"&&Object.entries(e).forEach(([s,r])=>{typeof r=="function"&&t.addEventListener(s,r)})}};Reflect.metadata("design:paramtypes",[g])(ht);Reflect.metadata("design:paramtypes",[Object])(ht.prototype,"vOn");u(ht,[[l(),1,"vOn"],[E({selector:"[v-on]",dirType:w.Normal,priority:4}),0]]);var ne=class{};u(ne,[[L(),0]]);var xe=class{constructor(e,t,s){this.elementRef=e,this.renderer=t,this.lifecycle=s,this._frames=[],this._interval=300,this._loop=!0,this.textNode=null,this.appliedStyleKeys=[],this.tickActive=!1,this.renderRegion="",this.listener=()=>this.tick()}set frames(e){this._frames=e}get frames(){return this._frames}set interval(e){let t=Number(e)||300;t!==this._interval&&(this._interval=t)}get interval(){return this._interval}set loop(e){this._loop=e!==!1}get loop(){return this._loop}get frameList(){return Array.isArray(this._frames)?this._frames:typeof this._frames=="string"?this._frames.split(/[,，、\s]+/).filter(e=>e!==""):[]}get frameIndex(){let e=this.frameList.length;if(!e)return 0;let t=Math.floor(Date.now()/Math.max(1,this._interval));return this._loop?t%e:Math.min(t,e-1)}get frameText(){let e=this.frameList[this.frameIndex];return typeof e=="string"?e:e?.text??""}get frameStyle(){let e=this.frameList[this.frameIndex];return typeof e=="object"?e?.style??{}:{}}onInit(){this.applyFrame(),this.frameList.length&&this.startTick()}onDestroy(){this.stopTick()}startTick(){this.tickActive||!this.lifecycle||(this.tickActive=!0,this.lifecycle.subscribe(this.listener))}stopTick(){this.tickActive&&(this.tickActive=!1,this.lifecycle?.unsubscribe(this.listener))}tick(){let e=this.elementRef?.nativeElement;if(!this.frameList.length||!e||e.parentNode==null){this.stopTick();return}this.applyFrame()}applyFrame(){let e=this.renderer,t=this.elementRef?.nativeElement;if(!e||!t)return;Array.from(t.childNodes||[]).forEach(a=>e.removeChild(t,a));let r=e.createText(this.frameText);e.appendChild(t,r),this.textNode=r;let n=this.frameStyle,o=typeof n=="object"?Object.keys(n):[];this.appliedStyleKeys.filter(a=>!o.includes(a)).forEach(a=>e.removeStyle?.(t,a)),o.forEach(a=>{e.setStyle(t,a,String(n[a]??""))}),this.appliedStyleKeys=o}};Reflect.metadata("design:type",Object)(xe.prototype,"renderRegion");Reflect.metadata("design:paramtypes",[g,R,ne])(xe);Reflect.metadata("design:paramtypes",[Object])(xe.prototype,"frames");Reflect.metadata("design:paramtypes",[Number])(xe.prototype,"interval");Reflect.metadata("design:paramtypes",[Boolean])(xe.prototype,"loop");u(xe,[[l(),1,"renderRegion"],[N(),3,void 0,2],[l(),1,"frames"],[l(),1,"interval"],[l(),1,"loop"],[E({selector:"[animation-frame]",dirType:w.Normal}),0]]);var ee=class{constructor(e,t,s){this.elementRef=e,this.renderer=t,this.lifecycle=s,this._text="",this._interval=120,this._scanWidth=1,this._loop=!0,this.tickActive=!1,this.charSpans=[],this.activeStyle={},this.baseStyle={},this.renderRegion="",this.listener=()=>this.tick()}set text(e){let t=String(e??"");t!==this._text&&(this._text=t,this.render(),this.charList.length?this.startTick():this.stopTick())}get text(){return this._text}set interval(e){let t=Number(e)||120;t!==this._interval&&(this._interval=t)}get interval(){return this._interval}set scanWidth(e){this._scanWidth=Math.max(1,Math.floor(Number(e)||1))}get scanWidth(){return this._scanWidth}set loop(e){this._loop=e!==!1}get loop(){return this._loop}get charList(){return Array.from(this._text||"")}get scanIndex(){let e=this.charList.length;if(!e)return 0;let t=Math.floor(Date.now()/Math.max(1,this._interval));return this._loop?t%e:Math.min(t,e-1)}get chars(){let e=this.charList,t=this.scanIndex,s=[],r="";return e.forEach((n,o)=>{let a=this.baseStyle||{};if(o>=t&&o<t+this.scanWidth?a=this.activeStyle||a:o<t&&(a=this.trailStyle||a),n===" "){r+=n;return}s.push({text:`${r}${n}`,style:a}),r=""}),r&&s.length&&(s[s.length-1].text+=r),s}onInit(){this.charList.length&&(this.render(),this.startTick())}onDestroy(){this.stopTick()}startTick(){this.tickActive||!this.lifecycle||(this.tickActive=!0,this.lifecycle.subscribe(this.listener))}stopTick(){this.tickActive&&(this.tickActive=!1,this.lifecycle?.unsubscribe(this.listener))}tick(){let e=this.elementRef?.nativeElement;if(!this.charList.length||!e||e.parentNode==null){this.stopTick();return}this.render()}render(){let e=this.renderer,t=this.elementRef?.nativeElement;if(!e||!t)return;Array.from(t.childNodes||[]).forEach(r=>e.removeChild(t,r)),this.charSpans=[],this.chars.forEach(r=>{let n=e.createElement("span"),o=e.createText(r.text);e.appendChild(n,o),Object.entries(r.style).forEach(([a,c])=>{e.setStyle(n,a,String(c??""))}),e.appendChild(t,n),this.charSpans.push(n)})}};Reflect.metadata("design:type",Object)(ee.prototype,"activeStyle");Reflect.metadata("design:type",Object)(ee.prototype,"trailStyle");Reflect.metadata("design:type",Object)(ee.prototype,"baseStyle");Reflect.metadata("design:type",Object)(ee.prototype,"renderRegion");Reflect.metadata("design:paramtypes",[g,R,ne])(ee);Reflect.metadata("design:paramtypes",[String])(ee.prototype,"text");Reflect.metadata("design:paramtypes",[Number])(ee.prototype,"interval");Reflect.metadata("design:paramtypes",[Number])(ee.prototype,"scanWidth");Reflect.metadata("design:paramtypes",[Boolean])(ee.prototype,"loop");u(ee,[[l(),1,"activeStyle"],[l(),1,"trailStyle"],[l(),1,"baseStyle"],[l(),1,"renderRegion"],[N(),3,void 0,2],[l(),1,"text"],[l(),1,"interval"],[l(),1,"scanWidth"],[l(),1,"loop"],[E({selector:"[animated-text]",dirType:w.Normal}),0]]);var We=class{constructor(e,t,s){this.elementRef=e,this.renderer=t,this.lifecycle=s,this._startedAt=0,this.renderedSecond=-1,this.enabled=!0,this.tickActive=!1,this.listener=()=>this.tick()}set startedAt(e){let t=Number(e)||0;t!==this._startedAt&&(this._startedAt=t,this.renderedSecond=-1,this.render())}get startedAt(){return this._startedAt}set active(e){this.enabled=e!==!1,this.enabled?this.startTick():this.stopTick()}get active(){return this.enabled}onInit(){this.render(),this.startTick()}onDestroy(){this.stopTick()}startTick(){!this.enabled||this.tickActive||!this.lifecycle||(this.tickActive=!0,this.lifecycle.subscribe(this.listener))}stopTick(){this.tickActive&&(this.tickActive=!1,this.lifecycle?.unsubscribe(this.listener))}tick(){let e=this.elementRef?.nativeElement;if(!e||e.parentNode==null){this.onDestroy();return}this.render()}render(){let e=this.elementRef?.nativeElement,t=this.renderer;if(!e||!t)return;let s=this._startedAt?Math.max(0,Math.floor((Date.now()-this._startedAt)/1e3)):0;if(s===this.renderedSecond)return;this.renderedSecond=s;let r=s<60?`${s}s`:`${Math.floor(s/60)}m ${s%60}s`;Array.from(e.childNodes||[]).forEach(n=>t.removeChild(e,n)),t.appendChild(e,t.createText(r))}};Reflect.metadata("design:paramtypes",[g,R,ne])(We);Reflect.metadata("design:paramtypes",[Object])(We.prototype,"startedAt");Reflect.metadata("design:paramtypes",[Boolean])(We.prototype,"active");u(We,[[N(),3,void 0,2],[l(),1,"startedAt"],[l(),1,"active"],[E({selector:"[elapsed-time]",dirType:w.Normal}),0]]);var pt=class{constructor(e,t){this.elementRef=e,this.focusMonitor=t,this.initialized=!1,this.value=!1}set focused(e){this.update(e)}get focused(){return this.value}onInit(){this.initialized=!0,this.apply()}apply(){let e=this.elementRef.nativeElement;this.value?(!e.ownerDocument||e.ownerDocument.activeElement!==e)&&this.focusMonitor.focusVia(e,"program"):(!e.ownerDocument||e.ownerDocument.activeElement===e)&&e.blur?.()}update(e){let t=e===!0||e===""||e==="true";this.initialized&&this.value===t||(this.value=t,this.initialized&&this.apply())}};Reflect.metadata("design:paramtypes",[g,Le])(pt);Reflect.metadata("design:paramtypes",[Object])(pt.prototype,"focused");u(pt,[[l(),1,"focused"],[E({selector:"[focused]",dirType:w.Normal}),0]]);var Pn=(i,e,t)=>{let s=i.provider??i.type;return s===g||gt(s,g)?t.getInjector().getPayload():e(i,t)},$n=(i,e,t)=>{let s=i.provider??i.type;if(s===A||gt(s,A)){let r=t.getInjector(),n=r.getPayload(),o=r.getTemplateRef(n.nativeElement,i.flags);return o||(o=Fn(r,n.nativeElement)),o??Ne}return e(i,t)},Bn=(i,e,t)=>{let s=i.provider??i.type;if(s===se||gt(s,se)){let r=t.getInjector(),n=r.getPayload();return r.getDirectiveRefByNode(n.nativeElement,i.flags)??Ne}return e(i,t)},Wn=(i,e,t)=>{let s=i.provider??i.type;if(s===te||gt(s,te)){let r=t.getInjector(),n=r.getPayload();return r.getComponentRefByNode(n.nativeElement,i.flags)??Ne}return e(i,t)};function Fn(i,e){let t=e[ie];if(!t||t.length===0)return i.getTemplateRef(e);for(let s of t)if(s.dirType===w.Iterable||s.dirType===w.Conditional){let r=i.getDirectiveRefByNode(e);if(!r){let n=i.getElementRef(e);r=s.\u01BFfac?.(i,{elementRef:n}),r&&i.attachDirective(r)}if(r)return i.getTemplateRef(e)}return i.getTemplateRef(e)}function xr(i,e){let t=e[re];if(!t)return null;let s=i.getComponentRefByNode(e);if(!s){let r=i.getElementRef(e);s=t.\u01BFfac?.(i,{elementRef:r}),s&&i.attachComponent(s)}return s}var zn=(i,e,t)=>{let s=i.provider??i.type;if(s===H||gt(s,H)){let r=t.getInjector(),n=r.getPayload(),o=r.getViewContainerRef(n.nativeElement,i.flags);return o||(r.createViewContainerRef(n.nativeElement)??Ne)}return e(i,t)},qn=(i,e,t)=>{let s=i.provider??i.type,r=Ge(s),n=r?.dirType;if(typeof r?.[je]=="function"){if(i.provider)return e(i,t);let a=t.getInjector(),c=i.flags??T.Default;if(n===w.Conditional||n===w.Iterable){let d=a.getDirectiveRef(s,c);return d&&d.length>0?d[0].instance:Ne}let h=a.getDirectiveRef(s,c);if(h&&h.length>0)return h[0].instance;let p=a.get(R),f=a.getPayload();if(n===w.Component){let d=a.getComponentRef(s,c);if(d&&d.length>0)return d[0];let y=xr(a,f.nativeElement);if(!y&&r.selector){let m=p.querySelectorAll(f.nativeElement,r.selector);m&&m.length>0&&(y=xr(a,m[0]))}return y??Ne}return Ne}return e(i,t)};var Rr=[{provide:$e,useValue:Pn,multi:!0},{provide:$e,useValue:$n,multi:!0},{provide:$e,useValue:Bn,multi:!0},{provide:$e,useValue:Wn,multi:!0},{provide:$e,useValue:zn,multi:!0},{provide:$e,useValue:qn,multi:!0}];var $s=class{};u($s,[[ye({providers:[{provide:Ie,useClass:_t,deps:[Je]},{provide:Ze,useClass:St,deps:[Je]},Rr,{provide:j,useFactory:()=>new kt},Le,wt],exports:[we,Se,st,Rt,ot,at,pe,ue,Be,lt,ct,ht,xe,ee,We,pt]}),0]]);var Cr,$t=class extends R{};u($t,[[D(),0]]);var Bt=class{constructor(e){this.renderer=e,this[Cr]=!0}};Cr=x;Reflect.metadata("design:paramtypes",[$t])(Bt);u(Bt,[[D(),0]]);var Kn={delimiters:["{{","}}"]},Er=Y("HTML_COMPILER_OPTIONS"),At=class extends rt{constructor(e,t,s,r){super(),this.effect=e,this.renderer=t,this.parser=s,this.options=r}};Reflect.metadata("design:paramtypes",[j,$t,Bt,Object])(At);u(At,[[Ve(Er,{defaultValue:Kn}),3,void 0,3],[L(),0]]);var Bs=class i{static withOptions(e){return{module:i,providers:[{provide:Er,useValue:e}]}}};u(Bs,[[ye({providers:[At,{provide:G,useClass:At,asDefault:!0}]}),0]]);var Hn=["@if","@switch"];function kr(i){return!i||!Hn.some(e=>i.includes(e))?i:new Ws(i).transform()}var Ws=class{constructor(e){this.input=e,this.pos=0,this.quote=null,this.escaped=!1,this.length=e.length}transform(){return this.parseContent()}parseContent(e=[]){let t="";for(;!this.eof()&&!(!this.isQuoted()&&this.matchesStopToken(e));){if(!this.isQuoted()&&this.startsWith("{{")){t+=this.readInterpolation();continue}if(!this.isQuoted()&&this.matchKeyword("@if")){t+=this.parseIfBlock();continue}if(!this.isQuoted()&&this.matchKeyword("@switch")){t+=this.parseSwitchBlock();continue}t+=this.consumeTextChar()}return t}parseIfBlock(){this.consumeKeyword("@if");let e=this.readParenExpression(),t=this.readBlockBody(),s=`<template v-if="${this.escapeAttribute(e)}">${t}</template>`;for(;;){if(this.skipWhitespace(),!this.isQuoted()&&this.matchKeyword("@else if")){this.consumeKeyword("@else if");let r=this.readParenExpression(),n=this.readBlockBody();s+=`<template v-else-if="${this.escapeAttribute(r)}">${n}</template>`;continue}if(!this.isQuoted()&&this.matchKeyword("@else")){this.consumeKeyword("@else");let r=this.readBlockBody();s+=`<template v-else>${r}</template>`}break}return s}parseSwitchBlock(){this.consumeKeyword("@switch");let e=this.readParenExpression();this.skipWhitespace(),this.expectChar("{");let t=`<template v-switch="${this.escapeAttribute(e)}">`;for(;!this.eof();){if(this.skipWhitespace(),!this.isQuoted()&&this.currentChar()==="}"){this.pos++;break}if(!this.isQuoted()&&this.matchKeyword("@case")){t+=this.parseCaseBlock();continue}if(!this.isQuoted()&&this.matchKeyword("@default")){t+=this.parseDefaultBlock();continue}t+=this.parseContent(["@case","@default","}"])}return`${t}</template>`}parseCaseBlock(){this.consumeKeyword("@case");let e=this.readParenExpression(),t=this.readBlockBody();return`<template v-case="${this.escapeAttribute(e)}">${t}</template>`}parseDefaultBlock(){return this.consumeKeyword("@default"),`<template v-default>${this.readBlockBody()}</template>`}readBlockBody(){this.skipWhitespace(),this.expectChar("{");let e=this.parseContent(["}"]);return this.expectChar("}"),e}readParenExpression(){this.skipWhitespace(),this.expectChar("(");let e=1,t="",s=null,r=!1;for(;!this.eof();){let n=this.consumeChar();if(s){if(t+=n,r){r=!1;continue}if(n==="\\"){r=!0;continue}n===s&&(s=null);continue}if(n==='"'||n==="'"||n==="`"){s=n,t+=n;continue}if(n==="("){e++,t+=n;continue}if(n===")"){if(e--,e===0)return t.trim();t+=n;continue}t+=n}throw new Error("Unclosed block expression")}readInterpolation(){let e="";for(e+=this.consumeChar(),e+=this.consumeChar();!this.eof();){if(this.startsWith("}}"))return e+=this.consumeChar(),e+=this.consumeChar(),e;e+=this.consumeChar()}return e}matchesStopToken(e){return e.some(t=>this.startsWith(t))}matchKeyword(e){if(!this.startsWith(e))return!1;let t=this.pos>0?this.input[this.pos-1]:"",s=this.input[this.pos+e.length]??"";return t&&/[A-Za-z0-9_$-]/.test(t)?!1:!s||/[\s({]/.test(s)}consumeKeyword(e){if(!this.matchKeyword(e))throw new Error(`Expected ${e}`);this.pos+=e.length}expectChar(e){if(this.skipWhitespace(),this.currentChar()!==e)throw new Error(`Expected '${e}'`);this.pos++}skipWhitespace(){for(;!this.eof()&&/\s/.test(this.currentChar());)this.pos++}currentChar(){return this.input[this.pos]??""}consumeChar(){return this.input[this.pos++]??""}consumeTextChar(){let e=this.consumeChar();return this.quote?this.escaped?(this.escaped=!1,e):e==="\\"?(this.escaped=!0,e):(e===this.quote&&(this.quote=null),e):((e==='"'||e==="'"||e==="`")&&(this.quote=e,this.escaped=!1),e)}startsWith(e){return this.input.startsWith(e,this.pos)}eof(){return this.pos>=this.length}isQuoted(){return this.quote!==null}escapeAttribute(e){return String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;")}};function Fs(i,e){if(!Number.isFinite(i)||i<=0)return 0;let t=Number.isFinite(e)?e:0;return Math.max(0,Math.min(i-1,t))}function _r(i,e,t){let s=Number.isFinite(t)&&t>0?Math.floor(t):0;if(!Number.isFinite(i)||i<=0||s<=0)return{start:0,count:0};let r=Fs(i,e);return i<=s?{start:0,count:i}:{start:Math.max(0,Math.min(i-s,r-Math.floor(s/2))),count:s}}function Dt(i){return Number.isFinite(i)&&i>0?Math.floor(i):0}var Wt=class{constructor(e={}){this.topRow=0,this.contentRows=0,this.viewportRows=0,this.sticky=!1,this.manual=!1,this.newItems=0,this.sticky=e.stickyScroll===!0,this.stickyAnchor=e.stickyStart,this.wheelStep=Dt(e.wheelStep??3)||3}get top(){return this.topRow}get contentHeight(){return this.contentRows}get viewportHeight(){return this.viewportRows}get maxTop(){return Math.max(0,this.contentRows-this.viewportRows)}get atTop(){return this.topRow<=0}get atBottom(){return this.topRow>=this.maxTop}get following(){return this.sticky&&this.stickyAnchor==="bottom"&&!this.manual&&this.atBottom}get manualScroll(){return this.manual}get newItemCount(){return this.newItems}get stickyScroll(){return this.sticky}get stickyStart(){return this.stickyAnchor}setSticky(e,t){this.sticky=e,this.stickyAnchor=t,this.applySticky(!0)}setViewportHeight(e){this.viewportRows=Dt(e),this.clampAndSettle()}setContentHeight(e){this.contentRows=Dt(e),this.clampAndSettle()}setMetrics(e,t){this.contentRows=Dt(e),this.viewportRows=Dt(t),this.clampAndSettle()}scrollBy(e){let t=Number.isFinite(e)?Math.trunc(e):0,s=Math.max(0,Math.min(this.maxTop,this.topRow+t));return s===this.topRow?(this.settleManualState(),!1):(this.topRow=s,this.settleManualState(),!0)}wheel(e){return this.scrollBy(e==="up"?-this.wheelStep:this.wheelStep)}scrollTo(e){let t=Math.max(0,Math.min(this.maxTop,Math.trunc(Number.isFinite(e)?e:0)));return t===this.topRow?(this.settleManualState(),!1):(this.topRow=t,this.settleManualState(),!0)}scrollToEdge(e){return this.scrollTo(e==="start"?0:this.maxTop)}handleKey(e){switch(e){case"up":return this.scrollBy(-this.step(5));case"down":return this.scrollBy(this.step(5));case"pageup":return this.scrollBy(-this.step(2));case"pagedown":return this.scrollBy(this.step(2));case"home":return this.scrollToEdge("start");case"end":return this.scrollToEdge("end");default:return!1}}scrollChildIntoView(e,t){let s=Dt(t),r=Math.trunc(Number.isFinite(e)?e:0);if(s<=0||s>=this.viewportRows)return!1;if(r<this.topRow)return this.scrollTo(r);let n=r+s-(this.topRow+this.viewportRows);return n>0?this.scrollBy(n):!1}noteNewItems(e=1){let t=Number.isFinite(e)&&e>0?Math.floor(e):0;return this.atBottom||(this.newItems+=t),this.newItems}resumeFollow(){let e=this.manual;return this.manual=!1,this.newItems=0,this.applySticky(!1)||e}reset(){this.topRow=0,this.contentRows=0,this.viewportRows=0,this.manual=!1,this.newItems=0}resolveVisibleRange(){return this.viewportRows<=0||this.topRow>=this.contentRows?{start:this.topRow,count:0}:{start:this.topRow,count:Math.min(this.viewportRows,this.contentRows-this.topRow)}}isRowVisible(e){let t=this.resolveVisibleRange();return e>=t.start&&e<t.start+t.count}step(e){return Math.max(1,Math.floor(this.viewportRows/e))}clampAndSettle(){this.topRow=Math.max(0,Math.min(this.maxTop,this.topRow)),this.sticky&&!this.manual&&this.applySticky(!1),this.settleManualState()}applySticky(e){if(!this.sticky||!this.stickyAnchor||(e&&(this.manual=!1),this.manual))return!1;let t=this.stickyAnchor==="bottom"?this.maxTop:0;return t===this.topRow?!1:(this.topRow=t,!0)}settleManualState(){if(this.atBottom){this.newItems=0,this.sticky&&(this.manual=!1);return}this.sticky&&this.stickyAnchor==="bottom"&&(this.manual=!0)}};var Un=Y("TAB_BAR_SOURCE"),Fe=class{constructor(e){this.injectedSource=e}get activeSource(){return this.source||this.injectedSource}get visible(){return this.activeSource?this.activeSource.visible:!0}get items(){return this.activeSource?.items||[]}get showCreate(){return this.activeSource?this.activeSource.showCreate!==!1:!0}get createLabel(){return this.activeSource?.createLabel||"+"}get closeLabel(){return this.activeSource?.closeLabel||"\u2715"}select(e,t){!e||(this.activeSource?.items||[]).some(r=>r.id===e&&r.disabled)||t?.target?.closest?.(".tab-close")||this.activeSource?.select?.(e)}closeTab(e,t){t?.stopPropagation?.(),this.close(e)}create(){this.activeSource?.create?.()}close(e){this.activeSource?.close?.(e)}};Reflect.metadata("design:type",Object)(Fe.prototype,"source");Reflect.metadata("design:paramtypes",[Object])(Fe);u(Fe,[[l(),1,"source"],[Ve(Un),3,void 0,0],[N(),3,void 0,0],[C({selector:"tab-bar",template:`
    <p class="tab-bar" role="tablist" v-show="visible">
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" v-for="tab in items" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-cell-width="3" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `}),0]]);function Re(i){if(i)try{i[x]=!0,i.nativeElement&&(i.nativeElement[x]=!0)}catch{}}var z=class{constructor(e){this.elementRef=e,this.groups=[],this.label="Menu",this.icon="\u2630",this.caret="\u25BE",this.align="right",this.triggerTitle="",this.disabled=!1,this._open=!1,this.bound=!1,Re(e)}get open(){return this._open}set open(e){let t=e===""||e===!0||e==="true";t!==this._open&&(this._open=t,this.openChange?.(t))}get openText(){return this._open?"true":"false"}get entries(){let e=Array.isArray(this.groups)?this.groups:[],t=[];return e.forEach((s,r)=>{s&&(r>0&&t.push(this.entry("separator",`sep-${r}`)),s.label&&t.push({...this.entry("title",`title-${r}`),label:String(s.label)}),(s.items||[]).forEach((n,o)=>{if(!n||!n.id)return;let a=(n.children||[]).filter(c=>c&&c.id).map((c,h)=>({...this.entry("item",`${r}-${o}-${h}-${c.id}`),id:c.id,label:String(c.label||c.id),icon:String(c.icon||""),shortcut:String(c.shortcut||""),disabled:c.disabled===!0,checked:c.checked===!0,className:this.itemClass(c)}));t.push({...this.entry("item",`${r}-${o}-${n.id}`),id:n.id,label:String(n.label||n.id),icon:String(n.icon||""),shortcut:String(n.shortcut||""),disabled:n.disabled===!0,checked:n.checked===!0,className:this.itemClass(n,a.length>0),children:a})}))}),t}onInit(){this.bindDocument()}onDestroy(){this.unbindDocument()}toggle(){this.disabled||(this.open=!this._open)}choose(e,t){let s=this.findItem(e);!s||s.disabled||(t?.stopPropagation?.(),!s.children?.length&&(this.close(),this.selectAction?.(e)))}close(){this.open=!1}itemClass(e,t=!1){let s=[];return e.danger&&s.push("is-danger"),e.checked&&s.push("is-checked"),t&&s.push("has-submenu"),s.join(" ")}entry(e,t){return{kind:e,key:t,id:"",label:"",icon:"",shortcut:"",disabled:!1,checked:!1,className:"",children:[]}}findItem(e){for(let t of this.groups||[])for(let s of t?.items||[]){if(!s)continue;if(s.id===e)return s;let r=(s.children||[]).find(n=>n?.id===e);if(r)return r}}bindDocument(){if(this.bound)return;let e=this.ownerDocument();!e||typeof e.addEventListener!="function"||(this.pointerHandler=t=>{if(!this._open)return;let s=this.hostElement,r=t?.target;s&&r&&typeof s.contains=="function"&&s.contains(r)||this.close()},this.keyHandler=t=>{!this._open||t?.key!=="Escape"||(t.preventDefault?.(),t.stopPropagation?.(),this.close())},e.addEventListener("mousedown",this.pointerHandler,!0),e.addEventListener("keydown",this.keyHandler,!0),this.bound=!0)}unbindDocument(){let e=this.ownerDocument();e&&typeof e.removeEventListener=="function"&&(this.pointerHandler&&e.removeEventListener("mousedown",this.pointerHandler,!0),this.keyHandler&&e.removeEventListener("keydown",this.keyHandler,!0)),this.pointerHandler=void 0,this.keyHandler=void 0,this.bound=!1}ownerDocument(){return this.hostElement?.ownerDocument||globalThis.document}get hostElement(){return this.elementRef?.nativeElement}};Reflect.metadata("design:type",Array)(z.prototype,"groups");Reflect.metadata("design:type",Object)(z.prototype,"label");Reflect.metadata("design:type",Object)(z.prototype,"icon");Reflect.metadata("design:type",Object)(z.prototype,"caret");Reflect.metadata("design:type",Object)(z.prototype,"align");Reflect.metadata("design:type",Object)(z.prototype,"triggerTitle");Reflect.metadata("design:type",Object)(z.prototype,"disabled");Reflect.metadata("design:type",Function)(z.prototype,"selectAction");Reflect.metadata("design:type",Function)(z.prototype,"openChange");Reflect.metadata("design:paramtypes",[g])(z);Reflect.metadata("design:paramtypes",[])(z.prototype,"open");Reflect.metadata("design:returntype",Boolean)(z.prototype,"open");u(z,[[l(),1,"groups"],[l(),1,"label"],[l(),1,"icon"],[l(),1,"caret"],[l(),1,"align"],[l(),1,"triggerTitle"],[l(),1,"disabled"],[l(),1,"selectAction"],[l(),1,"openChange"],[N(),3,void 0,0],[l(),1,"open"],[C({selector:"menu-bar",template:`
    <div class="menu-bar menu-bar-align-{{align}}" data-open="{{openText}}" role="menubar">
        <button class="menu-bar-trigger" type="button"
            aria-haspopup="menu"
            aria-label="{{triggerTitle || label}}"
            aria-expanded="{{openText}}"
            [title]="triggerTitle || label"
            [disabled]="disabled"
            @click="toggle">
            <span class="menu-bar-glyph" v-if="icon">{{icon}}</span>
            <span class="menu-bar-label" v-if="label">{{label}}</span>
            <span class="menu-bar-caret" v-if="caret">{{caret}}</span>
        </button>
        <div class="menu-bar-popup" role="menu" v-show="open">
            <div [class]="'menu-bar-entry' + (entry.children.length ? ' has-submenu' : '')" v-for="entry in entries" data-menu-key="{{entry.key}}">
                <div class="menu-bar-separator" role="separator" v-if="entry.kind === 'separator'"></div>
                <div class="menu-bar-group-title" v-if="entry.kind === 'title'">{{entry.label}}</div>
                <button class="menu-bar-item {{entry.className}}" type="button" role="menuitem"
                    v-if="entry.kind === 'item'"
                    data-menu-id="{{entry.id}}"
                    [disabled]="entry.disabled"
                    aria-disabled="{{entry.disabled}}"
                    @click="choose(entry.id, $event)">
                    <span class="menu-bar-item-icon" v-if="entry.icon">{{entry.icon}}</span>
                    <span class="menu-bar-item-label">{{entry.label}}</span>
                    <span class="menu-bar-item-shortcut" v-if="entry.shortcut">{{entry.shortcut}}</span>
                    <span class="menu-bar-item-check" v-if="entry.checked">\u2713</span>
                    <span class="menu-bar-item-caret" v-if="entry.children.length">\u25B8</span>
                </button>
                <div class="menu-bar-submenu" role="menu" v-if="entry.children.length">
                    <button class="menu-bar-item" type="button" role="menuitem"
                        v-for="child in entry.children"
                        data-menu-id="{{child.id}}"
                        [disabled]="child.disabled"
                        [class]="child.className"
                        aria-disabled="{{child.disabled}}"
                        @click="choose(child.id, $event)">
                        <span class="menu-bar-item-icon" v-if="child.icon">{{child.icon}}</span>
                        <span class="menu-bar-item-label">{{child.label}}</span>
                        <span class="menu-bar-item-shortcut" v-if="child.shortcut">{{child.shortcut}}</span>
                        <span class="menu-bar-item-check" v-if="child.checked">\u2713</span>
                    </button>
                </div>
            </div>
        </div>
    </div>`}),0]]);var ze=class{constructor(){this.header=[],this.rows=[]}};Reflect.metadata("design:type",Array)(ze.prototype,"header");Reflect.metadata("design:type",Array)(ze.prototype,"rows");u(ze,[[l(),1,"header"],[l(),1,"rows"],[C({selector:"markdown-table",template:`
    <div class="markdown-table" role="table">
        <div class="markdown-row markdown-head" role="row">
            <div class="markdown-cell align-{{cell.align || 'left'}}" role="columnheader" v-for="cell in header"><span class="markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
        <div class="markdown-row" role="row" v-for="row in rows">
            <div class="markdown-cell align-{{cell.align || 'left'}}" role="cell" v-for="cell in row"><span class="markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
    </div>`}),0]]);var ut=class{constructor(){this.lines=[]}};Reflect.metadata("design:type",Array)(ut.prototype,"lines");u(ut,[[l(),1,"lines"],[C({selector:"markdown-code",template:`
    <pre class="markdown-code"><code><span class="markdown-code-line" v-for="line in lines"><span class="markdown-code-token" data-tone="{{token.tone}}" v-for="token in line">{{token.text}}</span></span></code></pre>`}),0]]);var Yn=/^\x1b\[[0-9;]*m/;function Gn(i){return i>=4352&&(i<=4447||i===9001||i===9002||i>=11904&&i<=42191&&i!==12351||i>=44032&&i<=55203||i>=63744&&i<=64255||i>=65040&&i<=65049||i>=65072&&i<=65135||i>=65280&&i<=65376||i>=65504&&i<=65510||i>=127744&&i<=128591||i>=129280&&i<=129535||i>=131072&&i<=262141)}function Jn(i,e){return i.charCodeAt(e)!==27?null:i.slice(e).match(Yn)?.[0]??null}function W(i){let e=0;for(let t=0;t<i.length;){let s=Jn(i,t);if(s){t+=s.length;continue}let r=i.codePointAt(t);if(r==null){t+=1;continue}if(r===0||r===8203||r===8204||r===8205||r>=768&&r<=879||r>=65024&&r<=65039){t+=r>65535?2:1;continue}e+=Gn(r)?2:1,t+=r>65535?2:1}return e}var J=class{constructor(){this.title="",this.lines=[],this.hint="",this.ariaLabel="",this.closeLabel="\u2715",this.maxWidth=88,this.minWidth=24,this.horizontalChrome=6}get resolvedShellStyle(){return`max-width: ${this.resolveContentWidth()}ch;`}get widthClass(){return`dialog-w-${this.resolveContentWidth()}`}resolveContentWidth(){let e=Math.max(8,Number(this.maxWidth)||88),t=Math.max(8,Math.min(e,Number(this.minWidth)||24)),s=Math.max(0,Number(this.horizontalChrome)||0),r=Math.max(0,W(String(this.title||"")),W(String(this.hint||"")),...(this.lines||[]).map(n=>W(String(n||""))));return Math.max(t,Math.min(e,r+s))}close(){this.closeAction?.()}};Reflect.metadata("design:type",Object)(J.prototype,"title");Reflect.metadata("design:type",Array)(J.prototype,"lines");Reflect.metadata("design:type",Object)(J.prototype,"hint");Reflect.metadata("design:type",Object)(J.prototype,"ariaLabel");Reflect.metadata("design:type",Object)(J.prototype,"closeLabel");Reflect.metadata("design:type",Object)(J.prototype,"maxWidth");Reflect.metadata("design:type",Object)(J.prototype,"minWidth");Reflect.metadata("design:type",Object)(J.prototype,"horizontalChrome");Reflect.metadata("design:type",Function)(J.prototype,"closeAction");u(J,[[l(),1,"title"],[l(),1,"lines"],[l(),1,"hint"],[l(),1,"ariaLabel"],[l(),1,"closeLabel"],[l(),1,"maxWidth"],[l(),1,"minWidth"],[l(),1,"horizontalChrome"],[l(),1,"closeAction"],[C({selector:"dialog-panel",template:`
    <div class="console-panel dialog-panel {{widthClass}}" role="dialog" aria-label="{{ariaLabel}}">
        <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
        <label class="dialog-title" v-show="title">{{title}}</label>
        <label class="dialog-line" v-for="line in lines">{{line}}</label>
        <label class="dialog-hint" v-show="hint">{{hint}}</label>
    </div>`}),0]]);var q=class{constructor(){this.title="",this.lines=[],this.hint="",this.tone="info",this.ariaLabel="",this.closeLabel="\u2715",this.actionLabel="OK",this.maxWidth=88,this.minWidth=24,this.horizontalChrome=6}get widthClass(){return`dialog-w-${this.resolveContentWidth()}`}close(){this.closeAction?.()}accept(){this.acceptAction?.()}resolveContentWidth(){let e=Math.max(8,Number(this.maxWidth)||88),t=Math.max(8,Math.min(e,Number(this.minWidth)||24)),s=Math.max(0,Number(this.horizontalChrome)||0),r=Math.max(0,W(String(this.title||"")),W(String(this.hint||"")),W(String(this.actionLabel||"")),...(this.lines||[]).map(n=>W(String(n||""))));return Math.max(t,Math.min(e,r+s))}};Reflect.metadata("design:type",Object)(q.prototype,"title");Reflect.metadata("design:type",Array)(q.prototype,"lines");Reflect.metadata("design:type",Object)(q.prototype,"hint");Reflect.metadata("design:type",Object)(q.prototype,"tone");Reflect.metadata("design:type",Object)(q.prototype,"ariaLabel");Reflect.metadata("design:type",Object)(q.prototype,"closeLabel");Reflect.metadata("design:type",Object)(q.prototype,"actionLabel");Reflect.metadata("design:type",Object)(q.prototype,"maxWidth");Reflect.metadata("design:type",Object)(q.prototype,"minWidth");Reflect.metadata("design:type",Object)(q.prototype,"horizontalChrome");Reflect.metadata("design:type",Function)(q.prototype,"closeAction");Reflect.metadata("design:type",Function)(q.prototype,"acceptAction");u(q,[[l(),1,"title"],[l(),1,"lines"],[l(),1,"hint"],[l(),1,"tone"],[l(),1,"ariaLabel"],[l(),1,"closeLabel"],[l(),1,"actionLabel"],[l(),1,"maxWidth"],[l(),1,"minWidth"],[l(),1,"horizontalChrome"],[l(),1,"closeAction"],[l(),1,"acceptAction"],[C({selector:"alert-dialog",template:`
    <div class="console-panel dialog-panel alert-dialog {{widthClass}}" role="alertdialog" data-tone="{{tone}}" aria-label="{{ariaLabel}}">
        <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
        <label class="dialog-title" v-if="title">{{title}}</label>
        <label class="dialog-line" v-for="line in lines">{{line}}</label>
        <label class="dialog-hint" v-if="hint">{{hint}}</label>
        <label class="alert-action" data-cell-width="2" @click="accept">{{actionLabel}}</label>
    </div>`}),0]]);var Ce=class{constructor(){this.items=[],this.closeLabel="\u2715",this.messageWidth=0}get closeAffordance(){return`\xA0${this.closeLabel}`}get entries(){let e=Array.isArray(this.items)?this.items:[],t=Math.max(0,Math.floor(Number(this.messageWidth)||0));if(!t)return e.map(r=>({...r,text:String(r?.message??"")}));let s=W(this.closeAffordance);return e.map(r=>{let n=String(r?.message??""),o=Math.max(1,t-s-W(n));return{...r,text:`${n}${" ".repeat(o)}`}})}get visible(){return this.entries.length>0}dismiss(e,t){t?.stopPropagation?.(),this.closeAction?.(e)}};Reflect.metadata("design:type",Object)(Ce.prototype,"items");Reflect.metadata("design:type",Object)(Ce.prototype,"closeLabel");Reflect.metadata("design:type",Function)(Ce.prototype,"closeAction");Reflect.metadata("design:type",Object)(Ce.prototype,"messageWidth");u(Ce,[[l(),1,"items"],[l(),1,"closeLabel"],[l(),1,"closeAction"],[l(),1,"messageWidth"],[C({selector:"toast-stack",template:`
    <div class="console-toast-stack" role="status" aria-live="polite" v-show="visible">
        <div class="console-toast-card">
        <label class="console-toast" data-tone="{{item.tone}}" v-for="item in entries">
            <span class="toast-message">{{item.text}}</span><span class="toast-close" role="button" data-cell-width="3" @click="dismiss(item.id, $event)">{{closeAffordance}}</span>
        </label>
        </div>
    </div>`}),0]]);var I=class{constructor(){this.options=[],this.selectedIndex=0,this.visibleCount=0,this.title="",this.hint="",this.meta="",this.detailLines=[],this.accessibilityLabel="Selection menu",this.closeLabel="\u2715",this.suggestion=!1,this.fitContent=!1,this.maxWidth=88,this.minWidth=28}get widthClass(){return this.fitContent?`dialog-w-${this.resolveContentWidth()}`:""}resolveContentWidth(){let e=Math.max(24,Math.min(88,Number(this.maxWidth)||88)),t=Math.max(24,Math.min(e,Number(this.minWidth)||28)),s=Math.max(0,W(String(this.title||"")),W(String(this.hint||"")),W(String(this.meta||"")),...(this.options||[]).map((r,n)=>W(`${n+1}. ${r?.label??""}`)+(r?.description?2+W(String(r.description)):0)));return Math.max(t,Math.min(e,s+12))}get visibleOptions(){let e=Array.isArray(this.options)?this.options:[],t=Fs(e.length,Number(this.selectedIndex)),s=_r(e.length,t,Number(this.visibleCount)||e.length||1);return e.slice(s.start,s.start+s.count).map((r,n)=>{let o=s.start+n,a=o===t;return{index:o,label:String(r?.label??""),value:String(r?.value??""),description:String(r?.description??""),selected:a,className:a?"select-option is-selected":"select-option"}})}choose(e){let t=(this.options||[])[e];t&&this.selectAction?.(t.value)}get optionsJson(){return JSON.stringify(this.options||[])}get detailLinesJson(){return this.detailLines?.length?JSON.stringify(this.detailLines):""}get selectedIndexText(){return String(this.selectedIndex??0)}get visibleCountText(){return String(this.visibleCount||0)}emitKeydown(e){this.keydownAction?.(e)}emitSelection(e){let t=Number(e?.optionIndex);if(!Number.isInteger(t))return;let s=this.options?.[t];s&&this.selectAction?.(s.value)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(I.prototype,"options");Reflect.metadata("design:type",Object)(I.prototype,"selectedIndex");Reflect.metadata("design:type",Object)(I.prototype,"visibleCount");Reflect.metadata("design:type",Object)(I.prototype,"title");Reflect.metadata("design:type",Object)(I.prototype,"hint");Reflect.metadata("design:type",Object)(I.prototype,"meta");Reflect.metadata("design:type",Array)(I.prototype,"detailLines");Reflect.metadata("design:type",Object)(I.prototype,"accessibilityLabel");Reflect.metadata("design:type",Object)(I.prototype,"closeLabel");Reflect.metadata("design:type",Object)(I.prototype,"suggestion");Reflect.metadata("design:type",Object)(I.prototype,"fitContent");Reflect.metadata("design:type",Object)(I.prototype,"maxWidth");Reflect.metadata("design:type",Object)(I.prototype,"minWidth");Reflect.metadata("design:type",Function)(I.prototype,"selectAction");Reflect.metadata("design:type",Function)(I.prototype,"closeAction");Reflect.metadata("design:type",Function)(I.prototype,"keydownAction");u(I,[[l(),1,"options"],[l(),1,"selectedIndex"],[l(),1,"visibleCount"],[l(),1,"title"],[l(),1,"hint"],[l(),1,"meta"],[l(),1,"detailLines"],[l(),1,"accessibilityLabel"],[l(),1,"closeLabel"],[l(),1,"suggestion"],[l(),1,"fitContent"],[l(),1,"maxWidth"],[l(),1,"minWidth"],[l(),1,"selectAction"],[l(),1,"closeAction"],[l(),1,"keydownAction"],[C({selector:"select-list",template:`
    <div class="console-panel select-list {{widthClass}}" role="dialog" aria-label="{{accessibilityLabel}}">
        <div class="select-shell {{suggestion ? 'select-suggestions' : 'select-card'}}">
            <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
            <select class="select-core"
                aria-label="{{accessibilityLabel}}"
                title="{{title}}" hint="{{hint}}" meta="{{meta}}"
                options="{{optionsJson}}"
                selectedIndex="{{selectedIndexText}}"
                visibleCount="{{visibleCountText}}"
                detailLines="{{detailLinesJson}}"
                optionClass="select-option"
                optionActiveClass="select-option is-selected"
                @keydown="emitKeydown($event)"
                @select-option="emitSelection($event)"></select>
            <div class="select-rows" role="listbox" aria-label="{{accessibilityLabel}}">
                <label class="select-title" v-if="title">{{title}}</label>
                <label class="select-meta" v-if="meta">{{meta}}</label>
                <label class="{{option.className}}" role="option" aria-selected="{{option.selected}}" v-for="option in visibleOptions" @click="choose(option.index)">
                    <span class="select-option-label">{{option.label}}</span><span class="select-option-description" v-if="option.description">{{option.description}}</span>
                </label>
                <label class="select-detail" v-for="line in detailLines" v-if="detailLines && detailLines.length">{{line}}</label>
                <label class="select-hint" v-if="hint">{{hint}}</label>
            </div>
        </div>
    </div>`}),0]]);var V=class{constructor(){this.header="",this.title="",this.context="",this.meta="",this.contextLines=[],this.hint="",this.secondaryHint="",this.empty="",this.ariaLabel="",this.listLabel="",this.activeOptionId="",this.showClose=!1,this.panelClass="",this.closeLabel="\u2715",this.items=[],this.detailLines=[]}selectItem(e){this.selectAction?.(e.value??e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Object)(V.prototype,"header");Reflect.metadata("design:type",Object)(V.prototype,"title");Reflect.metadata("design:type",Object)(V.prototype,"context");Reflect.metadata("design:type",Object)(V.prototype,"meta");Reflect.metadata("design:type",Array)(V.prototype,"contextLines");Reflect.metadata("design:type",Object)(V.prototype,"hint");Reflect.metadata("design:type",Object)(V.prototype,"secondaryHint");Reflect.metadata("design:type",Object)(V.prototype,"empty");Reflect.metadata("design:type",Object)(V.prototype,"ariaLabel");Reflect.metadata("design:type",Object)(V.prototype,"listLabel");Reflect.metadata("design:type",Object)(V.prototype,"activeOptionId");Reflect.metadata("design:type",Object)(V.prototype,"showClose");Reflect.metadata("design:type",Object)(V.prototype,"panelClass");Reflect.metadata("design:type",Object)(V.prototype,"closeLabel");Reflect.metadata("design:type",Array)(V.prototype,"items");Reflect.metadata("design:type",Array)(V.prototype,"detailLines");Reflect.metadata("design:type",Function)(V.prototype,"selectAction");Reflect.metadata("design:type",Function)(V.prototype,"closeAction");u(V,[[l(),1,"header"],[l(),1,"title"],[l(),1,"context"],[l(),1,"meta"],[l(),1,"contextLines"],[l(),1,"hint"],[l(),1,"secondaryHint"],[l(),1,"empty"],[l(),1,"ariaLabel"],[l(),1,"listLabel"],[l(),1,"activeOptionId"],[l(),1,"showClose"],[l(),1,"panelClass"],[l(),1,"closeLabel"],[l(),1,"items"],[l(),1,"detailLines"],[l(),1,"selectAction"],[l(),1,"closeAction"],[C({selector:"list-panel",template:`
    <div class="console-panel list-panel {{panelClass}}" role="dialog" aria-label="{{ariaLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label class="dialog-close" data-cell-width="2" v-show="showClose" @click="close">{{closeLabel}}</label>
        <label class="list-panel-header" v-show="header">{{header}}</label>
        <label class="list-panel-title" v-show="title">{{title}}</label>
        <label class="list-panel-meta" v-show="context">{{context}}</label>
        <label class="list-panel-meta" v-show="meta">{{meta}}</label>
        <label class="list-panel-context" v-for="line in contextLines">{{line}}</label>
        <div role="listbox" aria-label="{{listLabel}}">
            <div id="{{item.id}}" class="list-panel-item {{item.className}}" role="option" aria-selected="{{item.selected}}" v-for="item in items" @click="selectItem(item)">{{item.label}}</div>
        </div>
        <label class="list-panel-detail" v-for="line in detailLines">{{line}}</label>
        <label class="list-panel-empty" v-show="empty">{{empty}}</label>
        <label class="list-panel-hint" v-show="hint">{{hint}}</label>
        <label class="list-panel-hint" v-show="secondaryHint">{{secondaryHint}}</label>
    </div>`}),0]]);function Qn(i){return Array.isArray(i)?{items:i,hasMore:!1}:{items:Array.isArray(i?.items)?i.items:[],hasMore:i?.hasMore===!0,nextCursor:i?.nextCursor}}var zs=class{constructor(e){this.loader=e,this.items=[],this.hasMore=!0,this.loading=!1,this.error="",this.request=0}reset(e=[],t=!0){this.request+=1,this.items=e.slice(),this.cursor=this.items[this.items.length-1]?.id,this.hasMore=t,this.loading=!1,this.error=""}async loadMore(e=this.loader){if(!e||this.loading||!this.hasMore)return!1;let t=++this.request;this.loading=!0,this.error="";try{let s=Qn(await e(this.cursor));if(t!==this.request)return!1;let r=new Set(this.items.map(o=>String(o.id))),n=s.items.filter(o=>o&&!r.has(String(o.id)));return n.length&&(this.items=[...this.items,...n]),this.cursor=s.nextCursor||this.items[this.items.length-1]?.id,this.hasMore=s.hasMore,n.length>0}catch(s){return t===this.request&&(this.error=s instanceof Error?s.message:String(s)),!1}finally{t===this.request&&(this.loading=!1)}}},K=class{constructor(){this.items=[],this.hasMore=!0,this.loading=!1,this.error="",this.empty="",this.loadingLabel="Loading\u2026",this.moreLabel="Load more",this.ariaLabel="List",this.autoLoad=!1,this.pager=new zs}onInit(){this.autoLoad&&!this.items.length&&this.loadPage&&this.loadMore()}onReachEnd(){this.loadMore()}async loadMore(){if(!this.loadPage||this.loading||!this.hasMore)return!1;this.pager.items=this.items,this.pager.cursor=this.cursor,this.pager.hasMore=this.hasMore,this.loading=!0,this.error="";try{let e=await this.pager.loadMore(t=>this.loadPage(t));return this.items=this.pager.items,this.cursor=this.pager.cursor,this.hasMore=this.pager.hasMore,this.error=this.pager.error,e}finally{this.loading=this.pager.loading}}selectItem(e){e?.disabled||this.selectAction?.(e)}};Reflect.metadata("design:type",Array)(K.prototype,"items");Reflect.metadata("design:type",String)(K.prototype,"cursor");Reflect.metadata("design:type",Object)(K.prototype,"hasMore");Reflect.metadata("design:type",Object)(K.prototype,"loading");Reflect.metadata("design:type",Object)(K.prototype,"error");Reflect.metadata("design:type",Object)(K.prototype,"empty");Reflect.metadata("design:type",Object)(K.prototype,"loadingLabel");Reflect.metadata("design:type",Object)(K.prototype,"moreLabel");Reflect.metadata("design:type",Object)(K.prototype,"ariaLabel");Reflect.metadata("design:type",Object)(K.prototype,"loadPage");Reflect.metadata("design:type",Function)(K.prototype,"selectAction");Reflect.metadata("design:type",Object)(K.prototype,"autoLoad");u(K,[[l(),1,"items"],[l(),1,"cursor"],[l(),1,"hasMore"],[l(),1,"loading"],[l(),1,"error"],[l(),1,"empty"],[l(),1,"loadingLabel"],[l(),1,"moreLabel"],[l(),1,"ariaLabel"],[l(),1,"loadPage"],[l(),1,"selectAction"],[l(),1,"autoLoad"],[C({selector:"list",template:`
    <div class="list" role="list" aria-label="{{ariaLabel}}">
        <div class="list-row {{item.className}}" role="listitem" v-for="item in items" @click="selectItem(item)">
            <span class="list-label">{{item.label}}</span>
            <span class="list-description" v-if="item.description"> {{item.description}}</span>
        </div>
        <label class="list-empty" v-show="!items.length && !loading">{{empty}}</label>
        <label class="list-loading" v-show="loading">{{loadingLabel}}</label>
        <label class="list-error" v-show="error">{{error}}</label>
        <button class="list-more" v-show="hasMore && !loading" @click="loadMore">{{moreLabel}}</button>
    </div>`}),0]]);var de=class{constructor(){this.title="",this.hint="",this.grouped=!1,this.items=[],this.groups=[]}};Reflect.metadata("design:type",Object)(de.prototype,"title");Reflect.metadata("design:type",Object)(de.prototype,"hint");Reflect.metadata("design:type",Object)(de.prototype,"grouped");Reflect.metadata("design:type",Array)(de.prototype,"items");Reflect.metadata("design:type",Array)(de.prototype,"groups");u(de,[[l(),1,"title"],[l(),1,"hint"],[l(),1,"grouped"],[l(),1,"items"],[l(),1,"groups"],[C({selector:"keymap-panel",template:`
    <div class="console-panel keymap-panel">
        <label class="keymap-title">{{title}}</label>
        <template v-if="grouped">
            <template v-for="group in groups">
                <label class="keymap-group">{{group.label}}</label>
                <label class="keymap-row" v-for="binding in group.items">
                    <span class="keymap-key">{{binding.key}}</span>
                    <span class="keymap-action"> {{binding.label || binding.action}}</span>
                </label>
            </template>
        </template>
        <template v-else>
            <label class="keymap-row" v-for="binding in items">
                <span class="keymap-key">{{binding.key}}</span>
                <span class="keymap-action"> {{binding.label || binding.action}}</span>
            </label>
        </template>
        <label class="keymap-hint">{{hint}}</label>
    </div>`}),0]]);var Ae=class{constructor(){this.title="",this.hint="",this.items=[]}};Reflect.metadata("design:type",Object)(Ae.prototype,"title");Reflect.metadata("design:type",Object)(Ae.prototype,"hint");Reflect.metadata("design:type",Array)(Ae.prototype,"items");u(Ae,[[l(),1,"title"],[l(),1,"hint"],[l(),1,"items"],[C({selector:"status-list",template:`
    <div class="console-panel status-list">
        <label class="status-list-title">{{title}}</label>
        <label class="status-list-row" data-status="{{item.status}}" v-for="item in items">
            <span class="status-list-status">{{item.statusLabel || item.status}}</span>
            <span class="status-list-label"> {{item.label}}</span>
            <span class="status-list-detail"> {{item.detail}}</span>
        </label>
        <label class="status-list-hint">{{hint}}</label>
    </div>`}),0]]);var Q=class{constructor(){this.tokens=[],this.status="",this.role="",this.prefix="",this.meta="",this.toggleContent="",this.ariaLabel="",this.hoverable=!1}toggle(){this.toggleAction?.()}};Reflect.metadata("design:type",Array)(Q.prototype,"tokens");Reflect.metadata("design:type",Object)(Q.prototype,"status");Reflect.metadata("design:type",Object)(Q.prototype,"role");Reflect.metadata("design:type",Object)(Q.prototype,"prefix");Reflect.metadata("design:type",Object)(Q.prototype,"meta");Reflect.metadata("design:type",Object)(Q.prototype,"toggleContent");Reflect.metadata("design:type",Object)(Q.prototype,"ariaLabel");Reflect.metadata("design:type",Object)(Q.prototype,"hoverable");Reflect.metadata("design:type",Function)(Q.prototype,"toggleAction");u(Q,[[l(),1,"tokens"],[l(),1,"status"],[l(),1,"role"],[l(),1,"prefix"],[l(),1,"meta"],[l(),1,"toggleContent"],[l(),1,"ariaLabel"],[l(),1,"hoverable"],[l(),1,"toggleAction"],[C({selector:"message-row",template:`
    <label class="message-line" aria-label="{{ariaLabel}}" data-hover="{{hoverable || toggleContent ? 'fade' : 'none'}}" @click="toggle">
        <span class="message-status" v-if="status">{{status}}</span>
        <span class="message-role" v-if="role">{{role}}</span>
        <span class="message-prefix" v-if="prefix">{{prefix}}</span>
        <span class="message-line-content">
            <span class="message-content">
                <span class="message-token tone-{{token.tone || 'default'}}" v-for="token in tokens">{{token.text}}</span>
            </span>
        </span>
        <span class="message-detail-toggle" v-if="toggleContent">{{toggleContent}}</span>
        <span class="message-meta" v-if="meta">{{meta}}</span>
    </label>`}),0]]);var me=class{constructor(){this.summary="",this.meta="",this.selection="",this.hint="",this.items=[]}};Reflect.metadata("design:type",Object)(me.prototype,"summary");Reflect.metadata("design:type",Object)(me.prototype,"meta");Reflect.metadata("design:type",Object)(me.prototype,"selection");Reflect.metadata("design:type",Object)(me.prototype,"hint");Reflect.metadata("design:type",Array)(me.prototype,"items");u(me,[[l(),1,"summary"],[l(),1,"meta"],[l(),1,"selection"],[l(),1,"hint"],[l(),1,"items"],[C({selector:"detail-panel",template:`
    <div class="console-panel detail-panel" >
        <label class="detail-summary"  v-show="summary">{{summary}}</label>
        <label class="detail-meta"  v-show="meta">{{meta}}</label>
        <label class="detail-selection"  v-show="selection">{{selection}}</label>
        <label class="detail-hint"  v-show="hint">{{hint}}</label>
        <label class="detail-line {{item.className}}" v-for="item in items">
            <span class="detail-line-number" v-show="item.lineNumber">{{item.lineNumber}}</span><span class="detail-line-prefix {{item.prefixClass}}" v-show="item.prefix">{{item.prefix}}</span><span class="detail-line-content {{item.contentClass}}">{{item.text}}</span>
        </label>
    </div>`}),0]]);var U=class{constructor(){this.value="",this.prompt="",this.placeholder="",this.cursorPos=0,this.focused=!0,this.continuationPrompt="  ",this.mask=!1}emitInput(e){this.inputAction?.(e)}emitCursor(e){this.cursorAction?.(e)}emitKeydown(e){this.keydownAction?.(e)}};Reflect.metadata("design:type",Object)(U.prototype,"value");Reflect.metadata("design:type",Object)(U.prototype,"prompt");Reflect.metadata("design:type",Object)(U.prototype,"placeholder");Reflect.metadata("design:type",Object)(U.prototype,"cursorPos");Reflect.metadata("design:type",Object)(U.prototype,"focused");Reflect.metadata("design:type",Object)(U.prototype,"continuationPrompt");Reflect.metadata("design:type",Object)(U.prototype,"mask");Reflect.metadata("design:type",Function)(U.prototype,"inputAction");Reflect.metadata("design:type",Function)(U.prototype,"cursorAction");Reflect.metadata("design:type",Function)(U.prototype,"keydownAction");u(U,[[l(),1,"value"],[l(),1,"prompt"],[l(),1,"placeholder"],[l(),1,"cursorPos"],[l(),1,"focused"],[l(),1,"continuationPrompt"],[l(),1,"mask"],[l(),1,"inputAction"],[l(),1,"cursorAction"],[l(),1,"keydownAction"],[C({selector:"input-field",template:`
    <textarea
        class="agent-input"
        value="{{value}}"
        prompt="{{prompt}}"
        placeholder="{{placeholder}}"
        cursor=" "
        cursorPos="{{cursorPos}}"
        [focused]="focused"
        showCursor="false"
        cursorTarget="input"
        continuationPrompt="{{continuationPrompt}}"
        mask="{{mask}}" data-hover="none"
        @input="emitInput($event)"
        @click="emitCursor($event)"
        @keyup="emitCursor($event)"
        @keydown="emitKeydown($event)"></textarea>`}),0]]);var Sr=.08,Ar=.6,Zn=.7,$=class{constructor(e){this.elementRef=e,this.leftRatio=.2,this.rightRatio=.24,this.bottomRatio=.26,this.minLeft=160,this.minRight=180,this.minBottom=80,this.resizable=!0,this.leftCollapsed=!1,this.rightCollapsed=!1,this.bottomCollapsed=!1,this.projected=!1,Re(e)}get layoutStyle(){return{"--workspace-left":`${this.leftRatio*100}%`,"--workspace-right":`${this.rightRatio*100}%`,"--workspace-bottom":`${this.bottomRatio*100}%`}}onAfterViewInit(){Re(this.layoutRoot),this.mountProjectedContent(),this.bindResizeListeners()}onDestroy(){this.unbindResizeListeners()}mountProjectedContent(){if(this.projected)return;let e=this.layoutRoot?.nativeElement;if(!e)return;let s=(e.closest?.("workspace-layout")||e.parentElement||this.hostElement)?.[_e]||[];if(!s.length)return;let r={};e.querySelectorAll?.("[data-workspace-slot]")?.forEach?.(n=>{r[n.getAttribute("data-workspace-slot")]=n}),Object.keys(r).length&&(s.forEach((n,o)=>{let a=String(n.tagName||"").toLowerCase(),c=a.startsWith("workspace-")?a.slice(10):"",h=["left","center","right","bottom"][o],p=r[c]||r[h];p&&typeof p.appendChild=="function"&&p.appendChild(n)}),this.projected=!0)}beginResize(e,t){if(!this.resizable||this.isCollapsed(t))return;e?.preventDefault?.(),e?.stopPropagation?.();let r=(this.layoutRoot?.nativeElement||this.hostElement)?.getBoundingClientRect?.()||{width:0,height:0};this.resizing={pane:t,startX:Number(e?.clientX)||0,startY:Number(e?.clientY)||0,startLeft:this.leftRatio,startRight:this.rightRatio,startBottom:this.bottomRatio,width:r.width||0,height:r.height||0}}resizeMove(e){let t=this.resizing;if(t)if(t.pane==="left"){let s=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setLeftRatio(t.startLeft+s)}else if(t.pane==="right"){let s=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setRightRatio(t.startRight-s)}else{let s=t.height?(Number(e?.clientY)-t.startY)/t.height:0;this.setBottomRatio(t.startBottom-s)}}endResize(){this.resizing&&(this.resizing=void 0)}resizePane(e,t){e==="left"?this.setLeftRatio(t):e==="right"?this.setRightRatio(t):this.setBottomRatio(t)}isCollapsed(e){return e==="left"?this.leftCollapsed:e==="right"?this.rightCollapsed:this.bottomCollapsed}togglePane(e){this.isCollapsed(e)?this.expandPane(e):this.collapsePane(e)}collapsePane(e){this.setCollapsed(e,!0)}expandPane(e){this.setCollapsed(e,!1)}setCollapsed(e,t){e==="left"?this.leftCollapsed=t:e==="right"?this.rightCollapsed=t:this.bottomCollapsed=t,this.collapseAction?.(e,t)}stopEvent(e){e?.preventDefault?.(),e?.stopPropagation?.()}setLeftRatio(e){let t=this.layoutSize().width,s=this.minRatio(this.minLeft,t),r=Math.min(Ar,1-this.rightRatio-s);this.leftRatio=this.clamp(e,s,r),this.resizeAction?.("left",this.leftRatio)}setRightRatio(e){let t=this.layoutSize().width,s=this.minRatio(this.minRight,t),r=Math.min(Ar,1-this.leftRatio-s);this.rightRatio=this.clamp(e,s,r),this.resizeAction?.("right",this.rightRatio)}setBottomRatio(e){let t=this.layoutSize().height,s=this.minRatio(this.minBottom,t);this.bottomRatio=this.clamp(e,s,Zn),this.resizeAction?.("bottom",this.bottomRatio)}layoutSize(){let e=this.layoutRoot?.nativeElement?.getBoundingClientRect?.();return{width:Number(e?.width)||0,height:Number(e?.height)||0}}minRatio(e,t){let s=Math.max(0,Number(e)||0);return t>0?Math.max(Sr,s/t):Sr}get hostElement(){return this.elementRef?.nativeElement}clamp(e,t,s){let r=Number(e);return Number.isFinite(r)?Math.max(t,Math.min(Math.max(t,s),r)):t}bindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.addEventListener!="function"||this.moveHandler||(this.moveHandler=t=>this.resizeMove(t),this.upHandler=()=>this.endResize(),e.addEventListener("mousemove",this.moveHandler),e.addEventListener("mouseup",this.upHandler))}unbindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.removeEventListener!="function"||(this.moveHandler&&e.removeEventListener("mousemove",this.moveHandler),this.upHandler&&e.removeEventListener("mouseup",this.upHandler),this.moveHandler=void 0,this.upHandler=void 0)}};Reflect.metadata("design:type",Object)($.prototype,"leftRatio");Reflect.metadata("design:type",Object)($.prototype,"rightRatio");Reflect.metadata("design:type",Object)($.prototype,"bottomRatio");Reflect.metadata("design:type",Object)($.prototype,"minLeft");Reflect.metadata("design:type",Object)($.prototype,"minRight");Reflect.metadata("design:type",Object)($.prototype,"minBottom");Reflect.metadata("design:type",Object)($.prototype,"resizable");Reflect.metadata("design:type",Object)($.prototype,"leftCollapsed");Reflect.metadata("design:type",Object)($.prototype,"rightCollapsed");Reflect.metadata("design:type",Object)($.prototype,"bottomCollapsed");Reflect.metadata("design:type",Function)($.prototype,"resizeAction");Reflect.metadata("design:type",Function)($.prototype,"collapseAction");Reflect.metadata("design:type",g)($.prototype,"layoutRoot");Reflect.metadata("design:paramtypes",[g])($);u($,[[l(),1,"leftRatio"],[l(),1,"rightRatio"],[l(),1,"bottomRatio"],[l(),1,"minLeft"],[l(),1,"minRight"],[l(),1,"minBottom"],[l(),1,"resizable"],[l(),1,"leftCollapsed"],[l(),1,"rightCollapsed"],[l(),1,"bottomCollapsed"],[l(),1,"resizeAction"],[l(),1,"collapseAction"],[et("layoutRoot",g),1,"layoutRoot"],[N(),3,void 0,0],[C({selector:"workspace-layout",template:`
    <div class="workspace-layout" #layoutRoot [style]="layoutStyle">
        <div class="workspace-layout-main">
            <section class="workspace-pane workspace-layout-left" aria-label="Left pane" v-show="!leftCollapsed">
                <div class="workspace-slot" data-workspace-slot="left"></div>
            </section>
            <div class="workspace-splitter workspace-splitter-left"
                 role="separator" aria-orientation="vertical" aria-label="Resize left pane"
                 @mousedown="beginResize($event, 'left')">
                <button class="workspace-collapse workspace-collapse-left"
                        type="button"
                        [title]="leftCollapsed ? 'Show left pane' : 'Hide left pane'"
                        @mousedown="stopEvent($event)"
                        @click="togglePane('left')">{{leftCollapsed ? '\u203A' : '\u2039'}}</button>
            </div>
            <section class="workspace-pane workspace-layout-center" aria-label="Center pane">
                <div class="workspace-slot" data-workspace-slot="center"></div>
            </section>
            <div class="workspace-splitter workspace-splitter-right"
                 role="separator" aria-orientation="vertical" aria-label="Resize right pane"
                 @mousedown="beginResize($event, 'right')">
                <button class="workspace-collapse workspace-collapse-right"
                        type="button"
                        [title]="rightCollapsed ? 'Show right pane' : 'Hide right pane'"
                        @mousedown="stopEvent($event)"
                        @click="togglePane('right')">{{rightCollapsed ? '\u2039' : '\u203A'}}</button>
            </div>
            <section class="workspace-pane workspace-layout-right" aria-label="Right pane" v-show="!rightCollapsed">
                <div class="workspace-slot" data-workspace-slot="right"></div>
            </section>
        </div>
        <div class="workspace-splitter workspace-splitter-bottom"
             role="separator" aria-orientation="horizontal" aria-label="Resize bottom pane"
             @mousedown="beginResize($event, 'bottom')">
            <button class="workspace-collapse workspace-collapse-bottom"
                    type="button"
                    [title]="bottomCollapsed ? 'Show bottom pane' : 'Hide bottom pane'"
                    @mousedown="stopEvent($event)"
                    @click="togglePane('bottom')">{{bottomCollapsed ? '\u25B2' : '\u25BC'}}</button>
        </div>
        <section class="workspace-pane workspace-layout-bottom" aria-label="Bottom pane" v-show="!bottomCollapsed">
            <div class="workspace-slot" data-workspace-slot="bottom"></div>
        </section>
    </div>`}),0]]);function ds(i,e){return i==null||i===""?`${e}px`:typeof i=="number"||/^\d+(\.\d+)?$/.test(String(i))?`${i}px`:String(i)}function Dr(i,e=1){let t=Number(i);return Number.isFinite(t)&&t>0?Math.floor(t):e}var B=class{constructor(e){this.elementRef=e,this.columns=1,this.gap=12,this.autoFit=!1,this.minItemWidth=200,this.fill=!1,this.projected=!1,Re(e)}get layoutClass(){return{"grid-layout":!0,"is-fill":this.fill===!0||this.fill==="true"||this.fill===""}}get gridStyle(){let e=this.autoFit===!0||this.autoFit==="true"||this.autoFit===""?`repeat(auto-fit, minmax(${ds(this.minItemWidth,200)}, 1fr))`:typeof this.columns=="string"&&!/^\d+$/.test(this.columns.trim())?this.columns:`repeat(${Dr(this.columns,1)}, minmax(0, 1fr))`,t=ds(this.gap,12),s={gridTemplateColumns:e,gap:t,rowGap:ds(this.rowGap??this.gap,12),columnGap:ds(this.columnGap??this.gap,12)};if(this.rows!==void 0&&this.rows!==null&&this.rows!==""&&(s.gridTemplateRows=typeof this.rows=="string"&&!/^\d+$/.test(this.rows)?this.rows:`repeat(${Dr(this.rows,1)}, minmax(0, auto))`),this.areas){let r=Array.isArray(this.areas)?this.areas:String(this.areas).split("|");s.gridTemplateAreas=r.map(n=>`"${String(n).trim()}"`).join(" ")}return this.flow&&(s.gridAutoFlow=String(this.flow)),this.alignItems&&(s.alignItems=String(this.alignItems)),this.justifyItems&&(s.justifyItems=String(this.justifyItems)),s}onAfterViewInit(){Re(this.itemsRef),this.mountProjectedContent()}mountProjectedContent(){if(this.projected)return;let e=this.itemsRef?.nativeElement;if(!e)return;let s=(e.closest?.("grid-layout")||e.parentElement?.parentElement)?.[_e]||[];s.length&&(s.forEach(r=>{r&&typeof e.appendChild=="function"&&e.appendChild(r)}),this.projected=!0)}};Reflect.metadata("design:type",Object)(B.prototype,"columns");Reflect.metadata("design:type",Object)(B.prototype,"rows");Reflect.metadata("design:type",Object)(B.prototype,"gap");Reflect.metadata("design:type",Object)(B.prototype,"rowGap");Reflect.metadata("design:type",Object)(B.prototype,"columnGap");Reflect.metadata("design:type",Object)(B.prototype,"autoFit");Reflect.metadata("design:type",Object)(B.prototype,"minItemWidth");Reflect.metadata("design:type",Object)(B.prototype,"areas");Reflect.metadata("design:type",Object)(B.prototype,"flow");Reflect.metadata("design:type",String)(B.prototype,"alignItems");Reflect.metadata("design:type",String)(B.prototype,"justifyItems");Reflect.metadata("design:type",Object)(B.prototype,"fill");Reflect.metadata("design:type",g)(B.prototype,"itemsRef");Reflect.metadata("design:paramtypes",[g])(B);u(B,[[l(),1,"columns"],[l(),1,"rows"],[l(),1,"gap"],[l(),1,"rowGap"],[l(),1,"columnGap"],[l(),1,"autoFit"],[l(),1,"minItemWidth"],[l(),1,"areas"],[l(),1,"flow"],[l(),1,"alignItems"],[l(),1,"justifyItems"],[l(),1,"fill"],[et("items",g),1,"itemsRef"],[N(),3,void 0,0],[C({selector:"grid-layout",template:`
    <div class="grid-layout" [class]="layoutClass" [style]="gridStyle">
        <div class="grid-layout-items" #items></div>
    </div>`}),0]]);var Z=class{constructor(e){this.elementRef=e,this.projected=!1,Re(e)}get itemStyle(){let e={};return this.span!==void 0&&this.span!==null&&this.span!==""?e.gridColumn=this.start?`${this.start} / span ${this.span}`:`span ${this.span}`:(this.start||this.end)&&(e.gridColumn=`${this.start||"auto"} / ${this.end||"auto"}`),this.rowSpan!==void 0&&this.rowSpan!==null&&this.rowSpan!==""?e.gridRow=this.rowStart?`${this.rowStart} / span ${this.rowSpan}`:`span ${this.rowSpan}`:(this.rowStart||this.rowEnd)&&(e.gridRow=`${this.rowStart||"auto"} / ${this.rowEnd||"auto"}`),this.area&&(e.gridArea=String(this.area)),e}onAfterViewInit(){Re(this.contentRef),this.mountProjectedContent()}mountProjectedContent(){if(this.projected)return;let e=this.contentRef?.nativeElement;if(!e)return;((e.closest?.("grid-item")||e.parentElement?.parentElement)?.[_e]||[]).forEach(r=>{r&&typeof e.appendChild=="function"&&e.appendChild(r)}),this.projected=!0}};Reflect.metadata("design:type",Object)(Z.prototype,"span");Reflect.metadata("design:type",Object)(Z.prototype,"rowSpan");Reflect.metadata("design:type",Object)(Z.prototype,"start");Reflect.metadata("design:type",Object)(Z.prototype,"end");Reflect.metadata("design:type",Object)(Z.prototype,"rowStart");Reflect.metadata("design:type",Object)(Z.prototype,"rowEnd");Reflect.metadata("design:type",String)(Z.prototype,"area");Reflect.metadata("design:type",g)(Z.prototype,"contentRef");Reflect.metadata("design:paramtypes",[g])(Z);u(Z,[[l(),1,"span"],[l(),1,"rowSpan"],[l(),1,"start"],[l(),1,"end"],[l(),1,"rowStart"],[l(),1,"rowEnd"],[l(),1,"area"],[et("content",g),1,"contentRef"],[N(),3,void 0,0],[C({selector:"grid-item",template:`
    <div class="grid-item" [style]="itemStyle">
        <div class="grid-item-content" #content></div>
    </div>`}),0]]);var qs=["light","dark","solarized","high-contrast"];function Tr(i){return typeof i=="string"&&i.trim().length>0}function Xn(i){return i==="dark"||i==="solarized"||i==="high-contrast"}var Ft=class{constructor(){this.theme="light",this.listeners=new Set}get current(){return this.theme}get available(){return qs.slice()}get isDark(){return Xn(this.theme)}setTheme(e){let t=Tr(e)?e:"light";t!==this.theme&&(this.theme=t,this.emit())}toggle(e=qs){let t=e?.length?e:qs,s=t.indexOf(this.theme);return this.setTheme(t[(s+1)%t.length]),this.theme}subscribe(e){return this.listeners.add(e),e(this.theme),()=>this.listeners.delete(e)}applyTo(e){eo(e,this.theme)}onDestroy(){this.listeners.clear()}emit(){for(let e of[...this.listeners])e(this.theme)}};u(Ft,[[L(),0]]);function eo(i,e){if(!i)return;let t=i.documentElement||i.body;if(!t||typeof t.setAttribute!="function")return;let s=Tr(e)?e:"light";t.setAttribute("data-theme",s),t.setAttribute("data-agent-theme",s),t.setAttribute("data-workspace-theme",s)}function ft(i){return i==null||i===""||Array.isArray(i)&&i.length===0}function Or(...i){let e=i.filter(Boolean).reduce((t,s)=>({...t,...s}),{});return Object.keys(e).length?e:null}var De={required(i){return ft(i.value)?{required:!0}:null},requiredTrue(i){return i.value===!0?null:{required:!0}},email(i){return ft(i.value)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(i.value))?null:{email:!0}},minLength(i){return e=>ft(e.value)||String(e.value).length>=i?null:{minlength:{requiredLength:i,actualLength:String(e.value).length}}},maxLength(i){return e=>ft(e.value)||String(e.value).length<=i?null:{maxlength:{requiredLength:i,actualLength:String(e.value).length}}},pattern(i){let e=i instanceof RegExp?i:new RegExp(i);return t=>ft(t.value)?null:(e.lastIndex=0,e.test(String(t.value))?null:{pattern:{requiredPattern:e.toString(),actualValue:t.value}})},min(i){return e=>ft(e.value)||Number(e.value)>=i?null:{min:{min:i,actual:e.value}}},max(i){return e=>ft(e.value)||Number(e.value)<=i?null:{max:{max:i,actual:e.value}}},nullValidator(){return null},compose(i){return e=>Or(...i.filter(t=>typeof t=="function").map(t=>t(e)))},composeAsync(i){return async e=>{let t=await Promise.all(i.filter(s=>typeof s=="function").map(s=>s(e)));return Or(...t)}}};function zt(i){return i==null?[]:Array.isArray(i)?i:[i]}var qt=class{constructor(e,t){this._status="VALID",this._errors=null,this._validators=[],this._asyncValidators=[],this._asyncSequence=0,this.valueChanges=new ge,this.statusChanges=new ge,this.touched=!1,this.dirty=!1,this._validators=zt(e),this._asyncValidators=zt(t)}get value(){return this._value}get status(){return this._status}get errors(){return this._errors}get valid(){return this._status==="VALID"}get invalid(){return this._status==="INVALID"}get pending(){return this._status==="PENDING"}get disabled(){return this._status==="DISABLED"}get parent(){return this._parent}setParent(e){this._parent=e}patchValue(e,t){this.setValue(e,t)}setValidators(e){this._validators=zt(e),this.updateValueAndValidity()}addValidators(e){this._validators=[...this._validators,...zt(e)],this.updateValueAndValidity()}clearValidators(){this._validators=[],this.updateValueAndValidity()}setAsyncValidators(e){this._asyncValidators=zt(e),this.updateValueAndValidity()}markAsTouched(){this.touched=!0}markAsUntouched(){this.touched=!1}markAsDirty(){this.dirty=!0}markAsPristine(){this.dirty=!1}markAllAsTouched(){this.markAsTouched()}reset(e,t={emitEvent:!0}){this.markAsPristine(),this.markAsUntouched(),this.setValue(e,t)}disable(e={emitEvent:!0}){this.setDisabled(!0,e)}enable(e={emitEvent:!0}){this.setDisabled(!1,e)}setDisabled(e,t){if(this._status=e?"DISABLED":"VALID",e)this._errors=null;else{this.updateValueAndValidity(t);return}t.emitEvent!==!1&&this.statusChanges.emit(this._status)}updateValueAndValidity(e={emitEvent:!0}){if(this._status==="DISABLED"){this._errors=null,e.emitEvent!==!1&&this.statusChanges.emit(this._status);return}let t=this.runSyncValidators();if(this._asyncValidators.length){this._status="PENDING",this._errors=t,e.emitEvent!==!1&&this.statusChanges.emit(this._status);let s=++this._asyncSequence;Promise.all(this._asyncValidators.map(r=>r(this))).then(r=>{s===this._asyncSequence&&(this._errors=this.mergeErrors(t,...r),this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))}).catch(()=>{s===this._asyncSequence&&(this._errors={...t||{},async:!0},this._status="INVALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))});return}this._errors=t,this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e)}notifyParent(e){!e.onlySelf&&this._parent&&this._parent.updateValueAndValidity({...e,onlySelf:!1})}runSyncValidators(){return this.mergeErrors(...this._validators.map(e=>e(this)))}mergeErrors(...e){let t=e.filter(Boolean).reduce((s,r)=>({...s,...r}),{});return Object.keys(t).length?t:null}},dt=class extends qt{constructor(e=null,t,s){let r=Ks(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??s),this._value=e,this.updateValueAndValidity({emitEvent:!1})}setValue(e,t={emitEvent:!0}){this._value=e,t.emitEvent!==!1&&this.valueChanges.emit(e),this.updateValueAndValidity(t)}reset(e=null,t={emitEvent:!0}){super.reset(e,t)}},mt=class extends qt{constructor(e={},t,s){let r=Ks(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??s),this.controls=e,Object.values(e).forEach(n=>n.setParent(this)),this._value=this.reduceValue(),this.updateValueAndValidity({emitEvent:!1})}get(e){let t=String(e||"").split(".").filter(Boolean),s=this;for(let r of t){if(!s)return null;s=s.controls?.[r]}return s||null}addControl(e,t){t.setParent(this),this.controls[e]=t,this.updateValueAndValidity()}removeControl(e){this.controls[e]&&(delete this.controls[e],this.updateValueAndValidity())}setControl(e,t){this.controls[e]&&(this.controls[e]=t,t.setParent(this),this.updateValueAndValidity())}contains(e){return!!this.controls[e]}updateValueAndValidity(e={emitEvent:!0}){this._value=this.reduceValue(),super.updateValueAndValidity(e)}setValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(s=>this.controls[s].setValue(e?.[s],{emitEvent:!1,onlySelf:!0})),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}patchValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(s=>{e&&s in e&&this.controls[s].setValue(e[s],{emitEvent:!1,onlySelf:!0})}),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}reset(e={},t={emitEvent:!0}){super.reset(e,t)}markAllAsTouched(){this.markAsTouched(),Object.values(this.controls).forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=Object.keys(this.controls).reduce((t,s)=>{let r=this.controls[s].errors;return r&&(t[s]=r),t},{});return this.mergeErrors(super.runSyncValidators(),Object.keys(e).length?e:null)}reduceValue(){return Object.keys(this.controls).reduce((e,t)=>(e[t]=this.controls[t].value,e),{})}},Kt=class extends qt{constructor(e=[],t,s){let r=Ks(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??s),this.controls=[...e],this.controls.forEach(n=>n.setParent(this)),this._value=this.controls.map(n=>n.value),this.updateValueAndValidity({emitEvent:!1})}updateValueAndValidity(e={emitEvent:!0}){this._value=this.controls.map(t=>t.value),super.updateValueAndValidity(e)}at(e){return this.controls[e]||null}push(e){e.setParent(this),this.controls.push(e),this.updateValueAndValidity()}removeAt(e){this.controls.splice(e,1),this.updateValueAndValidity()}clear(){this.controls.length=0,this.updateValueAndValidity()}setValue(e,t={emitEvent:!0}){this.controls.forEach((s,r)=>s.setValue(e?.[r],{emitEvent:!1,onlySelf:!0})),this._value=this.controls.map(s=>s.value),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}markAllAsTouched(){this.markAsTouched(),this.controls.forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=this.controls.some(t=>t.errors)?{children:this.controls.map(t=>t.errors)}:null;return this.mergeErrors(super.runSyncValidators(),e)}};function Ks(i){return!!i&&typeof i=="object"&&!Array.isArray(i)&&("validators"in i||"asyncValidators"in i)}var Tt=class{control(e=null,t,s){return new dt(e,t,s)}group(e,t,s){let r={};return Object.keys(e).forEach(n=>{let o=e[n];r[n]=Array.isArray(o)?this.control(o[0],o[1],o[2]):o instanceof dt||o instanceof mt||o instanceof Kt?o:this.control(o)}),new mt(r,t,s)}array(e,t,s){let r=e.map(n=>Array.isArray(n)?this.control(n[0],n[1],n[2]):n);return new Kt(r,t,s)}};u(Tt,[[L(),0]]);var Te=class{constructor(e){this.elementRef=e,this.handleInput=()=>{if(!this.control)return;let s=this.elementRef.nativeElement?.value;this.control.setValue(s),this.control.markAsDirty(),this.control.markAsTouched()};let t=this.elementRef?.nativeElement;t?.addEventListener?.("input",this.handleInput),t?.addEventListener?.("change",this.handleInput)}set formControl(e){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe(),this.control=e,e&&(this.writeValue(e.value),this.subscription=e.valueChanges.subscribe(t=>this.writeValue(t)),this.statusSubscription=e.statusChanges.subscribe(()=>this.syncValidity()),this.syncValidity())}get formControl(){return this.control}onDestroy(){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe();let e=this.elementRef?.nativeElement;e?.removeEventListener?.("input",this.handleInput),e?.removeEventListener?.("change",this.handleInput)}writeValue(e){let t=this.elementRef?.nativeElement;t&&t.value!==e&&(t.value=e??"")}syncValidity(){let e=this.elementRef?.nativeElement,t=!!this.control?.invalid;e?.setAttribute?.("aria-invalid",t?"true":"false"),t?e?.classList?.add?.("is-invalid"):e?.classList?.remove?.("is-invalid")}};Reflect.metadata("design:paramtypes",[g])(Te);Reflect.metadata("design:paramtypes",[Object])(Te.prototype,"formControl");u(Te,[[l(),1,"formControl"],[E({selector:"[formControl]"}),0]]);var qe=class{set formGroup(e){this.group=e}get formGroup(){return this.group}get value(){return this.group?.value}get valid(){return this.group?.valid!==!1}};Reflect.metadata("design:paramtypes",[Object])(qe.prototype,"formGroup");u(qe,[[l(),1,"formGroup"],[E({selector:"[formGroup]"}),0]]);var Hs=class{};u(Hs,[[ye({providers:[Tt,Te,qe],declarations:[Te,qe],exports:[Tt,Te,qe]}),0]]);var to={required:"Required",requiredTrue:"Required",email:"Invalid email address",url:"Invalid URL",min:"Value is too small",max:"Value is too large",minlength:"Too short",maxlength:"Too long",pattern:"Invalid format",json:"Invalid JSON",number:"Must be a number",integer:"Must be an integer"};function ms(i){return i==null||i===""||Array.isArray(i)&&i.length===0}function so(i){return ms(i.value)||Number.isFinite(Number(i.value))?null:{number:!0}}function io(i){if(ms(i.value))return null;let e=Number(i.value);return Number.isFinite(e)&&Math.floor(e)===e?null:{integer:!0}}function ro(i){return ms(i.value)||/^(https?:\/\/|\/)[^\s]+$/i.test(String(i.value))?null:{url:!0}}function no(i){if(ms(i.value)||typeof i.value!="string")return null;try{return JSON.parse(i.value),null}catch{return{json:!0}}}function oo(i){let e=[],t=new Set,s=r=>{t.has(r.type)||(t.add(r.type),e.push(r))};return(i.rules||[]).forEach(r=>{s(typeof r=="string"?{type:r}:r)}),i.required&&s({type:"required"}),(i.type==="number"||i.type==="range")&&s({type:"number"}),i.type==="email"&&s({type:"email"}),i.type==="url"&&s({type:"url"}),i.type==="json"&&s({type:"json"}),i.min!==void 0&&s({type:"min",value:i.min}),i.max!==void 0&&s({type:"max",value:i.max}),i.minLength!==void 0&&s({type:"minLength",value:i.minLength}),i.maxLength!==void 0&&s({type:"maxLength",value:i.maxLength}),i.pattern&&s({type:"pattern",value:i.pattern}),e}function ao(i){switch(i.type){case"required":return De.required;case"requiredTrue":return De.requiredTrue;case"email":return De.email;case"url":return ro;case"min":return De.min(Number(i.value));case"max":return De.max(Number(i.value));case"minLength":return De.minLength(Number(i.value));case"maxLength":return De.maxLength(Number(i.value));case"pattern":try{return De.pattern(new RegExp(String(i.value)))}catch{return}case"json":return no;case"number":return so;case"integer":return io;default:return}}function Vr(i){let e=[],t={};return oo(i).forEach(s=>{let r=ao(s);if(r&&(e.push(r),s.message)){let n=s.type==="minLength"?"minlength":s.type==="maxLength"?"maxlength":s.type;t[n]=s.message}}),{validators:e,messages:t}}function Nr(i,e,t,s){if(!e)return"";let r=Object.keys(e);for(let n of r){let o=i.errorMessages?.[n]||t?.[n]||s?.[n]||to[n];if(o)return o}return""}function lo(i){return{...i,key:String(i?.key??""),type:i?.type||"text",options:Array.isArray(i?.options)?i.options:void 0,rules:Array.isArray(i?.rules)?i.rules:void 0}}function co(i){let e=i;return typeof e=="string"&&(e=JSON.parse(e)),Array.isArray(e)&&(e={fields:e}),!e||typeof e!="object"?{fields:[]}:{...e,fields:(Array.isArray(e.fields)?e.fields:[]).filter(t=>t&&t.key).map(lo)}}function ho(i,e){return e.equals!==void 0?String(i)===String(e.equals):e.notEquals!==void 0?String(i)!==String(e.notEquals):e.in?e.in.map(s=>String(s)).includes(String(i)):e.truthy!==void 0?e.truthy?!!i:!i:e.falsy!==void 0?e.falsy?!i:!!i:!0}function po(i,e){return!!i&&Object.prototype.hasOwnProperty.call(i,e)}var uo=0,M=class{constructor(){this.classPrefix="df",this.showActions=!1,this.submitLabel="",this.resetLabel="",this.resetFieldLabel="Reset to default",this.emptyLabel="No fields",this.messages={},this._schema={fields:[]},this._value={},this._contextKey="",this.formSignature="",this.schemaSignature="",this.valueSignature="",this.schemaError="",this.validationErrors={},this.ruleMessages={},this.submitAttempted=!1,this.valueVersion=0,this.destroyed=!1,this.syncQueued=!1,this.syncMode="none",this.formId=`dynamic-form-${++uo}`}set schema(e){let t,s="";try{t=co(e)}catch(n){t={fields:[]},s=`Invalid form schema: ${n.message}`}let r=JSON.stringify(t);r===this.schemaSignature&&s===this.schemaError||(this.schemaSignature=r,this.schemaError=s,this._schema=t,Promise.resolve().then(()=>{this.destroyed||this.applySchema()}))}get schema(){return this._schema}set value(e){let t=e&&typeof e=="object"?e:{},s=JSON.stringify(t);s!==this.valueSignature&&(this.valueSignature=s,this._value=t,this.scheduleSync(!1))}get value(){return this._value}set contextKey(e){let t=String(e??"");t!==this._contextKey&&(this._contextKey=t,this.scheduleSync(!0))}get contextKey(){return this._contextKey}scheduleSync(e){e?this.syncMode="force":this.syncMode==="none"&&(this.syncMode="soft"),!this.syncQueued&&(this.syncQueued=!0,Promise.resolve().then(()=>{this.syncQueued=!1;let t=this.syncMode;this.syncMode="none",this.destroyed||this.syncValues(t==="force")}))}get submitText(){return this.submitLabel||this._schema?.submitLabel||"Submit"}get resetText(){return this.resetLabel||this._schema?.resetLabel||"Reset"}get formValid(){return!!this.form?.valid}get isDirty(){return!!this.form?.dirty}get visibleGroups(){this.valueVersion;let e=[],t={};return this.schemaFields().forEach(s=>{if(s.hidden||s.type==="hidden"||!this.isVisible(s))return;let r=s.group||"",n=t[r];n===void 0&&(n=e.length,t[r]=n,e.push({label:r,fields:[]})),e[n].fields.push(s)}),e}schemaFields(){return this._schema?.fields||[]}applySchema(){let e=this.schemaFields(),t=e.map(n=>[n.key,n.type,n.required?1:0,n.defaultValue===void 0?"":JSON.stringify(n.defaultValue),JSON.stringify(n.rules||""),n.min??"",n.max??"",n.minLength??"",n.maxLength??"",n.pattern||""].join(":")).join("|");if(this.form&&t===this.formSignature){this.syncValues(!1);return}let s={};this.ruleMessages={},e.forEach(n=>{let o=Vr(n);this.ruleMessages[n.key]=o.messages,s[n.key]=new dt(this.initialValue(n),o.validators)});let r=new mt(s);r[x]=!0,Object.values(s).forEach(n=>{n[x]=!0}),this.form=r,this.formSignature=t,this.valueVersion+=1,this.refreshErrors()}syncValues(e){if(!this.form){this.applySchema();return}this.schemaFields().forEach(t=>{let s=this.form?.get(t.key);if(!s)return;let r=this.initialValue(t);e?s.reset(r,{emitEvent:!1}):!s.dirty&&s.value!==r&&s.setValue(r,{emitEvent:!1})}),this.valueVersion+=1,this.refreshErrors()}refreshErrors(){let e={};this.schemaFields().forEach(t=>{e[t.key]=this.form?.get(t.key)?.errors||null}),this.validationErrors=e}fieldDisplayValue(e,t){return e.type==="json"?typeof t=="string"?t:t==null?"":JSON.stringify(t,null,2):e.type==="checkbox"||e.type==="switch"?!!t:t??""}initialValue(e){let t=this._value||{},s=po(t,e.key)?t[e.key]:e.defaultValue;return this.fieldDisplayValue(e,s)}resetValue(e){return this.fieldDisplayValue(e,e.defaultValue)}coerceValue(e,t){return e.type==="checkbox"||e.type==="switch"?!!t:e.type==="number"||e.type==="range"?t===""||t===void 0||t===null?"":Number(t):t}updateValue(e,t){let s=this.form?.get(e.key);if(!s)return;s.setValue(this.coerceValue(e,t)),s.markAsDirty(),s.markAsTouched(),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:s.errors};let r={key:e.key,value:s.value,field:e,valid:s.valid,errors:s.errors};this.changeAction?.(r),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}changeText(e,t){this.updateValue(e,t?.target?.value)}changeBoolean(e,t){this.updateValue(e,!!t?.target?.checked)}chooseOption(e,t){this.updateValue(e,t)}blurField(e){this.blurAction?.(e)}resetField(e){let t=this.form?.get(e.key);t&&(t.reset(this.resetValue(e),{emitEvent:!1}),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:t.errors},this.changeAction?.({key:e.key,value:t.value,field:e,valid:t.valid,errors:t.errors}),this.validityAction?.(!!this.form?.valid,this.form?.errors||null))}reset(e=!0){if(this.schemaFields().forEach(t=>{let s=t.defaultValue!==void 0?this.resetValue(t):this.initialValue(t);this.form?.get(t.key)?.reset(s,{emitEvent:!1})}),this.submitAttempted=!1,this.valueVersion+=1,this.refreshErrors(),e){let t=this.getValue();this.resetAction?.(t),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}return this.getValue()}resetForm(){this.reset(!0)}submit(){this.submitAttempted=!0,this.form?.markAllAsTouched(),this.refreshErrors();let e={value:this.getValue(),valid:!!this.form?.valid,errors:this.form?.errors||null};return this.submitAction?.(e),e}validate(){return{valid:!!this.form?.valid,value:this.getValue(),errors:this.form?.errors||null}}getValue(){let e={};return this.schemaFields().forEach(t=>{let s=this.form?.get(t.key),r=s?s.value:this.initialValue(t);switch(t.type){case"number":case"range":e[t.key]=r===""||r===void 0||r===null?"":Number(r);break;case"checkbox":case"switch":e[t.key]=r===!0;break;case"json":if(typeof r=="string"&&r.trim()!=="")try{e[t.key]=JSON.parse(r)}catch{e[t.key]=r}else e[t.key]=r;break;default:e[t.key]=r;break}}),e}setValue(e){this._value=e&&typeof e=="object"?e:{},this.valueSignature=JSON.stringify(this._value),this.valueVersion+=1,this.syncValues(!0)}patchValue(e){this.setValue({...this._value,...e||{}})}sameOptionValue(e,t){return String(e)===String(t)}isVisible(e){if(!e.visibleWhen)return!0;let t=this.form?.get(e.visibleWhen.key),s=t?t.value:this._value?.[e.visibleWhen.key];return ho(s,e.visibleWhen)}fieldLabel(e){return e.label||e.key}fieldValue(e){return this.valueVersion,this.form?.get(e.key)?.value??this.initialValue(e)}fieldChecked(e){return this.fieldValue(e)===!0}isRequired(e){return e.required===!0||(e.rules||[]).some(t=>{let s=typeof t=="string"?t:t?.type;return s==="required"||s==="requiredTrue"})}canReset(e){return e.defaultValue!==void 0&&!e.readonly&&!e.disabled}errorFor(e){let t=this.validationErrors[e.key],s=this.form?.get(e.key);if(!s||s.valid||!(s.dirty||s.touched||this.submitAttempted))return"";let r={...this._schema?.messages||{},...this.messages||{}};return Nr(e,t,this.ruleMessages[e.key],r)}encodeValue(e){return encodeURIComponent(String(this.fieldValue(e)??""))}suggestionData(e){return encodeURIComponent(JSON.stringify(e.suggestions||[]))}htmlType(e){switch(e.type){case"number":return"number";case"range":return"range";case"password":case"email":case"url":case"tel":case"search":case"date":case"time":case"datetime-local":case"month":case"week":case"color":return e.type;default:return"text"}}isTextInput(e){return["text","password","email","url","tel","search","date","time","datetime-local","month","week","color"].includes(e.type)}isNumberInput(e){return e.type==="number"||e.type==="range"}isBooleanInput(e){return e.type==="checkbox"||e.type==="switch"}isOptionInput(e){return e.type==="select"||e.type==="radio"}isTextareaInput(e){return e.type==="textarea"||e.type==="json"}isCodeInput(e){return e.type==="code"}formClass(){return`${this.classPrefix}-form dynamic-form`}schemaErrorClass(){return`${this.classPrefix}-schema-error`}groupClass(){return`${this.classPrefix}-field-group`}groupTitleClass(){return`${this.classPrefix}-field-group-title`}noFieldsClass(){return`${this.classPrefix}-no-fields`}fieldClass(e){return[`${this.classPrefix}-field`,e.fieldClass||""].filter(Boolean).join(" ")}labelRowClass(){return`${this.classPrefix}-field-label-row`}labelClass(){return`${this.classPrefix}-field-label`}requiredClass(){return`${this.classPrefix}-field-required`}resetClass(){return`${this.classPrefix}-field-reset`}inputClass(e){return[`${this.classPrefix}-input`,e.inputClass||""].filter(Boolean).join(" ")}textareaClass(e){return[`${this.classPrefix}-textarea`,e.inputClass||""].filter(Boolean).join(" ")}codeClass(e){return[`${this.classPrefix}-textarea`,`${this.classPrefix}-code-editor`,e.inputClass||""].filter(Boolean).join(" ")}checkboxRowClass(){return`${this.classPrefix}-checkbox-row`}optionsClass(){return`${this.classPrefix}-options`}optionClass(e,t){return[`${this.classPrefix}-option`,this.sameOptionValue(t.value,this.fieldValue(e))?"is-selected":"",t.disabled||e.disabled||e.readonly?"is-disabled":""].filter(Boolean).join(" ")}errorClass(){return`${this.classPrefix}-field-error`}hintClass(){return`${this.classPrefix}-field-hint`}actionsClass(){return`${this.classPrefix}-actions`}buttonClass(e){return[`${this.classPrefix}-btn`,e?`${this.classPrefix}-btn-primary`:""].filter(Boolean).join(" ")}onDestroy(){this.destroyed=!0}};Reflect.metadata("design:type",Object)(M.prototype,"classPrefix");Reflect.metadata("design:type",Object)(M.prototype,"showActions");Reflect.metadata("design:type",Object)(M.prototype,"submitLabel");Reflect.metadata("design:type",Object)(M.prototype,"resetLabel");Reflect.metadata("design:type",Object)(M.prototype,"resetFieldLabel");Reflect.metadata("design:type",Object)(M.prototype,"emptyLabel");Reflect.metadata("design:type",Object)(M.prototype,"messages");Reflect.metadata("design:type",Function)(M.prototype,"changeAction");Reflect.metadata("design:type",Function)(M.prototype,"blurAction");Reflect.metadata("design:type",Function)(M.prototype,"submitAction");Reflect.metadata("design:type",Function)(M.prototype,"resetAction");Reflect.metadata("design:type",Function)(M.prototype,"validityAction");Reflect.metadata("design:paramtypes",[Object])(M.prototype,"schema");Reflect.metadata("design:paramtypes",[Object])(M.prototype,"value");Reflect.metadata("design:paramtypes",[String])(M.prototype,"contextKey");u(M,[[l(),1,"classPrefix"],[l(),1,"showActions"],[l(),1,"submitLabel"],[l(),1,"resetLabel"],[l(),1,"resetFieldLabel"],[l(),1,"emptyLabel"],[l(),1,"messages"],[l(),1,"changeAction"],[l(),1,"blurAction"],[l(),1,"submitAction"],[l(),1,"resetAction"],[l(),1,"validityAction"],[l(),1,"schema"],[l(),1,"value"],[l(),1,"contextKey"],[C({selector:"dynamic-form",template:`
    <div [class]="formClass()">
        <div [class]="schemaErrorClass()" v-if="schemaError">{{schemaError}}</div>
        <div v-else>
            <div [class]="noFieldsClass()" v-if="!visibleGroups.length">{{emptyLabel}}</div>
            <div [class]="groupClass()" v-for="group in visibleGroups">
                <div [class]="groupTitleClass()" v-if="group.label">{{group.label}}</div>
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="labelRowClass()" v-if="field.type !== 'hidden'">
                        <label [class]="labelClass()">{{fieldLabel(field)}}<span [class]="requiredClass()" v-if="isRequired(field)">*</span></label>
                        <button [class]="resetClass()" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">\u21BA</button>
                    </div>
                    <input v-if="isTextInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                        [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        [min]="field.min" [max]="field.max" [step]="field.step"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)" />
                    <input v-if="isNumberInput(field)" [class]="inputClass(field)" type="{{htmlType(field)}}"
                        [value]="fieldValue(field)" [placeholder]="field.placeholder || ''"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        [min]="field.min" [max]="field.max" [step]="field.step || 1"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)" />
                    <label v-if="isBooleanInput(field)" [class]="checkboxRowClass()">
                        <input type="checkbox" [checked]="fieldChecked(field)"
                            [disabled]="field.disabled || field.readonly"
                            @change="changeBoolean(field, $event)" />
                        <span v-if="field.description">{{field.description}}</span>
                    </label>
                    <div v-if="isOptionInput(field)" [class]="optionsClass()" role="radiogroup"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}">
                        <label v-for="option in field.options" data-option-value="{{option.value}}"
                            [class]="optionClass(field, option)">
                            <input type="radio" name="{{formId}}-{{field.key}}"
                                [value]="option.value"
                                [checked]="sameOptionValue(option.value, fieldValue(field))"
                                [disabled]="field.disabled || field.readonly || option.disabled"
                                @change="chooseOption(field, option.value)" />
                            <span>{{option.label}}</span>
                        </label>
                    </div>
                    <textarea v-if="isTextareaInput(field)" [class]="textareaClass(field)"
                        [value]="fieldValue(field)" [rows]="field.rows || (field.type === 'json' ? 4 : 3)"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <textarea v-if="isCodeInput(field)" [class]="codeClass(field)"
                        data-dynamic-code="{{field.language || 'javascript'}}"
                        data-code-value="{{encodeValue(field)}}"
                        data-code-suggestions="{{suggestionData(field)}}"
                        [value]="fieldValue(field)" [rows]="field.rows || 8"
                        [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="errorClass()" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="hintClass()" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
            </div>
            <div [class]="actionsClass()" v-if="showActions">
                <button type="button" [class]="buttonClass(false)" @click="resetForm()">{{resetText}}</button>
                <button type="button" [class]="buttonClass(true)" @click="submit()">{{submitText}}</button>
            </div>
        </div>
    </div>`}),0]]);var X=class{constructor(e){this.elementRef=e,this._expanded=!1,this._locale="zh-CN",this._expandText="",this._collapseText="",this.expandedChange=new ge}get expanded(){return this._expanded}set expanded(e){this._expanded=e===""||e===!0||e==="true"}get locale(){return this._locale}set locale(e){this._locale=String(e||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get expandText(){return this._expandText||(this._locale==="en"?"Click to expand":"\u70B9\u51FB\u5C55\u5F00")}set expandText(e){this._expandText=String(e||"").trim()}get collapseText(){return this._collapseText||(this._locale==="en"?"Click to collapse":"\u70B9\u51FB\u6298\u53E0")}set collapseText(e){this._collapseText=String(e||"").trim()}get headerLines(){return this.collectProjectionSlot("panel-header")}get summaryLines(){return this.collectProjectionSlot("panel-summary")}get bodyLines(){return this.collectProjectionSlot("panel-body")}get hasSummary(){return this.summaryLines.length>0}get bodyVisible(){return!this.hasSummary||this._expanded}get toggleLabel(){return this._expanded?this.collapseText:this.expandText}get headerIndexes(){return this.indexes(this.headerLines)}get summaryIndexes(){return this.indexes(this._expanded?[]:this.summaryLines)}get bodyIndexes(){return this.indexes(this.bodyVisible?this.bodyLines:[])}headerLineAt(e){let t=this.headerLines[e]||"";return e===0&&this.hasSummary?`${this._expanded?"\u25BE":"\u25B8"} ${t}`:t}summaryLineAt(e){return this.summaryLines[e]||""}bodyLineAt(e){return this.bodyLines[e]||""}toggle(){this.hasSummary&&(this._expanded=!this._expanded,this.expandedChange.emit(this._expanded))}indexes(e){return Array.from({length:e.length},(t,s)=>s)}collectProjectionSlot(e){let t=[];return this.resolveProjectedContent().filter(s=>String(s.tagName||"").toLowerCase()===e).forEach(s=>this.collectContentText(s,t)),t}resolveProjectedContent(){let e=this.elementRef?.nativeElement?.[_e];return e?.length?e:[]}collectContentText(e,t){if(!e)return;if(e.nodeType===O.Text||e.nodeType===O.Comment){String(e.textContent||"").split(`
`).map(r=>r.trim()).filter(Boolean).forEach(r=>t.push(r));return}let s=e.childNodes;s?.length?s.forEach(r=>this.collectContentText(r,t)):String(e.textContent||"").split(`
`).map(r=>r.trim()).filter(Boolean).forEach(r=>t.push(r))}};Reflect.metadata("design:paramtypes",[g])(X);Reflect.metadata("design:paramtypes",[])(X.prototype,"expanded");Reflect.metadata("design:returntype",Boolean)(X.prototype,"expanded");Reflect.metadata("design:type",Object)(X.prototype,"expandedChange");Reflect.metadata("design:paramtypes",[])(X.prototype,"locale");Reflect.metadata("design:returntype",Object)(X.prototype,"locale");Reflect.metadata("design:paramtypes",[])(X.prototype,"expandText");Reflect.metadata("design:returntype",String)(X.prototype,"expandText");Reflect.metadata("design:paramtypes",[])(X.prototype,"collapseText");Reflect.metadata("design:returntype",String)(X.prototype,"collapseText");u(X,[[N(),3,void 0,0],[l(),1,"expanded"],[l(),1,"expandedChange"],[l(),1,"locale"],[l(),1,"expandText"],[l(),1,"collapseText"],[C({selector:"panel",template:`
    <div class="console-panel console-base-panel" >
        <label class="panel-header"  @click="toggle" v-for="index in headerIndexes">{{headerLineAt(index)}}</label>
        <label class="panel-summary"  @click="toggle" v-show="!expanded" v-for="index in summaryIndexes">{{summaryLineAt(index)}}</label>
        <label class="panel-body"  v-show="bodyVisible" v-for="index in bodyIndexes">{{bodyLineAt(index)}}</label>
        <label class="panel-toggle"  @click="toggle" v-show="hasSummary">{{toggleLabel}}</label>
    </div>`}),0]]);var Ot=class{};u(Ot,[[ye({providers:[Ft],declarations:[X,Fe,z,ze,ut,J,q,Ce,I,V,K,de,Ae,Q,me,U,$,B,Z,M],exports:[X,Fe,z,ze,ut,J,q,Ce,I,V,K,de,Ae,Q,me,U,$,B,Z,M]}),0]]);var Us=class{constructor(){this.entries=[],this.listeners=new Set,this.sequence=0,this.timers=new Map}get current(){return this.entries}show(e,t={}){let s=String(e||"").trim();if(!s)return"";let r=`toast-${++this.sequence}`,n={id:r,message:s,tone:t.tone||"info",createdAt:Date.now()};this.entries=[...this.entries,n],this.emit();let o=Number(t.durationMs??2200);if(Number.isFinite(o)&&o>0){let a=setTimeout(()=>this.dismiss(r),o);a.unref?.(),this.timers.set(r,a)}return r}dismiss(e){let t=this.timers.get(e);t&&(clearTimeout(t),this.timers.delete(e));let s=this.entries.filter(r=>r.id!==e);s.length!==this.entries.length&&(this.entries=s,this.emit())}clear(){for(let e of this.timers.values())clearTimeout(e);this.timers.clear(),this.entries.length&&(this.entries=[],this.emit())}subscribe(e){return this.listeners.add(e),e(this.entries),()=>this.listeners.delete(e)}onDestroy(){this.clear(),this.listeners.clear()}emit(){for(let e of[...this.listeners])e(this.entries)}};u(Us,[[L(),0]]);var Lr="tsdi-menu-bar-styles",fo=`
menu-bar {
    display: inline-block;
    position: relative;
}

.menu-bar {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.menu-bar-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border: 1px solid var(--menu-bar-border, #cbd5e1);
    border-radius: 6px;
    background: var(--menu-bar-surface, #ffffff);
    color: var(--menu-bar-text, #334155);
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;
}

.menu-bar-trigger:hover:not(:disabled),
.menu-bar[data-open="true"] .menu-bar-trigger {
    background: var(--menu-bar-hover, #f1f5f9);
}

.menu-bar-trigger:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.menu-bar-glyph {
    font-size: 13px;
    line-height: 1;
}

.menu-bar-caret {
    color: var(--menu-bar-muted, #64748b);
    font-size: 9px;
    line-height: 1;
}

.menu-bar-popup {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 60;
    min-width: 220px;
    max-width: min(340px, calc(100vw - 24px));
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--menu-bar-surface, #ffffff);
    border: 1px solid var(--menu-bar-border, #cbd5e1);
    border-radius: 10px;
    box-shadow: 0 18px 42px var(--menu-bar-shadow, rgba(15, 23, 42, 0.18));
}

.menu-bar-align-left .menu-bar-popup {
    left: 0;
    right: auto;
}

.menu-bar-popup[hidden] {
    display: none !important;
}

.menu-bar-entry {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.menu-bar-entry.has-submenu {
    position: relative;
}

.menu-bar-submenu {
    position: absolute;
    top: -6px;
    left: calc(100% + 2px);
    z-index: 61;
    display: none;
    flex-direction: column;
    gap: 1px;
    min-width: 180px;
    max-width: min(280px, calc(100vw - 24px));
    padding: 6px;
    background: var(--menu-bar-surface, #ffffff);
    border: 1px solid var(--menu-bar-border, #cbd5e1);
    border-radius: 10px;
    box-shadow: 0 18px 42px var(--menu-bar-shadow, rgba(15, 23, 42, 0.18));
}

.menu-bar-align-right .menu-bar-submenu {
    left: auto;
    right: calc(100% + 2px);
}

.menu-bar-entry.has-submenu:hover .menu-bar-submenu,
.menu-bar-entry.has-submenu:focus-within .menu-bar-submenu {
    display: flex;
}

.menu-bar-item-caret {
    flex: 0 0 auto;
    color: var(--menu-bar-muted, #64748b);
    font-size: 10px;
    line-height: 1;
}

.menu-bar-group-title {
    padding: 5px 9px 3px;
    color: var(--menu-bar-muted, #64748b);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.menu-bar-separator {
    height: 1px;
    margin: 4px 2px;
    background: var(--menu-bar-separator, #e2e8f0);
}

.menu-bar-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--menu-bar-text, #334155);
    font-size: 12px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
}

.menu-bar-item:hover:not(:disabled) {
    background: var(--menu-bar-hover, #f1f5f9);
}

.menu-bar-item:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.menu-bar-item.is-danger {
    color: var(--menu-bar-danger, #dc2626);
}

.menu-bar-item.is-checked {
    color: var(--menu-bar-accent, #2563eb);
}

.menu-bar-item-icon {
    flex: 0 0 16px;
    width: 16px;
    text-align: center;
}

.menu-bar-item-label {
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.menu-bar-item-shortcut {
    flex: 0 0 auto;
    color: var(--menu-bar-muted, #64748b);
    font-size: 10px;
}

.menu-bar-item-check {
    flex: 0 0 auto;
    color: var(--menu-bar-accent, #2563eb);
}
`;function mm(i){if(!i||typeof i.createElement!="function"||!i.head||i.getElementById&&i.getElementById(Lr))return;let e=i.createElement("style");e.setAttribute("id",Lr),e.textContent=fo,i.head.appendChild(e)}var S=i=>new Set(i.trim().split(/\s+/).filter(Boolean)),gm=S(`
    async await break case catch class const continue debugger default delete do else export extends
    false finally for from function get if import in instanceof interface let new null of return set
    static super switch this throw true try type typeof undefined var void while with yield
    implements namespace private protected public readonly declare abstract as satisfies keyof infer
    never unknown any boolean number string symbol bigint object
`),bm=S(`
    and as assert async await break case class continue def del elif else except finally for from
    global if import in is lambda match nonlocal not or pass raise return try while with yield
`),vm=S("True False None NotImplemented Ellipsis self cls"),wm=S(`
    break case chan const continue default defer else fallthrough for func go goto if import
    interface map package range return select struct switch type var
`),xm=S("true false nil iota"),Rm=S(`
    as async await break const continue crate dyn else enum extern false fn for if impl in let loop
    match mod move mut pub ref return self Self static struct super trait true type unsafe use where
    while yield
`),Cm=S("None Some Ok Err"),Em=S(`
    abstract assert break case catch class const continue default do else enum extends final finally
    for goto if implements import instanceof interface native new package private protected public
    return static strictfp super switch synchronized this throw throws transient try volatile while
    var record sealed permits non-sealed yield
`),km=S("true false null"),_m=S(`
    abstract as async await base break case catch checked class const continue default delegate do
    else enum event explicit extern finally fixed for foreach goto if implicit in interface internal
    is lock namespace new operator out override params private protected public readonly record ref
    return sealed sizeof stackalloc static struct switch this throw try typeof unchecked unsafe
    using virtual volatile while yield
`),Sm=S("true false null"),Am=S(`
    auto break case char const continue default do double else enum extern float for goto if inline
    int long register restrict return short signed sizeof static struct switch typedef union unsigned
    void volatile while class namespace template typename using virtual public private protected
    new delete nullptr true false constexpr noexcept override final
`),Dm=S(`
    as break class continue do else false for fun if in interface is null object package return
    super this throw true try typealias typeof val var when while by catch constructor delegate
    dynamic field file finally get import init param property receiver set setparam where actual
    abstract annotation companion const crossinline data enum expect external final infix inline
    inner internal lateinit noinline open operator out override private protected public reified
    sealed suspend tailrec vararg
`),Tm=S(`
    as associatedtype break case catch class continue default defer deinit do else enum extension
    fallthrough false fileprivate for func guard if import in init inout internal is let nil open
    operator private protocol public repeat rethrows return self Self static struct subscript super
    switch throw throws true try typealias var where while async await actor some any
`),Om=S(`
    alias and begin break case class def defined do else elsif end ensure false for if in module
    next nil not or redo rescue retry return self super then true undef unless until when while yield
`),Vm=S(`
    abstract and array as break callable case catch class clone const continue declare default do
    echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends
    final finally fn for foreach function global goto if implements include include_once instanceof
    insteadof interface isset list match namespace new or print private protected public readonly
    require require_once return static switch throw trait try unset use var while xor yield
`),Nm=S("true false null TRUE FALSE NULL"),Lm=S(`
    add all alter and any as asc begin between by case check column commit constraint create cross
    database default delete desc distinct drop else end escape except exists foreign from full group
    having if in index inner insert intersect into is join key left like limit not null offset on or
    order outer primary references right rollback row select set table then to transaction union
    unique update values view when where with
`),Im=S(`
    break case cd continue do done echo elif else esac eval exec exit export false fi for function
    if in local read readonly return select set shift source then true unset until while
`),jm=S("true false null yes no on off ~"),Mm=S("true false"),Pm=S(`
    FROM RUN CMD LABEL MAINTAINER EXPOSE ENV ADD COPY ENTRYPOINT VOLUME USER WORKDIR ARG ONBUILD
    STOPSIGNAL HEALTHCHECK SHELL AS
`),$m=S(`
    and break do else elseif end false for function goto if in local nil not or repeat return then
    true until while
`),Bm=S(`
    abstract as assert async await base break case catch class const continue covariant default
    deferred do dynamic else enum export extends extension external factory false final finally for
    Function get hide if implements import in interface is late library mixin new null on operator
    part required rethrow return sealed set show static super switch sync this throw true try
    typedef var void when while with yield
`),Wm=S(`
    abstract case catch class def do else enum export extends false final finally for forSome given
    if implicit import lazy match new null object opaque open override package private protected
    return sealed super then this throw trait true try type val var while with yield
`),Fm=S(`
    abstract as assert break case catch class const continue def default do else enum extends final
    finally for goto if implements import in instanceof interface native new null package private
    protected public return static strictfp super switch synchronized this throw throws trait true
    try var void volatile while
`),zm=S(`
    my our local use no require package sub return if elsif else unless while until for foreach do
    last next redo and or not eq ne lt gt le ge cmp x qw q qq m s tr y
`),qm=S(`
    begin break catch class continue data define do dynamicparam else elseif end enum exit filter
    finally for foreach from function hidden if in param process return switch throw trap try until
    using var while workflow
`);var Ht=class{set cssVariables(e){let t=this.elementRef?.nativeElement;if(!t)return;let s=String(e||"").trim();s?this.renderer.setAttribute(t,"style",s):this.renderer.removeAttribute(t,"style")}constructor(e,t){this.elementRef=e,this.renderer=t}};Reflect.metadata("design:paramtypes",[String])(Ht.prototype,"cssVariables");Reflect.metadata("design:paramtypes",[g,R])(Ht);u(Ht,[[l(),1,"cssVariables"],[E({selector:"[cssVariables]"}),0]]);var Ir="tsdi-workspace-layout-styles",mo=`
workspace-layout {
    display: block;
    height: 100%;
    min-height: 0;
}

.workspace-layout {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    /* Hosts/themes supply these custom properties. Fallbacks keep the
       standalone layout usable without a theme. */
}

.workspace-layout-main {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
}

.workspace-pane {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    background: var(--workspace-pane-bg, transparent);
}

/* Themeable scrollbars for every layout scroll container. */
.workspace-pane,
.workspace-slot,
.workspace-slot > workspace-left,
.workspace-slot > workspace-center,
.workspace-slot > workspace-right,
.workspace-slot > workspace-bottom {
    scrollbar-width: var(--workspace-scrollbar-width, thin);
    scrollbar-color: var(--workspace-scrollbar-thumb, #cbd5e1) var(--workspace-scrollbar-track, transparent);
}

.workspace-pane::-webkit-scrollbar,
.workspace-slot::-webkit-scrollbar,
.workspace-slot > workspace-left::-webkit-scrollbar,
.workspace-slot > workspace-center::-webkit-scrollbar,
.workspace-slot > workspace-right::-webkit-scrollbar,
.workspace-slot > workspace-bottom::-webkit-scrollbar {
    width: var(--workspace-scrollbar-size, 10px);
    height: var(--workspace-scrollbar-size, 10px);
}

.workspace-pane::-webkit-scrollbar-track,
.workspace-slot::-webkit-scrollbar-track,
.workspace-slot > workspace-left::-webkit-scrollbar-track,
.workspace-slot > workspace-center::-webkit-scrollbar-track,
.workspace-slot > workspace-right::-webkit-scrollbar-track,
.workspace-slot > workspace-bottom::-webkit-scrollbar-track {
    background: var(--workspace-scrollbar-track, transparent);
}

.workspace-pane::-webkit-scrollbar-thumb,
.workspace-slot::-webkit-scrollbar-thumb,
.workspace-slot > workspace-left::-webkit-scrollbar-thumb,
.workspace-slot > workspace-center::-webkit-scrollbar-thumb,
.workspace-slot > workspace-right::-webkit-scrollbar-thumb,
.workspace-slot > workspace-bottom::-webkit-scrollbar-thumb {
    background: var(--workspace-scrollbar-thumb, #cbd5e1);
    border-radius: 999px;
}

.workspace-pane::-webkit-scrollbar-thumb:hover,
.workspace-slot::-webkit-scrollbar-thumb:hover,
.workspace-slot > workspace-left::-webkit-scrollbar-thumb:hover,
.workspace-slot > workspace-center::-webkit-scrollbar-thumb:hover,
.workspace-slot > workspace-right::-webkit-scrollbar-thumb:hover,
.workspace-slot > workspace-bottom::-webkit-scrollbar-thumb:hover {
    background: var(--workspace-scrollbar-thumb-hover, #94a3b8);
}

.workspace-pane::-webkit-scrollbar-corner,
.workspace-slot::-webkit-scrollbar-corner {
    background: transparent;
}

.workspace-layout-left,
.workspace-layout-right {
    flex-grow: 0;
    flex-shrink: 0;
}

.workspace-layout-left {
    flex-basis: var(--workspace-left, 20%);
    width: var(--workspace-left, 20%);
}

.workspace-layout-center {
    flex: 1 1 auto;
}

.workspace-layout-right {
    flex-basis: var(--workspace-right, 24%);
    width: var(--workspace-right, 24%);
}

.workspace-layout-bottom {
    flex: 0 0 auto;
    height: var(--workspace-bottom, 26%);
    border-top: 1px solid var(--workspace-splitter, #e2e8f0);
}

.workspace-layout-center,
.workspace-layout-left,
.workspace-layout-right,
.workspace-layout-bottom {
    display: flex;
    flex-direction: column;
}

.workspace-slot {
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.workspace-slot > workspace-left,
.workspace-slot > workspace-center,
.workspace-slot > workspace-right,
.workspace-slot > workspace-bottom {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow: auto;
}

.workspace-splitter {
    position: relative;
    flex: 0 0 5px;
    background: var(--workspace-splitter, #e2e8f0);
    transition: background 120ms ease;
    z-index: 5;
    overflow: visible;
}

.workspace-splitter-left,
.workspace-splitter-right {
    cursor: col-resize;
}

.workspace-splitter-bottom {
    cursor: row-resize;
}

.workspace-splitter:hover,
.workspace-splitter:active {
    background: var(--workspace-splitter-hover, #93c5fd);
}

.workspace-collapse {
    position: absolute;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 26px;
    padding: 0;
    border: 1px solid var(--workspace-collapse-border, var(--workspace-splitter, #e2e8f0));
    border-radius: 4px;
    background: var(--workspace-collapse-bg, #ffffff);
    color: var(--workspace-collapse-color, #475569);
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    box-shadow: var(--workspace-collapse-shadow, 0 1px 3px rgba(15, 23, 42, 0.12));
}

.workspace-collapse:hover {
    border-color: var(--workspace-splitter-hover, #93c5fd);
    color: var(--workspace-collapse-hover-color, #2563eb);
}

.workspace-collapse-left,
.workspace-collapse-right {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.workspace-collapse-bottom {
    top: 50%;
    left: 50%;
    width: 26px;
    height: 16px;
    transform: translate(-50%, -50%);
}

.workspace-pane[hidden] {
    display: none !important;
}

@media (max-width: 760px) {
    .workspace-layout-left {
        flex-basis: max(var(--workspace-left, 20%), 140px);
    }
    .workspace-layout-right {
        flex-basis: max(var(--workspace-right, 24%), 150px);
    }
}
`;function sy(i){if(!i||typeof i.createElement!="function"||!i.head||i.getElementById&&i.getElementById(Ir))return;let e=i.createElement("style");e.setAttribute("id",Ir),e.textContent=mo,i.head.appendChild(e)}var jr="tsdi-dynamic-form-styles",yo=`
.df-form {
    --df-border: #cbd5e1;
    --df-border-strong: #93c5fd;
    --df-bg: #ffffff;
    --df-bg-alt: #f8fafc;
    --df-text: #0f172a;
    --df-text-muted: #64748b;
    --df-text-hint: #94a3b8;
    --df-primary: #2563eb;
    --df-primary-soft: #eff6ff;
    --df-danger: #dc2626;
    --df-danger-soft: #fef2f2;
    --df-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: var(--df-text);
    font-size: 12px;
}

.df-schema-error {
    padding: 8px 10px;
    border: 1px solid var(--df-danger);
    border-radius: var(--df-radius);
    background: var(--df-danger-soft);
    color: var(--df-danger);
    font-size: 11px;
}

.df-field-group-title {
    margin: 12px 0 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--df-text-hint);
}

.df-field {
    margin-bottom: 9px;
}

.df-field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 3px;
}

.df-field-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: #475569;
    margin: 0;
}

.df-field-required {
    margin-left: 2px;
    color: var(--df-danger);
}

.df-field-reset {
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

.df-field-reset:hover {
    color: var(--df-primary);
}

.df-input,
.df-textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--df-border);
    border-radius: var(--df-radius);
    padding: 6px 8px;
    background: var(--df-bg);
    color: var(--df-text);
    font-size: 12px;
    outline: none;
}

.df-input:focus,
.df-textarea:focus {
    border-color: var(--df-border-strong);
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}

.df-textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    resize: vertical;
}

.df-checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #334155;
    font-size: 12px;
}

.df-options {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.df-option {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid var(--df-border);
    border-radius: 999px;
    background: var(--df-bg);
    color: #334155;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
}

.df-option.is-selected {
    border-color: var(--df-primary);
    background: var(--df-primary-soft);
    color: #1d4ed8;
}

.df-option.is-disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.df-option input {
    margin: 0;
    accent-color: var(--df-primary);
}

.df-field-hint {
    margin-top: 2px;
    font-size: 10px;
    color: var(--df-text-hint);
}

.df-field-error {
    margin-top: 3px;
    font-size: 10px;
    color: var(--df-danger);
}

.df-input[aria-invalid="true"],
.df-textarea[aria-invalid="true"] {
    border-color: var(--df-danger);
    background: var(--df-danger-soft);
}

.df-no-fields {
    padding: 6px 0;
    color: var(--df-text-hint);
    font-size: 11px;
}

.df-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 10px;
}

.df-btn {
    border: 1px solid var(--df-border);
    border-radius: var(--df-radius);
    background: var(--df-bg);
    color: #334155;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
}

.df-btn:hover {
    background: var(--df-bg-alt);
}

.df-btn-primary {
    border-color: transparent;
    background: var(--df-primary);
    color: #ffffff;
}

.df-btn-primary:hover {
    background: #1d4ed8;
}
`;function ny(i){if(!i||typeof i.createElement!="function"||!i.head||i.getElementById&&i.getElementById(jr))return;let e=i.createElement("style");e.setAttribute("id",jr),e.textContent=yo,i.head.appendChild(e)}var Vt=class extends ne{constructor(){super(...arguments),this.listeners=new Set,this.host=globalThis}subscribe(e){this.listeners.add(e),this.schedule()}unsubscribe(e){this.listeners.delete(e),this.listeners.size||this.cancel()}onDestroy(){this.listeners.clear(),this.cancel()}schedule(){this.frame!==void 0||!this.listeners.size||!this.host.requestAnimationFrame||(this.frame=this.host.requestAnimationFrame(()=>{this.frame=void 0,this.listeners.forEach(e=>e()),this.schedule()}))}cancel(){this.frame!==void 0&&(this.host.cancelAnimationFrame?.(this.frame),this.frame=void 0)}};u(Vt,[[L(),0]]);var Mr,Pr,Ke=class{constructor(e,t){if(this.platformId=t,this[Mr]=!0,e)this.document=e;else{let{JSDOM:s}=Wr(),r=new s("<!DOCTYPE html><html><body></body></html>",{runScripts:"dangerously",resources:"usable"});this.document=r.window.document}}createComment(e){return this.document.createComment(e)}createElement(e,t){return t?this.document.createElementNS(t,e):this.document.createElement(e)}createText(e){return this.document.createTextNode(e)}appendChild(e,t){e.appendChild(t)}insertBefore(e,t,s){e.insertBefore(t,s)}removeChild(e,t,s){if(e)try{e.removeChild(t)}catch{}}querySelector(e,t){let s=Lt(e)?e:[e];for(let r of s){let n=r;if(this.matchesSelector(r,t))return r;if(n.querySelector)try{let o=n.querySelector(t);if(o)return o}catch{if(t.startsWith("[")&&t.endsWith("]")){let o=t.slice(1,-1);return this.queryByAttribute(r,o)?.[0]??null}}}return null}querySelectorAll(e,t){let s=Lt(e)?e:[e],r=[];for(let n of s){let o=n;if(this.matchesSelector(n,t)&&r.push(n),o.querySelectorAll)try{let a=o.querySelectorAll(t);r.push(...Array.from(a).map(c=>c))}catch{if(t.includes(",")){let a=t.split(",").map(c=>c.trim());for(let c of a)if(c.startsWith("[")&&c.endsWith("]")){let h=this.queryByAttribute(n,c.slice(1,-1));h&&r.push(...h)}}else if(t.startsWith("[")&&t.endsWith("]")){let a=this.queryByAttribute(n,t.slice(1,-1));a&&r.push(...a)}}}return r.length?r:null}queryByAttribute(e,t,s){let r=Lt(e)?e:[e],n=[],o=a=>{let c=a;if(c.hasAttribute&&(s!==void 0?c.getAttribute(t)===s&&n.push(a):c.hasAttribute(t)&&n.push(a),c.children)){let h=Array.from(c.children);for(let p of h)o(p)}};for(let a of r)o(a);return n.length?n:null}queryByTagName(e,t){let s=Lt(e)?e:[e],r=[],n=t.toLowerCase(),o=a=>{let c=a;if(c.tagName&&(c.tagName.toLowerCase()===n&&r.push(a),c.children)){let h=Array.from(c.children);for(let p of h)o(p)}};for(let a of s)o(a);return r.length?r:null}queryByComponent(e,t){return this.querySelectorAll(e,t)}getAncestors(e){let t=[],s=e.parentNode;for(;s&&s!==this.document;)t.push(s),s=s.parentNode;return t}getDescendants(e){let t=[],s=r=>{let n=r;if(n.childNodes){let o=Array.from(n.childNodes);for(let a of o)t.push(a),s(a)}};return s(e),t}matchesSelector(e,t){let s=e;if(s.matches)try{return s.matches(t)}catch{if(t.includes(","))return t.split(",").map(r=>r.trim()).filter(Boolean).some(r=>this.matchesSelector(e,r));if(t.startsWith("[")&&t.endsWith("]"))return s.hasAttribute(t.slice(1,-1))}return!1}parentNode(e){return e.parentNode}nextSibling(e){return e.nextSibling}setAttribute(e,t,s,r){let n=e;if(!(typeof t!="string"||!t)){if(t.startsWith("@")||t.startsWith(":")||t.startsWith("v-")||t.startsWith("*")){n[t]=s;return}if(r)n.setAttributeNS(r,t,s);else try{n.setAttribute(t,s)}catch{n[t]=s}}}getAttributes(e){let t=e;return t.attributes?Array.from(t.attributes).map(s=>({name:s.name,value:s.value,namespace:s.namespaceURI??void 0})):[]}removeAttribute(e,t,s){let r=e;s?r.removeAttributeNS(s,t):r.removeAttribute(t)}addClass(e,t){e.classList.add(t)}removeClass(e,t){e.classList.remove(t)}setStyle(e,t,s,r){e.style.setProperty(t,s)}removeStyle(e,t,s){e.style.removeProperty(t)}setProperty(e,t,s){e[t]=s}setValue(e,t){e.textContent=t}click(e){e.click()}};Mr=x;Reflect.metadata("design:paramtypes",[Object,Object])(Ke);u(Ke,[[Ve(ni),3,void 0,1],[N(),3,void 0,1],[Ve(oi),3,void 0,0],[N(),3,void 0,0],[L(),0]]);var yt=class{constructor(e){this.renderer=e,this[Pr]=!0}parse(e){let s=this.renderer.document.createElement("div");return s.innerHTML=kr(e).trim(),Array.from(s.childNodes).map(r=>r)}};Pr=x;Reflect.metadata("design:paramtypes",[Ke])(yt);u(yt,[[L(),0]]);var go={delimiters:["{{","}}"]},$r=Y("HTML_COMPILER_OPTIONS"),Nt=class extends rt{constructor(e,t,s){super(),this.renderer=e,this.parser=t,this.options=s}};Reflect.metadata("design:paramtypes",[Ke,yt,Object])(Nt);u(Nt,[[Ve($r,{defaultValue:go}),3,void 0,2],[L(),0]]);var Ys=class i{static withOptions(e){return{module:i,providers:[{provide:$r,useValue:e}]}}};u(Ys,[[ye({imports:[Ot],providers:[Ke,yt,Nt,Vt,{provide:ne,useExisting:Vt},{provide:R,useClass:Ke,asDefault:!0},{provide:jt,useClass:yt,asDefault:!0},{provide:G,useClass:Nt,asDefault:!0}],exports:[Ot]}),0]]);var ys=class{constructor(e,t={}){this.element=e,this.box=new Wt({...t,stickyScroll:!1}),this.sync()}sync(){this.syncToElement(),this.apply()}wheel(e){this.syncToElement();let t=this.box.scrollBy(e);return this.apply(),t}scrollToEdge(e){this.syncToElement();let t=this.box.scrollToEdge(e);return this.apply(),t}scrollToBottom(){this.syncToElement(),this.box.scrollToEdge("end"),this.apply()}get following(){return this.box.atBottom}get top(){return this.box.top}get atBottom(){return this.box.atBottom}get atTop(){return this.box.atTop}get newItemCount(){return this.box.newItemCount}noteNewItems(e=1){return this.box.noteNewItems(e)}resumeFollow(){let e=this.box.atBottom;return this.scrollToBottom(),e}syncToElement(){this.box.setMetrics(this.element.scrollHeight,this.element.clientHeight),this.box.scrollTo(this.element.scrollTop)}apply(){this.element.scrollTop=this.box.top}};var bo={newMessages:"{count} new messages",jumpToBottom:"jump to bottom"},Br=class{constructor(e,t,s={}){this.transcript=e,this.indicator=t,this.options=s,this.previousScrollHeight=0,this.lastScrollTop=0,this.prependPending=!1,this.onScroll=()=>{let r=this.transcript.scrollTop,n=r<this.lastScrollTop;this.lastScrollTop=r,this.box.sync(),this.box.atBottom?this.resumeFollow():this.updateIndicator(),this.previousScrollHeight=this.transcript.scrollHeight,n&&this.box.atTop&&this.options.onReachTop?.()},this.box=new ys(e),this.labels={...bo,...s.labels||{}},this.previousScrollHeight=e.scrollHeight}attach(){this.box.scrollToBottom(),this.previousScrollHeight=this.transcript.scrollHeight,this.lastScrollTop=this.transcript.scrollTop,this.updateIndicator(),this.transcript.addEventListener("scroll",this.onScroll);let t=this.transcript.ownerDocument?.defaultView?.MutationObserver??globalThis.MutationObserver;t&&(this.observer=new t(()=>this.onContentGrew()),this.observer.observe(this.transcript,{childList:!0,subtree:!0,characterData:!0}))}detach(){this.transcript.removeEventListener("scroll",this.onScroll),this.observer?.disconnect(),this.observer=null}sync(){this.box.sync(),this.updateIndicator()}wheel(e){let t=this.box.wheel(e);return this.updateIndicator(),t}notifyPrepend(){this.prependPending=!0}onContentGrew(){let e=this.box.atBottom,t=this.previousScrollHeight;this.box.sync();let s=this.transcript.scrollHeight;this.prependPending?(this.prependPending=!1,e?this.box.scrollToBottom():s>t&&(this.transcript.scrollTop+=s-t,this.box.sync())):e?this.box.scrollToBottom():this.box.noteNewItems(1),this.previousScrollHeight=s,this.updateIndicator()}resumeFollow(){this.box.scrollToBottom(),this.updateIndicator()}get newItemCount(){return this.box.newItemCount}get following(){return this.box.following}get atTop(){return this.box.atTop}updateIndicator(){if(!this.indicator)return;let e=this.box.newItemCount,t=!this.box.following&&e>0;this.indicator.style.display=t?"":"none",t&&(this.indicator.textContent=`${this.labels.newMessages.replace("{count}",String(e))} \xB7 ${this.labels.jumpToBottom}`)}};var vo={match:"pager-match",current:"pager-match-current"};function cg(i,e,t){e.textContent="";for(let s of t){let r=i.createElement("div");r.className=s.kind==="hud"?"pager-hud":"pager-line",s.row!=null&&r.setAttribute("data-row",String(s.row));for(let n of s.segments){let o=vo[n.highlight];if(o){let a=i.createElement("span");a.className=o,a.textContent=n.text,r.appendChild(a)}else r.appendChild(i.createTextNode(n.text))}e.appendChild(r)}}function pg(i){if(!i)return 0;let e=i.ownerDocument,t=e?.defaultView;if(!e||!t)return 0;let s=Number(i.clientWidth)||0;if(s<=0)return 0;let r=t.getComputedStyle(i),n=e.createElement("span");n.textContent="00000000",n.style.cssText="position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;",n.style.fontFamily=r.fontFamily,n.style.fontSize=r.fontSize,n.style.fontWeight=r.fontWeight,n.style.letterSpacing=r.letterSpacing,e.body.appendChild(n);let o=n.getBoundingClientRect().width/8;return n.remove(),!Number.isFinite(o)||o<=0?0:Math.max(24,Math.floor(s/o)-2)}export{ge as a,x as b,j as c,li as d,be as e,H as f,g,l as h,E as i,et as j,C as k,$s as l,Re as m,Tr as n,eo as o,Hs as p,M as q,Ot as r,mm as s,sy as t,ny as u,Vt as v,Ke as w,yt as x,$r as y,Nt as z,Ys as A,ys as B,Br as C,cg as D,pg as E};
