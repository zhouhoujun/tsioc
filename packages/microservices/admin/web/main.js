import{A as $t,a as Zt,b as K,c as Be,d as z,e as Le,f as jt,g as ie,h as u,i as Ge,j as Ke,k as x,l as dt,m as Pt,n as ae,o as xe,p as ct,q as ut,r as ft,s as Ye,t as _t,u as Ft}from"./chunks/chunk-UWRIOZQ7.js";import"./chunks/chunk-OHZ55BRH.js";import{a as Wt,b as Vt,c as qt,d as Ut,e as pt,f as Ht,g as Jt,h as Bt,i as Xe,j as Gt}from"./chunks/chunk-YO4XV7PI.js";import{$ as Mt,D as h,E as nt,H as re,I as ve,M as G,N as D,O as b,Q as I,S as Lt,_ as Ee,aa as Dt,ba as lt,ca as zt,ma as se,x as B,xa as Ot}from"./chunks/chunk-M2OH2HRV.js";import"./chunks/chunk-U6UJE3IR.js";var N=class{};h(N,[[re(),0]]);var Se=B("I18N_OPTIONS"),zo=B("I18N_LOCALE"),Cr=B("I18N_TRANSLATIONS"),Me=B("TRANSLATION_LOADERS");var ne=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(ne);h(ne,[[b(),3,void 0,0],[D(Se),3,void 0,0],[I(),0]]);var Qe=class{format(e,t,o){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,o):this.interpolate(e,t)}interpolate(e,t){let o=e;return"#"in t&&(o=o.replace(/#/g,String(t["#"]))),o=o.replace(/\{(\w+)\}/g,(r,s)=>{if(s in t){let a=t[s];return String(a)}return r}),o}formatICU(e,t,o){let r=e,s=/\{(\w+),\s*(plural|select),\s*/g,a;for(;(a=s.exec(e))!==null;){let n=a.index,l=a[1],d=a[2],p=n+a[0].length,c=this.findMatchingBrace(e,n);if(c===-1)continue;let f=e.substring(p,c),g=e.substring(n,c+1),y=this.parseChoices(f);if(d==="plural"){let v=t[l];if(typeof v=="number"){let k=this.getPluralForm(v,o),R=y[k]||y.other||"",E=this.interpolate(R,{"#":v,...t});r=r.replace(g,E)}}else if(d==="select"){let v=t[l];if(v!==void 0){let k=y[String(v)]||y.other||"",R=this.interpolate(k,t);r=r.replace(g,R)}}}return this.interpolate(r,t)}findMatchingBrace(e,t){let o=1;for(let r=t+1;r<e.length;r++)if(e[r]==="{")o++;else if(e[r]==="}"&&(o--,o===0))return r;return-1}parseChoices(e){let t={},o=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,r;for(;(r=o.exec(e))!==null;){let s=r[1],a=r.index+r[0].length,n=this.findMatchingBrace(e,r.index+r[0].length-1);if(n!==-1){let l=e.substring(a,n);t[s]=l.trim()}}return t}getPluralForm(e,t){let o=t.split("-")[0];return o==="zh"||o==="ja"||o==="ko"?"other":o==="en"||o==="de"||o==="nl"?e===1?"one":"other":o==="ru"||o==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":o==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var ue=class extends N{constructor(e,t,o){super(),this.injector=e,this.options=t,this.localeService=o,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new Qe,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(Me,[]);for(let t of e){let o=await t.load(this.options.basePath,this.options.locales||[]);for(let r of o)this._translations.set(r.locale,r),this.localeService.registerBundle(r.locale,r)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,o){let r=typeof t=="string"?t:this._currentLocale,s=typeof t=="string"?o:t,a=this._translations.get(r);if(!a)return e;let n=this.getMessage(a,e);return n?this._formatter.format(n,s||{},r):e}getMessage(e,t){let o=t.split("."),r=e.messages;for(let s of o)if(r&&typeof r=="object"&&s in r)r=r[s];else return;return typeof r=="string"?r:void 0}has(e,t){let o=t||this._currentLocale,r=this._translations.get(o);return r?this.getMessage(r,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[ve,Object,ne])(ue);h(ue,[[D(),3,void 0,2],[b(),3,void 0,1],[D(Se),3,void 0,1],[D(),3,void 0,0],[I(),0]]);var De=class{};h(De,[[re(),0]]);var fe=class extends De{constructor(e){super(),this.fileAdapter=e}async load(e,t){let o=[];for(let r of t)try{let s=await this.loadLocale(e,r);o.push(s)}catch{}return o}async loadLocale(e,t){let o=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(o))throw new Error(`Translation file not found: ${o}`);let s=await this.fileAdapter.readJSON(o);return{locale:t,messages:s}}};Reflect.metadata("design:paramtypes",[Ot])(fe);h(fe,[[D(),3,void 0,0],[I(),0]]);var pe=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let o,r;return t.length>0&&(typeof t[0]=="object"?o=t[0]:typeof t[0]=="string"&&(r=t[0])),t.length>1&&typeof t[1]=="object"&&(o=t[1]),r?this.translator.translate(e,r,o||{}):this.translator.translate(e,o||{})}};Reflect.metadata("design:paramtypes",[N])(pe);h(pe,[[I(),0],[Dt("translate"),0]]);var Oo=[ne,ue,{provide:N,useClass:ue},fe,{provide:Me,useClass:fe,multi:!0},pe],Ce=class i{static withOptions(e){let t=[{provide:Se,useValue:e}];return e.loader&&t.push({provide:Me,useClass:e.loader,multi:!0}),{module:i,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};h(Ce,[[G({providers:Oo,exports:[pe]}),0]]);var ht=class{format(e,t,o){return new Intl.NumberFormat(t,o).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,o){return this.format(e,t,{minimumFractionDigits:o,maximumFractionDigits:o})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};h(ht,[[I(),0]]);var mt=class{format(e,t,o){let r=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,o).format(r)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};h(mt,[[I(),0]]);var wt=class{format(e,t,o,r){let s={style:"currency",...r};return o&&(s.currency=o),new Intl.NumberFormat(t,s).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};h(wt,[[I(),0]]);var et=class{constructor(e){this.translator=e}intercept(e,t,o){let r=t.handle(e,o);return typeof r=="string"&&r.startsWith("i18n:")?this.translator.translate(r.substring(5)):r&&typeof r=="object"?this.translateObject(r):r}translateObject(e){if(Array.isArray(e))return e.map(o=>this.translateObject(o));let t={};for(let[o,r]of Object.entries(e))typeof r=="string"&&r.startsWith("i18n:")?t[o]=this.translator.translate(r.substring(5)):typeof r=="object"?t[o]=this.translateObject(r):t[o]=r;return t}};Reflect.metadata("design:paramtypes",[N])(et);h(et,[[I(),0]]);var Zo={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",logTitle:"Execution log",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},inject:{payload:"Payload"},trigger:{delay:"Delay (ms)",payload:"Payload"},function:{code:"Code",timeout:"Timeout (ms)"},template:{template:"Template",target:"Target field"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout (ms)"},command:{command:"Command",args:"Args",timeout:"Timeout (ms)"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Expected value"},loop:{iterations:"Iterations",delay:"Delay (ms)"},delay:{delay:"Delay (ms)"},log:{message:"Message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",logTitle:"\u6267\u884C\u65E5\u5FD7",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},inject:{payload:"\u6570\u636E"},trigger:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},template:{template:"\u6A21\u677F",target:"\u76EE\u6807\u5B57\u6BB5"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u671F\u671B\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},delay:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},log:{message:"\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},Re=class{};h(Re,[[G({imports:[Ce.withLocales(Zo,"zh-CN")],exports:[Ce]}),0]]);function S(i,e,t,o,r){if(!i)return o;try{if(i.has(t,e))return i.translate(t,e,r);let s=i.translate(t,e,r);if(s&&s!==t)return s}catch{}return o}function gt(i,e,t,o="",r){return t?t.startsWith("workflow.")?S(i,e,t,o||t,r):t:o}var Kt={trigger:{en:"Triggers",zh:"\u89E6\u53D1\u5668"},flow:{en:"Flow control",zh:"\u6D41\u7A0B\u63A7\u5236"},action:{en:"Actions",zh:"\u6267\u884C\u52A8\u4F5C"},data:{en:"Data",zh:"\u6570\u636E\u5904\u7406"},error:{en:"Error handling",zh:"\u5F02\u5E38\u5904\u7406"},advanced:{en:"Advanced",zh:"\u9AD8\u7EA7"}};function m(i,e,t,o){return{id:i,name:e,type:t,label:o}}function w(i){return{...i}}var jo=184,Po=64;function _(i,e,t){return i==="zh-CN"&&t||e}var _o=[{type:"start",label:"Start",labelZh:"\u5F00\u59CB",description:"Entry point of the workflow",descriptionZh:"\u5DE5\u4F5C\u6D41\u5165\u53E3",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[m("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",labelZh:"\u7ED3\u675F",description:"Finish the workflow",descriptionZh:"\u7ED3\u675F\u5DE5\u4F5C\u6D41",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[m("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",labelZh:"\u6CE8\u5165",description:"Start with a fixed payload",descriptionZh:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[m("out","out","output","Payload")],fields:[w({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{}})],defaultConfig:{payload:{}}},{type:"task",label:"Task",labelZh:"\u4EFB\u52A1",description:"Run a named action or return a fixed result",descriptionZh:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"action",label:"Action",labelZh:"\u52A8\u4F5C",type:"text",placeholder:"actions.fetch",placeholderZh:"actions.fetch",description:"Function name in context.actions.",descriptionZh:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\u3002"}),w({key:"result",label:"Mock result",labelZh:"\u6A21\u62DF\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set.",descriptionZh:"\u672A\u914D\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u8BE5\u7ED3\u679C\u3002"}),w({key:"fail",label:"Fail this step",labelZh:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",type:"boolean",defaultValue:!1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),w({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Automatic retries before the step fails.",descriptionZh:"\u6B65\u9AA4\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002"}),w({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),w({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"function",label:"Function",labelZh:"\u51FD\u6570",description:"Run trusted JavaScript against the workflow context",descriptionZh:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"code",label:"Code",labelZh:"\u4EE3\u7801",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions.",descriptionZh:"\u53D7\u4FE1\u4EFB\u4EE3\u7801\u3002`context` \u662F\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\uFF0C`input` \u662F\u4E0A\u4E00\u6B65\u7ED3\u679C\u3002\u6309 Ctrl+Space \u83B7\u53D6\u4E0A\u4E0B\u6587\u548C\u53D8\u91CF\u63D0\u793A\u3002"}),w({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",labelZh:"\u6761\u4EF6",description:"Branch on a context field",descriptionZh:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("true","true","output","True"),m("false","false","output","False")],fields:[w({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.approved",description:"Path to the value to test.",descriptionZh:"\u8981\u5224\u65AD\u7684\u503C\u8DEF\u5F84\u3002"}),w({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),w({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",labelZh:"\u591A\u8DEF\u5206\u652F",description:"Route by a context value",descriptionZh:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Matched"),m("default","default","output","Default"),m("error","error","output","Error")],fields:[w({key:"field",label:"Value field",labelZh:"\u53D6\u503C\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.type",description:"Path to the value used for routing.",descriptionZh:"\u7528\u4E8E\u5206\u652F\u5224\u65AD\u7684\u53D6\u503C\u8DEF\u5F84\u3002"}),w({key:"value",label:"Expected value",labelZh:"\u671F\u671B\u503C",type:"text",required:!0,placeholder:"approved",description:"Routes to the matched output when the value is equal.",descriptionZh:"\u503C\u76F8\u7B49\u65F6\u8DEF\u7531\u5230 Matched \u8F93\u51FA\u3002"})],defaultConfig:{}},{type:"parallel",label:"Parallel",labelZh:"\u5E76\u884C",description:"Run all outgoing branches concurrently",descriptionZh:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",labelZh:"\u6C47\u805A",description:"Wait for all incoming branches before continuing",descriptionZh:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],defaultConfig:{}},{type:"loop",label:"Loop",labelZh:"\u5FAA\u73AF",description:"Repeat the node body",descriptionZh:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Done"),m("error","error","output","Error")],fields:[w({key:"iterations",label:"Iterations",labelZh:"\u8FED\u4EE3\u6B21\u6570",type:"number",defaultValue:1,min:1,max:1e4,step:1}),w({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Options",groupZh:"\u9009\u9879"})],defaultConfig:{iterations:1}},{type:"trigger",label:"Trigger",labelZh:"\u89E6\u53D1",description:"Emit a payload after an optional delay",descriptionZh:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100}),w({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'})],defaultConfig:{delay:0,payload:{}}},{type:"delay",label:"Delay",labelZh:"\u5EF6\u8FDF",description:"Wait before continuing",descriptionZh:"\u7B49\u5F85\u540E\u7EE7\u7EED",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:500,min:0,max:6e5,step:100,description:"Pause before continuing.",descriptionZh:"\u7EE7\u7EED\u6267\u884C\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002"})],defaultConfig:{delay:500}},{type:"log",label:"Log",labelZh:"\u65E5\u5FD7",description:"Record a message",descriptionZh:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Workflow step completed",required:!0,placeholder:"Workflow step completed",description:"Message written to the execution log.",descriptionZh:"\u5199\u5165\u6267\u884C\u65E5\u5FD7\u7684\u6D88\u606F\u3002"}),w({key:"level",label:"Level",labelZh:"\u7EA7\u522B",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"http-request",label:"HTTP request",labelZh:"HTTP \u8BF7\u6C42",description:"Call an HTTP endpoint",descriptionZh:"\u8C03\u7528 HTTP \u63A5\u53E3",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Response"),m("error","error","output","Error")],fields:[w({key:"url",label:"URL",labelZh:"\u5730\u5740",type:"text",required:!0,placeholder:"https://api.example.com",group:"Request",groupZh:"\u8BF7\u6C42",description:"Absolute endpoint or a path resolved by the host.",descriptionZh:"\u7EDD\u5BF9\u5730\u5740\u6216\u7531\u5BBF\u4E3B\u89E3\u6790\u7684\u8DEF\u5F84\u3002"}),w({key:"method",label:"Method",labelZh:"\u65B9\u6CD5",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(i=>({label:i,value:i})),group:"Request",groupZh:"\u8BF7\u6C42"}),w({key:"headers",label:"Headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request",groupZh:"\u8BF7\u6C42"}),w({key:"body",label:"Body",labelZh:"\u8BF7\u6C42\u4F53",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",groupZh:"\u8BF7\u6C42",visibleWhen:{key:"method",notEquals:"GET"}}),w({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),w({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),w({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",labelZh:"\u8D4B\u503C",description:"Merge values into workflow variables",descriptionZh:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"values",label:"Values",labelZh:"\u503C",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",labelZh:"\u8F6C\u6362",description:"Map the previous result",descriptionZh:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"mapping",label:"Mapping",labelZh:"\u6620\u5C04",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result.",descriptionZh:"\u5C06\u4E0A\u4E0B\u6587\u8DEF\u5F84\u6620\u5C04\u5230\u65B0\u7684\u7ED3\u679C\u3002"}),w({key:"result",label:"Fixed result",labelZh:"\u56FA\u5B9A\u7ED3\u679C",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",labelZh:"\u6A21\u677F",description:"Render a message template",descriptionZh:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"template",label:"Template",labelZh:"\u6A21\u677F",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",description:"Use {{path.to.value}} placeholders.",descriptionZh:"\u4F7F\u7528 {{path.to.value}} \u5360\u4F4D\u7B26\u3002"}),w({key:"target",label:"Target field",labelZh:"\u76EE\u6807\u5B57\u6BB5",type:"text",defaultValue:"message",placeholder:"message",description:"Context field that receives the rendered text.",descriptionZh:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u6587\u5B57\u6BB5\u3002"})],defaultConfig:{template:"{{value}}",target:"message"}},{type:"json",label:"JSON",labelZh:"JSON",description:"Parse or stringify JSON",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),w({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the value to parse or stringify.",descriptionZh:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u503C\u8DEF\u5F84\u3002"}),w({key:"pretty",label:"Pretty print",labelZh:"\u683C\u5F0F\u5316\u8F93\u51FA",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",labelZh:"CSV",description:"Parse or stringify CSV",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),w({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the CSV text or array.",descriptionZh:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u8DEF\u5F84\u3002"}),w({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns.",descriptionZh:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002"}),w({key:"header",label:"First row is header",labelZh:"\u9996\u884C\u4E3A\u8868\u5934",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",labelZh:"\u4FEE\u6539\u5C5E\u6027",description:"Set, delete or append a context field",descriptionZh:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"action",label:"Action",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"set",options:[{label:"Set",labelZh:"\u8BBE\u7F6E",value:"set"},{label:"Delete",labelZh:"\u5220\u9664",value:"delete"},{label:"Append",labelZh:"\u8FFD\u52A0",value:"append"}]}),w({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"variables.name",description:"Context path to modify.",descriptionZh:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"}),w({key:"value",label:"Value",labelZh:"\u503C",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append.",descriptionZh:"\u65B0\u503C\u6216\u8981\u8FFD\u52A0\u7684\u5185\u5BB9\u3002"})],defaultConfig:{action:"set"}},{type:"statistics",label:"Statistics",labelZh:"\u7EDF\u8BA1",description:"Aggregate an array (count/sum/avg/min/max)",descriptionZh:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Result")],fields:[w({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items",description:"Path to the array to aggregate.",descriptionZh:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"}),w({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",placeholder:"value",description:"Numeric property of each item.",descriptionZh:"\u6BCF\u4E2A\u5143\u7D20\u7684\u6570\u503C\u5C5E\u6027\u3002"}),w({key:"operation",label:"Operation",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"count",options:[{label:"Count",labelZh:"\u8BA1\u6570",value:"count"},{label:"Sum",labelZh:"\u6C42\u548C",value:"sum"},{label:"Average",labelZh:"\u5E73\u5747",value:"avg"},{label:"Min",labelZh:"\u6700\u5C0F",value:"min"},{label:"Max",labelZh:"\u6700\u5927",value:"max"}]}),w({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",labelZh:"\u5408\u5E76",description:"Merge objects or concatenate arrays",descriptionZh:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"fields",label:"Fields",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second",descriptionZh:"\u9017\u53F7\u5206\u9694\u7684\u8DEF\u5F84\uFF0C\u4F8B\u5982 first, second\u3002"}),w({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"object",options:[{label:"Object merge",labelZh:"\u5BF9\u8C61\u5408\u5E76",value:"object"},{label:"Array concat",labelZh:"\u6570\u7EC4\u62FC\u63A5",value:"array"}]}),w({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",labelZh:"\u53D1\u9001\u4E8B\u4EF6",description:"Emit an event through the workflow event bus",descriptionZh:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output")],fields:[w({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to publish.",descriptionZh:"\u8981\u53D1\u5E03\u7684\u4E8B\u4EF6\u540D\u3002"}),w({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload.",descriptionZh:"\u53EF\u9009\u7684\u4E8B\u4EF6\u6570\u636E\u3002"})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",labelZh:"\u7B49\u5F85\u4E8B\u4EF6",description:"Wait for a workflow event",descriptionZh:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Event"),m("error","error","output","Timeout")],fields:[w({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to wait for.",descriptionZh:"\u8981\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u3002"}),w({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:3e4,min:0,step:1e3,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Route to the timeout port after this delay.",descriptionZh:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",labelZh:"\u547D\u4EE4",description:"Run a host-provided command executor",descriptionZh:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"command",label:"Command",labelZh:"\u547D\u4EE4",type:"text",required:!0,placeholder:"context.exec"}),w({key:"args",label:"Args",labelZh:"\u53C2\u6570",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command.",descriptionZh:"\u4F20\u7ED9\u547D\u4EE4\u7684\u53C2\u6570\u6570\u7EC4\u3002"}),w({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"split",label:"Split",labelZh:"\u62C6\u5206",description:"Split a string or array into items",descriptionZh:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Items")],fields:[w({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"items",description:"Text or array to split.",descriptionZh:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u3002"}),w({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text.",descriptionZh:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002"})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",labelZh:"\u6620\u5C04",description:"Map each array item",descriptionZh:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Items")],fields:[w({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),w({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name",descriptionZh:"\u4F8B\u5982 value \u6216 user.name\u3002"})],defaultConfig:{}},{type:"filter",label:"Filter",labelZh:"\u8FC7\u6EE4",description:"Keep array items that match a condition",descriptionZh:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Items")],fields:[w({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),w({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:""}),w({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),w({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",labelZh:"\u6392\u5E8F",description:"Sort an array by a field",descriptionZh:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Items")],fields:[w({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),w({key:"path",label:"Sort path",labelZh:"\u6392\u5E8F\u8DEF\u5F84",type:"text",placeholder:"value",description:"Property of each item used for ordering.",descriptionZh:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002"}),w({key:"order",label:"Order",labelZh:"\u987A\u5E8F",type:"select",defaultValue:"asc",options:[{label:"Ascending",labelZh:"\u5347\u5E8F",value:"asc"},{label:"Descending",labelZh:"\u964D\u5E8F",value:"desc"}]})],defaultConfig:{order:"asc"}},{type:"range",label:"Range",labelZh:"\u533A\u95F4",description:"Generate a numeric range",descriptionZh:"\u751F\u6210\u6570\u503C\u533A\u95F4",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Items")],fields:[w({key:"from",label:"From",labelZh:"\u8D77\u59CB",type:"number",defaultValue:0}),w({key:"to",label:"To",labelZh:"\u7ED3\u675F",type:"number",defaultValue:10}),w({key:"step",label:"Step",labelZh:"\u6B65\u957F",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",labelZh:"\u6279\u5904\u7406",description:"Split an array into chunks",descriptionZh:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Batches")],fields:[w({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),w({key:"size",label:"Batch size",labelZh:"\u6279\u5927\u5C0F",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch.",descriptionZh:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002"})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",labelZh:"\u5F02\u5E38\u6355\u83B7",description:"Route failures to an error branch",descriptionZh:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",labelZh:"\u5B50\u6D41\u7A0B",description:"Execute another workflow",descriptionZh:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"workflow",label:"Workflow JSON",labelZh:"\u5DE5\u4F5C\u6D41 JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute.",descriptionZh:"\u8981\u6267\u884C\u7684\u5185\u8054\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u3002"})],defaultConfig:{}},{type:"comment",label:"Comment",labelZh:"\u6CE8\u91CA",description:"Canvas note; not executed",descriptionZh:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[w({key:"text",label:"Text",labelZh:"\u6587\u672C",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",labelZh:"\u81EA\u5B9A\u4E49",description:"Run a custom activity or handler",descriptionZh:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[m("in","in","input","Input")],outputs:[m("out","out","output","Output"),m("error","error","output","Error")],fields:[w({key:"result",label:"Result",labelZh:"\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node.",descriptionZh:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"})],defaultConfig:{}}],Yt=0;function Fo(i){if(i===null||typeof i!="object")return i;try{return JSON.parse(JSON.stringify(i))}catch{return i}}var T=class{constructor(){this.definitions=new Map,this._revision=0,_o.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(o=>({...o})),outputs:(e.outputs||[]).map(o=>({...o})),fields:(e.fields||[]).map(o=>({...o})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let o={...t.defaultConfig||{}};return(t.fields||[]).forEach(r=>{r.defaultValue!==void 0&&o[r.key]===void 0&&(o[r.key]=Fo(r.defaultValue))}),o}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let o of this.definitions.values())e.has(o.category)||(e.add(o.category),t.push(o.category));return t}palette(e="zh-CN",t){return this.categories().map(o=>({id:o,label:S(t,e,`workflow.category.${o}`,_(e,Kt[o].en,Kt[o].zh)),items:this.list().filter(r=>r.category===o).map(r=>this.paletteItem(r,e,t))}))}paletteItem(e,t="zh-CN",o){return{type:e.type,label:this.nodeLabel(e.type,t,o),description:this.nodeDescription(e.type,t,o),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",o){let r=this.get(e);return r?S(o,t,`workflow.node.${e}.label`,_(t,r.label,r.labelZh)):e}nodeDescription(e,t="zh-CN",o){let r=this.get(e);return r?S(o,t,`workflow.node.${e}.description`,_(t,r.description||r.label,r.descriptionZh)):""}createNode(e,t,o={}){let r=this.get(e);if(!r)throw new Error(`Unknown workflow node type: ${e}`);return{id:o.id||this.nextId(e),name:o.name||_("zh-CN",r.label,r.labelZh),type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:jo,height:Po},description:r.description,inputs:r.inputs.map(a=>({...a})),outputs:r.outputs.map(a=>({...a})),config:{...r.defaultConfig||{},...o.config||{}},style:{backgroundColor:r.color,textColor:r.textColor||"#ffffff",borderColor:r.color,borderRadius:e==="start"||e==="end"?50:10,icon:r.icon},activityType:r.activityType,pluginId:r.pluginId,requiresServer:r.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return Yt+=1,`${e}_${Yt}`}};Reflect.metadata("design:paramtypes",[])(T);h(T,[[I(),0]]);function j(i,e){if(typeof i=="function")return i(e);if(i==null||typeof i!="string")return i;let t=i.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let o=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),r=e;for(let s of o){if(r==null)return;r=r[s]}return r}function Xt(i,e,t){switch(e){case"equals":return i==t;case"not-equals":return i!=t;case"gt":return Number(i)>Number(t);case"lt":return Number(i)<Number(t);case"gte":return Number(i)>=Number(t);case"lte":return Number(i)<=Number(t);case"truthy":default:return!!i}}function $o(i,e){let t=i?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!j(t.condition,e);if(t.field!==void 0){let o=j(t.field,e);return Xt(o,String(t.operator||"truthy"),t.value)}return!0}function Wo(i,e){let t=i?.config||{};if(t.field!==void 0)return j(t.field,e);if(t.value!==void 0)return j(t.value,e)}function W(i){if(typeof i!="string")return i;try{return JSON.parse(i)}catch{return i}}function ze(i,e){if(!e)return i;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),o=i;for(let r of t){if(o==null)return;o=o[r]}return o}function Oe(i,e){let t=e?j(e,i):i.items??i.value;return Array.isArray(t)?t:[]}function Vo(i,e){return String(i??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,o)=>String(j(o,e)??""))}function qo(i){return String(i||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function Uo(i,e,t,o){let r=qo(e);if(!r.length)return t==="set"&&o&&typeof o=="object"?(Object.assign(i,o),o):void 0;let s=i;for(let n=0;n<r.length-1;n++){let l=r[n];(s[l]===void 0||s[l]===null)&&(s[l]={}),s=s[l]}let a=r[r.length-1];if(t==="delete"){let n=s[a];return delete s[a],n}if(t==="append"){let n=s[a];return Array.isArray(n)?(n.push(o),n):(s[a]=n==null?[o]:`${n}${o}`,s[a])}return s[a]=o,o}function Ho(i,e,t){let o=[],r=[],s="",a=!1,n=String(i??"");for(let d=0;d<n.length;d++){let p=n[d];a?p==='"'?n[d+1]==='"'?(s+='"',d++):a=!1:s+=p:p==='"'?a=!0:p===e?(r.push(s),s=""):p===`
`?(r.push(s),o.push(r),r=[],s=""):p!=="\r"&&(s+=p)}if((s||r.length)&&(r.push(s),o.push(r)),!t||!o.length)return o;let l=o[0];return o.slice(1).map(d=>{let p={};return l.forEach((c,f)=>{p[c]=d[f]??""}),p})}function Jo(i,e){let t=Array.isArray(i)?i:[];if(!t.length)return"";let o=r=>{let s=r==null?"":String(r);return/["\n\r]/.test(s)||s.includes(e)?`"${s.replace(/"/g,'""')}"`:s};if(!Array.isArray(t[0])){let r=Object.keys(t[0]||{});return[r.map(o).join(e),...t.map(s=>r.map(a=>o(s?.[a])).join(e))].join(`
`)}return t.map(r=>r.map(o).join(e)).join(`
`)}function Bo(i){let e=i.activityType;if(e)try{let t=new e;return Object.assign(t,i.config||{}),t}catch{return}}async function Go(i,e){let t=i.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${i.name}" failed`)),data:{nodeId:i.id,failed:!0}};let o=t.action,r=e.actions||{};if(typeof o=="function")return{success:!0,data:{nodeId:i.id,result:await o(e)}};if(typeof o=="string"&&o&&typeof r[o]=="function")return{success:!0,data:{nodeId:i.id,result:await r[o](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:i.id,result:await t.execute(e)}};if(t.result!==void 0){let s=W(t.result);return s&&typeof s=="object"&&!Array.isArray(s)?{success:!0,data:{...s,nodeId:i.id}}:{success:!0,data:{nodeId:i.id,result:s}}}return{success:!0,data:{nodeId:i.id,config:t}}}async function Ko(i,e){let t=i.config||{},o=j(t.url,e);if(!o)return{success:!0,data:{nodeId:i.id,skipped:!0,reason:"No URL configured"}};let r=globalThis.fetch;if(typeof r!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:i.id}};try{let s=await r(String(o),{method:String(t.method||"GET").toUpperCase(),headers:W(t.headers)||void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),a=await s.text(),n=a;try{n=a?JSON.parse(a):null}catch{n=a}return{success:s.ok,error:s.ok?void 0:new Error(`HTTP ${s.status}`),data:{nodeId:i.id,status:s.status,body:n}}}catch(s){return{success:!1,error:s,data:{nodeId:i.id}}}}async function Ze(i,e,t){let o=i.config||{};if(t?.executeNode){let s=await t.executeNode(i,e);if(s)return s}let r=Bo(i);if(r)return r.execute(e);switch(i.type){case"start":return{success:!0,data:{nodeId:i.id,started:!0}};case"end":return{success:!0,data:{nodeId:i.id,completed:!0}};case"task":return Go(i,e);case"condition":return{success:!0,data:{nodeId:i.id,condition:$o(i,e)}};case"switch":return{success:!0,data:{nodeId:i.id,condition:Wo(i,e)}};case"delay":{let s=Math.max(0,Number(o.delay??o.duration??0)||0);return await new Promise(a=>setTimeout(a,s)),{success:!0,data:{nodeId:i.id,delayed:s}}}case"loop":{let s=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0));return{success:!0,data:{nodeId:i.id,iterations:s}}}case"log":{let s=String(o.level||"info"),a=j(o.message,e),n=e.logger;return n&&typeof n[s]=="function"&&n[s](a),{success:!0,data:{nodeId:i.id,level:s,message:a}}}case"http-request":return Ko(i,e);case"inject":{let s=W(o.payload??{});return s&&typeof s=="object"&&!Array.isArray(s)?{success:!0,data:{...s,nodeId:i.id}}:{success:!0,data:{nodeId:i.id,payload:s}}}case"trigger":{let s=Math.max(0,Number(o.delay)||0);await new Promise(n=>setTimeout(n,s));let a=W(o.payload??{});return a&&typeof a=="object"&&!Array.isArray(a)?{success:!0,data:{...a,nodeId:i.id,triggered:!0}}:{success:!0,data:{nodeId:i.id,triggered:!0,payload:a}}}case"function":try{let s=String(o.code||"return input;"),n=await new Function("context","input","msg",`"use strict"; return (async () => { ${s}
 })();`)(e,e,{...e});return n&&typeof n=="object"&&!Array.isArray(n)?{success:!0,data:{...n,nodeId:i.id}}:{success:!0,data:{nodeId:i.id,result:n}}}catch(s){return{success:!1,error:s,data:{nodeId:i.id}}}case"template":{let s=Vo(String(o.template??""),e),a=String(o.target||"message");return{success:!0,data:{nodeId:i.id,[a]:s,value:s}}}case"json":{let s=j(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let n=JSON.stringify(s,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:i.id,value:n,json:n}}}try{let n=typeof s=="string"?JSON.parse(s):s;return{success:!0,data:n&&typeof n=="object"&&!Array.isArray(n)?{...n,nodeId:i.id,value:n}:{nodeId:i.id,value:n}}}catch(n){return{success:!1,error:n,data:{nodeId:i.id}}}}case"csv":{let s=j(o.field||"value",e),a=String(o.delimiter??",");try{if(String(o.mode||"parse")==="stringify"){let l=Jo(s,a);return{success:!0,data:{nodeId:i.id,value:l}}}let n=Ho(String(s??""),a,o.header!==!1);return{success:!0,data:{nodeId:i.id,value:n,items:n,count:n.length}}}catch(n){return{success:!1,error:n,data:{nodeId:i.id}}}}case"change":try{let s=W(o.value),a=Uo(e,o.field,String(o.action||"set"),s);return{success:!0,data:{nodeId:i.id,field:o.field,value:a,changed:!0}}}catch(s){return{success:!1,error:s,data:{nodeId:i.id}}}case"statistics":{let s=Oe(e,o.field),a=s.map(c=>ze(c,o.path)).filter(c=>c!=null),n=a.map(Number).filter(c=>Number.isFinite(c)),l=String(o.operation||"count"),d=a.length;l==="sum"?d=n.reduce((c,f)=>c+f,0):l==="avg"?d=n.length?n.reduce((c,f)=>c+f,0)/n.length:0:l==="min"?d=n.length?Math.min(...n):0:l==="max"&&(d=n.length?Math.max(...n):0);let p=String(o.resultField||"value");return{success:!0,data:{nodeId:i.id,[p]:d,value:d,count:s.length}}}case"merge":{let a=String(o.fields||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>j(d,e)),n=String(o.mode||"object")==="array"?a.reduce((d,p)=>d.concat(Array.isArray(p)?p:[p]),[]):Object.assign({},...a.filter(d=>d&&typeof d=="object"&&!Array.isArray(d))),l=String(o.resultField||"value");return{success:!0,data:{nodeId:i.id,[l]:n,value:n}}}case"event-emit":{let s=String(o.event||"workflow.event"),a=W(o.payload),n=e.eventBus||e.events;return n&&typeof n.emit=="function"?(n.emit(s,a),{success:!0,data:{nodeId:i.id,event:s,emitted:!0,payload:a}}):typeof e.emit=="function"?(e.emit(s,a),{success:!0,data:{nodeId:i.id,event:s,emitted:!0,payload:a}}):{success:!0,data:{nodeId:i.id,event:s,emitted:!1,payload:a}}}case"event-wait":{let s=String(o.event||"workflow.event"),a=Math.max(0,Number(o.timeout)||0),n=e.eventBus||e.events;try{if(n&&typeof n.wait=="function"){let l=await n.wait(s,a);return{success:!0,data:{nodeId:i.id,event:s,value:l,waited:!0}}}if(typeof e.waitEvent=="function"){let l=a?await Promise.race([Promise.resolve(e.waitEvent(s)),new Promise(d=>setTimeout(()=>d(void 0),a))]):await e.waitEvent(s);return{success:!0,data:{nodeId:i.id,event:s,value:l,waited:!0}}}return{success:!0,data:{nodeId:i.id,event:s,waited:!1}}}catch(l){return{success:!1,error:l,data:{nodeId:i.id,event:s}}}}case"command":{let s=String(o.command||""),a=W(o.args),n=e.exec||e.runCommand||e.commands?.[s];if(typeof n=="function")try{let l=await n(s,a,e);return{success:!0,data:l&&typeof l=="object"?{...l,nodeId:i.id,command:s}:{nodeId:i.id,command:s,result:l}}}catch(l){return{success:!1,error:l,data:{nodeId:i.id,command:s}}}return{success:!0,data:{nodeId:i.id,command:s,skipped:!0,args:a}}}case"split":{let s=j(o.field||"items",e),a=Array.isArray(s)?s:typeof s=="string"?s.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:i.id,items:a,count:a.length}}}case"map":{let a=Oe(e,o.field).map(n=>ze(n,o.path));return{success:!0,data:{nodeId:i.id,items:a,count:a.length}}}case"filter":{let a=Oe(e,o.field).filter(n=>{let l=ze(n,o.path);return Xt(l,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:i.id,items:a,count:a.length}}}case"sort":{let s=Oe(e,o.field).slice(),a=String(o.order||"asc")==="desc"?-1:1;return s.sort((n,l)=>{let d=ze(n,o.path),p=ze(l,o.path);return typeof d=="number"&&typeof p=="number"?(d-p)*a:String(d??"").localeCompare(String(p??""))*a}),{success:!0,data:{nodeId:i.id,items:s,count:s.length}}}case"range":{let s=Number(o.from??0),a=Number(o.to??10),n=Math.max(1,Math.abs(Number(o.step??1))||1),l=[];for(let d=s;d<a;d+=n)l.push(d);return{success:!0,data:{nodeId:i.id,items:l,count:l.length}}}case"batch":{let s=Oe(e,o.field),a=Math.max(1,Number(o.size)||10),n=[];for(let l=0;l<s.length;l+=a)n.push(s.slice(l,l+a));return{success:!0,data:{nodeId:i.id,items:n,count:n.length}}}case"comment":return{success:!0,data:{nodeId:i.id,comment:!0}};case"assign":{let s=W(o.values??o.data??{}),a={...e.variables||{},...s&&typeof s=="object"?s:{}};return e.variables=a,{success:!0,data:{nodeId:i.id,variables:a}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:i.id,result:W(o.result)}};let s=W(o.mapping);if(s&&typeof s=="object"){let a={};return Object.keys(s).forEach(n=>{a[n]=j(s[n],e)}),{success:!0,data:{nodeId:i.id,result:a}}}return{success:!0,data:{nodeId:i.id,result:e}}}case"parallel":return{success:!0,data:{nodeId:i.id,parallel:!0}};case"join":return{success:!0,data:{nodeId:i.id,joined:!0}};case"trycatch":return{success:!0,data:{nodeId:i.id,guarded:!0}};case"subprocess":{let s=W(o.workflow);if(s&&t?.executeDefinition){let a=await t.executeDefinition(s,e);return{success:a.success,data:{nodeId:i.id,subprocess:a.data},error:a.error}}return{success:!0,data:{nodeId:i.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:i.id,result:await o.execute(e)}}:i.requiresServer?{success:!1,error:new Error(`Node type "${i.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:i.id,type:i.type,pluginId:i.pluginId}}:{success:!0,data:{nodeId:i.id,type:i.type,result:W(o.result)}}}}function he(i){let e=[];if(i?.id||e.push("Workflow ID is required"),i?.name||e.push("Workflow name is required"),!i?.nodes||i.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,o=[];for(let a of i.nodes)a.id?t.has(a.id)&&o.push(a.id):e.push("Every node requires an id"),t.add(a.id);o.length&&e.push(`Duplicate node IDs found: ${[...new Set(o)].join(", ")}`);let r=i.nodes.filter(a=>a.type==="start"),s=i.nodes.filter(a=>a.type==="inject");r.length===0&&s.length===0?e.push("Workflow must have at least one start node"):r.length>1&&e.push("Workflow should have only one start node");for(let a of i.connections||[])t.has(a.sourceNodeId)||e.push(`Connection references non-existent source node: ${a.sourceNodeId}`),t.has(a.targetNodeId)||e.push(`Connection references non-existent target node: ${a.targetNodeId}`),a.sourceNodeId===a.targetNodeId&&e.push(`Connection cannot link a node to itself: ${a.sourceNodeId}`);return bt(i)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function bt(i){let e=new Set,t=new Set,o=new Map;for(let s of i.nodes||[])o.set(s.id,[]);for(let s of i.connections||[]){let a=o.get(s.sourceNodeId);a&&a.push(s.targetNodeId)}let r=s=>{if(e.has(s))return!0;if(t.has(s))return!1;e.add(s);for(let a of o.get(s)||[])if(r(a))return!0;return e.delete(s),t.add(s),!1};for(let s of o.keys())if(r(s))return!0;return!1}function Qt(i){let e=(i.nodes||[]).find(o=>o.type==="start");if(e)return e;let t=(i.nodes||[]).find(o=>o.type==="inject");return t||(i.nodes||[]).find(o=>!(i.connections||[]).some(r=>r.targetNodeId===o.id))}function je(i){let e=he(i),t=new Map,o=new Map,r=new Map,s=(i?.connections||[]).slice();for(let d of i?.nodes||[])t.set(d.id,d),o.set(d.id,[]),r.set(d.id,[]);for(let d of s)o.get(d.sourceNodeId)?.push(d),r.get(d.targetNodeId)?.push(d);let a=Qt(i),n=[],l=new Set;if(a){let d=[a.id];for(l.add(a.id);d.length;){let p=d.shift();n.push(p);for(let c of o.get(p)||[])!l.has(c.targetNodeId)&&t.has(c.targetNodeId)&&(l.add(c.targetNodeId),d.push(c.targetNodeId))}}for(let d of t.keys())l.has(d)||n.push(d);return{definition:i,entry:a,nodes:t,outgoing:o,incoming:r,edges:s,order:n,reachable:l,valid:e.valid,errors:e.errors}}function eo(i,e={}){let t=je(i),o=e.originX??80,r=e.originY??80,s=e.columnGap??240,a=e.rowGap??140,n=new Map,l=[],d=t.entry?[t.entry.id]:[],p=[...d];for(d.forEach(f=>n.set(f,0));p.length;){let f=p.shift(),g=n.get(f)||0;for(let y of t.outgoing.get(f)||[]){let v=y.targetNodeId;if(!t.nodes.has(v))continue;let k=g+1,R=n.get(v);(R===void 0||R<k)&&(R===void 0&&p.push(v),n.set(v,k))}}for(let f of t.order){n.has(f)||n.set(f,Yo(n,0));let g=n.get(f)||0;l[g]||(l[g]=[]),l[g].push(f)}let c={};return l.forEach((f,g)=>{f.forEach((y,v)=>{c[y]={x:o+g*s,y:r+v*a}})}),c}function Yo(i,e){let t=e;return i.forEach(o=>{t=Math.max(t,o)}),t+1}var to,oo,Xo;function Pe(i){return{id:i.id,name:i.name,description:i.description,nodeCount:i.nodes?.length||0,connectionCount:i.connections?.length||0,updatedAt:i.metadata?.updatedAt||new Date().toISOString()}}function yt(i){return JSON.parse(JSON.stringify(i))}var kt=class{constructor(){this[to]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(Pe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?yt(t):void 0}async save(e){let t={...yt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),Pe(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};to=K;var vt=class{constructor(e="tsdi.workflow.definitions.v1",t=ro()){this.key=e,this.storage=t,this[oo]=!0}async list(){return this.readAll().map(Pe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(r=>r.id!==e.id),o={...yt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(o),this.writeAll(t),Pe(o)}async remove(e){let t=this.readAll(),o=t.filter(r=>r.id!==e);return o.length===t.length?!1:(this.writeAll(o),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};oo=K;function ro(){try{return globalThis.localStorage}catch{return}}function so(){return ro()?new vt:new kt}Xo=K;function io(i){return Pe(i)}var V=class{};h(V,[[re(),0]]);var Y=class extends V{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return Ze(this.node,e,this.runtimeHost)}};var xt=class extends Mt{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return Y}getBackend(){return e=>Ze(e.node,e.context,e.host)}handleNode(e){return Promise.resolve(this.handle(e,nt(this.injector)))}};function ao(i,e){let t=i.get(Ee,null);if(t)return e.forEach(r=>t.addInterceptor(Y,r)),new xt(i);let o=new Lt(r=>Ze(r.node,r.context,r.host),()=>e);return{handleNode:r=>Promise.resolve(o.handle(r,nt(i)))}}function Qo(i){return{nodeId:i,status:"pending"}}var tt=class{intercept(e,t,o){let{node:r,state:s,emit:a}=e,n=s.nodeStates?.get(r.id)||Qo(r.id);return n.status="running",n.startedAt=Date.now(),s.nodeStates?.set(r.id,n),s.currentNodeId=r.id,s.activeNodeIds=[...s.activeNodeIds||[],r.id],a({type:"node-start",nodeId:r.id,status:"running"}),Promise.resolve(t.handle(e,o)).then(l=>(this.finish(e,n,l),l),l=>{let d={success:!1,error:l,data:{nodeId:r.id}};return this.finish(e,n,d),d})}finish(e,t,o){let{node:r,state:s,emit:a}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=o.success?"success":"failed",t.result=o,t.error=o.error?.message,s.nodeStates?.set(r.id,t),s.nodeResults.set(r.id,o),s.activeNodeIds=(s.activeNodeIds||[]).filter(n=>n!==r.id),a({type:"node-end",nodeId:r.id,status:t.status,result:o})}};function er(i){return i>0?new Promise(e=>setTimeout(e,i)):Promise.resolve()}var St=class{constructor(e={}){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(0,Number(this.options.retries??1)||0),s=Math.max(0,Number(this.options.delayMs??0)||0),a=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,n=this.options.shouldRetry||((d,p)=>p?!0:d?.success===!1),l=async d=>{try{let p=await t.handle(e,o);if(d>=r||!n(p,void 0,e,d))return p}catch(p){if(d>=r||!n(void 0,p,e,d))throw p}return await er(s*Math.pow(a,d)),l(d+1)};return l(0)}},ot=class{intercept(e,t,o){let r=e.node.config||{},s=Math.max(0,Math.min(20,Number(r.retry??r.retries)||0)),a=Math.max(0,Number(r.retryDelay)||0),n=Math.max(0,Number(r.timeout)||0);if(!s&&!n)return Promise.resolve(t.handle(e,o));let l={handle:(d,p)=>t.handle(d,p)};if(n>0){let d=new Ct({timeoutMs:n}),p=l;l={handle:(c,f)=>d.intercept(c,p,f)}}if(s>0){let d=new St({retries:s,delayMs:a}),p=l;l={handle:(c,f)=>d.intercept(c,p,f)}}return Promise.resolve(l.handle(e,o))}},Ct=class{constructor(e){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(s=>{let a=!1,n=setTimeout(()=>{a||(a=!0,s({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${r}ms`),data:{nodeId:e.node.id,timeoutMs:r}}))},r);Promise.resolve(t.handle(e,o)).then(l=>{a||(a=!0,clearTimeout(n),s(l))},l=>{a||(a=!0,clearTimeout(n),s({success:!1,error:l,data:{nodeId:e.node.id}}))})})}};var tr=100,or=.35,rr=2.5;function sr(i){return JSON.parse(JSON.stringify(i))}function ir(i){return`${i}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function Rt(i,e="zh-CN",t){let o=(f,g)=>S(t,e,`workflow.demo.${f}`,g),r=(f,g,y,v,k,R)=>i.createNode(f,{x:v,y:k},{id:g,name:y,config:R}),s=r("start","start_1",o("start",e==="zh-CN"?"\u5F00\u59CB":"Start"),80,220),a=r("task","task_1",o("loadInput",e==="zh-CN"?"\u8BFB\u53D6\u8F93\u5165":"Load input"),330,220,{action:"loadInput",result:{approved:!0}}),n=r("condition","condition_1",o("approved",e==="zh-CN"?"\u662F\u5426\u901A\u8FC7":"Approved?"),590,220,{field:"approved",operator:"truthy"}),l=r("task","task_2",o("approve",e==="zh-CN"?"\u901A\u8FC7\u5904\u7406":"Approve"),850,120,{result:{approved:!0}}),d=r("task","task_3",o("reject",e==="zh-CN"?"\u62D2\u7EDD\u5904\u7406":"Reject"),850,320,{result:{approved:!1}}),p=r("end","end_1",o("end",e==="zh-CN"?"\u7ED3\u675F":"End"),1110,220),c=(f,g,y,v)=>({id:f,sourceNodeId:g,sourcePort:y,targetNodeId:v,targetPort:"in"});return{id:"workflow_demo",name:o("name",e==="zh-CN"?"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B":"Approval workflow"),description:o("description",e==="zh-CN"?"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002":"Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[s,a,n,l,d,p],connections:[c("conn_1","start_1","out","task_1"),c("conn_2","task_1","out","condition_1"),c("conn_3","condition_1","true","task_2"),c("conn_4","condition_1","false","task_3"),c("conn_5","task_2","out","end_1"),c("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function no(i="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||(i==="zh-CN"?"\u65B0\u5EFA\u6D41\u7A0B":"New workflow"),description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var X=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new T,this.service=e.service,this.definition=e.definition||Rt(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,o={}){let r=this.registry.get(e);if(!r){this.setError("workflow.error.unknownType",{type:e});return}if(r.singleton&&this.definition.nodes.some(a=>a.type===e)){this.setError("workflow.error.singleton",{label:r.label});return}let s=this.registry.createNode(e,t,{id:this.nextNodeId(e),...o});return this.commit(a=>({...a,nodes:[...a.nodes,s],metadata:{...a.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:s.id},this.clearError(),this.setMessage("workflow.message.added",{name:s.name}),s}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(o=>o.id!==e),connections:t.connections.filter(o=>o.sourceNodeId!==e&&o.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let o=Number.isFinite(t?.x)?t.x:0,r=Number.isFinite(t?.y)?t.y:0,s=this.definition.nodes.find(n=>n.id===e);if(!s)return!1;let a=this.snapPosition({x:o,y:r});return s.position.x===a.x&&s.position.y===a.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(n=>n.id===e?{...n,position:a}:n)}),!0)}updateNode(e,t){return this.definition.nodes.find(r=>r.id===e)?(this.commit(r=>({...r,nodes:r.nodes.map(s=>s.id===e?{...s,...t,id:s.id}:s),metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?this.updateNode(e,{config:{...o.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(o=>o.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,o,r){let s=this.definition.nodes.find(f=>f.id===e),a=this.definition.nodes.find(f=>f.id===o);if(!s||!a){this.setError("workflow.error.endpoints");return}if(e===o){this.setError("workflow.error.selfLink");return}let n=t||s.outputs?.[0]?.id||"out",l=r||a.inputs?.[0]?.id||"in";if(s.outputs?.length&&!s.outputs.some(f=>f.id===n)){this.setError("workflow.error.unknownOutput",{port:n});return}if(a.inputs?.length&&!a.inputs.some(f=>f.id===l)){this.setError("workflow.error.unknownInput",{port:l});return}let d=this.definition.connections.find(f=>f.sourceNodeId===e&&f.sourcePort===n&&f.targetNodeId===o&&f.targetPort===l);if(d)return this.selection={connectionId:d.id},d;let p={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:n,targetNodeId:o,targetPort:l},c={...this.definition,connections:[...this.definition.connections,p]};if(bt(c)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...c,metadata:{...c.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:p.id},this.clearError(),this.setMessage("workflow.message.connected"),p}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(o=>o.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?(this.selection={nodeId:e},this.drag={nodeId:e,startX:o.position.x,startY:o.position.y,offsetX:t.x-o.position.x,offsetY:t.y-o.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),o=Math.round(e.y-this.drag.offsetY),r=this.snapPosition({x:t,y:o});r.x===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.x&&r.y===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(s=>s.id===this.drag.nodeId?{...s,position:r}:s)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,o,r="output"){let s=this.definition.nodes.find(n=>n.id===e),a=r==="input"?s?.inputs:s?.outputs;return!s||!(a||[]).some(n=>n.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:r,x:o.x,y:o.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let o=this.connectionDraft;if(o)return this.connectionDraft=void 0,o.sourceSide==="input"?this.addConnection(e,t,o.sourceNodeId,o.sourcePort):this.addConnection(o.sourceNodeId,o.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(or,Math.min(rr,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return je(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=eo(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(o=>({...o,position:e[o.id]||o.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(o=>({...o,nodes:[...o.nodes,t],metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(o=>o.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let o;try{o=typeof e=="string"?JSON.parse(e):sr(e)}catch(s){return this.setError(s.message),!1}let r=he(o);return!o||!Array.isArray(o.nodes)||!Array.isArray(o.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=o,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(r.valid?"":r.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let o=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(o={...o,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let r=await e.save(o);return this.definition=o,this.normalize(),this.dirty=!1,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:o.name}),r}async openFrom(e,t){let o=await e.get(t);return o?this.load(o,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){return he(this.definition)}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let o=new Error("workflow.error.noService");return this.setError(o.message),{success:!1,error:o}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let o=await this.service.execute(this.definition,e.context||{},{...e,onEvent:s=>{this.activeExecutionId=s.executionId,this.execution=s.snapshot,e.onEvent?.(s)},onCheckpoint:s=>{s.status==="running"&&(this.checkpoint=s),e.onCheckpoint?.(s)}}),r=o.data?.executionState;return r&&(this.execution=r,this.recordExecution(r)),o.success&&(this.checkpoint=void 0),this.activeExecutionId=o.data?.executionId,this.running=!1,this.setMessage(o.success?"workflow.message.completed":"workflow.message.failed"),o.success||this.setError(o.error?.message||"workflow.message.failed"),o}catch(o){return this.running=!1,this.setError(o.message),this.setMessage("workflow.message.failed"),{success:!1,error:o}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=ir("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),o=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(r=>({...r})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(r=>({...r})),config:{...o||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>tr&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(o=>o&&o.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,o=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(o)};let r=this.gridSize;return{x:Math.round(t/r)*r,y:Math.round(o/r)*r}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(r=>r.id)),o=1;for(;t.has(`${e}_${o}`);)o++;return`${e}_${o}`}nextConnectionId(){let e=new Set(this.definition.connections.map(o=>o.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var ar=184;var fo=20,po=48,lo={idle:{en:"",zh:""},pending:{en:"Pending",zh:"\u7B49\u5F85"},running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},success:{en:"Done",zh:"\u6210\u529F"},failed:{en:"Failed",zh:"\u5931\u8D25"},skipped:{en:"Skipped",zh:"\u8DF3\u8FC7"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"}};function ho(i,e,t){let o=lo[i]||lo.idle;return S(t,e,`workflow.status.${i}`,_(e,o.en,o.zh))}function It(i,e,t){let o=i||"idle",r={running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},completed:{en:"Completed",zh:"\u5DF2\u5B8C\u6210"},failed:{en:"Failed",zh:"\u5931\u8D25"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"},pending:{en:"Pending",zh:"\u7B49\u5F85"},idle:{en:"Idle",zh:"\u7A7A\u95F2"}},s=r[o]||r.idle;return S(t,e,`workflow.status.${o}`,_(e,s.en,s.zh))}function At(i){let e=i.dimension?.width||ar,t=Math.max(i.inputs?.length||0,i.outputs?.length||0,1),o=Math.max(i.dimension?.height||64,po+t*fo+10);return{width:e,height:o}}function nr(i){let{width:e,height:t}=At(i),o=(r,s)=>(r||[]).map((a,n)=>({id:a.id,label:a.label||a.name||a.id,type:a.type,x:s,y:i.position.y+po+n*fo-5}));return{width:e,height:t,inputs:o(i.inputs,i.position.x),outputs:o(i.outputs,i.position.x+e)}}function co(i,e){let t=Math.max(48,Math.abs(e.x-i.x)/2);return`M ${i.x} ${i.y} C ${i.x+t} ${i.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function lr(i){return{class:["workflow-node",i.selected?"is-selected":""].filter(Boolean).join(" "),"data-node-id":i.id,"data-node-type":i.type,"data-status":i.status,role:"button",tabindex:"0","aria-label":i.name,style:[`left:${i.x}px`,`top:${i.y}px`,`width:${i.width}px`,`min-height:${i.height}px`].join(";")}}function mo(i,e,t="zh-CN",o){let r=[],s=new Map,a=i.execution;for(let c of i.nodes){let f=nr(c);s.set(c.id,f);let g=a?.nodeStates?.[c.id]?.status||"idle",y={id:c.id,name:c.name,type:c.type,typeLabel:e.nodeLabel(c.type,t,o),description:c.description||e.nodeDescription(c.type,t,o),x:c.position.x,y:c.position.y,width:f.width,height:f.height,icon:c.style?.icon||e.get(c.type)?.icon||"\u25C6",color:c.style?.backgroundColor||e.get(c.type)?.color||"#64748b",textColor:c.style?.textColor||e.get(c.type)?.textColor||"#ffffff",selected:i.selection.nodeId===c.id,status:g,statusLabel:ho(g,t,o),inputs:f.inputs,outputs:f.outputs};r.push({...y,attrs:lr(y)})}let n=i.connections.map(c=>{let f=i.nodes.find(ce=>ce.id===c.sourceNodeId),g=i.nodes.find(ce=>ce.id===c.targetNodeId),y=f?s.get(f.id):void 0,v=g?s.get(g.id):void 0,k=y?.outputs.find(ce=>ce.id===c.sourcePort)||y?.outputs[0],R=v?.inputs.find(ce=>ce.id===c.targetPort)||v?.inputs[0],E=a?.edgeStates?.[c.id]?.status||"idle",Z=i.selection.connectionId===c.id,ke=k&&R?co(k,R):"M 0 0",Je=k&&R?(k.x+R.x)/2:0,Mo=k&&R?(k.y+R.y)/2:0,Do={class:`workflow-edge workflow-edge-${E}${Z?" is-selected":""}`,"data-edge-id":c.id,"data-status":E,d:ke,"marker-end":`url(#wf-arrow-${E})`};return{id:c.id,sourceNodeId:c.sourceNodeId,targetNodeId:c.targetNodeId,sourcePort:c.sourcePort,targetPort:c.targetPort,label:c.label||"",d:ke,status:E,selected:Z,attrs:Do,hitAttrs:{class:"workflow-edge-hit","data-edge-id":c.id,d:ke},labelAttrs:{x:String(Je),y:String(Mo-6),class:"workflow-edge-label"}}}),l;if(i.connectionDraft){let c=i.nodes.find(v=>v.id===i.connectionDraft.sourceNodeId),f=c?s.get(c.id):void 0,y=(i.connectionDraft.sourceSide==="input"?f?.inputs:f?.outputs)?.find(v=>v.id===i.connectionDraft.sourcePort);y&&(l={d:co(y,{x:i.connectionDraft.x,y:i.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=r.reduce((c,f)=>Math.max(c,f.x+f.width),0),p=r.reduce((c,f)=>Math.max(c,f.y+f.height),0);return{nodes:r,edges:n,draft:l,connecting:!!i.connectionDraft,connectingSide:i.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,p+240),zoom:i.zoom,pan:{...i.pan},gridStyle:{"--wf-grid-size":`${24*i.zoom}px`,"--wf-grid-x":`${i.pan.x}px`,"--wf-grid-y":`${i.pan.y}px`}}}function wo(i,e="zh-CN",t){return i.palette(e,t)}function dr(i,e){return e.equals!==void 0?String(i)===String(e.equals):e.notEquals!==void 0?String(i)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(i)):e.truthy!==void 0?e.truthy?!!i:!i:e.falsy!==void 0?e.falsy?!i:!!i:!0}function cr(i){let e=i.defaultValue;return i.type==="json"?typeof e=="string"?e:JSON.stringify(e??{},null,2):i.type==="boolean"?e===!0:e==null?"":String(e)}function go(i,e,t="zh-CN",o){let r=i.selectedNode;if(!r)return{hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let s=e.get(r.type),a=i.execution?.nodeStates?.[r.id],n=a?.status||"idle",l={};(s?.fields||[]).forEach(f=>{l[f.key]=r.config?.[f.key]!==void 0?r.config[f.key]:f.defaultValue});let d=(s?.fields||[]).map(f=>{let g=l[f.key];return{key:f.key,label:S(o,t,`workflow.field.${r.type}.${f.key}`,_(t,f.label,f.labelZh)),type:f.type,value:g,displayValue:f.type==="json"?typeof g=="string"?g:JSON.stringify(g??{},null,2):g==null?"":String(g),checked:g===!0,options:(f.options||[]).map(y=>({label:S(o,t,`workflow.option.${y.value}`,_(t,y.label,y.labelZh)),value:y.value})),placeholder:_(t,f.placeholder||"",f.placeholderZh),description:_(t,f.description||"",f.descriptionZh),group:_(t,f.group||"",f.groupZh),visible:f.visibleWhen?dr(l[f.visibleWhen.key],f.visibleWhen):!0,min:f.min,max:f.max,step:f.step,rows:f.rows||(f.type==="json"?4:f.type==="code"?8:3),required:f.required===!0,readonly:f.readonly===!0,pattern:f.pattern,language:f.language,hasDefault:f.defaultValue!==void 0,resetValue:cr(f)}}),p="";if(a?.result?.data!==void 0)try{p=JSON.stringify(a.result.data,null,2)}catch{p=String(a.result.data)}let c=a?.durationMs||0;return{hasSelection:!0,nodeId:r.id,name:r.name,description:r.description||"",typeLabel:e.nodeLabel(r.type,t,o),status:n,statusLabel:ho(n,t,o),durationLabel:c?`${c} ms`:"",fields:d,resultText:p,errorText:a?.error||""}}function bo(i,e="zh-CN",t){let o=i.execution;return{name:i.definition.name,nodeCount:i.nodes.length,connectionCount:i.connections.length,hasSelection:!!i.selection?.nodeId||!!i.selection?.connectionId,canUndo:i.canUndo,canRedo:i.canRedo,canResume:i.canResume,running:i.running,zoomLabel:`${Math.round(i.zoom*100)}%`,statusLabel:It(o?.status,e,t)}}function yo(i,e="zh-CN",t){let o=i.selectedNode,r=i.execution,s=o?i.registry.nodeLabel(o.type,e,t):"";return{message:gt(t,e,i.message,"",i.messageParams),error:gt(t,e,i.error,"",i.errorParams),running:i.running,nodeCount:i.nodes.length,selectedLabel:o?`${o.name} \xB7 ${s}`:S(t,e,"workflow.ui.noSelection",_(e,"No node selected","\u672A\u9009\u62E9\u8282\u70B9")),zoomLabel:`${Math.round(i.zoom*100)}%`,executionLabel:It(r?.status,e,t)}}function uo(i){if(!i)return"";let e=new Date(i),t=o=>String(o).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function ur(i,e){if(!i||!e||e<i)return"";let t=e-i;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function ko(i,e="zh-CN",t){return(i.executionHistory||[]).filter(Boolean).map(o=>{let r=o.status==="completed"?"success":o.status==="failed"?"failed":o.status==="cancelled"?"cancelled":o.status==="running"?"running":"idle";return{executionId:o.executionId,label:uo(o.startTime),status:o.status,statusLabel:It(o.status,e,t),timeLabel:uo(o.startTime),durationLabel:ur(o.startTime,o.endTime),nodeCount:Object.keys(o.nodeStates||{}).length,tone:r,active:i.selectedExecutionId===o.executionId}})}var _i=B("VISUAL_NODE"),M=class extends V{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(M.prototype,"id");Reflect.metadata("design:type",String)(M.prototype,"name");Reflect.metadata("design:type",Object)(M.prototype,"type");Reflect.metadata("design:type",Object)(M.prototype,"position");Reflect.metadata("design:type",String)(M.prototype,"description");Reflect.metadata("design:type",Array)(M.prototype,"inputs");Reflect.metadata("design:type",Array)(M.prototype,"outputs");Reflect.metadata("design:type",Object)(M.prototype,"config");Reflect.metadata("design:type",Object)(M.prototype,"style");h(M,[[u(),1,"id"],[u(),1,"name"],[u(),1,"type"],[u(),1,"position"],[u(),1,"description"],[u(),1,"inputs"],[u(),1,"outputs"],[u(),1,"config"],[u(),1,"style"],[re(),0]]);var rt=class extends M{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(rt);h(rt,[[x({selector:"start-node"}),0]]);var st=class extends M{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(st);h(st,[[x({selector:"end-node"}),0]]);var Ie=class extends M{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(Ie.prototype,"action");Reflect.metadata("design:type",String)(Ie.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(Ie);h(Ie,[[u(),1,"action"],[u(),1,"taskName"],[x({selector:"task-node"}),0]]);var _e=class extends M{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(_e.prototype,"condition");Reflect.metadata("design:paramtypes",[])(_e);h(_e,[[u(),1,"condition"],[x({selector:"condition-node"}),0]]);var me=class extends M{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=[],r=[...this.branches],s=[];for(;r.length>0||s.length>0;){for(;r.length>0&&s.length<this.maxConcurrent;){let n=r.shift().execute(e).then(l=>{t.push(l),!l.success&&l.error&&o.push(l.error)});s.push(n)}s.length>0&&(await Promise.race(s),s.splice(0,s.findIndex(a=>!r.includes(a))))}return{success:o.length===0,data:{results:t,errors:o.length>0?o:void 0,nodeId:this.id},error:o.length>0?o[0]:void 0}}};Reflect.metadata("design:type",Array)(me.prototype,"branches");Reflect.metadata("design:type",Object)(me.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(me.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(me);h(me,[[u(),1,"branches"],[u(),1,"maxConcurrent"],[u(),1,"waitAll"],[x({selector:"parallel-node"}),0]]);var Fe=class extends M{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(Fe.prototype,"delay");Reflect.metadata("design:paramtypes",[])(Fe);h(Fe,[[u(),1,"delay"],[x({selector:"delay-node"}),0]]);var we=class extends M{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=0;for(;o<this.maxIterations&&await this.condition(e,o);){let s=await this.body.execute(e);t.push(s),o++}return{success:!0,data:{iterations:o,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",V)(we.prototype,"body");Reflect.metadata("design:type",Function)(we.prototype,"condition");Reflect.metadata("design:type",Object)(we.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(we);h(we,[[u(),1,"body"],[u(),1,"condition"],[u(),1,"maxIterations"],[x({selector:"loop-node"}),0]]);var ge=class extends M{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),o=this.cases.get(t)||this.defaultCase;if(!o)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let r=await o.execute(e);return{success:r.success,data:{value:t,caseResult:r.data,nodeId:this.id},error:r.error}}};Reflect.metadata("design:type",Function)(ge.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(ge.prototype,"cases");Reflect.metadata("design:type",V)(ge.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(ge);h(ge,[[u(),1,"value"],[u(),1,"cases"],[u(),1,"defaultCase"],[x({selector:"switch-node"}),0]]);var be=class extends M{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,o;try{t=await this.tryActivity.execute(e)}catch(r){o=r,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:o,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:o,nodeId:this.id}}}};Reflect.metadata("design:type",V)(be.prototype,"tryActivity");Reflect.metadata("design:type",V)(be.prototype,"catchActivity");Reflect.metadata("design:type",V)(be.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(be);h(be,[[u(),1,"tryActivity"],[u(),1,"catchActivity"],[u(),1,"finallyActivity"],[x({selector:"trycatch-node"}),0]]);var $e=class extends M{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)($e.prototype,"workflow");Reflect.metadata("design:paramtypes",[])($e);h($e,[[u(),1,"workflow"],[x({selector:"subprocess-node"}),0]]);var le=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};h(le,[[I(),0]]);function vo(i){return{id:i.id,name:i.name,description:i.description,version:i.version,nodes:(i.nodes||[]).map(e=>{let{execute:t,activityType:o,...r}=e;return JSON.parse(JSON.stringify(r))})}}var Q=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>vo(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let a of e.nodes||[])a?.type&&(this.nodes.register({...a,pluginId:e.id,requiresServer:a.requiresServer!==!1}),t.push(a.type));let o=typeof e.services=="function"?e.services():e.services,r=[];Object.entries(o||{}).forEach(([a,n])=>{this.services.set(a,n),r.push(a)});let s={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(s)}catch(a){throw t.forEach(n=>this.nodes.unregister(n)),r.forEach(n=>this.services.remove(n)),a}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:r}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let o={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(o)}finally{t.nodeTypes.forEach(r=>this.nodes.unregister(r));for(let r of t.serviceNames){let s=this.services.get(r);try{await s?.dispose?.()}finally{this.services.remove(r)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[T,le])(Q);h(Q,[[I(),0]]);var xo=30,So=300;function We(i){let e={};i.nodeStates?.forEach((o,r)=>{e[r]={...o,result:o.result?{success:o.result.success,data:o.result.data,error:o.result.error?.message}:void 0}});let t={};return i.edgeStates?.forEach((o,r)=>{t[r]={...o}}),{executionId:i.executionId,workflowId:i.workflowId,status:i.status,currentNodeId:i.currentNodeId,startTime:i.startTime,endTime:i.endTime,error:i.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...i.activeNodeIds||[]],logs:[...i.logs||[]]}}var ee=class{constructor(e,t,o){this.injector=e,this.plugins=o,this.executions=new Map,this.pathInterceptor=new tt,this.policyInterceptor=new ot,this.interceptors=[],this.registry=t||new T;let r=this.injector.get(Ee,null);r&&(r.addInterceptor(Y,this.pathInterceptor),r.addInterceptor(Y,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get(Ee,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(Y,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(Y,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},o={}){let r=o.executionId||o.resumeFrom?.executionId||this.generateExecutionId(),s=this.withPluginServices(t),a=o.resumeFrom?this.createStateFromCheckpoint(e,o.resumeFrom,r):this.createState(e,r);this.executions.set(r,a),this.trimHistory(o.maxHistory),this.emit(o,a,{type:"workflow-start",status:"running"}),this.checkpoint(o,a);try{let n=je(e),l=n.entry;if(!l)throw new Error("No start node found in workflow");let d={executeDefinition:(v,k)=>this.execute(v,k,{...o,executionId:void 0}),executeNode:async(v,k)=>{let R=this.registry.executor(v.type);return R?R(v,k):void 0}},p=new Set,c=new Set,f=ao(this.injector,this.nodeInterceptors()),g=await this.executeFromNode(l,n,s,a,o,d,p,f,!!o.resumeFrom,c);a.status==="cancelled"||this.isCancelled(a)?(a.status="cancelled",this.finishPendingNodes(a,"skipped"),this.emit(o,a,{type:"workflow-cancelled",status:"cancelled"})):(a.status=g.success?"completed":"failed",!g.success&&g.error&&(a.error=g.error),this.finishPendingNodes(a,(g.success,"skipped")),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:g.success?"workflow-end":"workflow-error",status:a.status,error:g.error})),a.endTime=Date.now(),a.currentNodeId=void 0,this.checkpoint(o,a);let y=We(a);return{success:a.status==="completed",data:{executionId:r,workflowId:e.id,status:a.status,nodeResults:Object.fromEntries(a.nodeResults),executionState:y,...g.data||{}},error:g.error||a.error}}catch(n){return a.status="failed",a.endTime=Date.now(),a.currentNodeId=void 0,a.error=n,this.finishPendingNodes(a,"skipped"),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:"workflow-error",status:"failed",error:n}),this.checkpoint(o,a),{success:!1,error:n,data:{executionId:r,workflowId:e?.id,status:a.status,executionState:We(a)}}}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let o=e?.services||{};return{...e,services:{...t,...o}}}createState(e,t){let o=new Map;(e.nodes||[]).forEach(s=>{o.set(s.id,{nodeId:s.id,status:"pending"})});let r=new Map;return(e.connections||[]).forEach(s=>{r.set(s.id,{connectionId:s.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:o,edgeStates:r,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,o){let r=this.createState(e,o);r.status="running",r.startTime=t.startTime||r.startTime,r.endTime=void 0,r.currentNodeId=void 0,r.activeNodeIds=[],r.logs=[...t.logs||[]];let s=t.nodeStates||{};for(let n of e.nodes||[]){let l=s[n.id];l&&(r.nodeStates?.set(n.id,{...l}),l.result&&r.nodeResults.set(n.id,{success:l.result.success,data:l.result.data,error:l.error?new Error(String(l.error)):void 0}))}let a=t.edgeStates||{};for(let n of e.connections||[]){let l=a[n.id];l&&r.edgeStates?.set(n.id,{...l})}return r}existingNodeResult(e,t,o){return o.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(We(t))}catch{}}async executeFromNode(e,t,o,r,s,a,n,l,d=!1,p=new Set){if(r.status==="cancelled"||this.isCancelled(r))return r.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(n.has(e.id))return r.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};let c=r.nodeStates?.get(e.id),f=c&&(c.status==="success"||c.status==="failed"||c.status==="skipped"||c.status==="cancelled"),g;if(f&&d&&(c.status==="success"||c.status==="failed")){if(p.has(e.id))return this.existingNodeResult(e.id,c,r);p.add(e.id),n.add(e.id),g=this.existingNodeResult(e.id,c,r)}else{if(f)return n.add(e.id),this.existingNodeResult(e.id,c,r);if(e.type==="join"&&!this.isJoinReady(t,r,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};n.add(e.id),g=await l.handleNode({node:e,context:o,host:a,state:r,options:s,emit:k=>this.emit(s,r,k)}),this.checkpoint(s,r)}if(!g.success){let k=t.outgoing.get(e.id)||[],R=k.filter(Z=>Z.sourcePort==="error");if(!R.length)return g;for(let Z of k)Z.sourcePort!=="error"&&this.markEdgeSkipped(r,Z.id,s);let E={...o,error:g.error,errorMessage:g.error?.message,failedNodeId:e.id,failedResult:g};for(let Z of R){let ke=t.nodes.get(Z.targetNodeId);if(!ke)continue;this.markEdgeTraversed(r,Z,s);let Je=await this.executeFromNode(ke,t,E,r,s,a,n,l,d,p);if(!Je.success)return Je}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return g;let y=this.selectNextConnections(e,t,o,g),v=new Set(y.map(k=>k.id));for(let k of t.outgoing.get(e.id)||[])v.has(k.id)||this.markEdgeSkipped(r,k.id,s);if(e.type==="parallel"&&y.length>1)return(await Promise.all(y.map(E=>{let Z=t.nodes.get(E.targetNodeId);return Z?(this.markEdgeTraversed(r,E,s),this.executeFromNode(Z,t,this.mergeContext(o,g,E),r,s,a,n,l,d,p)):Promise.resolve({success:!1,error:new Error(`Missing node ${E.targetNodeId}`)})}))).find(E=>!E.success)||g;for(let k of y){let R=t.nodes.get(k.targetNodeId);if(!R)continue;this.markEdgeTraversed(r,k,s);let E=await this.executeFromNode(R,t,this.mergeContext(o,g,k),r,s,a,n,l,d,p);if(!E.success)return E}return g}mergeContext(e,t,o){return{...e,...t.data||{}}}isJoinReady(e,t,o){let r=e.incoming.get(o)||[];if(!r.length)return!0;let s=r.map(n=>t.nodeStates?.get(n.sourceNodeId)?.status);return s.every(n=>n==="success"||n==="failed"||n==="skipped"||n==="cancelled")&&s.some(n=>n==="success")}selectNextConnections(e,t,o,r){let s=t.outgoing.get(e.id)||[];if(!s.length)return[];if(e.type==="condition"){let a=r.data?.condition?"true":"false",n=s.filter(l=>l.sourcePort===a);return n.length?n:s.filter(l=>l.sourcePort!=="true"&&l.sourcePort!=="false")}if(e.type==="switch"){let a=r.data?.condition,n=a==null?"":String(a),l=s.filter(p=>p.sourcePort===n);if(l.length)return l;let d=s.filter(p=>p.sourcePort==="default");return d.length?d:s.filter(p=>p.sourcePort==="out")}return s.filter(a=>a.sourcePort==="error"?!1:a.condition===void 0||a.condition===null?!0:typeof a.condition=="function"?!!a.condition(o):typeof a.condition=="boolean"?a.condition:!!j(a.condition,o))}markEdgeTraversed(e,t,o){let r=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};r.status!=="traversed"&&(r.status="traversed",r.traversedAt=Date.now(),r.count=(r.count||0)+1,e.edgeStates?.set(t.id,r),this.emit(o,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"}))}markEdgeSkipped(e,t,o){let r=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};r.status!=="traversed"&&(r.status="skipped",e.edgeStates?.set(t,r),this.emit(o,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((o,r)=>{(o.status==="pending"||o.status==="idle")&&(o.status=t,e.nodeStates?.set(r,o))})}finishIdleEdges(e,t){e.edgeStates?.forEach((o,r)=>{(o.status==="idle"||o.status==="active")&&(o.status=t,e.edgeStates?.set(r,o))})}emit(e,t,o){let r=Date.now(),s={...o,executionId:t.executionId,workflowId:t.workflowId,timestamp:r,snapshot:We(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:r,level:this.logLevelFor(o.type,o.status),event:o.type,message:this.logMessageFor(t,o),nodeId:o.nodeId,connectionId:o.connectionId}),t.logs.length>So&&t.logs.splice(0,t.logs.length-So)),e.onEvent)try{e.onEvent(s)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let o=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return o?.success===!1?`Node ${t.nodeId} failed: ${o.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=xo){let t=Math.max(1,Number(e)||xo),o=Array.from(this.executions.values()).filter(r=>r.status!=="running").sort((r,s)=>(r.endTime||0)-(s.endTime||0));for(;o.length>t;){let r=o.shift();r&&this.executions.delete(r.executionId)}}validate(e){return he(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?We(t):void 0}getExecutions(){return Array.from(this.executions.values())}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[ve,T,Q])(ee);h(ee,[[b(),3,void 0,2],[b(),3,void 0,1],[I(),0]]);var Ae=class i{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,o){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,o){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,o){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,o){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:o||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,o){let r={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:o?.sourcePort||"out",targetNodeId:t,targetPort:o?.targetPort||"in",label:o?.label,condition:o?.condition};return this.connections.push(r),this}connectNodes(e,t,o="out",r="in"){return this.connect(e,t,{sourcePort:o,targetPort:r})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new i}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};h(Ae,[[I(),0]]);var fr={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},A=class{constructor(e){this.translator=e,this.model=fr,this.locale="zh-CN",this.theme="light",this.hiddenActions=[]}visible(e){return!(Array.isArray(this.hiddenActions)?this.hiddenActions:[]).includes(e)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,o){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,o)}get runLabel(){return this.t("run","Run")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}run(){(this.runAction||(()=>this.action?.("run")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(A.prototype,"model");Reflect.metadata("design:type",Object)(A.prototype,"locale");Reflect.metadata("design:type",Object)(A.prototype,"theme");Reflect.metadata("design:type",Function)(A.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(A.prototype,"runAction");Reflect.metadata("design:type",Function)(A.prototype,"resumeAction");Reflect.metadata("design:type",Function)(A.prototype,"cancelAction");Reflect.metadata("design:type",Function)(A.prototype,"undoAction");Reflect.metadata("design:type",Function)(A.prototype,"redoAction");Reflect.metadata("design:type",Function)(A.prototype,"deleteAction");Reflect.metadata("design:type",Function)(A.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(A.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(A.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(A.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(A.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(A.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(A.prototype,"saveAction");Reflect.metadata("design:type",Function)(A.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(A.prototype,"clearAction");Reflect.metadata("design:type",Function)(A.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(A.prototype,"action");Reflect.metadata("design:type",Array)(A.prototype,"hiddenActions");Reflect.metadata("design:paramtypes",[N])(A);h(A,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"themeChangeAction"],[u(),1,"runAction"],[u(),1,"resumeAction"],[u(),1,"cancelAction"],[u(),1,"undoAction"],[u(),1,"redoAction"],[u(),1,"deleteAction"],[u(),1,"zoomInAction"],[u(),1,"zoomOutAction"],[u(),1,"resetViewAction"],[u(),1,"autoLayoutAction"],[u(),1,"duplicateAction"],[u(),1,"toggleLogsAction"],[u(),1,"saveAction"],[u(),1,"openLibraryAction"],[u(),1,"clearAction"],[u(),1,"toggleJsonAction"],[u(),1,"action"],[u(),1,"hiddenActions"],[b(),3,void 0,0],[x({selector:"workflow-toolbar",template:`
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
    </div>`}),0]]);var Co=["light","dark","solarized","high-contrast"],Ro={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},F=class{constructor(e){this.translator=e,this.model=Ro,this.locale="zh-CN",this.theme="light",this.menuSelect=t=>{if(t.startsWith("theme:")){let o=t.slice(6);Co.includes(o)&&this.themeChangeAction?.(o);return}this.action?.(t)}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get themeName(){return ae(this.theme)?this.theme:"light"}t(e,t){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get menuLabel(){return this.t("menu","Menu")}get menuGroups(){let e=this.model||Ro,t=this.cache;if(t&&t.model===e&&t.theme===this.theme&&t.locale===this.locale)return t.groups;let o=(s,a)=>this.t(s,a),r=[{items:[{id:"save",label:o("save","Save"),shortcut:"Ctrl+S"},{id:"open-library",label:o("library","Workflows")},{id:"toggle-json",label:o("jsonMenu","Import / Export JSON")}]},{items:[{id:"run",label:o("run","Run"),icon:"\u25B6",disabled:e.running||!e.nodeCount},{id:"resume",label:o("resume","Resume"),icon:"\u23F5",disabled:!e.canResume},{id:"cancel",label:o("stop","Stop"),icon:"\u25A0",disabled:!e.running}]},{items:[{id:"undo",label:o("undo","Undo"),shortcut:"Ctrl+Z",disabled:!e.canUndo},{id:"redo",label:o("redo","Redo"),shortcut:"Ctrl+Y",disabled:!e.canRedo},{id:"duplicate",label:o("duplicate","Duplicate"),shortcut:"Ctrl+D",disabled:!e.hasSelection},{id:"delete",label:o("delete","Delete"),shortcut:"Del",disabled:!e.hasSelection,danger:!0},{id:"clear",label:o("clear","Clear"),disabled:!e.nodeCount}]},{items:[{id:"reset-view",label:o("fit","Fit")},{id:"auto-layout",label:o("layout","Auto layout")},{id:"toggle-logs",label:o("logs","Logs")},{id:"theme",label:o("themeMenu","Theme"),icon:"\u25D0",children:Co.map(s=>({id:`theme:${s}`,label:this.themeOptionLabel(s),checked:this.themeName===s}))}]},{items:[{id:"shortcuts",label:o("shortcuts","Keyboard shortcuts"),shortcut:"?"}]}];return this.cache={model:e,theme:this.theme,locale:this.locale,groups:r},r}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}};Reflect.metadata("design:type",Object)(F.prototype,"model");Reflect.metadata("design:type",Object)(F.prototype,"locale");Reflect.metadata("design:type",Object)(F.prototype,"theme");Reflect.metadata("design:type",Function)(F.prototype,"action");Reflect.metadata("design:type",Function)(F.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(F.prototype,"cache");Reflect.metadata("design:paramtypes",[N])(F);h(F,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"action"],[u(),1,"themeChangeAction"],[z(),1,"cache"],[b(),3,void 0,0],[x({selector:"workflow-management-menu",template:`
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="\u2630" label="" caret="\u25BE" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var U=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes",this.isZh?"\u641C\u7D22\u8282\u70B9\u2026":"Search nodes\u2026")}get noMatchesLabel(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches",this.isZh?"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9":"No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(o=>this.matches(o,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(o=>String(o).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(U.prototype,"groups");Reflect.metadata("design:type",Object)(U.prototype,"locale");Reflect.metadata("design:type",Function)(U.prototype,"addAction");Reflect.metadata("design:type",Function)(U.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[N])(U);h(U,[[u(),1,"groups"],[u(),1,"locale"],[u(),1,"addAction"],[u(),1,"dragStartAction"],[b(),3,void 0,0],[x({selector:"workflow-palette",template:`
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
    </div>`}),0]]);var pr={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},H=class{constructor(e){this.elementRef=e,this.model=pr,this.locale="zh-CN"}get emptyHint(){return String(this.locale||"").toLowerCase().startsWith("zh")?"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0":"Drag a component from the palette, or click one to add it"}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,o){return{class:`workflow-node-port workflow-node-port-${o}`,"data-port-id":t.id,"data-port-side":o,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,o=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,o-this.panStart.clientY),this.panStart={clientX:t,clientY:o}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,o,r){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}portUp(e,t,o,r){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,o=this.model.pan||{x:0,y:0},r=this.elementRef?.nativeElement,s=r?.querySelector?.(".workflow-canvas")||r,a=s?.getBoundingClientRect?.()||{left:0,top:0},n=Number(e?.clientX),l=Number(e?.clientY),d=(Number.isFinite(n)?n:0)-(a.left||0)+(s?.scrollLeft||0),p=(Number.isFinite(l)?l:0)-(a.top||0)+(s?.scrollTop||0);return{x:(d-o.x)/t,y:(p-o.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)(H.prototype,"model");Reflect.metadata("design:type",Object)(H.prototype,"locale");Reflect.metadata("design:type",Function)(H.prototype,"pointerAction");Reflect.metadata("design:type",Function)(H.prototype,"panAction");Reflect.metadata("design:paramtypes",[ie])(H);h(H,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"pointerAction"],[u(),1,"panAction"],[b(),3,void 0,0],[x({selector:"workflow-canvas",template:`
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
    </div>`}),0]]);var Io={hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function hr(i){return i.hasSelection?JSON.stringify([i.nodeId,i.name,i.description,i.typeLabel,i.status,i.statusLabel,i.durationLabel,i.resultText,i.errorText,i.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var P=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=Io,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let o=this.changeType(t.field);if(o==="code"){this.queueChange(t.key,t.value,o);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,o,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||Io,o=hr(t);o!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=o,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage",this.isZh?"\u5FC5\u586B\u9879":"Required")}get numberMessage(){return this.t("numberMessage",this.isZh?"\u6570\u503C\u8D85\u51FA\u8303\u56F4":"Number out of range")}get patternMessage(){return this.t("patternMessage",this.isZh?"\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid format")}get jsonMessage(){return this.t("jsonMessage",this.isZh?"JSON \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid JSON")}get emailMessage(){return this.t("invalidEmail",this.isZh?"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid email address")}get urlMessage(){return this.t("invalidUrl",this.isZh?"URL \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid URL")}get integerMessage(){return this.t("integerMessage",this.isZh?"\u8BF7\u8F93\u5165\u6574\u6570":"Must be an integer")}get formSchema(){let e=[];return this._model.hasSelection?(e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),this._model.fields.forEach(t=>{e.push({key:t.key,type:this.dynamicType(t),label:t.label,placeholder:t.placeholder,description:t.description,group:t.group,options:t.options.map(o=>({label:o.label,value:o.value})),defaultValue:t.hasDefault?t.resetValue:void 0,rows:t.rows,min:t.min,max:t.max,step:t.step,required:t.required,readonly:t.readonly,pattern:t.pattern,language:t.language,suggestions:this.codeSuggestions,hidden:t.visible===!1})}),{fields:e}):{fields:e}}get formValue(){let e={name:this._model.name,description:this._model.description};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){switch(e.type){case"code":return"code";case"json":return"json";case"textarea":return"textarea";case"boolean":return"checkbox";case"select":return"radio";case"number":return"number";default:return"text"}}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"code":return"code";default:return"text"}}queueChange(e,t,o){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:o,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let r=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),r)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(P.prototype,"locale");Reflect.metadata("design:type",Object)(P.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(P.prototype,"changeAction");Reflect.metadata("design:type",Function)(P.prototype,"restoreAction");Reflect.metadata("design:type",Array)(P.prototype,"codeSuggestions");Reflect.metadata("design:type",ut)(P.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[N])(P);Reflect.metadata("design:paramtypes",[])(P.prototype,"model");Reflect.metadata("design:returntype",Object)(P.prototype,"model");h(P,[[u(),1,"locale"],[u(),1,"codeChangeDelay"],[u(),1,"changeAction"],[u(),1,"restoreAction"],[u(),1,"codeSuggestions"],[Ke("nodeForm",ut),1,"nodeForm"],[b(),3,void 0,0],[u(),1,"model"],[x({selector:"workflow-inspector",template:`
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
    </div>`}),0]]);var te=class{constructor(){this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return this.isZh?"\u8FD0\u884C\u5386\u53F2":"Runs"}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(te.prototype,"items");Reflect.metadata("design:type",Object)(te.prototype,"locale");Reflect.metadata("design:type",Function)(te.prototype,"selectAction");h(te,[[u(),1,"items"],[u(),1,"locale"],[u(),1,"selectAction"],[x({selector:"workflow-run-history",template:`
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
    </div>`}),0]]);var J=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle",this.isZh?"\u6267\u884C\u65E5\u5FD7":"Execution log")}get closeLabel(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close",this.isZh?"\u5173\u95ED":"Close")}levelLabel(e){let t={info:this.isZh?"\u4FE1\u606F":"INFO",success:this.isZh?"\u6210\u529F":"OK",warning:this.isZh?"\u544A\u8B66":"WARN",error:this.isZh?"\u9519\u8BEF":"ERROR"};return S(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),o=r=>String(r).padStart(2,"0");return`${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(J.prototype,"items");Reflect.metadata("design:type",Object)(J.prototype,"visible");Reflect.metadata("design:type",Object)(J.prototype,"locale");Reflect.metadata("design:type",Function)(J.prototype,"closeAction");Reflect.metadata("design:paramtypes",[N])(J);h(J,[[u(),1,"items"],[u(),1,"visible"],[u(),1,"locale"],[u(),1,"closeAction"],[b(),3,void 0,0],[x({selector:"workflow-run-log",template:`
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
    </div>`}),0]]);var O=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",this.isZh?`${e.nodeCount} \u4E2A\u8282\u70B9`:`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(O.prototype,"items");Reflect.metadata("design:type",Object)(O.prototype,"visible");Reflect.metadata("design:type",Object)(O.prototype,"currentId");Reflect.metadata("design:type",Object)(O.prototype,"locale");Reflect.metadata("design:type",Object)(O.prototype,"error");Reflect.metadata("design:type",Function)(O.prototype,"saveAction");Reflect.metadata("design:type",Function)(O.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(O.prototype,"openAction");Reflect.metadata("design:type",Function)(O.prototype,"removeAction");Reflect.metadata("design:type",Function)(O.prototype,"closeAction");Reflect.metadata("design:paramtypes",[N])(O);h(O,[[u(),1,"items"],[u(),1,"visible"],[u(),1,"currentId"],[u(),1,"locale"],[u(),1,"error"],[u(),1,"saveAction"],[u(),1,"saveAsAction"],[u(),1,"openAction"],[u(),1,"removeAction"],[u(),1,"closeAction"],[b(),3,void 0,0],[x({selector:"workflow-library",template:`
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
    </div>`}),0]]);var Ao="tsdi-workflow-designer-styles",mr=`
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
`;function it(i){if(!i||typeof i.createElement!="function"||!i.head||i.getElementById&&i.getElementById(Ao))return;let e=i.createElement("style");e.setAttribute("id",Ao),e.textContent=mr,i.head.appendChild(e)}var C=class{constructor(e,t,o){this.translator=t,this.elementRef=o,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.saveState="saved",this.hiddenActions=[],this.showRunHistory=!0,this.showStatusbar=!0,this.showRunLogs=!0,this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.jsonText="",this.jsonError="",this.notifyChange=()=>{this.autosaveAction?.()},this.handleToolbarAction=r=>{let s=this.selfRef||this;switch(r){case"run":this.designer.run({context:this.runContext});break;case"resume":s.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":s.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":s.showLogs=!s.showLogs;break;case"save":s.hostAction?.("save");break;case"open-library":s.hostAction?.("open-library");break;case"clear":this.designer.clear();break;case"toggle-json":s.toggleJson();break;case"shortcuts":s.toggleShortcuts();break;default:break}s.notifyChange()},this.fitView=()=>{let r=this.canvasViewport(),s=this.designer.nodes;if(!r||!s.length){this.designer.resetView();return}let a=48,n=1/0,l=1/0,d=-1/0,p=-1/0;s.forEach(E=>{let Z=At(E);n=Math.min(n,E.position.x),l=Math.min(l,E.position.y),d=Math.max(d,E.position.x+Z.width),p=Math.max(p,E.position.y+Z.height)});let c=Math.max(1,d-n),f=Math.max(1,p-l),g=Math.max(.25,Math.min(1.25,Math.min((r.width-a*2)/c,(r.height-a*2)/f)));this.designer.setZoom(g);let y=this.designer.zoom||1;this.designer.pan={x:Math.round((r.width-c*y)/2-n*y),y:Math.round((r.height-f*y)/2-l*y)};let v=this.elementRef?.nativeElement,k=globalThis.document,R=v?.querySelector?.(".workflow-canvas")||k?.querySelector?.(".workflow-canvas");R&&(R.scrollLeft=0,R.scrollTop=0)},this.addFromPalette=r=>{let s=this.selfRef||this;this.designer.addNode(r.type,this.nextAddPosition()),s.notifyChange()},this.paletteDragStart=(r,s)=>{this.pendingNodeType=s.type,this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:s.label}},this.handlePan=(r,s)=>{this.designer.panBy(r,s)},this.selectRun=r=>{this.designer.selectExecution(r)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let r=this.selfRef||this;r.showLogs=!1},this.handleCanvas=r=>{let s=this.designer;switch(r.type){case"background-down":s.connectionDraft?s.cancelConnection():s.clearSelection();break;case"pointer-move":r.world&&(s.drag?s.dragNodeTo(r.world):s.connectionDraft&&s.updateConnectionDraft(r.world));break;case"pointer-up":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"pointer-leave":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"node-down":s.connectionDraft&&r.nodeId?this.connectToNode(r.nodeId):r.nodeId&&r.world&&s.beginNodeDrag(r.nodeId,r.world);break;case"node-up":s.drag?s.endNodeDrag():s.connectionDraft&&r.nodeId&&this.connectToNode(r.nodeId);break;case"edge-click":r.connectionId&&s.selectConnection(r.connectionId);break;case"port-down":{let a=r.portType==="input"?"input":"output";if(!r.nodeId||!r.portId||!r.world)break;let n=s.connectionDraft;if(n){if((n.sourceSide||"output")!==a){s.completeConnection(r.nodeId,r.portId);break}s.cancelConnection()}s.beginConnection(r.nodeId,r.portId,r.world,a);break}case"port-up":{let a=s.connectionDraft;if(!a||!r.nodeId||!r.portId)break;let n=r.portType==="input"?"input":"output",l=a.sourceSide||"output";n!==l?s.completeConnection(r.nodeId,r.portId):(r.nodeId!==a.sourceNodeId||r.portId!==a.sourcePort)&&s.cancelConnection();break}case"drop":{let a=r.nodeType||this.pendingNodeType;this.pendingNodeType=void 0,a&&r.world&&s.addNode(a,{x:Math.round(r.world.x-92),y:Math.round(r.world.y-32)});break}case"key-down":this.handleKey(r);break;case"wheel":{let a=this.canvasRect();if(r.ctrlKey||r.metaKey)this.zoomAtPoint(r,a);else{let n=!!r.shiftKey,l=Number(r.deltaX)||0,d=Number(r.deltaY)||0,p=n&&!l?d:l,c=n&&!l?0:d;s.panBy(-p,-c)}break}default:break}(r.type==="pointer-up"||r.type==="node-up"||r.type==="drop"||r.type==="port-down"||r.type==="port-up"||r.type==="key-down")&&this.notifyChange()},this.inspectorRestore=()=>{let r=this.designer.selectedNode;r&&(this.designer.resetNodeConfig(r.id),this.notifyChange())},this.inspectorChange=(r,s,a,n)=>{let l=n?this.designer.nodes.find(p=>p.id===n):this.designer.selectedNode;if(!l)return;if(r==="name"){this.designer.renameNode(l.id,String(s)),this.notifyChange();return}if(r==="description"){this.designer.updateNode(l.id,{description:String(s)}),this.notifyChange();return}let d=s;if(a==="json")if(String(s??"").trim()==="")d=void 0;else try{d=JSON.parse(String(s))}catch(p){this.designer.error=`Invalid JSON: ${p.message}`;return}else if(a==="number"){if(d=s===""||s===void 0||s===null?void 0:Number(s),typeof d=="number"&&!Number.isFinite(d)){this.designer.error="Invalid number";return}}else a==="boolean"?d=!!s:d=String(s??"");this.designer.updateNodeConfig(l.id,{[r]:d}),this.notifyChange()},Pt(o),this.documentRef=e;try{e&&(e[K]=!0)}catch{}it(e),_t(e),Ft(e),Ye(e),xe(e,this.themeName)}onInit(){this.selfRef=this,this.registry||(this.registry=new T),this.autoRun&&this.designer&&this.designer.run({context:this.runContext})}onDestroy(){}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ae(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}setTheme(e){this.theme=ae(e)?e:"light";let t=this.documentRef||globalThis.document;xe(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return S(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get visibleActions(){return Array.isArray(this.hiddenActions)?this.hiddenActions:[]}visibleAction(e){return!this.visibleActions.includes(e)}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let o=wo(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:o},o}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let o=mo(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:o},o}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,o=this.localeValue,r=this.registry.revision,s=e?.id||"",a=e?.name||"",n=e?.description||"",l=e?.type||"",d=e?.config,p=this.inspectorModelCache;if(p&&p.nodeId===s&&p.name===a&&p.description===n&&p.type===l&&p.config===d&&p.execution===t&&p.locale===o&&p.revision===r)return p.model;let c=go(this.designer,this.registry,o,this.translator);return this.inspectorModelCache={nodeId:s,name:a,description:n,type:l,config:d,execution:t,locale:o,revision:r,model:c},c}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let o=bo(this.designer,this.localeValue,this.translator);return this.toolbarModelCache={key:e,model:o},o}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let o=yo(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:o},o}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,o=this.localeValue,r=this.runHistoryCache;if(r&&r.history===e&&r.selected===t&&r.locale===o)return r.model;let s=ko(this.designer,o,this.translator);return this.runHistoryCache={history:e,selected:t,locale:o,model:s},s}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let o=e?.logs||[];return this.runLogsCache={execution:e,logs:o},o}get codeSuggestions(){let e=this.designer.nodes.map(a=>[a.id,a.type,a.config?.action||"",a.config?.field||"",a.config?.target||"",JSON.stringify(a.config?.values||""),JSON.stringify(a.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let o=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),r=a=>{typeof a=="string"&&a.trim()&&o.add(a.trim())};this.designer.nodes.forEach(a=>{let n=a.config||{};if(typeof n.action=="string"){let l=n.action.replace(/^actions\./,"");r(`context.actions.${l}`),r(`input.actions.${l}`)}typeof n.field=="string"&&(r(n.field),n.field.includes(".")||r(`variables.${n.field}`)),typeof n.target=="string"&&r(n.target.includes(".")?n.target:`variables.${n.target}`),n.values&&typeof n.values=="object"&&Object.keys(n.values).forEach(l=>r(`variables.${l}`)),n.result&&typeof n.result=="object"&&Object.keys(n.result).forEach(l=>r(`input.${l}`)),typeof n.event=="string"&&r(`context.events.${n.event}`)});let s=Array.from(o).slice(0,240);return this.codeSuggestionCache={key:e,values:s},s}canvasModelKey(){let e=this.designer,t=e.execution,o=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],r=e.connectionDraft;return o.push(r?`draft:${r.sourceNodeId}:${r.sourcePort}:${r.sourceSide||"output"}:${r.x}:${r.y}`:""),(e.nodes||[]).forEach(s=>{o.push([s.id,s.name,s.type,s.description||"",s.position?.x,s.position?.y,s.dimension?.width||"",s.dimension?.height||"",s.style?.icon||"",s.style?.backgroundColor||"",s.style?.textColor||"",(s.inputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),(s.outputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),t?.nodeStates?.[s.id]?.status||""].join(":"))}),(e.connections||[]).forEach(s=>{o.push([s.id,s.sourceNodeId,s.sourcePort,s.targetNodeId,s.targetPort,s.label||"",t?.edgeStates?.[s.id]?.status||""].join(":"))}),o.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},o=this.viewportBounds(),r=t;return o&&(t.x>=o.left&&t.x+184<=o.right&&t.y>=o.top&&t.y+64<=o.bottom||(r={x:Math.round((o.left+o.right)/2-92),y:Math.round((o.top+o.bottom)/2-32)})),this.findFreePosition(r)}canvasViewport(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{width:r.width,height:r.height}}canvasRect(){let e=this.elementRef?.nativeElement,o=(e?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{left:o.left,top:o.top,width:o.width,height:o.height}}zoomAtPoint(e,t){let o=Number(e.deltaY)||0;if(!o)return;let r=this.designer,s=r.zoom||1,a=o<0?1.1:.9,n=Math.max(.2,Math.min(2.5,s*a)),l=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),p=r.pan||{x:0,y:0},c=(l-p.x)/s,f=(d-p.y)/s;r.setZoom(n);let g=r.zoom||n;r.pan={x:Math.round(l-c*g),y:Math.round(d-f*g)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,o=this.designer.pan||{x:0,y:0};return{left:-o.x/t,top:-o.y/t,right:(e.width-o.x)/t,bottom:(e.height-o.y)/t}}findFreePosition(e){let r=[0,1,-1,2,-2,3,-3];for(let s=0;s<30;s++)for(let a of r){let n={x:e.x+a*220,y:e.y+s*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-n.x)<184&&Math.abs(d.position.y-n.y)<64))return n}return e}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let o=this.designer.nodes.find(s=>s.id===e);if(!o){this.designer.cancelConnection();return}let r=t.sourceSide==="input"?o.outputs:o.inputs;if(!r?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,r[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.notifyChange()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",X)(C.prototype,"designer");Reflect.metadata("design:type",T)(C.prototype,"registry");Reflect.metadata("design:type",Object)(C.prototype,"locale");Reflect.metadata("design:type",Object)(C.prototype,"theme");Reflect.metadata("design:type",Function)(C.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(C.prototype,"runContext");Reflect.metadata("design:type",Object)(C.prototype,"autoRun");Reflect.metadata("design:type",Object)(C.prototype,"saveState");Reflect.metadata("design:type",Array)(C.prototype,"hiddenActions");Reflect.metadata("design:type",Object)(C.prototype,"showRunHistory");Reflect.metadata("design:type",Object)(C.prototype,"showStatusbar");Reflect.metadata("design:type",Object)(C.prototype,"showRunLogs");Reflect.metadata("design:type",Function)(C.prototype,"hostAction");Reflect.metadata("design:type",Function)(C.prototype,"autosaveAction");Reflect.metadata("design:type",Object)(C.prototype,"documentRef");Reflect.metadata("design:type",Object)(C.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(C.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(C.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(C.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(C.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(C.prototype,"paletteCache");Reflect.metadata("design:type",Object)(C.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(C.prototype,"codeSuggestionCache");Reflect.metadata("design:paramtypes",[Object,N,ie])(C);h(C,[[u(),1,"designer"],[u(),1,"registry"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"themeChangeAction"],[u(),1,"runContext"],[u(),1,"autoRun"],[u(),1,"saveState"],[u(),1,"hiddenActions"],[u(),1,"showRunHistory"],[u(),1,"showStatusbar"],[u(),1,"showRunLogs"],[u(),1,"hostAction"],[u(),1,"autosaveAction"],[z(),1,"documentRef"],[z(),1,"canvasModelCache"],[z(),1,"toolbarModelCache"],[z(),1,"inspectorModelCache"],[z(),1,"runHistoryCache"],[z(),1,"statusModelCache"],[z(),1,"paletteCache"],[z(),1,"runLogsCache"],[z(),1,"codeSuggestionCache"],[b(),3,void 0,2],[b(),3,void 0,1],[D(se),3,void 0,0],[b(),3,void 0,0],[x({selector:"workflow-designer-preview",template:`
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
    </div>`}),0]]);var L=class{constructor(e,t,o,r,s,a){this.translator=r,this.elementRef=a,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=so(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.previewHiddenActions=["save","open-library"],this.showLibrary=!1,this.libraryError="",this.libraryItems=[],this.autosaveInFlight=!1,this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let l=this.selfRef||this;l.designer?.dirty&&(l.saveState!=="saving"&&(l.saveState="dirty"),l.autosave&&(l.clearAutosaveTimer(),l.autosaveTimer=setTimeout(()=>{l.autosaveTimer=void 0,l.performAutosave()},Math.max(0,Number(l.autosaveDelay)||0))))},this.toolbarAction=l=>{if(l==="save"){this.saveWorkflow();return}if(l==="open-library"){this.openLibrary();return}this.preview?.handleToolbarAction(l)},this.previewHostAction=l=>{this.toolbarAction(l)},this.fitView=()=>{this.preview?.fitView()},this.openLibrary=async()=>{let l=this.selfRef||this;try{l.libraryItems=await l.designer.listSaved(l.store),l.libraryError=""}catch(d){l.libraryError=d.message}l.showLibrary=!0},this.saveWorkflow=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store);let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.saveWorkflowAs=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store,{as:!0,name:`${l.designer.definition.name} copy`});let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.loadWorkflow=async l=>{let d=this.selfRef||this,p=d.workflowTabs.find(f=>f.id===l);if(p){try{let f=await d.store.get(l);if(!f){d.libraryError=`${d.t("notFound","Workflow not found")}: ${l}`;return}p.designer.load(f),d.setActiveTab(p),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(f){d.libraryError=f.message}return}await d.openWorkflowTab(l)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async l=>{let d=this.selfRef||this;try{d.workflowTabs.some(p=>p.id===l)&&await d.closeWorkflowTab(l),await d.designer.removeSaved(d.store,l),await d.refreshLibrary()}catch(p){d.libraryError=p.message}},this.closeLibrary=()=>{let l=this.selfRef||this;l.showLibrary=!1},this.documentRef=o;try{o&&(o[K]=!0)}catch{}this.registry=e||new T,this.service=t,this.reactiveEffect=s,it(o),xe(o,this.themeName);let n=new X({registry:this.registry,service:t,definition:Rt(this.registry,this.localeValue,r)});this.designer=s?Le(n,s):n,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=this.documentRef;e?.removeEventListener&&this.keyHandler&&e.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ae(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get toolbarModel(){return this.preview?.toolbarModel}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=no(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let o=e.createTab(t);e.workflowTabs.push(o),e.setActiveTab(o),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(r=>r.id===e))return await t.activateWorkflowTab(e),!0;try{let r=await t.store.get(e);if(!r)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let s=t.createTab(r,!0);return t.workflowTabs.push(s),t.setActiveTab(s),t.emitTabs(),!0}catch(r){return t.libraryError=r.message,!1}}async restoreWorkflowTabs(e,t){let o=this.selfRef||this,r=[],s;try{s=new Set((await o.store.list()).map(n=>n.id))}catch{s=new Set(e||[])}for(let n of Array.from(new Set(e||[])))if(!(!n||!s.has(n)))try{let l=await o.store.get(n);l&&r.push(o.createTab(l,!0))}catch{}if(!r.length)return!1;o.workflowTabs=r;let a=r.find(n=>n.id===t)||r[0];return o.setActiveTab(a),o.emitTabs(),!0}createTab(e,t=!1){let o=new X({registry:this.registry,service:this.service,definition:e}),r=this.reactiveEffect?Le(o,this.reactiveEffect):o;return{id:r.definition.id,designer:r,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.find(r=>r.id===e);!o||o.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(o),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.findIndex(s=>s.id===e);if(o<0)return;let[r]=t.workflowTabs.splice(o,1);if(t.autosave&&r.designer.dirty)try{await t.saveTab(r)}catch{}if(t.activeTabId===e){let s=t.workflowTabs[Math.min(o,t.workflowTabs.length-1)];s?t.setActiveTab(s):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,o=e.id,r=e.designer.definition.id;o!==r&&(e.id=r,t.activeTabId===o&&(t.activeTabId=r),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(r=>r.persisted),o=e.activeTab();e.tabChangeAction?.({openIds:t.map(r=>r.id),activeId:o?.persisted?o.id:t[0]?.id})}setTheme(e){this.theme=ae(e)?e:"light";let t=this.documentRef||globalThis.document;xe(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return S(this.translator,this.localeValue,`workflow.ui.${e}`,t)}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,o=String(e?.key||""),r=!!(e?.ctrlKey||e?.metaKey),s=e?.target,a=String(s?.tagName||"").toLowerCase(),n=a==="input"||a==="textarea"||a==="select"||!!s?.isContentEditable;if(r&&(o==="s"||o==="S")){e.preventDefault(),t.saveWorkflow();return}if(r&&(o==="o"||o==="O")){e.preventDefault(),t.openLibrary();return}if(r&&o==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!n&&(o==="?"||o==="F1")){e.preventDefault(),t.preview?.toggleShortcuts();return}o==="Escape"&&t.preview?.showShortcuts&&(e.preventDefault(),t.preview?.closeShortcuts())}get canvasModel(){return this.preview?.canvasModel}get inspectorModel(){return this.preview?.inspectorModel}get statusModel(){return this.preview?.statusModel}get codeSuggestions(){return this.preview?.codeSuggestions??[]}get saveStateLabel(){return this.preview?.saveStateLabel??""}get showLogs(){return!!this.preview?.showLogs}set showLogs(e){this.preview&&(this.preview.showLogs=e)}get jsonText(){return this.preview?.jsonText??""}set jsonText(e){this.preview&&(this.preview.jsonText=e)}toggleJson(){this.preview?.toggleJson()}handleCanvas(e){this.preview?.handleCanvas(e)}toggleShortcuts(){this.preview?.toggleShortcuts()}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await e.designer.listSaved(e.store)}};Reflect.metadata("design:type",Object)(L.prototype,"locale");Reflect.metadata("design:type",Object)(L.prototype,"theme");Reflect.metadata("design:type",Function)(L.prototype,"themeChangeAction");Reflect.metadata("design:type",X)(L.prototype,"designer");Reflect.metadata("design:type",Object)(L.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(L.prototype,"runContext");Reflect.metadata("design:type",Object)(L.prototype,"autoRun");Reflect.metadata("design:type",Object)(L.prototype,"store");Reflect.metadata("design:type",Object)(L.prototype,"autosave");Reflect.metadata("design:type",Object)(L.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(L.prototype,"tabChangeAction");Reflect.metadata("design:type",C)(L.prototype,"preview");Reflect.metadata("design:type",Object)(L.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(L.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(L.prototype,"keyHandler");Reflect.metadata("design:type",Object)(L.prototype,"documentRef");Reflect.metadata("design:paramtypes",[T,ee,Object,N,Be,ie])(L);h(L,[[u(),1,"locale"],[u(),1,"theme"],[u(),1,"themeChangeAction"],[u(),1,"designer"],[u(),1,"initialDefinition"],[u(),1,"runContext"],[u(),1,"autoRun"],[u(),1,"store"],[u(),1,"autosave"],[u(),1,"autosaveDelay"],[u(),1,"tabChangeAction"],[Ke("preview",C),1,"preview"],[z(),1,"autosaveTimer"],[z(),1,"autosaveInFlight"],[z(),1,"keyHandler"],[z(),1,"documentRef"],[b(),3,void 0,5],[b(),3,void 0,4],[b(),3,void 0,3],[D(se),3,void 0,2],[b(),3,void 0,2],[b(),3,void 0,1],[b(),3,void 0,0],[x({selector:"workflow-designer",template:`
    <div class="workflow-designer" data-theme="{{themeName}}">
        <div class="workflow-global-bar">
            <tab-bar class="workflow-tabs" :source="workflowTabSource"></tab-bar>
            <workflow-management-menu :model="toolbarModel" :locale="locale" :theme="themeName"
                :action="toolbarAction" :themeChangeAction="themeSelectAction"></workflow-management-menu>
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
    </div>`}),0]]);var Ve=class{};h(Ve,[[G({imports:[lt,dt,ft,ct,Re],providers:[ee,Ae,T,le,Q],declarations:[A,U,H,P,te,J,O,C,F,L],exports:[lt,dt,ft,ct,Re,ee,Ae,T,le,Q,A,U,H,P,te,J,O,C,F,L]}),0]]);var Te={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function Ne(i,e,t,o){return{id:i,name:e,type:t,label:o}}var wr=[{type:Te.route,label:"Gateway route",labelZh:"\u7F51\u5173\u8DEF\u7531",description:"Forward matching requests to a microservice or static upstream",descriptionZh:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[Ne("in","in","input","Input")],outputs:[Ne("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",labelZh:"\u5165\u53E3\u8DEF\u5F84",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value.",descriptionZh:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002"},{key:"service",label:"Service",labelZh:"\u670D\u52A1\u540D",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",labelZh:"\u4E0A\u6E38\u5730\u5740",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",labelZh:"\u4E0A\u6E38\u8DEF\u5F84",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",labelZh:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",min:0,step:100},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"headers",label:"Request headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",labelZh:"\u54CD\u5E94\u5934",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",labelZh:"\u9650\u6D41",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",labelZh:"\u7F13\u5B58",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",labelZh:"\u7194\u65AD",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",labelZh:"\u9694\u79BB\u8231",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:Te.condition,label:"Gateway condition",labelZh:"\u7F51\u5173\u6761\u4EF6",description:"Match path, method, host, header or query values",descriptionZh:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[Ne("in","in","input","Input")],outputs:[Ne("true","true","output","True"),Ne("false","false","output","False")],fields:[{key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"select",defaultValue:"path",options:[{label:"Path",labelZh:"\u8DEF\u5F84",value:"path"},{label:"Method",labelZh:"\u65B9\u6CD5",value:"method"},{label:"Host",labelZh:"\u4E3B\u673A",value:"host"},{label:"Header",labelZh:"\u8BF7\u6C42\u5934",value:"header"},{label:"Query",labelZh:"\u67E5\u8BE2\u53C2\u6570",value:"query"}]},{key:"name",label:"Header / query name",labelZh:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"equals",options:[{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"prefix",labelZh:"\u524D\u7F00",value:"prefix"},{label:"not prefix",labelZh:"\u975E\u524D\u7F00",value:"not-prefix"},{label:"exists",labelZh:"\u5B58\u5728",value:"exists"},{label:"not exists",labelZh:"\u4E0D\u5B58\u5728",value:"not-exists"}]},{key:"value",label:"Value",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:Te.deny,label:"Gateway deny",labelZh:"\u7F51\u5173\u62D2\u7EDD",description:"Reject matching requests at the gateway",descriptionZh:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[Ne("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",labelZh:"\u72B6\u6001\u7801",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"body",label:"Body",labelZh:"\u54CD\u5E94\u4F53",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function qe(i){return wr.forEach(e=>i.register(e)),i}function gr(){return qe(new T)}function Nt(i="zh-CN"){let e=i==="zh-CN",t=gr(),o=(p,c,f,g,y,v)=>t.createNode(p,{x:g,y},{id:c,name:f,config:v}),r=o("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),s=o(Te.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),a=o(Te.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),n=o(Te.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),l=(p,c,f,g)=>({id:p,sourceNodeId:c,sourcePort:f,targetNodeId:g,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[r,s,a,n],connections:[l("conn_1","start_1","out","condition_1"),l("conn_2","condition_1","true","route_1"),l("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}var at=class{constructor(e){this.http=e}async list(){let e=await this.http.listRules();if(!e.ok)return[];let t=e.body;return Array.isArray(t)?t:Array.isArray(t?.items)?t.items:[]}async get(e){let t=await this.http.getRule(e);if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return t.body}}async save(e){let t=await this.http.saveRule(e);if(!t.ok)throw new Error(t.body?.message||t.body?.error||`Failed to apply gateway rules: HTTP ${t.status}`);return t.body?.summary??io(e)}async remove(e){let t=await this.http.removeRule(e);return t.ok||t.status===404}async clear(){let e=await this.list();await Promise.all(e.map(t=>this.remove(t.id)))}};var No={en:{"brand.name":"Gateway","brand.subtitle":"Microservice control","nav.overview":"Overview","nav.routes":"Routes","nav.rules":"Rules","sidebar.live":"Live gateway runtime","sidebar.sso":"SSO protected","sidebar.signOut":"Sign out","top.refresh":"Refresh","top.language":"Language","top.theme":"Theme","top.menu":"Menu","theme.light":"Light","theme.dark":"Dark","page.overview.title":"Overview","page.overview.subtitle":"Live operational view of the gateway runtime.","page.routes.title":"Routes","page.routes.subtitle":"Manage discovered and static gateway routes.","page.rules.title":"Rules","page.rules.subtitle":"Visual workflows compiled into gateway decisions.","metric.routes":"Routes","metric.enabled":"{count} enabled","metric.services":"Services","metric.discoveryTargets":"discovery targets","metric.rules":"Gateway rules","metric.compiled":"compiled from visual workflows","metric.runtime":"Runtime","metric.healthy":"Healthy","metric.localAdmin":"local/admin service","card.routeTable":"Route table","card.routeTableDesc":"Traffic is matched in table order.","card.manageRoutes":"Manage routes","card.noRoutes":"No routes configured.","card.rules":"Gateway rules","card.rulesDesc":"Evaluated before the route table.","card.manageRules":"Manage rules","card.noRules":"No rules configured.","card.conditions":"{count} condition(s)","routes.filter":"Filter by path, service or upstream","routes.add":"+ Add route","routes.apply":"Apply changes","table.path":"Path","table.service":"Service","table.upstream":"Upstream","table.discovery":"discovery","table.staticUpstream":"static upstream","table.methods":"Methods","table.status":"Status","table.actions":"Actions","status.enabled":"enabled","status.disabled":"disabled","action.edit":"Edit","action.remove":"Remove","routes.noneFiltered":"No routes match this filter.","common.any":"ANY","common.none":"\u2014","rules.title":"Gateway rules","rules.desc":"Rules are stored as visual workflow documents and compiled into the live gateway runtime.","rules.configure":"Configure rules","rules.compiled":"Compiled rule set","rules.count":"{count} rule(s) \xB7 evaluated by priority before routes.","rules.matchesEvery":"matches every request","rules.priority":"priority {value}","rules.empty":"No compiled rules yet. Open the visual designer to add conditions, route and deny actions.","rule.route":"route","rule.deny":"deny","editor.editTitle":"Edit route","editor.addTitle":"Add route","editor.desc":"Routes are matched in the order shown in the table.","editor.path":"Path","editor.service":"Service","editor.targetUrl":"Target URL","editor.targetPath":"Target path","editor.methods":"Methods","editor.timeout":"Timeout (ms)","editor.stripPrefix":"Strip inbound prefix","editor.enabled":"Route enabled","editor.cancel":"Cancel","editor.save":"Save route","designer.title":"Visual rule designer","designer.desc":"Conditions, route and deny actions compile to gateway rules. The designer is only opened while editing.","designer.cancel":"Cancel","designer.apply":"Apply rules","login.title":"Sign in to Gateway Admin","login.desc":"The gateway management API is protected. Use your organization account to continue.","login.button":"Sign in with SSO","status.loading":"Loading\u2026","status.ready":"Ready \xB7 {routes} route(s) \xB7 {rules} rule(s)","status.offline":"Offline","status.signInRequired":"Sign in required","status.routesApplied":"Routes applied \xB7 {count} route(s)","status.routeStaged":"Route staged \xB7 {count} route(s). Apply changes to publish.","status.routeRemoved":"Route removed locally \xB7 {count} route(s). Apply changes to publish.","status.rulesApplied":"Rules applied \xB7 {count} node(s)","error.routeRequired":"Route requires a path and either service or targetUrl.","error.applyRoutes":"Failed to apply routes: HTTP {status}","error.apiUnavailable":"Gateway admin API unavailable: HTTP {status}"},"zh-CN":{"brand.name":"\u7F51\u5173","brand.subtitle":"\u5FAE\u670D\u52A1\u63A7\u5236\u53F0","nav.overview":"\u6982\u89C8","nav.routes":"\u8DEF\u7531","nav.rules":"\u89C4\u5219","sidebar.live":"\u7F51\u5173\u8FD0\u884C\u65F6","sidebar.sso":"SSO \u5DF2\u4FDD\u62A4","sidebar.signOut":"\u9000\u51FA\u767B\u5F55","top.refresh":"\u5237\u65B0","top.language":"\u8BED\u8A00","top.theme":"\u4E3B\u9898","top.menu":"\u83DC\u5355","theme.light":"\u6D45\u8272","theme.dark":"\u6DF1\u8272","page.overview.title":"\u6982\u89C8","page.overview.subtitle":"\u7F51\u5173\u8FD0\u884C\u65F6\u5B9E\u65F6\u89C6\u56FE\u3002","page.routes.title":"\u8DEF\u7531","page.routes.subtitle":"\u7BA1\u7406\u670D\u52A1\u53D1\u73B0\u4E0E\u9759\u6001\u7F51\u5173\u8DEF\u7531\u3002","page.rules.title":"\u89C4\u5219","page.rules.subtitle":"\u5C06\u53EF\u89C6\u5316\u6D41\u7A0B\u7F16\u8BD1\u4E3A\u7F51\u5173\u51B3\u7B56\u3002","metric.routes":"\u8DEF\u7531","metric.enabled":"{count} \u4E2A\u542F\u7528","metric.services":"\u670D\u52A1","metric.discoveryTargets":"\u4E2A\u53D1\u73B0\u76EE\u6807","metric.rules":"\u7F51\u5173\u89C4\u5219","metric.compiled":"\u7531\u53EF\u89C6\u5316\u6D41\u7A0B\u7F16\u8BD1","metric.runtime":"\u8FD0\u884C\u65F6","metric.healthy":"\u5065\u5EB7","metric.localAdmin":"\u672C\u5730/\u7BA1\u7406\u670D\u52A1","card.routeTable":"\u8DEF\u7531\u8868","card.routeTableDesc":"\u6309\u8868\u683C\u987A\u5E8F\u5339\u914D\u6D41\u91CF\u3002","card.manageRoutes":"\u7BA1\u7406\u8DEF\u7531","card.noRoutes":"\u5C1A\u672A\u914D\u7F6E\u8DEF\u7531\u3002","card.rules":"\u7F51\u5173\u89C4\u5219","card.rulesDesc":"\u5728\u8DEF\u7531\u8868\u4E4B\u524D\u6267\u884C\u3002","card.manageRules":"\u7BA1\u7406\u89C4\u5219","card.noRules":"\u5C1A\u672A\u914D\u7F6E\u89C4\u5219\u3002","card.conditions":"{count} \u4E2A\u6761\u4EF6","routes.filter":"\u6309\u8DEF\u5F84\u3001\u670D\u52A1\u6216\u4E0A\u6E38\u8FC7\u6EE4","routes.add":"+ \u6DFB\u52A0\u8DEF\u7531","routes.apply":"\u5E94\u7528\u66F4\u6539","table.path":"\u8DEF\u5F84","table.service":"\u670D\u52A1","table.upstream":"\u4E0A\u6E38","table.discovery":"\u670D\u52A1\u53D1\u73B0","table.staticUpstream":"\u9759\u6001\u4E0A\u6E38","table.methods":"\u65B9\u6CD5","table.status":"\u72B6\u6001","table.actions":"\u64CD\u4F5C","status.enabled":"\u542F\u7528","status.disabled":"\u505C\u7528","action.edit":"\u7F16\u8F91","action.remove":"\u5220\u9664","routes.noneFiltered":"\u6CA1\u6709\u7B26\u5408\u8FC7\u6EE4\u6761\u4EF6\u7684\u8DEF\u7531\u3002","common.any":"\u4EFB\u610F","common.none":"\u2014","rules.title":"\u7F51\u5173\u89C4\u5219","rules.desc":"\u89C4\u5219\u4EE5\u53EF\u89C6\u5316\u6D41\u7A0B\u6587\u6863\u5B58\u50A8\uFF0C\u5E76\u7F16\u8BD1\u5230\u8FD0\u884C\u4E2D\u7684\u7F51\u5173\u3002","rules.configure":"\u914D\u7F6E\u89C4\u5219","rules.compiled":"\u5DF2\u7F16\u8BD1\u89C4\u5219","rules.count":"{count} \u6761\u89C4\u5219 \xB7 \u6309\u4F18\u5148\u7EA7\u5728\u8DEF\u7531\u524D\u6267\u884C\u3002","rules.matchesEvery":"\u5339\u914D\u6240\u6709\u8BF7\u6C42","rules.priority":"\u4F18\u5148\u7EA7 {value}","rules.empty":"\u5C1A\u65E0\u7F16\u8BD1\u89C4\u5219\u3002\u6253\u5F00\u53EF\u89C6\u5316\u8BBE\u8BA1\u5668\u6DFB\u52A0\u6761\u4EF6\u3001\u8DEF\u7531\u548C\u62D2\u7EDD\u52A8\u4F5C\u3002","rule.route":"\u8DEF\u7531","rule.deny":"\u62D2\u7EDD","editor.editTitle":"\u7F16\u8F91\u8DEF\u7531","editor.addTitle":"\u6DFB\u52A0\u8DEF\u7531","editor.desc":"\u8DEF\u7531\u6309\u8868\u683C\u4E2D\u7684\u987A\u5E8F\u5339\u914D\u3002","editor.path":"\u8DEF\u5F84","editor.service":"\u670D\u52A1","editor.targetUrl":"\u4E0A\u6E38\u5730\u5740","editor.targetPath":"\u4E0A\u6E38\u8DEF\u5F84","editor.methods":"\u65B9\u6CD5","editor.timeout":"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09","editor.stripPrefix":"\u53BB\u6389\u5165\u53E3\u524D\u7F00","editor.enabled":"\u542F\u7528\u8DEF\u7531","editor.cancel":"\u53D6\u6D88","editor.save":"\u4FDD\u5B58\u8DEF\u7531","designer.title":"\u53EF\u89C6\u5316\u89C4\u5219\u8BBE\u8BA1\u5668","designer.desc":"\u6761\u4EF6\u3001\u8DEF\u7531\u4E0E\u62D2\u7EDD\u52A8\u4F5C\u4F1A\u7F16\u8BD1\u4E3A\u7F51\u5173\u89C4\u5219\u3002\u4EC5\u5728\u7F16\u8F91\u65F6\u6253\u5F00\u8BBE\u8BA1\u5668\u3002","designer.cancel":"\u53D6\u6D88","designer.apply":"\u5E94\u7528\u89C4\u5219","login.title":"\u767B\u5F55\u7F51\u5173\u7BA1\u7406\u53F0","login.desc":"\u7F51\u5173\u7BA1\u7406 API \u5DF2\u542F\u7528\u4FDD\u62A4\uFF0C\u8BF7\u4F7F\u7528\u7EC4\u7EC7\u8D26\u53F7\u7EE7\u7EED\u3002","login.button":"\u4F7F\u7528 SSO \u767B\u5F55","status.loading":"\u52A0\u8F7D\u4E2D\u2026","status.ready":"\u5C31\u7EEA \xB7 {routes} \u6761\u8DEF\u7531 \xB7 {rules} \u6761\u89C4\u5219","status.offline":"\u79BB\u7EBF","status.signInRequired":"\u9700\u8981\u767B\u5F55","status.routesApplied":"\u8DEF\u7531\u5DF2\u5E94\u7528 \xB7 {count} \u6761","status.routeStaged":"\u8DEF\u7531\u5DF2\u6682\u5B58 \xB7 {count} \u6761\u3002\u5E94\u7528\u66F4\u6539\u540E\u53D1\u5E03\u3002","status.routeRemoved":"\u8DEF\u7531\u5DF2\u672C\u5730\u5220\u9664 \xB7 {count} \u6761\u3002\u5E94\u7528\u66F4\u6539\u540E\u53D1\u5E03\u3002","status.rulesApplied":"\u89C4\u5219\u5DF2\u5E94\u7528 \xB7 {count} \u4E2A\u8282\u70B9","error.routeRequired":"\u8DEF\u7531\u9700\u8981\u8DEF\u5F84\uFF0C\u4EE5\u53CA service \u6216 targetUrl\u3002","error.applyRoutes":"\u5E94\u7528\u8DEF\u7531\u5931\u8D25\uFF1AHTTP {status}","error.apiUnavailable":"\u7F51\u5173\u7BA1\u7406 API \u4E0D\u53EF\u7528\uFF1AHTTP {status}"}};function To(i,e,t){let o=No[i]?.[e]??No.en[e]??e;return t?o.replace(/\{(\w+)\}/g,(r,s)=>String(t[s]??`{${s}}`)):o}var Tt=B("ROUTES"),Et=B("ROUTER_INITIAL_URL");function ye(i){let o=String(i||"/").trim().split("#")[0].split("?")[0];return(o.startsWith("/")?o:`/${o}`).replace(/\/{2,}/g,"/").replace(/\/$/,"")||"/"}function Eo(i){let e=ye(i);return e==="/"?[]:e.slice(1).split("/").filter(Boolean)}function Lo(i,e){let t=(Array.isArray(i)?i:[i]).map(s=>String(s??"").trim()).filter(Boolean),o=ye(t.join("/")),r=Object.entries(e?.queryParams||{}).filter(([,s])=>s!=null).map(([s,a])=>`${encodeURIComponent(s)}=${encodeURIComponent(String(a))}`);return r.length&&(o+=`?${r.join("&")}`),e?.fragment&&(o+=`#${e.fragment}`),o}var $=class{constructor(e=[],t="/",o){this.events=new Zt,this.routes=[],this._url="/",this._activeRoute=null,this._navigating=!1,this.injector=o,this.resetConfig(e),this._url=ye(t);let r=this.match(this.routes,Eo(this._url));this._activeRoute=r?.snapshot||null}get url(){return this._url}get activeRoute(){return this._activeRoute}get activeLeaf(){return this.leafRoute()}get rootRoute(){return this._activeRoute}get params(){return this.leafRoute()?.params||{}}get data(){return this.leafRoute()?.data||{}}get navigating(){return this._navigating}resetConfig(e=[]){this.routes=Array.isArray(e)?e:[]}async navigate(e,t){return this.navigateByUrl(Lo(e,t),t)}async navigateByUrl(e,t){let o=ye(e),r=String(e||"/").trim(),s=r.startsWith("/")?r:`/${r}`,a=this._url;if(this._navigating)return!1;this._navigating=!0,this.events.emit({type:"NavigationStart",url:o,previousUrl:a});try{let n=await this.resolveUrl(o,0);if(!n)return this.events.emit({type:"NavigationCancel",url:o,previousUrl:a}),!1;let l=n.snapshot;return await this.resolveSnapshotLazy(l),this.events.emit({type:"RoutesRecognized",url:o,previousUrl:a,snapshot:l}),await this.runGuards(l)?(this._url=n.resolvedUrl||s,this._activeRoute=l,this.events.emit({type:"NavigationEnd",url:o,previousUrl:a,snapshot:l}),!0):(this.events.emit({type:"NavigationCancel",url:o,previousUrl:a,snapshot:l}),!1)}catch(n){return this.events.emit({type:"NavigationError",url:o,previousUrl:a,error:n}),!1}finally{this._navigating=!1}}isActive(e,t=!1){let o=ye(this._url),r=ye(e);return t?o===r:o===r||o.startsWith(`${r}/`)}async resolveSnapshotLazy(e){let t=e.route;if(!t.component&&t.loadComponent){let o=await t.loadComponent();t.component=typeof o=="function"?o:o?.component}for(let o of e.children)await this.resolveSnapshotLazy(o)}async resolveUrl(e,t){if(t>20)throw new Error("Router redirect loop detected");let o=this.match(this.routes,Eo(e));if(!o)return;let r=o.snapshot.route;if(r.loadChildren&&!r.children?.length){let s=await r.loadChildren(),a=Array.isArray(s)?s:s?.routes;if(!Array.isArray(a))throw new Error(`Route '${r.path}' loadChildren must resolve to routes`);r.children=a;let n=await this.resolveUrl(e,t+1);return n?{consumed:o.consumed,redirectTo:n.redirectTo,resolvedUrl:n.resolvedUrl,snapshot:{...o.snapshot,children:[n.snapshot]}}:void 0}if(r.loadComponent&&!r.component){let s=await r.loadComponent(),a=typeof s=="function"?s:s?.component;if(r.component=a,!a)throw new Error(`Route '${r.path}' loadComponent did not resolve a component`)}if(o.redirectTo!==void 0){let s=Lo(o.redirectTo);this.events.emit({type:"NavigationStart",url:s,previousUrl:e});let a=await this.resolveUrl(s,t+1);return a&&(a.resolvedUrl=a.resolvedUrl||s),a}return o}match(e,t,o=""){for(let r of e){if(!r||typeof r.path!="string")continue;let s=r.path;if(s==="**"){let c=o||"/";return{consumed:t.length,snapshot:{url:c,path:"**",params:{},data:{...r.data||{}},route:r,children:[]}}}let a=s===""?[]:s.split("/").filter(Boolean);if(a.length>t.length)continue;let n={},l=!0;for(let c=0;c<a.length;c++){let f=a[c],g=t[c];if(f.startsWith(":"))n[f.slice(1)]=decodeURIComponent(g);else if(f!==g){l=!1;break}}if(!l)continue;let d=ye(`${o}/${a.map((c,f)=>c.startsWith(":")?t[f]:c).join("/")}`),p=t.slice(a.length);if(p.length&&!r.children?.length){if(r.loadChildren&&r.pathMatch!=="full")return{consumed:a.length,snapshot:{url:d,path:s,params:n,data:{...r.data||{}},route:r,children:[]}};continue}if(!(r.pathMatch==="full"&&p.length)){if(r.children?.length){let c=this.match(r.children,p,d);if(c)return{consumed:t.length,redirectTo:c.redirectTo,snapshot:{url:d,path:s,params:n,data:{...r.data||{}},route:r,children:[c.snapshot]}}}if(!(p.length&&r.pathMatch!=="full"))return{consumed:t.length,redirectTo:r.redirectTo,snapshot:{url:d,path:s,params:n,data:{...r.data||{}},route:r,children:[]}}}}}async runGuards(e){let t=e.route.canActivate||[];for(let o of t)if(!await this.invokeGuard(o,e))return!1;for(let o of e.children)if(!await this.runGuards(o))return!1;return!0}invokeGuard(e,t){return e&&typeof e.prototype?.canActivate=="function"?(this.injector?this.injector.get(e):new e).canActivate(t):e(t)}leafRoute(e=this._activeRoute){if(!e)return null;let t=e;for(;t.children.length;)t=t.children[t.children.length-1];return t}};Reflect.metadata("design:paramtypes",[Object,Object,ve])($);h($,[[b(),3,void 0,2],[D(Et),3,void 0,1],[b(),3,void 0,1],[D(Tt),3,void 0,0],[b(),3,void 0,0],[I(),0]]);var de=class{constructor(e,t){this.viewContainer=e,this.router=t}onInit(){this.subscription=this.router.events.subscribe(e=>{e?.type==="NavigationEnd"&&this.activate()}),this.activate()}onDestroy(){this.subscription?.unsubscribe(),this.componentRef?.destroy(),this.componentRef=void 0,this.activeComponent=void 0,this.activeUrl=void 0}clearAnchor(){let e=this.viewContainer?.element?.nativeElement;if(!(!e||typeof e.removeChild!="function"))for(;e.firstChild;)e.removeChild(e.firstChild)}activate(){let e=this.router.activeRoute;for(;e?.children?.length;)e=e.children[e.children.length-1];let t=e?.route?.component,o=this.router.activeRoute?.url,r=this.viewContainer?.element?.nativeElement;if(!(t&&r?.getAttribute?.("data-route-url")===o)&&(t&&r?.setAttribute?r.setAttribute("data-route-url",String(o||"")):r?.removeAttribute&&r.removeAttribute("data-route-url"),!(t&&this.componentRef&&this.activeComponent===t&&this.activeUrl===o))){if(this.activeUrl=o,this.componentRef?.destroy(),this.componentRef=void 0,!t){this.activeComponent=void 0,this.clearAnchor(),this.viewContainer.clear();return}this.clearAnchor(),this.viewContainer.clear(),this.activeComponent=t,this.componentRef=this.viewContainer.createComponent(t,{injector:this.viewContainer.injector})}}};Reflect.metadata("design:paramtypes",[jt,$])(de);h(de,[[I(),0],[Ge({selector:"router-outlet, [routerOutlet]"}),0]]);var q=class{constructor(e,t){this.elementRef=e,this.router=t,this.commands="/",this.activeClass="",this.handleClick=o=>{o.defaultPrevented||o.button!==0||o.metaKey||o.ctrlKey||o.shiftKey||o.altKey||(o.preventDefault?.(),this.router.navigate(this.commands,this.extras))},this.elementRef?.nativeElement?.addEventListener?.("click",this.handleClick),this.subscription=t.events.subscribe(()=>this.syncActive())}set routerLink(e){this.commands=e??"/",this.syncHref(),this.syncActive()}get routerLink(){return this.commands}set routerLinkActive(e){this.activeClass=String(e||"").trim(),this.syncActive()}get routerLinkActive(){return this.activeClass}set queryParams(e){this.extras={...this.extras||{},queryParams:e}}set fragment(e){this.extras={...this.extras||{},fragment:e}}onDestroy(){this.subscription?.unsubscribe(),this.elementRef?.nativeElement?.removeEventListener?.("click",this.handleClick)}syncHref(){let e=this.elementRef?.nativeElement,t=Array.isArray(this.commands)?this.commands.join("/"):this.commands,o=String(t||"/").startsWith("/")?String(t||"/"):`/${t}`;e?.setAttribute?.("href",o)}syncActive(){if(!this.activeClass)return;let e=this.elementRef?.nativeElement,t=Array.isArray(this.commands)?this.commands.join("/"):this.commands;this.router.isActive(t)?e?.classList?.add?.(this.activeClass):e?.classList?.remove?.(this.activeClass)}};Reflect.metadata("design:paramtypes",[ie,$])(q);Reflect.metadata("design:paramtypes",[Object])(q.prototype,"routerLink");Reflect.metadata("design:paramtypes",[String])(q.prototype,"routerLinkActive");Reflect.metadata("design:paramtypes",[Object])(q.prototype,"queryParams");Reflect.metadata("design:paramtypes",[Object])(q.prototype,"fragment");h(q,[[u(),1,"routerLink"],[u(),1,"routerLinkActive"],[u(),1,"queryParams"],[u(),1,"fragment"],[Ge({selector:"[routerLink]"}),0]]);var Ue=class i{static forRoot(e=[],t="/"){return{module:i,providers:[{provide:Tt,useValue:e},{provide:Et,useValue:t}]}}static withRoutes(e=[],t="/"){return i.forRoot(e,t)}};h(Ue,[[G({providers:[$,de,q],declarations:[de,q],exports:[$,de,q]}),0]]);var br=["run","resume","cancel","toggle-logs","save","open-library","clear","menu"],oe=class{constructor(e,t,o,r){this.documentRef=t,this.router=o,this.http=r,this.page="dashboard",this.routes=[],this.services=[],this.rules=[],this.status="",this.locale="en",this.theme="light",this.error="",this.routeQuery="",this.routeEditorOpen=!1,this.editingRoute={},this.editingIndex=-1,this.designerOpen=!1,this.designerHiddenActions=br,this.authEnabled=!1,this.needsLogin=!1,this.loaded=!1,this.globalMenuSelect=a=>{if(a==="language:en"||a==="language:zh-CN"){this.setLocale(a.slice(9));return}(a==="theme:light"||a==="theme:dark")&&this.setTheme(a.slice(6))},this.store=new at(this.http);try{t&&(t[K]=!0)}catch{}Ye(t),this.registry=qe(new T);let s=new X({registry:this.registry,definition:Nt("zh-CN")});this.designer=e?Le(s,e):s}onInit(){this.selfRef=this;try{let e=this.storage()?.getItem("tsdi-gateway-admin-locale");e==="zh-CN"||e==="en"?this.locale=e:String(globalThis.navigator?.language||"").toLowerCase().startsWith("zh")&&(this.locale="zh-CN");let t=this.storage()?.getItem("tsdi-gateway-admin-theme");(t==="dark"||t==="light")&&(this.theme=t)}catch{}this.status=this.t("status.loading"),this.applyTheme()}async onAfterViewInit(){if(this.loaded)return;this.loaded=!0,this.applyTheme();let e=this.documentRef?.defaultView;e?.location&&(this.page=pt(e.location.hash)),this.router&&(this.routerSub=this.router.events.subscribe(t=>this.handleRouterEvent(t)),e?.addEventListener&&(this.hashHandler=()=>this.handleHashChange(),e.addEventListener("hashchange",this.hashHandler)),await this.router.navigateByUrl(`/${this.page}`)),await this.reload()}onDestroy(){let e=this.documentRef?.defaultView;e?.removeEventListener&&this.hashHandler&&e.removeEventListener("hashchange",this.hashHandler),this.hashHandler=void 0,this.routerSub?.unsubscribe(),this.routerSub=void 0}t(e,t){return To(this.locale,e,t)}storage(){try{return this.documentRef?.defaultView?.localStorage??globalThis.localStorage}catch{return}}applyTheme(){let e=this.documentRef??globalThis.document;e?.documentElement&&e.documentElement.setAttribute("data-theme",this.theme)}get globalMenuGroups(){let e=this.globalMenuCache;if(e&&e.locale===this.locale&&e.theme===this.theme)return e.groups;let t=[{items:[{id:"menu:language",label:this.t("top.language"),icon:"\u{1F310}",children:[{id:"language:en",label:"English",checked:this.locale==="en"},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.locale==="zh-CN"}]},{id:"menu:theme",label:this.t("top.theme"),icon:"\u25D0",children:[{id:"theme:light",label:this.t("theme.light"),checked:this.theme==="light"},{id:"theme:dark",label:this.t("theme.dark"),checked:this.theme==="dark"}]}]}];return this.globalMenuCache={locale:this.locale,theme:this.theme,groups:t},t}setLocale(e){let t=this.self();if(t.locale!==e){t.locale=e,t.globalMenuCache=void 0;try{t.storage()?.setItem("tsdi-gateway-admin-locale",e),(t.documentRef??globalThis.document)?.documentElement?.setAttribute("lang",e)}catch{}t.loaded&&t.reload()}}setTheme(e){let t=this.self();t.theme=e==="dark"?"dark":"light",t.applyTheme(),t.globalMenuCache=void 0;try{t.storage()?.setItem("tsdi-gateway-admin-theme",t.theme)}catch{}}self(){return this.selfRef??this}get pageTitle(){switch(this.page){case"routes":return this.t("page.routes.title");case"rules":return this.t("page.rules.title");default:return this.t("page.overview.title")}}get pageSubtitle(){switch(this.page){case"routes":return this.t("page.routes.subtitle");case"rules":return this.t("page.rules.subtitle");default:return this.t("page.overview.subtitle")}}get enabledRoutes(){return this.routes.filter(e=>e.enabled!==!1).length}get filteredRoutes(){let e=String(this.routeQuery||"").trim().toLowerCase();return e?this.routes.filter(t=>[t.path,t.service,t.targetUrl,t.targetPath].some(o=>String(o||"").toLowerCase().includes(e))):this.routes}get dashboardNavClass(){return`ga-nav-item${this.page==="dashboard"?" is-active":""}`}get routesNavClass(){return`ga-nav-item${this.page==="routes"?" is-active":""}`}get rulesNavClass(){return`ga-nav-item${this.page==="rules"?" is-active":""}`}goDashboard(){this.navigate("dashboard")}goRoutes(){this.navigate("routes")}goRules(){this.navigate("rules")}navigate(e){let t=this.self();if(t.needsLogin){t.redirectToLogin();return}if(t.router){t.router.navigateByUrl(`/${e}`);return}t.page=e}handleHashChange(){let e=this.self();if(e.needsLogin){e.redirectToLogin();return}let t=e.documentRef?.defaultView,o=pt(t?.location?.hash);o!==e.page&&(e.router?e.router.navigateByUrl(`/${o}`):e.page=o)}handleRouterEvent(e){let t=this.self();if(e.type!=="NavigationEnd"||!e.snapshot)return;let o=this.router?.data?.page||e.snapshot.data?.page;o&&(t.page=o);let r=t.documentRef?.defaultView;try{let s=Ht(t.page);r?.history?.replaceState&&r.location?.hash!==s&&r.history.replaceState(null,"",s)}catch{}}redirectToLogin(){let e=this.documentRef?.defaultView??globalThis.window;Jt(e)}searchRoutes(e){this.self().routeQuery=e.target.value}conditionSummary(e){let t=e?.when??[];return t.length?t.map(o=>[o.field,o.name?`(${o.name})`:"",o.operator||"equals",o.value??""].filter(Boolean).join(" ")).join(" \xB7 "):this.t("rules.matchesEvery")}routeMethods(e){return(e.methods??[]).join(", ")}ruleActionType(e){return e?.action?.type||"route"}ruleActionLabel(e){return this.t(this.ruleActionType(e)==="deny"?"rule.deny":"rule.route")}ruleTone(e){return e?.action?.type==="deny"?"ga-status-dot is-danger":"ga-status-dot"}rulePriority(e){return e?.priority??0}ruleConditionCount(e){return e?.when?.length||0}async reload(){let e=this.self();e.error="";try{let t=await fetch("/api/gateway-admin/state");if(t.status===401){e.requireLogin();return}if(!t.ok)throw new Error(this.t("error.apiUnavailable",{status:t.status}));let o=await t.json();e.authEnabled=o.auth?.enabled===!0,e.needsLogin=!1,e.routes=(o.routes??[]).map(r=>({...r})),e.services=o.services??[],e.rules=o.rules??[],e.status=e.t("status.ready",{routes:e.routes.length,rules:e.rules.length})}catch(t){e.status=e.t("status.offline"),e.error=t.message}}requireLogin(){let e=this.self();e.needsLogin=!0,e.authEnabled=!0,e.status=e.t("status.signInRequired"),e.redirectToLogin()}async fetchState(){if(!this.http)throw new Error("Gateway admin HTTP client is unavailable");let e=await this.http.state();if(e.status===401)return this.requireLogin(),{};if(!e.ok)throw new Error(this.t("error.apiUnavailable",{status:e.status}));return e.body}addRoute(){let e=this.self();e.editingIndex=-1,e.editingRoute={path:"/api/new",service:"my-service",stripPrefix:!0,enabled:!0},e.routeEditorOpen=!0}editRoute(e){let t=this.self();t.editingIndex=t.routes.indexOf(e),t.editingRoute={...e},t.routeEditorOpen=!0}closeRouteEditor(){let e=this.self();e.routeEditorOpen=!1,e.editingRoute={},e.editingIndex=-1}editRouteField(e){let t=this.self(),o=e.target,r=o.getAttribute("data-field")||"";if(!r)return;let s=o.checked;r!=="stripPrefix"&&r!=="enabled"&&(s=o.value),r==="timeout"&&(s=o.value?Number(o.value):void 0),r==="methods"&&(s=String(o.value||"").split(",").map(a=>a.trim().toUpperCase()).filter(Boolean)),t.editingRoute[r]=s,t.editingRoute={...t.editingRoute}}saveRouteEditor(){let e=this.self(),t=e.editingRoute;if(!t.path||!t.service&&!t.targetUrl){e.error=e.t("error.routeRequired");return}if(e.error="",e.editingIndex>=0){let o=e.routes.slice();o[e.editingIndex]={...t},e.routes=o}else e.routes=[...e.routes,{...t}];e.closeRouteEditor(),e.status=e.t("status.routeStaged",{count:e.routes.length})}removeRoute(e){let t=this.self();t.routes=t.routes.filter(o=>o!==e),t.status=t.t("status.routeRemoved",{count:t.routes.length})}async applyRoutes(){let e=this.self();e.error="";try{if(!e.http)throw new Error("Gateway admin HTTP client is unavailable");let t=await e.http.updateRoutes(e.routes);if(t.status===401){e.requireLogin();return}if(!t.ok)throw new Error(e.t("error.applyRoutes",{status:t.status}));let o=t.body;e.routes=(o.routes??[]).map(r=>({...r})),e.services=o.services??[],e.status=e.t("status.routesApplied",{count:e.routes.length})}catch(t){e.error=t.message}}async editRules(){let e=this.self();e.error="",await e.loadRuleDocument(),e.designerOpen=!0}async loadRuleDocument(){let e=this.self(),t=await e.store.list().catch(()=>[]),o;t.length&&(o=await e.store.get(t[0].id)),e.designer.load(o??Nt("zh-CN"))}closeDesigner(){this.self().designerOpen=!1}async applyRules(){let e=this.self();e.error="";try{let t=await e.store.save(e.designer.definition);e.designerOpen=!1,e.status=e.t("status.rulesApplied",{count:t.nodeCount});let o=await e.fetchState();e.rules=o.rules??[],e.services=o.services??[]}catch(t){e.error=t.message}}};Reflect.metadata("design:paramtypes",[Be,Object,$,Xe])(oe);h(oe,[[b(),3,void 0,3],[b(),3,void 0,2],[D(se),3,void 0,1],[b(),3,void 0,1],[b(),3,void 0,0],[x({selector:"gateway-admin",template:`
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
    </div>`}),0]]);var He=class{};h(He,[[G({imports:[Ve,Ue.forRoot([{path:"",loadChildren:()=>import("./chunks/admin.routes-7CWCU3HY.js").then(i=>i.GATEWAY_ADMIN_ROUTES)}])],declarations:[oe],providers:[...Ut(Wt(),Vt(),qt([Bt])),Xe,Gt,{provide:T,useFactory:()=>qe(new T)}]}),0]]);async function yr(){let i=document.getElementById("boot-status");i&&(i.textContent="Starting microservice admin\u2026");let e=await zt.run(oe,{deps:[$t,He],providers:[{provide:se,useValue:document}]}),t=e.runners.getRef(oe),o=document.getElementById("gateway-admin-app");if(!o)throw new Error("gateway-admin-app container missing");o.appendChild(t.elementRef.nativeElement),i&&i.remove(),window.gatewayAdmin=t.instance,window.gatewayAdminContext=e}yr().catch(i=>{let e=document.getElementById("boot-status");e&&(e.textContent=`\u542F\u52A8\u5931\u8D25\uFF1A${i.message}`)});
