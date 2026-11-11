import{A as St,B as ke,C as Xe,D as Qe,E as et,F as tt,G as Ct,H as It,I as Nt,O as Rt,a as te,b as g,c as Be,d as K,e as Ze,f as Y,g as V,h as N,i as R,j as gt,k as ye,l as bt,m as yt,n as Ge,o as kt,p as je,q as vt,r as ce,s as xt,t as D,u as Ke,v as Pe,w as p,x as _e,y as x,z as Ye}from"./chunks/chunk-O3TFAXNJ.js";import"./chunks/chunk-QD4R4ZOC.js";var A=class{};g(A,[[K(),0]]);var ue=te("I18N_OPTIONS"),no=te("I18N_LOCALE"),Yo=te("I18N_TRANSLATIONS"),ve=te("TRANSLATION_LOADERS");var X=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(X);g(X,[[N(),3,void 0,0],[V(ue),3,void 0,0],[R(),0]]);var Fe=class{format(e,t,o){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,o):this.interpolate(e,t)}interpolate(e,t){let o=e;return"#"in t&&(o=o.replace(/#/g,String(t["#"]))),o=o.replace(/\{(\w+)\}/g,(r,i)=>{if(i in t){let a=t[i];return String(a)}return r}),o}formatICU(e,t,o){let r=e,i=/\{(\w+),\s*(plural|select),\s*/g,a;for(;(a=i.exec(e))!==null;){let l=a.index,n=a[1],d=a[2],f=l+a[0].length,u=this.findMatchingBrace(e,l);if(u===-1)continue;let c=e.substring(f,u),w=e.substring(l,u+1),b=this.parseChoices(c);if(d==="plural"){let y=t[n];if(typeof y=="number"){let k=this.getPluralForm(y,o),I=b[k]||b.other||"",T=this.interpolate(I,{"#":y,...t});r=r.replace(w,T)}}else if(d==="select"){let y=t[n];if(y!==void 0){let k=b[String(y)]||b.other||"",I=this.interpolate(k,t);r=r.replace(w,I)}}}return this.interpolate(r,t)}findMatchingBrace(e,t){let o=1;for(let r=t+1;r<e.length;r++)if(e[r]==="{")o++;else if(e[r]==="}"&&(o--,o===0))return r;return-1}parseChoices(e){let t={},o=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,r;for(;(r=o.exec(e))!==null;){let i=r[1],a=r.index+r[0].length,l=this.findMatchingBrace(e,r.index+r[0].length-1);if(l!==-1){let n=e.substring(a,l);t[i]=n.trim()}}return t}getPluralForm(e,t){let o=t.split("-")[0];return o==="zh"||o==="ja"||o==="ko"?"other":o==="en"||o==="de"||o==="nl"?e===1?"one":"other":o==="ru"||o==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":o==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var oe=class extends A{constructor(e,t,o){super(),this.injector=e,this.options=t,this.localeService=o,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new Fe,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(ve,[]);for(let t of e){let o=await t.load(this.options.basePath,this.options.locales||[]);for(let r of o)this._translations.set(r.locale,r),this.localeService.registerBundle(r.locale,r)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,o){let r=typeof t=="string"?t:this._currentLocale,i=typeof t=="string"?o:t,a=this._translations.get(r);if(!a)return e;let l=this.getMessage(a,e);return l?this._formatter.format(l,i||{},r):e}getMessage(e,t){let o=t.split("."),r=e.messages;for(let i of o)if(r&&typeof r=="object"&&i in r)r=r[i];else return;return typeof r=="string"?r:void 0}has(e,t){let o=t||this._currentLocale,r=this._translations.get(o);return r?this.getMessage(r,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[Ze,Object,X])(oe);g(oe,[[V(),3,void 0,2],[N(),3,void 0,1],[V(ue),3,void 0,1],[V(),3,void 0,0],[R(),0]]);var xe=class{};g(xe,[[K(),0]]);var re=class extends xe{constructor(e){super(),this.fileAdapter=e}async load(e,t){let o=[];for(let r of t)try{let i=await this.loadLocale(e,r);o.push(i)}catch{}return o}async loadLocale(e,t){let o=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(o))throw new Error(`Translation file not found: ${o}`);let i=await this.fileAdapter.readJSON(o);return{locale:t,messages:i}}};Reflect.metadata("design:paramtypes",[vt])(re);g(re,[[V(),3,void 0,0],[R(),0]]);var se=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let o,r;return t.length>0&&(typeof t[0]=="object"?o=t[0]:typeof t[0]=="string"&&(r=t[0])),t.length>1&&typeof t[1]=="object"&&(o=t[1]),r?this.translator.translate(e,r,o||{}):this.translator.translate(e,o||{})}};Reflect.metadata("design:paramtypes",[A])(se);g(se,[[R(),0],[yt("translate"),0]]);var lo=[X,oe,{provide:A,useClass:oe},re,{provide:ve,useClass:re,multi:!0},se],fe=class s{static withOptions(e){let t=[{provide:ue,useValue:e}];return e.loader&&t.push({provide:ve,useClass:e.loader,multi:!0}),{module:s,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};g(fe,[[Y({providers:lo,exports:[se]}),0]]);var ot=class{format(e,t,o){return new Intl.NumberFormat(t,o).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,o){return this.format(e,t,{minimumFractionDigits:o,maximumFractionDigits:o})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};g(ot,[[R(),0]]);var rt=class{format(e,t,o){let r=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,o).format(r)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};g(rt,[[R(),0]]);var st=class{format(e,t,o,r){let i={style:"currency",...r};return o&&(i.currency=o),new Intl.NumberFormat(t,i).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};g(st,[[R(),0]]);var $e=class{constructor(e){this.translator=e}intercept(e,t,o){let r=t.handle(e,o);return typeof r=="string"&&r.startsWith("i18n:")?this.translator.translate(r.substring(5)):r&&typeof r=="object"?this.translateObject(r):r}translateObject(e){if(Array.isArray(e))return e.map(o=>this.translateObject(o));let t={};for(let[o,r]of Object.entries(e))typeof r=="string"&&r.startsWith("i18n:")?t[o]=this.translator.translate(r.substring(5)):typeof r=="object"?t[o]=this.translateObject(r):t[o]=r;return t}};Reflect.metadata("design:paramtypes",[A])($e);g($e,[[R(),0]]);var co={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",logTitle:"Execution log",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},inject:{payload:"Payload"},trigger:{delay:"Delay (ms)",payload:"Payload"},function:{code:"Code",timeout:"Timeout (ms)"},template:{template:"Template",target:"Target field"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout (ms)"},command:{command:"Command",args:"Args",timeout:"Timeout (ms)"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Expected value"},loop:{iterations:"Iterations",delay:"Delay (ms)"},delay:{delay:"Delay (ms)"},log:{message:"Message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay (ms)",timeout:"Timeout (ms)"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",logTitle:"\u6267\u884C\u65E5\u5FD7",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},inject:{payload:"\u6570\u636E"},trigger:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},template:{template:"\u6A21\u677F",target:"\u76EE\u6807\u5B57\u6BB5"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u671F\u671B\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},delay:{delay:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09"},log:{message:"\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},pe=class{};g(pe,[[Y({imports:[fe.withLocales(co,"zh-CN")],exports:[fe]}),0]]);function S(s,e,t,o,r){if(!s)return o;try{if(s.has(t,e))return s.translate(t,e,r);let i=s.translate(t,e,r);if(i&&i!==t)return i}catch{}return o}function it(s,e,t,o="",r){return t?t.startsWith("workflow.")?S(s,e,t,o||t,r):t:o}var Tt={trigger:{en:"Triggers",zh:"\u89E6\u53D1\u5668"},flow:{en:"Flow control",zh:"\u6D41\u7A0B\u63A7\u5236"},action:{en:"Actions",zh:"\u6267\u884C\u52A8\u4F5C"},data:{en:"Data",zh:"\u6570\u636E\u5904\u7406"},error:{en:"Error handling",zh:"\u5F02\u5E38\u5904\u7406"},advanced:{en:"Advanced",zh:"\u9AD8\u7EA7"}};function h(s,e,t,o){return{id:s,name:e,type:t,label:o}}function m(s){return{...s}}var uo=184,fo=64;function j(s,e,t){return s==="zh-CN"&&t||e}var po=[{type:"start",label:"Start",labelZh:"\u5F00\u59CB",description:"Entry point of the workflow",descriptionZh:"\u5DE5\u4F5C\u6D41\u5165\u53E3",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[h("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",labelZh:"\u7ED3\u675F",description:"Finish the workflow",descriptionZh:"\u7ED3\u675F\u5DE5\u4F5C\u6D41",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[h("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",labelZh:"\u6CE8\u5165",description:"Start with a fixed payload",descriptionZh:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[h("out","out","output","Payload")],fields:[m({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{}})],defaultConfig:{payload:{}}},{type:"task",label:"Task",labelZh:"\u4EFB\u52A1",description:"Run a named action or return a fixed result",descriptionZh:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"action",label:"Action",labelZh:"\u52A8\u4F5C",type:"text",placeholder:"actions.fetch",placeholderZh:"actions.fetch",description:"Function name in context.actions.",descriptionZh:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\u3002"}),m({key:"result",label:"Mock result",labelZh:"\u6A21\u62DF\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set.",descriptionZh:"\u672A\u914D\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u8BE5\u7ED3\u679C\u3002"}),m({key:"fail",label:"Fail this step",labelZh:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",type:"boolean",defaultValue:!1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),m({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Automatic retries before the step fails.",descriptionZh:"\u6B65\u9AA4\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002"}),m({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),m({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"function",label:"Function",labelZh:"\u51FD\u6570",description:"Run trusted JavaScript against the workflow context",descriptionZh:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"code",label:"Code",labelZh:"\u4EE3\u7801",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions.",descriptionZh:"\u53D7\u4FE1\u4EFB\u4EE3\u7801\u3002`context` \u662F\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\uFF0C`input` \u662F\u4E0A\u4E00\u6B65\u7ED3\u679C\u3002\u6309 Ctrl+Space \u83B7\u53D6\u4E0A\u4E0B\u6587\u548C\u53D8\u91CF\u63D0\u793A\u3002"}),m({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",labelZh:"\u6761\u4EF6",description:"Branch on a context field",descriptionZh:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("true","true","output","True"),h("false","false","output","False")],fields:[m({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.approved",description:"Path to the value to test.",descriptionZh:"\u8981\u5224\u65AD\u7684\u503C\u8DEF\u5F84\u3002"}),m({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),m({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",labelZh:"\u591A\u8DEF\u5206\u652F",description:"Route by a context value",descriptionZh:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Matched"),h("default","default","output","Default"),h("error","error","output","Error")],fields:[m({key:"field",label:"Value field",labelZh:"\u53D6\u503C\u5B57\u6BB5",type:"text",required:!0,placeholder:"input.type",description:"Path to the value used for routing.",descriptionZh:"\u7528\u4E8E\u5206\u652F\u5224\u65AD\u7684\u53D6\u503C\u8DEF\u5F84\u3002"}),m({key:"value",label:"Expected value",labelZh:"\u671F\u671B\u503C",type:"text",required:!0,placeholder:"approved",description:"Routes to the matched output when the value is equal.",descriptionZh:"\u503C\u76F8\u7B49\u65F6\u8DEF\u7531\u5230 Matched \u8F93\u51FA\u3002"})],defaultConfig:{}},{type:"parallel",label:"Parallel",labelZh:"\u5E76\u884C",description:"Run all outgoing branches concurrently",descriptionZh:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",labelZh:"\u6C47\u805A",description:"Wait for all incoming branches before continuing",descriptionZh:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],defaultConfig:{}},{type:"loop",label:"Loop",labelZh:"\u5FAA\u73AF",description:"Repeat the node body",descriptionZh:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Done"),h("error","error","output","Error")],fields:[m({key:"iterations",label:"Iterations",labelZh:"\u8FED\u4EE3\u6B21\u6570",type:"number",defaultValue:1,min:1,max:1e4,step:1}),m({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Options",groupZh:"\u9009\u9879"})],defaultConfig:{iterations:1}},{type:"trigger",label:"Trigger",labelZh:"\u89E6\u53D1",description:"Emit a payload after an optional delay",descriptionZh:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100}),m({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'})],defaultConfig:{delay:0,payload:{}}},{type:"delay",label:"Delay",labelZh:"\u5EF6\u8FDF",description:"Wait before continuing",descriptionZh:"\u7B49\u5F85\u540E\u7EE7\u7EED",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"delay",label:"Delay (ms)",labelZh:"\u5EF6\u8FDF\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:500,min:0,max:6e5,step:100,description:"Pause before continuing.",descriptionZh:"\u7EE7\u7EED\u6267\u884C\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002"})],defaultConfig:{delay:500}},{type:"log",label:"Log",labelZh:"\u65E5\u5FD7",description:"Record a message",descriptionZh:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Workflow step completed",required:!0,placeholder:"Workflow step completed",description:"Message written to the execution log.",descriptionZh:"\u5199\u5165\u6267\u884C\u65E5\u5FD7\u7684\u6D88\u606F\u3002"}),m({key:"level",label:"Level",labelZh:"\u7EA7\u522B",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"http-request",label:"HTTP request",labelZh:"HTTP \u8BF7\u6C42",description:"Call an HTTP endpoint",descriptionZh:"\u8C03\u7528 HTTP \u63A5\u53E3",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Response"),h("error","error","output","Error")],fields:[m({key:"url",label:"URL",labelZh:"\u5730\u5740",type:"text",required:!0,placeholder:"https://api.example.com",group:"Request",groupZh:"\u8BF7\u6C42",description:"Absolute endpoint or a path resolved by the host.",descriptionZh:"\u7EDD\u5BF9\u5730\u5740\u6216\u7531\u5BBF\u4E3B\u89E3\u6790\u7684\u8DEF\u5F84\u3002"}),m({key:"method",label:"Method",labelZh:"\u65B9\u6CD5",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(s=>({label:s,value:s})),group:"Request",groupZh:"\u8BF7\u6C42"}),m({key:"headers",label:"Headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request",groupZh:"\u8BF7\u6C42"}),m({key:"body",label:"Body",labelZh:"\u8BF7\u6C42\u4F53",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",groupZh:"\u8BF7\u6C42",visibleWhen:{key:"method",notEquals:"GET"}}),m({key:"retry",label:"Retries",labelZh:"\u91CD\u8BD5\u6B21\u6570",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),m({key:"retryDelay",label:"Retry delay (ms)",labelZh:"\u91CD\u8BD5\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"}),m({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",labelZh:"\u8D4B\u503C",description:"Merge values into workflow variables",descriptionZh:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"values",label:"Values",labelZh:"\u503C",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",labelZh:"\u8F6C\u6362",description:"Map the previous result",descriptionZh:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"mapping",label:"Mapping",labelZh:"\u6620\u5C04",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result.",descriptionZh:"\u5C06\u4E0A\u4E0B\u6587\u8DEF\u5F84\u6620\u5C04\u5230\u65B0\u7684\u7ED3\u679C\u3002"}),m({key:"result",label:"Fixed result",labelZh:"\u56FA\u5B9A\u7ED3\u679C",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",labelZh:"\u6A21\u677F",description:"Render a message template",descriptionZh:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"template",label:"Template",labelZh:"\u6A21\u677F",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",description:"Use {{path.to.value}} placeholders.",descriptionZh:"\u4F7F\u7528 {{path.to.value}} \u5360\u4F4D\u7B26\u3002"}),m({key:"target",label:"Target field",labelZh:"\u76EE\u6807\u5B57\u6BB5",type:"text",defaultValue:"message",placeholder:"message",description:"Context field that receives the rendered text.",descriptionZh:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u6587\u5B57\u6BB5\u3002"})],defaultConfig:{template:"{{value}}",target:"message"}},{type:"json",label:"JSON",labelZh:"JSON",description:"Parse or stringify JSON",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),m({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the value to parse or stringify.",descriptionZh:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u503C\u8DEF\u5F84\u3002"}),m({key:"pretty",label:"Pretty print",labelZh:"\u683C\u5F0F\u5316\u8F93\u51FA",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",labelZh:"CSV",description:"Parse or stringify CSV",descriptionZh:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"parse",options:[{label:"Parse",labelZh:"\u89E3\u6790",value:"parse"},{label:"Stringify",labelZh:"\u5E8F\u5217\u5316",value:"stringify"}]}),m({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"value",description:"Path to the CSV text or array.",descriptionZh:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u8DEF\u5F84\u3002"}),m({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns.",descriptionZh:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002"}),m({key:"header",label:"First row is header",labelZh:"\u9996\u884C\u4E3A\u8868\u5934",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",labelZh:"\u4FEE\u6539\u5C5E\u6027",description:"Set, delete or append a context field",descriptionZh:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"action",label:"Action",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"set",options:[{label:"Set",labelZh:"\u8BBE\u7F6E",value:"set"},{label:"Delete",labelZh:"\u5220\u9664",value:"delete"},{label:"Append",labelZh:"\u8FFD\u52A0",value:"append"}]}),m({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"variables.name",description:"Context path to modify.",descriptionZh:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"}),m({key:"value",label:"Value",labelZh:"\u503C",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append.",descriptionZh:"\u65B0\u503C\u6216\u8981\u8FFD\u52A0\u7684\u5185\u5BB9\u3002"})],defaultConfig:{action:"set"}},{type:"statistics",label:"Statistics",labelZh:"\u7EDF\u8BA1",description:"Aggregate an array (count/sum/avg/min/max)",descriptionZh:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Result")],fields:[m({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items",description:"Path to the array to aggregate.",descriptionZh:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"}),m({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",placeholder:"value",description:"Numeric property of each item.",descriptionZh:"\u6BCF\u4E2A\u5143\u7D20\u7684\u6570\u503C\u5C5E\u6027\u3002"}),m({key:"operation",label:"Operation",labelZh:"\u64CD\u4F5C",type:"select",defaultValue:"count",options:[{label:"Count",labelZh:"\u8BA1\u6570",value:"count"},{label:"Sum",labelZh:"\u6C42\u548C",value:"sum"},{label:"Average",labelZh:"\u5E73\u5747",value:"avg"},{label:"Min",labelZh:"\u6700\u5C0F",value:"min"},{label:"Max",labelZh:"\u6700\u5927",value:"max"}]}),m({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",labelZh:"\u5408\u5E76",description:"Merge objects or concatenate arrays",descriptionZh:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"fields",label:"Fields",labelZh:"\u5B57\u6BB5",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second",descriptionZh:"\u9017\u53F7\u5206\u9694\u7684\u8DEF\u5F84\uFF0C\u4F8B\u5982 first, second\u3002"}),m({key:"mode",label:"Mode",labelZh:"\u6A21\u5F0F",type:"select",defaultValue:"object",options:[{label:"Object merge",labelZh:"\u5BF9\u8C61\u5408\u5E76",value:"object"},{label:"Array concat",labelZh:"\u6570\u7EC4\u62FC\u63A5",value:"array"}]}),m({key:"resultField",label:"Result field",labelZh:"\u7ED3\u679C\u5B57\u6BB5",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",labelZh:"\u53D1\u9001\u4E8B\u4EF6",description:"Emit an event through the workflow event bus",descriptionZh:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output")],fields:[m({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to publish.",descriptionZh:"\u8981\u53D1\u5E03\u7684\u4E8B\u4EF6\u540D\u3002"}),m({key:"payload",label:"Payload",labelZh:"\u6570\u636E",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload.",descriptionZh:"\u53EF\u9009\u7684\u4E8B\u4EF6\u6570\u636E\u3002"})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",labelZh:"\u7B49\u5F85\u4E8B\u4EF6",description:"Wait for a workflow event",descriptionZh:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Event"),h("error","error","output","Timeout")],fields:[m({key:"event",label:"Event",labelZh:"\u4E8B\u4EF6",type:"text",defaultValue:"workflow.event",required:!0,description:"Event name to wait for.",descriptionZh:"\u8981\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u3002"}),m({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:3e4,min:0,step:1e3,group:"Reliability",groupZh:"\u53EF\u9760\u6027",description:"Route to the timeout port after this delay.",descriptionZh:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",labelZh:"\u547D\u4EE4",description:"Run a host-provided command executor",descriptionZh:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"command",label:"Command",labelZh:"\u547D\u4EE4",type:"text",required:!0,placeholder:"context.exec"}),m({key:"args",label:"Args",labelZh:"\u53C2\u6570",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command.",descriptionZh:"\u4F20\u7ED9\u547D\u4EE4\u7684\u53C2\u6570\u6570\u7EC4\u3002"}),m({key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",defaultValue:0,min:0,step:100,group:"Reliability",groupZh:"\u53EF\u9760\u6027"})],defaultConfig:{}},{type:"split",label:"Split",labelZh:"\u62C6\u5206",description:"Split a string or array into items",descriptionZh:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Items")],fields:[m({key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"text",placeholder:"items",description:"Text or array to split.",descriptionZh:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u3002"}),m({key:"delimiter",label:"Delimiter",labelZh:"\u5206\u9694\u7B26",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text.",descriptionZh:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002"})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",labelZh:"\u6620\u5C04",description:"Map each array item",descriptionZh:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Items")],fields:[m({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),m({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name",descriptionZh:"\u4F8B\u5982 value \u6216 user.name\u3002"})],defaultConfig:{}},{type:"filter",label:"Filter",labelZh:"\u8FC7\u6EE4",description:"Keep array items that match a condition",descriptionZh:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Items")],fields:[m({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),m({key:"path",label:"Item path",labelZh:"\u5143\u7D20\u8DEF\u5F84",type:"text",defaultValue:""}),m({key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"truthy",options:[{label:"is truthy",labelZh:"\u4E3A\u771F",value:"truthy"},{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"greater than",labelZh:"\u5927\u4E8E",value:"gt"},{label:"less than",labelZh:"\u5C0F\u4E8E",value:"lt"}]}),m({key:"value",label:"Compare with",labelZh:"\u6BD4\u8F83\u503C",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",labelZh:"\u6392\u5E8F",description:"Sort an array by a field",descriptionZh:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Items")],fields:[m({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),m({key:"path",label:"Sort path",labelZh:"\u6392\u5E8F\u8DEF\u5F84",type:"text",placeholder:"value",description:"Property of each item used for ordering.",descriptionZh:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002"}),m({key:"order",label:"Order",labelZh:"\u987A\u5E8F",type:"select",defaultValue:"asc",options:[{label:"Ascending",labelZh:"\u5347\u5E8F",value:"asc"},{label:"Descending",labelZh:"\u964D\u5E8F",value:"desc"}]})],defaultConfig:{order:"asc"}},{type:"range",label:"Range",labelZh:"\u533A\u95F4",description:"Generate a numeric range",descriptionZh:"\u751F\u6210\u6570\u503C\u533A\u95F4",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Items")],fields:[m({key:"from",label:"From",labelZh:"\u8D77\u59CB",type:"number",defaultValue:0}),m({key:"to",label:"To",labelZh:"\u7ED3\u675F",type:"number",defaultValue:10}),m({key:"step",label:"Step",labelZh:"\u6B65\u957F",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",labelZh:"\u6279\u5904\u7406",description:"Split an array into chunks",descriptionZh:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Batches")],fields:[m({key:"field",label:"Array field",labelZh:"\u6570\u7EC4\u5B57\u6BB5",type:"text",placeholder:"items"}),m({key:"size",label:"Batch size",labelZh:"\u6279\u5927\u5C0F",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch.",descriptionZh:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002"})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",labelZh:"\u5F02\u5E38\u6355\u83B7",description:"Route failures to an error branch",descriptionZh:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",labelZh:"\u5B50\u6D41\u7A0B",description:"Execute another workflow",descriptionZh:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"workflow",label:"Workflow JSON",labelZh:"\u5DE5\u4F5C\u6D41 JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute.",descriptionZh:"\u8981\u6267\u884C\u7684\u5185\u8054\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u3002"})],defaultConfig:{}},{type:"comment",label:"Comment",labelZh:"\u6CE8\u91CA",description:"Canvas note; not executed",descriptionZh:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[m({key:"text",label:"Text",labelZh:"\u6587\u672C",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",labelZh:"\u81EA\u5B9A\u4E49",description:"Run a custom activity or handler",descriptionZh:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[h("in","in","input","Input")],outputs:[h("out","out","output","Output"),h("error","error","output","Error")],fields:[m({key:"result",label:"Result",labelZh:"\u7ED3\u679C",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node.",descriptionZh:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"})],defaultConfig:{}}],At=0;function ho(s){if(s===null||typeof s!="object")return s;try{return JSON.parse(JSON.stringify(s))}catch{return s}}var L=class{constructor(){this.definitions=new Map,this._revision=0,po.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(o=>({...o})),outputs:(e.outputs||[]).map(o=>({...o})),fields:(e.fields||[]).map(o=>({...o})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let o={...t.defaultConfig||{}};return(t.fields||[]).forEach(r=>{r.defaultValue!==void 0&&o[r.key]===void 0&&(o[r.key]=ho(r.defaultValue))}),o}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let o of this.definitions.values())e.has(o.category)||(e.add(o.category),t.push(o.category));return t}palette(e="zh-CN",t){return this.categories().map(o=>({id:o,label:S(t,e,`workflow.category.${o}`,j(e,Tt[o].en,Tt[o].zh)),items:this.list().filter(r=>r.category===o).map(r=>this.paletteItem(r,e,t))}))}paletteItem(e,t="zh-CN",o){return{type:e.type,label:this.nodeLabel(e.type,t,o),description:this.nodeDescription(e.type,t,o),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",o){let r=this.get(e);return r?S(o,t,`workflow.node.${e}.label`,j(t,r.label,r.labelZh)):e}nodeDescription(e,t="zh-CN",o){let r=this.get(e);return r?S(o,t,`workflow.node.${e}.description`,j(t,r.description||r.label,r.descriptionZh)):""}createNode(e,t,o={}){let r=this.get(e);if(!r)throw new Error(`Unknown workflow node type: ${e}`);return{id:o.id||this.nextId(e),name:o.name||j("zh-CN",r.label,r.labelZh),type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:uo,height:fo},description:r.description,inputs:r.inputs.map(a=>({...a})),outputs:r.outputs.map(a=>({...a})),config:{...r.defaultConfig||{},...o.config||{}},style:{backgroundColor:r.color,textColor:r.textColor||"#ffffff",borderColor:r.color,borderRadius:e==="start"||e==="end"?50:10,icon:r.icon},activityType:r.activityType,pluginId:r.pluginId,requiresServer:r.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return At+=1,`${e}_${At}`}};Reflect.metadata("design:paramtypes",[])(L);g(L,[[R(),0]]);function O(s,e){if(typeof s=="function")return s(e);if(s==null||typeof s!="string")return s;let t=s.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let o=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),r=e;for(let i of o){if(r==null)return;r=r[i]}return r}function Lt(s,e,t){switch(e){case"equals":return s==t;case"not-equals":return s!=t;case"gt":return Number(s)>Number(t);case"lt":return Number(s)<Number(t);case"gte":return Number(s)>=Number(t);case"lte":return Number(s)<=Number(t);case"truthy":default:return!!s}}function wo(s,e){let t=s?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!O(t.condition,e);if(t.field!==void 0){let o=O(t.field,e);return Lt(o,String(t.operator||"truthy"),t.value)}return!0}function mo(s,e){let t=s?.config||{};if(t.field!==void 0)return O(t.field,e);if(t.value!==void 0)return O(t.value,e)}function P(s){if(typeof s!="string")return s;try{return JSON.parse(s)}catch{return s}}function Se(s,e){if(!e)return s;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),o=s;for(let r of t){if(o==null)return;o=o[r]}return o}function Ce(s,e){let t=e?O(e,s):s.items??s.value;return Array.isArray(t)?t:[]}function go(s,e){return String(s??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,o)=>String(O(o,e)??""))}function bo(s){return String(s||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function yo(s,e,t,o){let r=bo(e);if(!r.length)return t==="set"&&o&&typeof o=="object"?(Object.assign(s,o),o):void 0;let i=s;for(let l=0;l<r.length-1;l++){let n=r[l];(i[n]===void 0||i[n]===null)&&(i[n]={}),i=i[n]}let a=r[r.length-1];if(t==="delete"){let l=i[a];return delete i[a],l}if(t==="append"){let l=i[a];return Array.isArray(l)?(l.push(o),l):(i[a]=l==null?[o]:`${l}${o}`,i[a])}return i[a]=o,o}function ko(s,e,t){let o=[],r=[],i="",a=!1,l=String(s??"");for(let d=0;d<l.length;d++){let f=l[d];a?f==='"'?l[d+1]==='"'?(i+='"',d++):a=!1:i+=f:f==='"'?a=!0:f===e?(r.push(i),i=""):f===`
`?(r.push(i),o.push(r),r=[],i=""):f!=="\r"&&(i+=f)}if((i||r.length)&&(r.push(i),o.push(r)),!t||!o.length)return o;let n=o[0];return o.slice(1).map(d=>{let f={};return n.forEach((u,c)=>{f[u]=d[c]??""}),f})}function vo(s,e){let t=Array.isArray(s)?s:[];if(!t.length)return"";let o=r=>{let i=r==null?"":String(r);return/["\n\r]/.test(i)||i.includes(e)?`"${i.replace(/"/g,'""')}"`:i};if(!Array.isArray(t[0])){let r=Object.keys(t[0]||{});return[r.map(o).join(e),...t.map(i=>r.map(a=>o(i?.[a])).join(e))].join(`
`)}return t.map(r=>r.map(o).join(e)).join(`
`)}function xo(s){let e=s.activityType;if(e)try{let t=new e;return Object.assign(t,s.config||{}),t}catch{return}}async function So(s,e){let t=s.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${s.name}" failed`)),data:{nodeId:s.id,failed:!0}};let o=t.action,r=e.actions||{};if(typeof o=="function")return{success:!0,data:{nodeId:s.id,result:await o(e)}};if(typeof o=="string"&&o&&typeof r[o]=="function")return{success:!0,data:{nodeId:s.id,result:await r[o](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:s.id,result:await t.execute(e)}};if(t.result!==void 0){let i=P(t.result);return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:i}}}return{success:!0,data:{nodeId:s.id,config:t}}}async function Co(s,e){let t=s.config||{},o=O(t.url,e);if(!o)return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No URL configured"}};let r=globalThis.fetch;if(typeof r!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:s.id}};try{let i=await r(String(o),{method:String(t.method||"GET").toUpperCase(),headers:P(t.headers)||void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),a=await i.text(),l=a;try{l=a?JSON.parse(a):null}catch{l=a}return{success:i.ok,error:i.ok?void 0:new Error(`HTTP ${i.status}`),data:{nodeId:s.id,status:i.status,body:l}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}}async function Ie(s,e,t){let o=s.config||{};if(t?.executeNode){let i=await t.executeNode(s,e);if(i)return i}let r=xo(s);if(r)return r.execute(e);switch(s.type){case"start":return{success:!0,data:{nodeId:s.id,started:!0}};case"end":return{success:!0,data:{nodeId:s.id,completed:!0}};case"task":return So(s,e);case"condition":return{success:!0,data:{nodeId:s.id,condition:wo(s,e)}};case"switch":return{success:!0,data:{nodeId:s.id,condition:mo(s,e)}};case"delay":{let i=Math.max(0,Number(o.delay??o.duration??0)||0);return await new Promise(a=>setTimeout(a,i)),{success:!0,data:{nodeId:s.id,delayed:i}}}case"loop":{let i=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0));return{success:!0,data:{nodeId:s.id,iterations:i}}}case"log":{let i=String(o.level||"info"),a=O(o.message,e),l=e.logger;return l&&typeof l[i]=="function"&&l[i](a),{success:!0,data:{nodeId:s.id,level:i,message:a}}}case"http-request":return Co(s,e);case"inject":{let i=P(o.payload??{});return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,payload:i}}}case"trigger":{let i=Math.max(0,Number(o.delay)||0);await new Promise(l=>setTimeout(l,i));let a=P(o.payload??{});return a&&typeof a=="object"&&!Array.isArray(a)?{success:!0,data:{...a,nodeId:s.id,triggered:!0}}:{success:!0,data:{nodeId:s.id,triggered:!0,payload:a}}}case"function":try{let i=String(o.code||"return input;"),l=await new Function("context","input","msg",`"use strict"; return (async () => { ${i}
 })();`)(e,e,{...e});return l&&typeof l=="object"&&!Array.isArray(l)?{success:!0,data:{...l,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:l}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"template":{let i=go(String(o.template??""),e),a=String(o.target||"message");return{success:!0,data:{nodeId:s.id,[a]:i,value:i}}}case"json":{let i=O(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let l=JSON.stringify(i,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:s.id,value:l,json:l}}}try{let l=typeof i=="string"?JSON.parse(i):i;return{success:!0,data:l&&typeof l=="object"&&!Array.isArray(l)?{...l,nodeId:s.id,value:l}:{nodeId:s.id,value:l}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id}}}}case"csv":{let i=O(o.field||"value",e),a=String(o.delimiter??",");try{if(String(o.mode||"parse")==="stringify"){let n=vo(i,a);return{success:!0,data:{nodeId:s.id,value:n}}}let l=ko(String(i??""),a,o.header!==!1);return{success:!0,data:{nodeId:s.id,value:l,items:l,count:l.length}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id}}}}case"change":try{let i=P(o.value),a=yo(e,o.field,String(o.action||"set"),i);return{success:!0,data:{nodeId:s.id,field:o.field,value:a,changed:!0}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"statistics":{let i=Ce(e,o.field),a=i.map(u=>Se(u,o.path)).filter(u=>u!=null),l=a.map(Number).filter(u=>Number.isFinite(u)),n=String(o.operation||"count"),d=a.length;n==="sum"?d=l.reduce((u,c)=>u+c,0):n==="avg"?d=l.length?l.reduce((u,c)=>u+c,0)/l.length:0:n==="min"?d=l.length?Math.min(...l):0:n==="max"&&(d=l.length?Math.max(...l):0);let f=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[f]:d,value:d,count:i.length}}}case"merge":{let a=String(o.fields||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>O(d,e)),l=String(o.mode||"object")==="array"?a.reduce((d,f)=>d.concat(Array.isArray(f)?f:[f]),[]):Object.assign({},...a.filter(d=>d&&typeof d=="object"&&!Array.isArray(d))),n=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[n]:l,value:l}}}case"event-emit":{let i=String(o.event||"workflow.event"),a=P(o.payload),l=e.eventBus||e.events;return l&&typeof l.emit=="function"?(l.emit(i,a),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:a}}):typeof e.emit=="function"?(e.emit(i,a),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:a}}):{success:!0,data:{nodeId:s.id,event:i,emitted:!1,payload:a}}}case"event-wait":{let i=String(o.event||"workflow.event"),a=Math.max(0,Number(o.timeout)||0),l=e.eventBus||e.events;try{if(l&&typeof l.wait=="function"){let n=await l.wait(i,a);return{success:!0,data:{nodeId:s.id,event:i,value:n,waited:!0}}}if(typeof e.waitEvent=="function"){let n=a?await Promise.race([Promise.resolve(e.waitEvent(i)),new Promise(d=>setTimeout(()=>d(void 0),a))]):await e.waitEvent(i);return{success:!0,data:{nodeId:s.id,event:i,value:n,waited:!0}}}return{success:!0,data:{nodeId:s.id,event:i,waited:!1}}}catch(n){return{success:!1,error:n,data:{nodeId:s.id,event:i}}}}case"command":{let i=String(o.command||""),a=P(o.args),l=e.exec||e.runCommand||e.commands?.[i];if(typeof l=="function")try{let n=await l(i,a,e);return{success:!0,data:n&&typeof n=="object"?{...n,nodeId:s.id,command:i}:{nodeId:s.id,command:i,result:n}}}catch(n){return{success:!1,error:n,data:{nodeId:s.id,command:i}}}return{success:!0,data:{nodeId:s.id,command:i,skipped:!0,args:a}}}case"split":{let i=O(o.field||"items",e),a=Array.isArray(i)?i:typeof i=="string"?i.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"map":{let a=Ce(e,o.field).map(l=>Se(l,o.path));return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"filter":{let a=Ce(e,o.field).filter(l=>{let n=Se(l,o.path);return Lt(n,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"sort":{let i=Ce(e,o.field).slice(),a=String(o.order||"asc")==="desc"?-1:1;return i.sort((l,n)=>{let d=Se(l,o.path),f=Se(n,o.path);return typeof d=="number"&&typeof f=="number"?(d-f)*a:String(d??"").localeCompare(String(f??""))*a}),{success:!0,data:{nodeId:s.id,items:i,count:i.length}}}case"range":{let i=Number(o.from??0),a=Number(o.to??10),l=Math.max(1,Math.abs(Number(o.step??1))||1),n=[];for(let d=i;d<a;d+=l)n.push(d);return{success:!0,data:{nodeId:s.id,items:n,count:n.length}}}case"batch":{let i=Ce(e,o.field),a=Math.max(1,Number(o.size)||10),l=[];for(let n=0;n<i.length;n+=a)l.push(i.slice(n,n+a));return{success:!0,data:{nodeId:s.id,items:l,count:l.length}}}case"comment":return{success:!0,data:{nodeId:s.id,comment:!0}};case"assign":{let i=P(o.values??o.data??{}),a={...e.variables||{},...i&&typeof i=="object"?i:{}};return e.variables=a,{success:!0,data:{nodeId:s.id,variables:a}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:s.id,result:P(o.result)}};let i=P(o.mapping);if(i&&typeof i=="object"){let a={};return Object.keys(i).forEach(l=>{a[l]=O(i[l],e)}),{success:!0,data:{nodeId:s.id,result:a}}}return{success:!0,data:{nodeId:s.id,result:e}}}case"parallel":return{success:!0,data:{nodeId:s.id,parallel:!0}};case"join":return{success:!0,data:{nodeId:s.id,joined:!0}};case"trycatch":return{success:!0,data:{nodeId:s.id,guarded:!0}};case"subprocess":{let i=P(o.workflow);if(i&&t?.executeDefinition){let a=await t.executeDefinition(i,e);return{success:a.success,data:{nodeId:s.id,subprocess:a.data},error:a.error}}return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:s.id,result:await o.execute(e)}}:s.requiresServer?{success:!1,error:new Error(`Node type "${s.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:s.id,type:s.type,pluginId:s.pluginId}}:{success:!0,data:{nodeId:s.id,type:s.type,result:P(o.result)}}}}function ie(s){let e=[];if(s?.id||e.push("Workflow ID is required"),s?.name||e.push("Workflow name is required"),!s?.nodes||s.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,o=[];for(let a of s.nodes)a.id?t.has(a.id)&&o.push(a.id):e.push("Every node requires an id"),t.add(a.id);o.length&&e.push(`Duplicate node IDs found: ${[...new Set(o)].join(", ")}`);let r=s.nodes.filter(a=>a.type==="start"),i=s.nodes.filter(a=>a.type==="inject");r.length===0&&i.length===0?e.push("Workflow must have at least one start node"):r.length>1&&e.push("Workflow should have only one start node");for(let a of s.connections||[])t.has(a.sourceNodeId)||e.push(`Connection references non-existent source node: ${a.sourceNodeId}`),t.has(a.targetNodeId)||e.push(`Connection references non-existent target node: ${a.targetNodeId}`),a.sourceNodeId===a.targetNodeId&&e.push(`Connection cannot link a node to itself: ${a.sourceNodeId}`);return at(s)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function at(s){let e=new Set,t=new Set,o=new Map;for(let i of s.nodes||[])o.set(i.id,[]);for(let i of s.connections||[]){let a=o.get(i.sourceNodeId);a&&a.push(i.targetNodeId)}let r=i=>{if(e.has(i))return!0;if(t.has(i))return!1;e.add(i);for(let a of o.get(i)||[])if(r(a))return!0;return e.delete(i),t.add(i),!1};for(let i of o.keys())if(r(i))return!0;return!1}function Et(s){let e=(s.nodes||[]).find(o=>o.type==="start");if(e)return e;let t=(s.nodes||[]).find(o=>o.type==="inject");return t||(s.nodes||[]).find(o=>!(s.connections||[]).some(r=>r.targetNodeId===o.id))}function Ne(s){let e=ie(s),t=new Map,o=new Map,r=new Map,i=(s?.connections||[]).slice();for(let d of s?.nodes||[])t.set(d.id,d),o.set(d.id,[]),r.set(d.id,[]);for(let d of i)o.get(d.sourceNodeId)?.push(d),r.get(d.targetNodeId)?.push(d);let a=Et(s),l=[],n=new Set;if(a){let d=[a.id];for(n.add(a.id);d.length;){let f=d.shift();l.push(f);for(let u of o.get(f)||[])!n.has(u.targetNodeId)&&t.has(u.targetNodeId)&&(n.add(u.targetNodeId),d.push(u.targetNodeId))}}for(let d of t.keys())n.has(d)||l.push(d);return{definition:s,entry:a,nodes:t,outgoing:o,incoming:r,edges:i,order:l,reachable:n,valid:e.valid,errors:e.errors}}function Mt(s,e={}){let t=Ne(s),o=e.originX??80,r=e.originY??80,i=e.columnGap??240,a=e.rowGap??140,l=new Map,n=[],d=t.entry?[t.entry.id]:[],f=[...d];for(d.forEach(c=>l.set(c,0));f.length;){let c=f.shift(),w=l.get(c)||0;for(let b of t.outgoing.get(c)||[]){let y=b.targetNodeId;if(!t.nodes.has(y))continue;let k=w+1,I=l.get(y);(I===void 0||I<k)&&(I===void 0&&f.push(y),l.set(y,k))}}for(let c of t.order){l.has(c)||l.set(c,Io(l,0));let w=l.get(c)||0;n[w]||(n[w]=[]),n[w].push(c)}let u={};return n.forEach((c,w)=>{c.forEach((b,y)=>{u[b]={x:o+w*i,y:r+y*a}})}),u}function Io(s,e){let t=e;return s.forEach(o=>{t=Math.max(t,o)}),t+1}var zt,Dt,No;function Re(s){return{id:s.id,name:s.name,description:s.description,nodeCount:s.nodes?.length||0,connectionCount:s.connections?.length||0,updatedAt:s.metadata?.updatedAt||new Date().toISOString()}}function nt(s){return JSON.parse(JSON.stringify(s))}var lt=class{constructor(){this[zt]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(Re).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?nt(t):void 0}async save(e){let t={...nt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),Re(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};zt=ce;var dt=class{constructor(e="tsdi.workflow.definitions.v1",t=Ot()){this.key=e,this.storage=t,this[Dt]=!0}async list(){return this.readAll().map(Re).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(r=>r.id!==e.id),o={...nt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(o),this.writeAll(t),Re(o)}async remove(e){let t=this.readAll(),o=t.filter(r=>r.id!==e);return o.length===t.length?!1:(this.writeAll(o),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};Dt=ce;function Ot(){try{return globalThis.localStorage}catch{return}}function Zt(){return Ot()?new dt:new lt}No=ce;function jt(s){return Re(s)}var _=class{};g(_,[[K(),0]]);var q=class extends _{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return Ie(this.node,e,this.runtimeHost)}};var ct=class extends bt{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return q}getBackend(){return e=>Ie(e.node,e.context,e.host)}handleNode(e){return Promise.resolve(this.handle(e,Be(this.injector)))}};function Pt(s,e){let t=s.get(ye,null);if(t)return e.forEach(r=>t.addInterceptor(q,r)),new ct(s);let o=new gt(r=>Ie(r.node,r.context,r.host),()=>e);return{handleNode:r=>Promise.resolve(o.handle(r,Be(s)))}}function Ro(s){return{nodeId:s,status:"pending"}}var We=class{intercept(e,t,o){let{node:r,state:i,emit:a}=e,l=i.nodeStates?.get(r.id)||Ro(r.id);return l.status="running",l.startedAt=Date.now(),i.nodeStates?.set(r.id,l),i.currentNodeId=r.id,i.activeNodeIds=[...i.activeNodeIds||[],r.id],a({type:"node-start",nodeId:r.id,status:"running"}),Promise.resolve(t.handle(e,o)).then(n=>(this.finish(e,l,n),n),n=>{let d={success:!1,error:n,data:{nodeId:r.id}};return this.finish(e,l,d),d})}finish(e,t,o){let{node:r,state:i,emit:a}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=o.success?"success":"failed",t.result=o,t.error=o.error?.message,i.nodeStates?.set(r.id,t),i.nodeResults.set(r.id,o),i.activeNodeIds=(i.activeNodeIds||[]).filter(l=>l!==r.id),a({type:"node-end",nodeId:r.id,status:t.status,result:o})}};function To(s){return s>0?new Promise(e=>setTimeout(e,s)):Promise.resolve()}var ut=class{constructor(e={}){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(0,Number(this.options.retries??1)||0),i=Math.max(0,Number(this.options.delayMs??0)||0),a=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,l=this.options.shouldRetry||((d,f)=>f?!0:d?.success===!1),n=async d=>{try{let f=await t.handle(e,o);if(d>=r||!l(f,void 0,e,d))return f}catch(f){if(d>=r||!l(void 0,f,e,d))throw f}return await To(i*Math.pow(a,d)),n(d+1)};return n(0)}},Ve=class{intercept(e,t,o){let r=e.node.config||{},i=Math.max(0,Math.min(20,Number(r.retry??r.retries)||0)),a=Math.max(0,Number(r.retryDelay)||0),l=Math.max(0,Number(r.timeout)||0);if(!i&&!l)return Promise.resolve(t.handle(e,o));let n={handle:(d,f)=>t.handle(d,f)};if(l>0){let d=new ft({timeoutMs:l}),f=n;n={handle:(u,c)=>d.intercept(u,f,c)}}if(i>0){let d=new ut({retries:i,delayMs:a}),f=n;n={handle:(u,c)=>d.intercept(u,f,c)}}return Promise.resolve(n.handle(e,o))}},ft=class{constructor(e){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(i=>{let a=!1,l=setTimeout(()=>{a||(a=!0,i({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${r}ms`),data:{nodeId:e.node.id,timeoutMs:r}}))},r);Promise.resolve(t.handle(e,o)).then(n=>{a||(a=!0,clearTimeout(l),i(n))},n=>{a||(a=!0,clearTimeout(l),i({success:!1,error:n,data:{nodeId:e.node.id}}))})})}};var Ao=100,Lo=.35,Eo=2.5;function Mo(s){return JSON.parse(JSON.stringify(s))}function zo(s){return`${s}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function pt(s,e="zh-CN",t){let o=(c,w)=>S(t,e,`workflow.demo.${c}`,w),r=(c,w,b,y,k,I)=>s.createNode(c,{x:y,y:k},{id:w,name:b,config:I}),i=r("start","start_1",o("start",e==="zh-CN"?"\u5F00\u59CB":"Start"),80,220),a=r("task","task_1",o("loadInput",e==="zh-CN"?"\u8BFB\u53D6\u8F93\u5165":"Load input"),330,220,{action:"loadInput",result:{approved:!0}}),l=r("condition","condition_1",o("approved",e==="zh-CN"?"\u662F\u5426\u901A\u8FC7":"Approved?"),590,220,{field:"approved",operator:"truthy"}),n=r("task","task_2",o("approve",e==="zh-CN"?"\u901A\u8FC7\u5904\u7406":"Approve"),850,120,{result:{approved:!0}}),d=r("task","task_3",o("reject",e==="zh-CN"?"\u62D2\u7EDD\u5904\u7406":"Reject"),850,320,{result:{approved:!1}}),f=r("end","end_1",o("end",e==="zh-CN"?"\u7ED3\u675F":"End"),1110,220),u=(c,w,b,y)=>({id:c,sourceNodeId:w,sourcePort:b,targetNodeId:y,targetPort:"in"});return{id:"workflow_demo",name:o("name",e==="zh-CN"?"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B":"Approval workflow"),description:o("description",e==="zh-CN"?"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002":"Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[i,a,l,n,d,f],connections:[u("conn_1","start_1","out","task_1"),u("conn_2","task_1","out","condition_1"),u("conn_3","condition_1","true","task_2"),u("conn_4","condition_1","false","task_3"),u("conn_5","task_2","out","end_1"),u("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function _t(s="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||(s==="zh-CN"?"\u65B0\u5EFA\u6D41\u7A0B":"New workflow"),description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var he=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new L,this.service=e.service,this.definition=e.definition||pt(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,o={}){let r=this.registry.get(e);if(!r){this.setError("workflow.error.unknownType",{type:e});return}if(r.singleton&&this.definition.nodes.some(a=>a.type===e)){this.setError("workflow.error.singleton",{label:r.label});return}let i=this.registry.createNode(e,t,{id:this.nextNodeId(e),...o});return this.commit(a=>({...a,nodes:[...a.nodes,i],metadata:{...a.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:i.id},this.clearError(),this.setMessage("workflow.message.added",{name:i.name}),i}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(o=>o.id!==e),connections:t.connections.filter(o=>o.sourceNodeId!==e&&o.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let o=Number.isFinite(t?.x)?t.x:0,r=Number.isFinite(t?.y)?t.y:0,i=this.definition.nodes.find(l=>l.id===e);if(!i)return!1;let a=this.snapPosition({x:o,y:r});return i.position.x===a.x&&i.position.y===a.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(l=>l.id===e?{...l,position:a}:l)}),!0)}updateNode(e,t){return this.definition.nodes.find(r=>r.id===e)?(this.commit(r=>({...r,nodes:r.nodes.map(i=>i.id===e?{...i,...t,id:i.id}:i),metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?this.updateNode(e,{config:{...o.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(o=>o.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,o,r){let i=this.definition.nodes.find(c=>c.id===e),a=this.definition.nodes.find(c=>c.id===o);if(!i||!a){this.setError("workflow.error.endpoints");return}if(e===o){this.setError("workflow.error.selfLink");return}let l=t||i.outputs?.[0]?.id||"out",n=r||a.inputs?.[0]?.id||"in";if(i.outputs?.length&&!i.outputs.some(c=>c.id===l)){this.setError("workflow.error.unknownOutput",{port:l});return}if(a.inputs?.length&&!a.inputs.some(c=>c.id===n)){this.setError("workflow.error.unknownInput",{port:n});return}let d=this.definition.connections.find(c=>c.sourceNodeId===e&&c.sourcePort===l&&c.targetNodeId===o&&c.targetPort===n);if(d)return this.selection={connectionId:d.id},d;let f={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:l,targetNodeId:o,targetPort:n},u={...this.definition,connections:[...this.definition.connections,f]};if(at(u)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...u,metadata:{...u.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:f.id},this.clearError(),this.setMessage("workflow.message.connected"),f}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(o=>o.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?(this.selection={nodeId:e},this.drag={nodeId:e,startX:o.position.x,startY:o.position.y,offsetX:t.x-o.position.x,offsetY:t.y-o.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),o=Math.round(e.y-this.drag.offsetY),r=this.snapPosition({x:t,y:o});r.x===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.x&&r.y===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(i=>i.id===this.drag.nodeId?{...i,position:r}:i)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,o,r="output"){let i=this.definition.nodes.find(l=>l.id===e),a=r==="input"?i?.inputs:i?.outputs;return!i||!(a||[]).some(l=>l.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:r,x:o.x,y:o.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let o=this.connectionDraft;if(o)return this.connectionDraft=void 0,o.sourceSide==="input"?this.addConnection(e,t,o.sourceNodeId,o.sourcePort):this.addConnection(o.sourceNodeId,o.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(Lo,Math.min(Eo,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return Ne(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=Mt(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(o=>({...o,position:e[o.id]||o.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(o=>({...o,nodes:[...o.nodes,t],metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(o=>o.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let o;try{o=typeof e=="string"?JSON.parse(e):Mo(e)}catch(i){return this.setError(i.message),!1}let r=ie(o);return!o||!Array.isArray(o.nodes)||!Array.isArray(o.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=o,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(r.valid?"":r.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let o=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(o={...o,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let r=await e.save(o);return this.definition=o,this.normalize(),this.dirty=!1,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:o.name}),r}async openFrom(e,t){let o=await e.get(t);return o?this.load(o,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){return ie(this.definition)}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let o=new Error("workflow.error.noService");return this.setError(o.message),{success:!1,error:o}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let o=await this.service.execute(this.definition,e.context||{},{...e,onEvent:i=>{this.activeExecutionId=i.executionId,this.execution=i.snapshot,e.onEvent?.(i)},onCheckpoint:i=>{i.status==="running"&&(this.checkpoint=i),e.onCheckpoint?.(i)}}),r=o.data?.executionState;return r&&(this.execution=r,this.recordExecution(r)),o.success&&(this.checkpoint=void 0),this.activeExecutionId=o.data?.executionId,this.running=!1,this.setMessage(o.success?"workflow.message.completed":"workflow.message.failed"),o.success||this.setError(o.error?.message||"workflow.message.failed"),o}catch(o){return this.running=!1,this.setError(o.message),this.setMessage("workflow.message.failed"),{success:!1,error:o}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=zo("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),o=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(r=>({...r})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(r=>({...r})),config:{...o||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>Ao&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(o=>o&&o.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,o=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(o)};let r=this.gridSize;return{x:Math.round(t/r)*r,y:Math.round(o/r)*r}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(r=>r.id)),o=1;for(;t.has(`${e}_${o}`);)o++;return`${e}_${o}`}nextConnectionId(){let e=new Set(this.definition.connections.map(o=>o.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var Do=184;var Vt=20,qt=48,Ft={idle:{en:"",zh:""},pending:{en:"Pending",zh:"\u7B49\u5F85"},running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},success:{en:"Done",zh:"\u6210\u529F"},failed:{en:"Failed",zh:"\u5931\u8D25"},skipped:{en:"Skipped",zh:"\u8DF3\u8FC7"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"}};function Jt(s,e,t){let o=Ft[s]||Ft.idle;return S(t,e,`workflow.status.${s}`,j(e,o.en,o.zh))}function ht(s,e,t){let o=s||"idle",r={running:{en:"Running",zh:"\u8FD0\u884C\u4E2D"},completed:{en:"Completed",zh:"\u5DF2\u5B8C\u6210"},failed:{en:"Failed",zh:"\u5931\u8D25"},cancelled:{en:"Cancelled",zh:"\u5DF2\u53D6\u6D88"},pending:{en:"Pending",zh:"\u7B49\u5F85"},idle:{en:"Idle",zh:"\u7A7A\u95F2"}},i=r[o]||r.idle;return S(t,e,`workflow.status.${o}`,j(e,i.en,i.zh))}function wt(s){let e=s.dimension?.width||Do,t=Math.max(s.inputs?.length||0,s.outputs?.length||0,1),o=Math.max(s.dimension?.height||64,qt+t*Vt+10);return{width:e,height:o}}function Oo(s){let{width:e,height:t}=wt(s),o=(r,i)=>(r||[]).map((a,l)=>({id:a.id,label:a.label||a.name||a.id,type:a.type,x:i,y:s.position.y+qt+l*Vt-5}));return{width:e,height:t,inputs:o(s.inputs,s.position.x),outputs:o(s.outputs,s.position.x+e)}}function $t(s,e){let t=Math.max(48,Math.abs(e.x-s.x)/2);return`M ${s.x} ${s.y} C ${s.x+t} ${s.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function Zo(s){return{class:["workflow-node",s.selected?"is-selected":""].filter(Boolean).join(" "),"data-node-id":s.id,"data-node-type":s.type,"data-status":s.status,role:"button",tabindex:"0","aria-label":s.name,style:[`left:${s.x}px`,`top:${s.y}px`,`width:${s.width}px`,`min-height:${s.height}px`].join(";")}}function Ht(s,e,t="zh-CN",o){let r=[],i=new Map,a=s.execution;for(let u of s.nodes){let c=Oo(u);i.set(u.id,c);let w=a?.nodeStates?.[u.id]?.status||"idle",b={id:u.id,name:u.name,type:u.type,typeLabel:e.nodeLabel(u.type,t,o),description:u.description||e.nodeDescription(u.type,t,o),x:u.position.x,y:u.position.y,width:c.width,height:c.height,icon:u.style?.icon||e.get(u.type)?.icon||"\u25C6",color:u.style?.backgroundColor||e.get(u.type)?.color||"#64748b",textColor:u.style?.textColor||e.get(u.type)?.textColor||"#ffffff",selected:s.selection.nodeId===u.id,status:w,statusLabel:Jt(w,t,o),inputs:c.inputs,outputs:c.outputs};r.push({...b,attrs:Zo(b)})}let l=s.connections.map(u=>{let c=s.nodes.find(ee=>ee.id===u.sourceNodeId),w=s.nodes.find(ee=>ee.id===u.targetNodeId),b=c?i.get(c.id):void 0,y=w?i.get(w.id):void 0,k=b?.outputs.find(ee=>ee.id===u.sourcePort)||b?.outputs[0],I=y?.inputs.find(ee=>ee.id===u.targetPort)||y?.inputs[0],T=a?.edgeStates?.[u.id]?.status||"idle",M=s.selection.connectionId===u.id,J=k&&I?$t(k,I):"M 0 0",Oe=k&&I?(k.x+I.x)/2:0,io=k&&I?(k.y+I.y)/2:0,ao={class:`workflow-edge workflow-edge-${T}${M?" is-selected":""}`,"data-edge-id":u.id,"data-status":T,d:J,"marker-end":`url(#wf-arrow-${T})`};return{id:u.id,sourceNodeId:u.sourceNodeId,targetNodeId:u.targetNodeId,sourcePort:u.sourcePort,targetPort:u.targetPort,label:u.label||"",d:J,status:T,selected:M,attrs:ao,hitAttrs:{class:"workflow-edge-hit","data-edge-id":u.id,d:J},labelAttrs:{x:String(Oe),y:String(io-6),class:"workflow-edge-label"}}}),n;if(s.connectionDraft){let u=s.nodes.find(y=>y.id===s.connectionDraft.sourceNodeId),c=u?i.get(u.id):void 0,b=(s.connectionDraft.sourceSide==="input"?c?.inputs:c?.outputs)?.find(y=>y.id===s.connectionDraft.sourcePort);b&&(n={d:$t(b,{x:s.connectionDraft.x,y:s.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=r.reduce((u,c)=>Math.max(u,c.x+c.width),0),f=r.reduce((u,c)=>Math.max(u,c.y+c.height),0);return{nodes:r,edges:l,draft:n,connecting:!!s.connectionDraft,connectingSide:s.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,f+240),zoom:s.zoom,pan:{...s.pan},gridStyle:{"--wf-grid-size":`${24*s.zoom}px`,"--wf-grid-x":`${s.pan.x}px`,"--wf-grid-y":`${s.pan.y}px`}}}function Ut(s,e="zh-CN",t){return s.palette(e,t)}function jo(s,e){return e.equals!==void 0?String(s)===String(e.equals):e.notEquals!==void 0?String(s)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(s)):e.truthy!==void 0?e.truthy?!!s:!s:e.falsy!==void 0?e.falsy?!s:!!s:!0}function Po(s){let e=s.defaultValue;return s.type==="json"?typeof e=="string"?e:JSON.stringify(e??{},null,2):s.type==="boolean"?e===!0:e==null?"":String(e)}function Bt(s,e,t="zh-CN",o){let r=s.selectedNode;if(!r)return{hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let i=e.get(r.type),a=s.execution?.nodeStates?.[r.id],l=a?.status||"idle",n={};(i?.fields||[]).forEach(c=>{n[c.key]=r.config?.[c.key]!==void 0?r.config[c.key]:c.defaultValue});let d=(i?.fields||[]).map(c=>{let w=n[c.key];return{key:c.key,label:S(o,t,`workflow.field.${r.type}.${c.key}`,j(t,c.label,c.labelZh)),type:c.type,value:w,displayValue:c.type==="json"?typeof w=="string"?w:JSON.stringify(w??{},null,2):w==null?"":String(w),checked:w===!0,options:(c.options||[]).map(b=>({label:S(o,t,`workflow.option.${b.value}`,j(t,b.label,b.labelZh)),value:b.value})),placeholder:j(t,c.placeholder||"",c.placeholderZh),description:j(t,c.description||"",c.descriptionZh),group:j(t,c.group||"",c.groupZh),visible:c.visibleWhen?jo(n[c.visibleWhen.key],c.visibleWhen):!0,min:c.min,max:c.max,step:c.step,rows:c.rows||(c.type==="json"?4:c.type==="code"?8:3),required:c.required===!0,readonly:c.readonly===!0,pattern:c.pattern,language:c.language,hasDefault:c.defaultValue!==void 0,resetValue:Po(c)}}),f="";if(a?.result?.data!==void 0)try{f=JSON.stringify(a.result.data,null,2)}catch{f=String(a.result.data)}let u=a?.durationMs||0;return{hasSelection:!0,nodeId:r.id,name:r.name,description:r.description||"",typeLabel:e.nodeLabel(r.type,t,o),status:l,statusLabel:Jt(l,t,o),durationLabel:u?`${u} ms`:"",fields:d,resultText:f,errorText:a?.error||""}}function Gt(s,e="zh-CN",t){let o=s.execution;return{name:s.definition.name,nodeCount:s.nodes.length,connectionCount:s.connections.length,hasSelection:!!s.selection?.nodeId||!!s.selection?.connectionId,canUndo:s.canUndo,canRedo:s.canRedo,canResume:s.canResume,running:s.running,zoomLabel:`${Math.round(s.zoom*100)}%`,statusLabel:ht(o?.status,e,t)}}function Kt(s,e="zh-CN",t){let o=s.selectedNode,r=s.execution,i=o?s.registry.nodeLabel(o.type,e,t):"";return{message:it(t,e,s.message,"",s.messageParams),error:it(t,e,s.error,"",s.errorParams),running:s.running,nodeCount:s.nodes.length,selectedLabel:o?`${o.name} \xB7 ${i}`:S(t,e,"workflow.ui.noSelection",j(e,"No node selected","\u672A\u9009\u62E9\u8282\u70B9")),zoomLabel:`${Math.round(s.zoom*100)}%`,executionLabel:ht(r?.status,e,t)}}function Wt(s){if(!s)return"";let e=new Date(s),t=o=>String(o).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function _o(s,e){if(!s||!e||e<s)return"";let t=e-s;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function Yt(s,e="zh-CN",t){return(s.executionHistory||[]).filter(Boolean).map(o=>{let r=o.status==="completed"?"success":o.status==="failed"?"failed":o.status==="cancelled"?"cancelled":o.status==="running"?"running":"idle";return{executionId:o.executionId,label:Wt(o.startTime),status:o.status,statusLabel:ht(o.status,e,t),timeLabel:Wt(o.startTime),durationLabel:_o(o.startTime,o.endTime),nodeCount:Object.keys(o.nodeStates||{}).length,tone:r,active:s.selectedExecutionId===o.executionId}})}var fi=te("VISUAL_NODE"),E=class extends _{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(E.prototype,"id");Reflect.metadata("design:type",String)(E.prototype,"name");Reflect.metadata("design:type",Object)(E.prototype,"type");Reflect.metadata("design:type",Object)(E.prototype,"position");Reflect.metadata("design:type",String)(E.prototype,"description");Reflect.metadata("design:type",Array)(E.prototype,"inputs");Reflect.metadata("design:type",Array)(E.prototype,"outputs");Reflect.metadata("design:type",Object)(E.prototype,"config");Reflect.metadata("design:type",Object)(E.prototype,"style");g(E,[[p(),1,"id"],[p(),1,"name"],[p(),1,"type"],[p(),1,"position"],[p(),1,"description"],[p(),1,"inputs"],[p(),1,"outputs"],[p(),1,"config"],[p(),1,"style"],[K(),0]]);var qe=class extends E{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(qe);g(qe,[[x({selector:"start-node"}),0]]);var Je=class extends E{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(Je);g(Je,[[x({selector:"end-node"}),0]]);var we=class extends E{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(we.prototype,"action");Reflect.metadata("design:type",String)(we.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(we);g(we,[[p(),1,"action"],[p(),1,"taskName"],[x({selector:"task-node"}),0]]);var Te=class extends E{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(Te.prototype,"condition");Reflect.metadata("design:paramtypes",[])(Te);g(Te,[[p(),1,"condition"],[x({selector:"condition-node"}),0]]);var ae=class extends E{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=[],r=[...this.branches],i=[];for(;r.length>0||i.length>0;){for(;r.length>0&&i.length<this.maxConcurrent;){let l=r.shift().execute(e).then(n=>{t.push(n),!n.success&&n.error&&o.push(n.error)});i.push(l)}i.length>0&&(await Promise.race(i),i.splice(0,i.findIndex(a=>!r.includes(a))))}return{success:o.length===0,data:{results:t,errors:o.length>0?o:void 0,nodeId:this.id},error:o.length>0?o[0]:void 0}}};Reflect.metadata("design:type",Array)(ae.prototype,"branches");Reflect.metadata("design:type",Object)(ae.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(ae.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(ae);g(ae,[[p(),1,"branches"],[p(),1,"maxConcurrent"],[p(),1,"waitAll"],[x({selector:"parallel-node"}),0]]);var Ae=class extends E{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(Ae.prototype,"delay");Reflect.metadata("design:paramtypes",[])(Ae);g(Ae,[[p(),1,"delay"],[x({selector:"delay-node"}),0]]);var ne=class extends E{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=0;for(;o<this.maxIterations&&await this.condition(e,o);){let i=await this.body.execute(e);t.push(i),o++}return{success:!0,data:{iterations:o,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",_)(ne.prototype,"body");Reflect.metadata("design:type",Function)(ne.prototype,"condition");Reflect.metadata("design:type",Object)(ne.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(ne);g(ne,[[p(),1,"body"],[p(),1,"condition"],[p(),1,"maxIterations"],[x({selector:"loop-node"}),0]]);var le=class extends E{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),o=this.cases.get(t)||this.defaultCase;if(!o)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let r=await o.execute(e);return{success:r.success,data:{value:t,caseResult:r.data,nodeId:this.id},error:r.error}}};Reflect.metadata("design:type",Function)(le.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(le.prototype,"cases");Reflect.metadata("design:type",_)(le.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(le);g(le,[[p(),1,"value"],[p(),1,"cases"],[p(),1,"defaultCase"],[x({selector:"switch-node"}),0]]);var de=class extends E{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,o;try{t=await this.tryActivity.execute(e)}catch(r){o=r,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:o,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:o,nodeId:this.id}}}};Reflect.metadata("design:type",_)(de.prototype,"tryActivity");Reflect.metadata("design:type",_)(de.prototype,"catchActivity");Reflect.metadata("design:type",_)(de.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(de);g(de,[[p(),1,"tryActivity"],[p(),1,"catchActivity"],[p(),1,"finallyActivity"],[x({selector:"trycatch-node"}),0]]);var Le=class extends E{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(Le.prototype,"workflow");Reflect.metadata("design:paramtypes",[])(Le);g(Le,[[p(),1,"workflow"],[x({selector:"subprocess-node"}),0]]);var Q=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};g(Q,[[R(),0]]);function Xt(s){return{id:s.id,name:s.name,description:s.description,version:s.version,nodes:(s.nodes||[]).map(e=>{let{execute:t,activityType:o,...r}=e;return JSON.parse(JSON.stringify(r))})}}var H=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>Xt(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let a of e.nodes||[])a?.type&&(this.nodes.register({...a,pluginId:e.id,requiresServer:a.requiresServer!==!1}),t.push(a.type));let o=typeof e.services=="function"?e.services():e.services,r=[];Object.entries(o||{}).forEach(([a,l])=>{this.services.set(a,l),r.push(a)});let i={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(i)}catch(a){throw t.forEach(l=>this.nodes.unregister(l)),r.forEach(l=>this.services.remove(l)),a}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:r}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let o={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(o)}finally{t.nodeTypes.forEach(r=>this.nodes.unregister(r));for(let r of t.serviceNames){let i=this.services.get(r);try{await i?.dispose?.()}finally{this.services.remove(r)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[L,Q])(H);g(H,[[R(),0]]);var Qt=30,eo=300;function Ee(s){let e={};s.nodeStates?.forEach((o,r)=>{e[r]={...o,result:o.result?{success:o.result.success,data:o.result.data,error:o.result.error?.message}:void 0}});let t={};return s.edgeStates?.forEach((o,r)=>{t[r]={...o}}),{executionId:s.executionId,workflowId:s.workflowId,status:s.status,currentNodeId:s.currentNodeId,startTime:s.startTime,endTime:s.endTime,error:s.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...s.activeNodeIds||[]],logs:[...s.logs||[]]}}var U=class{constructor(e,t,o){this.injector=e,this.plugins=o,this.executions=new Map,this.pathInterceptor=new We,this.policyInterceptor=new Ve,this.interceptors=[],this.registry=t||new L;let r=this.injector.get(ye,null);r&&(r.addInterceptor(q,this.pathInterceptor),r.addInterceptor(q,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get(ye,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(q,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(q,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},o={}){let r=o.executionId||o.resumeFrom?.executionId||this.generateExecutionId(),i=this.withPluginServices(t),a=o.resumeFrom?this.createStateFromCheckpoint(e,o.resumeFrom,r):this.createState(e,r);this.executions.set(r,a),this.trimHistory(o.maxHistory),this.emit(o,a,{type:"workflow-start",status:"running"}),this.checkpoint(o,a);try{let l=Ne(e),n=l.entry;if(!n)throw new Error("No start node found in workflow");let d={executeDefinition:(y,k)=>this.execute(y,k,{...o,executionId:void 0}),executeNode:async(y,k)=>{let I=this.registry.executor(y.type);return I?I(y,k):void 0}},f=new Set,u=new Set,c=Pt(this.injector,this.nodeInterceptors()),w=await this.executeFromNode(n,l,i,a,o,d,f,c,!!o.resumeFrom,u);a.status==="cancelled"||this.isCancelled(a)?(a.status="cancelled",this.finishPendingNodes(a,"skipped"),this.emit(o,a,{type:"workflow-cancelled",status:"cancelled"})):(a.status=w.success?"completed":"failed",!w.success&&w.error&&(a.error=w.error),this.finishPendingNodes(a,(w.success,"skipped")),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:w.success?"workflow-end":"workflow-error",status:a.status,error:w.error})),a.endTime=Date.now(),a.currentNodeId=void 0,this.checkpoint(o,a);let b=Ee(a);return{success:a.status==="completed",data:{executionId:r,workflowId:e.id,status:a.status,nodeResults:Object.fromEntries(a.nodeResults),executionState:b,...w.data||{}},error:w.error||a.error}}catch(l){return a.status="failed",a.endTime=Date.now(),a.currentNodeId=void 0,a.error=l,this.finishPendingNodes(a,"skipped"),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:"workflow-error",status:"failed",error:l}),this.checkpoint(o,a),{success:!1,error:l,data:{executionId:r,workflowId:e?.id,status:a.status,executionState:Ee(a)}}}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let o=e?.services||{};return{...e,services:{...t,...o}}}createState(e,t){let o=new Map;(e.nodes||[]).forEach(i=>{o.set(i.id,{nodeId:i.id,status:"pending"})});let r=new Map;return(e.connections||[]).forEach(i=>{r.set(i.id,{connectionId:i.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:o,edgeStates:r,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,o){let r=this.createState(e,o);r.status="running",r.startTime=t.startTime||r.startTime,r.endTime=void 0,r.currentNodeId=void 0,r.activeNodeIds=[],r.logs=[...t.logs||[]];let i=t.nodeStates||{};for(let l of e.nodes||[]){let n=i[l.id];n&&(r.nodeStates?.set(l.id,{...n}),n.result&&r.nodeResults.set(l.id,{success:n.result.success,data:n.result.data,error:n.error?new Error(String(n.error)):void 0}))}let a=t.edgeStates||{};for(let l of e.connections||[]){let n=a[l.id];n&&r.edgeStates?.set(l.id,{...n})}return r}existingNodeResult(e,t,o){return o.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(Ee(t))}catch{}}async executeFromNode(e,t,o,r,i,a,l,n,d=!1,f=new Set){if(r.status==="cancelled"||this.isCancelled(r))return r.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(l.has(e.id))return r.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};let u=r.nodeStates?.get(e.id),c=u&&(u.status==="success"||u.status==="failed"||u.status==="skipped"||u.status==="cancelled"),w;if(c&&d&&(u.status==="success"||u.status==="failed")){if(f.has(e.id))return this.existingNodeResult(e.id,u,r);f.add(e.id),l.add(e.id),w=this.existingNodeResult(e.id,u,r)}else{if(c)return l.add(e.id),this.existingNodeResult(e.id,u,r);if(e.type==="join"&&!this.isJoinReady(t,r,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};l.add(e.id),w=await n.handleNode({node:e,context:o,host:a,state:r,options:i,emit:k=>this.emit(i,r,k)}),this.checkpoint(i,r)}if(!w.success){let k=t.outgoing.get(e.id)||[],I=k.filter(M=>M.sourcePort==="error");if(!I.length)return w;for(let M of k)M.sourcePort!=="error"&&this.markEdgeSkipped(r,M.id,i);let T={...o,error:w.error,errorMessage:w.error?.message,failedNodeId:e.id,failedResult:w};for(let M of I){let J=t.nodes.get(M.targetNodeId);if(!J)continue;this.markEdgeTraversed(r,M,i);let Oe=await this.executeFromNode(J,t,T,r,i,a,l,n,d,f);if(!Oe.success)return Oe}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return w;let b=this.selectNextConnections(e,t,o,w),y=new Set(b.map(k=>k.id));for(let k of t.outgoing.get(e.id)||[])y.has(k.id)||this.markEdgeSkipped(r,k.id,i);if(e.type==="parallel"&&b.length>1)return(await Promise.all(b.map(T=>{let M=t.nodes.get(T.targetNodeId);return M?(this.markEdgeTraversed(r,T,i),this.executeFromNode(M,t,this.mergeContext(o,w,T),r,i,a,l,n,d,f)):Promise.resolve({success:!1,error:new Error(`Missing node ${T.targetNodeId}`)})}))).find(T=>!T.success)||w;for(let k of b){let I=t.nodes.get(k.targetNodeId);if(!I)continue;this.markEdgeTraversed(r,k,i);let T=await this.executeFromNode(I,t,this.mergeContext(o,w,k),r,i,a,l,n,d,f);if(!T.success)return T}return w}mergeContext(e,t,o){return{...e,...t.data||{}}}isJoinReady(e,t,o){let r=e.incoming.get(o)||[];if(!r.length)return!0;let i=r.map(l=>t.nodeStates?.get(l.sourceNodeId)?.status);return i.every(l=>l==="success"||l==="failed"||l==="skipped"||l==="cancelled")&&i.some(l=>l==="success")}selectNextConnections(e,t,o,r){let i=t.outgoing.get(e.id)||[];if(!i.length)return[];if(e.type==="condition"){let a=r.data?.condition?"true":"false",l=i.filter(n=>n.sourcePort===a);return l.length?l:i.filter(n=>n.sourcePort!=="true"&&n.sourcePort!=="false")}if(e.type==="switch"){let a=r.data?.condition,l=a==null?"":String(a),n=i.filter(f=>f.sourcePort===l);if(n.length)return n;let d=i.filter(f=>f.sourcePort==="default");return d.length?d:i.filter(f=>f.sourcePort==="out")}return i.filter(a=>a.sourcePort==="error"?!1:a.condition===void 0||a.condition===null?!0:typeof a.condition=="function"?!!a.condition(o):typeof a.condition=="boolean"?a.condition:!!O(a.condition,o))}markEdgeTraversed(e,t,o){let r=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};r.status!=="traversed"&&(r.status="traversed",r.traversedAt=Date.now(),r.count=(r.count||0)+1,e.edgeStates?.set(t.id,r),this.emit(o,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"}))}markEdgeSkipped(e,t,o){let r=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};r.status!=="traversed"&&(r.status="skipped",e.edgeStates?.set(t,r),this.emit(o,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((o,r)=>{(o.status==="pending"||o.status==="idle")&&(o.status=t,e.nodeStates?.set(r,o))})}finishIdleEdges(e,t){e.edgeStates?.forEach((o,r)=>{(o.status==="idle"||o.status==="active")&&(o.status=t,e.edgeStates?.set(r,o))})}emit(e,t,o){let r=Date.now(),i={...o,executionId:t.executionId,workflowId:t.workflowId,timestamp:r,snapshot:Ee(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:r,level:this.logLevelFor(o.type,o.status),event:o.type,message:this.logMessageFor(t,o),nodeId:o.nodeId,connectionId:o.connectionId}),t.logs.length>eo&&t.logs.splice(0,t.logs.length-eo)),e.onEvent)try{e.onEvent(i)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let o=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return o?.success===!1?`Node ${t.nodeId} failed: ${o.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=Qt){let t=Math.max(1,Number(e)||Qt),o=Array.from(this.executions.values()).filter(r=>r.status!=="running").sort((r,i)=>(r.endTime||0)-(i.endTime||0));for(;o.length>t;){let r=o.shift();r&&this.executions.delete(r.executionId)}}validate(e){return ie(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?Ee(t):void 0}getExecutions(){return Array.from(this.executions.values())}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[Ze,L,H])(U);g(U,[[N(),3,void 0,2],[N(),3,void 0,1],[R(),0]]);var me=class s{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,o){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,o){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,o){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,o){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:o||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,o){let r={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:o?.sourcePort||"out",targetNodeId:t,targetPort:o?.targetPort||"in",label:o?.label,condition:o?.condition};return this.connections.push(r),this}connectNodes(e,t,o="out",r="in"){return this.connect(e,t,{sourcePort:o,targetPort:r})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new s}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};g(me,[[R(),0]]);var to=["light","dark","solarized","high-contrast"],Fo={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},C=class{constructor(e){this.translator=e,this.model=Fo,this.locale="zh-CN",this.theme="light",this.menuSelect=t=>{if(t.startsWith("theme:")){let o=t.slice(6);to.includes(o)&&this.selectTheme(o);return}switch(t){case"run":this.run();break;case"resume":this.resume();break;case"cancel":this.cancel();break;case"undo":this.undo();break;case"redo":this.redo();break;case"duplicate":this.duplicate();break;case"delete":this.remove();break;case"clear":this.clear();break;case"reset-view":this.resetView();break;case"auto-layout":this.autoLayout();break;case"toggle-logs":this.toggleLogs();break;case"save":this.save();break;case"open-library":this.openLibrary();break;case"toggle-json":this.toggleJson();break;default:this.action?.(t);break}}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,o){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,o)}get runLabel(){return this.t("run","Run")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get themeMenuLabel(){return this.t("themeMenu","Theme")}get themeName(){return ke(this.theme)?this.theme:"light"}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}get menuLabel(){return this.t("menu","Menu")}get shortcutsLabel(){return this.t("shortcuts","Keyboard shortcuts")}get jsonMenuLabel(){return this.t("jsonMenu","Import / Export JSON")}get menuGroups(){let e=this.menuCache;if(e&&e.model===this.model&&e.theme===this.theme&&e.locale===this.locale)return e.groups;let t=[{items:[{id:"save",label:this.saveLabel,shortcut:"Ctrl+S"},{id:"open-library",label:this.libraryLabel},{id:"toggle-json",label:this.jsonMenuLabel}]},{items:[{id:"run",label:this.runLabel,icon:"\u25B6",disabled:this.model.running||!this.model.nodeCount},{id:"resume",label:this.resumeLabel,icon:"\u23F5",disabled:!this.model.canResume},{id:"cancel",label:this.stopLabel,icon:"\u25A0",disabled:!this.model.running}]},{items:[{id:"undo",label:this.undoLabel,shortcut:"Ctrl+Z",disabled:!this.model.canUndo},{id:"redo",label:this.redoLabel,shortcut:"Ctrl+Y",disabled:!this.model.canRedo},{id:"duplicate",label:this.duplicateLabel,shortcut:"Ctrl+D",disabled:!this.model.hasSelection},{id:"delete",label:this.deleteLabel,shortcut:"Del",disabled:!this.model.hasSelection,danger:!0},{id:"clear",label:this.clearLabel,disabled:!this.model.nodeCount}]},{items:[{id:"reset-view",label:this.resetLabel},{id:"auto-layout",label:this.layoutLabel},{id:"toggle-logs",label:this.logsLabel},{id:"theme",label:this.themeMenuLabel,icon:"\u25D0",children:to.map(o=>({id:`theme:${o}`,label:this.themeOptionLabel(o),checked:this.themeName===o}))}]},{items:[{id:"shortcuts",label:this.shortcutsLabel,shortcut:"?"}]}];return this.menuCache={model:this.model,theme:this.theme,locale:this.locale,groups:t},t}run(){(this.runAction||(()=>this.action?.("run")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(C.prototype,"model");Reflect.metadata("design:type",Object)(C.prototype,"locale");Reflect.metadata("design:type",Object)(C.prototype,"theme");Reflect.metadata("design:type",Function)(C.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(C.prototype,"runAction");Reflect.metadata("design:type",Function)(C.prototype,"resumeAction");Reflect.metadata("design:type",Function)(C.prototype,"cancelAction");Reflect.metadata("design:type",Function)(C.prototype,"undoAction");Reflect.metadata("design:type",Function)(C.prototype,"redoAction");Reflect.metadata("design:type",Function)(C.prototype,"deleteAction");Reflect.metadata("design:type",Function)(C.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(C.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(C.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(C.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(C.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(C.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(C.prototype,"saveAction");Reflect.metadata("design:type",Function)(C.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(C.prototype,"clearAction");Reflect.metadata("design:type",Function)(C.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(C.prototype,"action");Reflect.metadata("design:type",Object)(C.prototype,"menuCache");Reflect.metadata("design:paramtypes",[A])(C);g(C,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"runAction"],[p(),1,"resumeAction"],[p(),1,"cancelAction"],[p(),1,"undoAction"],[p(),1,"redoAction"],[p(),1,"deleteAction"],[p(),1,"zoomInAction"],[p(),1,"zoomOutAction"],[p(),1,"resetViewAction"],[p(),1,"autoLayoutAction"],[p(),1,"duplicateAction"],[p(),1,"toggleLogsAction"],[p(),1,"saveAction"],[p(),1,"openLibraryAction"],[p(),1,"clearAction"],[p(),1,"toggleJsonAction"],[p(),1,"action"],[D(),1,"menuCache"],[N(),3,void 0,0],[x({selector:"workflow-toolbar",template:`
    <div class="workflow-toolbar">
        <span class="workflow-toolbar-title">{{model.name}}</span>
        <span class="workflow-toolbar-meta">{{nodeLabel}} \xB7 {{connectionLabel}}</span>
        <span class="workflow-toolbar-status">{{model.statusLabel}}</span>
        <span class="workflow-status-spacer"></span>
        <button class="workflow-btn workflow-btn-primary" [disabled]="model.running || !model.nodeCount" @click="run">{{runLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canResume" @click="resume">{{resumeLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.running" @click="cancel">{{stopLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canUndo" @click="undo">{{undoLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.canRedo" @click="redo">{{redoLabel}}</button>
        <button class="workflow-btn workflow-btn-danger" [disabled]="!model.hasSelection" @click="remove">{{deleteLabel}}</button>
        <button class="workflow-btn" @click="zoomOut">\u2212</button>
        <span class="workflow-toolbar-zoom">{{model.zoomLabel}}</span>
        <button class="workflow-btn" @click="zoomIn">+</button>
        <button class="workflow-btn" @click="resetView">{{resetLabel}}</button>
        <button class="workflow-btn" @click="autoLayout">{{layoutLabel}}</button>
        <button class="workflow-btn" [disabled]="!model.hasSelection" @click="duplicate">{{duplicateLabel}}</button>
        <button class="workflow-btn" @click="toggleLogs">{{logsLabel}}</button>
        <button class="workflow-btn" @click="save">{{saveLabel}}</button>
        <button class="workflow-btn" @click="openLibrary">{{libraryLabel}}</button>
        <button class="workflow-btn" @click="toggleJson">JSON</button>
        <button class="workflow-btn" [disabled]="!model.nodeCount" @click="clear">{{clearLabel}}</button>
        <menu-bar class="workflow-menu" icon="\u2630" label="" caret="" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var F=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes",this.isZh?"\u641C\u7D22\u8282\u70B9\u2026":"Search nodes\u2026")}get noMatchesLabel(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches",this.isZh?"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9":"No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(o=>this.matches(o,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(o=>String(o).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(F.prototype,"groups");Reflect.metadata("design:type",Object)(F.prototype,"locale");Reflect.metadata("design:type",Function)(F.prototype,"addAction");Reflect.metadata("design:type",Function)(F.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[A])(F);g(F,[[p(),1,"groups"],[p(),1,"locale"],[p(),1,"addAction"],[p(),1,"dragStartAction"],[N(),3,void 0,0],[x({selector:"workflow-palette",template:`
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
    </div>`}),0]]);var $o={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},$=class{constructor(e){this.elementRef=e,this.model=$o,this.locale="zh-CN"}get emptyHint(){return String(this.locale||"").toLowerCase().startsWith("zh")?"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0":"Drag a component from the palette, or click one to add it"}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,o){return{class:`workflow-node-port workflow-node-port-${o}`,"data-port-id":t.id,"data-port-side":o,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,o=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,o-this.panStart.clientY),this.panStart={clientX:t,clientY:o}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,o,r){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}portUp(e,t,o,r){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,o=this.model.pan||{x:0,y:0},r=this.elementRef?.nativeElement,i=r?.querySelector?.(".workflow-canvas")||r,a=i?.getBoundingClientRect?.()||{left:0,top:0},l=Number(e?.clientX),n=Number(e?.clientY),d=(Number.isFinite(l)?l:0)-(a.left||0)+(i?.scrollLeft||0),f=(Number.isFinite(n)?n:0)-(a.top||0)+(i?.scrollTop||0);return{x:(d-o.x)/t,y:(f-o.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)($.prototype,"model");Reflect.metadata("design:type",Object)($.prototype,"locale");Reflect.metadata("design:type",Function)($.prototype,"pointerAction");Reflect.metadata("design:type",Function)($.prototype,"panAction");Reflect.metadata("design:paramtypes",[Pe])($);g($,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"pointerAction"],[p(),1,"panAction"],[N(),3,void 0,0],[x({selector:"workflow-canvas",template:`
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
    </div>`}),0]]);var oo={hasSelection:!1,nodeId:"",name:"",description:"",typeLabel:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function Wo(s){return s.hasSelection?JSON.stringify([s.nodeId,s.name,s.description,s.typeLabel,s.status,s.statusLabel,s.durationLabel,s.resultText,s.errorText,s.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var Z=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=oo,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let o=this.changeType(t.field);if(o==="code"){this.queueChange(t.key,t.value,o);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,o,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||oo,o=Wo(t);o!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=o,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage",this.isZh?"\u5FC5\u586B\u9879":"Required")}get numberMessage(){return this.t("numberMessage",this.isZh?"\u6570\u503C\u8D85\u51FA\u8303\u56F4":"Number out of range")}get patternMessage(){return this.t("patternMessage",this.isZh?"\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid format")}get jsonMessage(){return this.t("jsonMessage",this.isZh?"JSON \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid JSON")}get emailMessage(){return this.t("invalidEmail",this.isZh?"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid email address")}get urlMessage(){return this.t("invalidUrl",this.isZh?"URL \u683C\u5F0F\u4E0D\u6B63\u786E":"Invalid URL")}get integerMessage(){return this.t("integerMessage",this.isZh?"\u8BF7\u8F93\u5165\u6574\u6570":"Must be an integer")}get formSchema(){let e=[];return this._model.hasSelection?(e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),this._model.fields.forEach(t=>{e.push({key:t.key,type:this.dynamicType(t),label:t.label,placeholder:t.placeholder,description:t.description,group:t.group,options:t.options.map(o=>({label:o.label,value:o.value})),defaultValue:t.hasDefault?t.resetValue:void 0,rows:t.rows,min:t.min,max:t.max,step:t.step,required:t.required,readonly:t.readonly,pattern:t.pattern,language:t.language,suggestions:this.codeSuggestions,hidden:t.visible===!1})}),{fields:e}):{fields:e}}get formValue(){let e={name:this._model.name,description:this._model.description};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){switch(e.type){case"code":return"code";case"json":return"json";case"textarea":return"textarea";case"boolean":return"checkbox";case"select":return"radio";case"number":return"number";default:return"text"}}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"code":return"code";default:return"text"}}queueChange(e,t,o){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:o,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let r=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),r)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(Z.prototype,"locale");Reflect.metadata("design:type",Object)(Z.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(Z.prototype,"changeAction");Reflect.metadata("design:type",Function)(Z.prototype,"restoreAction");Reflect.metadata("design:type",Array)(Z.prototype,"codeSuggestions");Reflect.metadata("design:type",et)(Z.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[A])(Z);Reflect.metadata("design:paramtypes",[])(Z.prototype,"model");Reflect.metadata("design:returntype",Object)(Z.prototype,"model");g(Z,[[p(),1,"locale"],[p(),1,"codeChangeDelay"],[p(),1,"changeAction"],[p(),1,"restoreAction"],[p(),1,"codeSuggestions"],[_e("nodeForm",et),1,"nodeForm"],[N(),3,void 0,0],[p(),1,"model"],[x({selector:"workflow-inspector",template:`
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
    </div>`}),0]]);var B=class{constructor(){this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return this.isZh?"\u8FD0\u884C\u5386\u53F2":"Runs"}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(B.prototype,"items");Reflect.metadata("design:type",Object)(B.prototype,"locale");Reflect.metadata("design:type",Function)(B.prototype,"selectAction");g(B,[[p(),1,"items"],[p(),1,"locale"],[p(),1,"selectAction"],[x({selector:"workflow-run-history",template:`
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
    </div>`}),0]]);var W=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle",this.isZh?"\u6267\u884C\u65E5\u5FD7":"Execution log")}get closeLabel(){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close",this.isZh?"\u5173\u95ED":"Close")}levelLabel(e){let t={info:this.isZh?"\u4FE1\u606F":"INFO",success:this.isZh?"\u6210\u529F":"OK",warning:this.isZh?"\u544A\u8B66":"WARN",error:this.isZh?"\u9519\u8BEF":"ERROR"};return S(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),o=r=>String(r).padStart(2,"0");return`${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(W.prototype,"items");Reflect.metadata("design:type",Object)(W.prototype,"visible");Reflect.metadata("design:type",Object)(W.prototype,"locale");Reflect.metadata("design:type",Function)(W.prototype,"closeAction");Reflect.metadata("design:paramtypes",[A])(W);g(W,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"locale"],[p(),1,"closeAction"],[N(),3,void 0,0],[x({selector:"workflow-run-log",template:`
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
    </div>`}),0]]);var z=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return S(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return S(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",this.isZh?`${e.nodeCount} \u4E2A\u8282\u70B9`:`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(z.prototype,"items");Reflect.metadata("design:type",Object)(z.prototype,"visible");Reflect.metadata("design:type",Object)(z.prototype,"currentId");Reflect.metadata("design:type",Object)(z.prototype,"locale");Reflect.metadata("design:type",Object)(z.prototype,"error");Reflect.metadata("design:type",Function)(z.prototype,"saveAction");Reflect.metadata("design:type",Function)(z.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(z.prototype,"openAction");Reflect.metadata("design:type",Function)(z.prototype,"removeAction");Reflect.metadata("design:type",Function)(z.prototype,"closeAction");Reflect.metadata("design:paramtypes",[A])(z);g(z,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"currentId"],[p(),1,"locale"],[p(),1,"error"],[p(),1,"saveAction"],[p(),1,"saveAsAction"],[p(),1,"openAction"],[p(),1,"removeAction"],[p(),1,"closeAction"],[N(),3,void 0,0],[x({selector:"workflow-library",template:`
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
    </div>`}),0]]);var ro="tsdi-workflow-designer-styles",Vo=`
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

.workflow-designer > workspace-layout {
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
`;function so(s){if(!s||typeof s.createElement!="function"||!s.head||s.getElementById&&s.getElementById(ro))return;let e=s.createElement("style");e.setAttribute("id",ro),e.textContent=Vo,s.head.appendChild(e)}var v=class{constructor(e,t,o,r,i,a){this.translator=r,this.elementRef=a,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=Zt(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.showLibrary=!1,this.libraryError="",this.libraryItems=[],this.jsonText="",this.jsonError="",this.autosaveInFlight=!1,this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let n=this.selfRef||this;n.designer?.dirty&&(n.saveState!=="saving"&&(n.saveState="dirty"),n.autosave&&(n.clearAutosaveTimer(),n.autosaveTimer=setTimeout(()=>{n.autosaveTimer=void 0,n.performAutosave()},Math.max(0,Number(n.autosaveDelay)||0))))},this.toolbarAction=n=>{let d=this.selfRef||this;switch(n){case"run":this.designer.run({context:this.runContext});break;case"resume":d.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":d.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":d.showLogs=!d.showLogs;break;case"save":d.saveWorkflow();break;case"open-library":d.openLibrary();break;case"clear":this.designer.clear();break;case"toggle-json":d.toggleJson();break;case"shortcuts":d.toggleShortcuts();break;default:break}d.scheduleAutosave()},this.fitView=()=>{let n=this.canvasViewport(),d=this.designer.nodes;if(!n||!d.length){this.designer.resetView();return}let f=48,u=1/0,c=1/0,w=-1/0,b=-1/0;d.forEach(M=>{let J=wt(M);u=Math.min(u,M.position.x),c=Math.min(c,M.position.y),w=Math.max(w,M.position.x+J.width),b=Math.max(b,M.position.y+J.height)});let y=Math.max(1,w-u),k=Math.max(1,b-c),I=Math.max(.25,Math.min(1.25,Math.min((n.width-f*2)/y,(n.height-f*2)/k)));this.designer.setZoom(I);let T=this.designer.zoom||1;this.designer.pan={x:Math.round((n.width-y*T)/2-u*T),y:Math.round((n.height-k*T)/2-c*T)}},this.addFromPalette=n=>{let d=this.selfRef||this;this.designer.addNode(n.type,this.nextAddPosition()),d.scheduleAutosave()},this.paletteDragStart=(n,d)=>{this.pendingNodeType=d.type,this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:d.label}},this.handlePan=(n,d)=>{this.designer.panBy(n,d)},this.selectRun=n=>{this.designer.selectExecution(n)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let n=this.selfRef||this;n.showLogs=!1},this.openLibrary=async()=>{let n=this.selfRef||this;try{n.libraryItems=await this.designer.listSaved(this.store),n.libraryError=""}catch(d){n.libraryError=d.message}n.showLibrary=!0},this.saveWorkflow=async()=>{let n=this.selfRef||this;n.clearAutosaveTimer(),n.saveState="saving";try{await this.designer.saveTo(this.store);let d=n.activeTab();d&&(d.persisted=!0),n.syncActiveTabId(),n.libraryError="",n.saveState="saved",await n.refreshLibrary()}catch(d){n.saveState="error",n.libraryError=d.message}},this.saveWorkflowAs=async()=>{let n=this.selfRef||this;n.clearAutosaveTimer(),n.saveState="saving";try{await this.designer.saveTo(this.store,{as:!0,name:`${this.designer.definition.name} copy`});let d=n.activeTab();d&&(d.persisted=!0),n.syncActiveTabId(),n.libraryError="",n.saveState="saved",await n.refreshLibrary()}catch(d){n.saveState="error",n.libraryError=d.message}},this.loadWorkflow=async n=>{let d=this.selfRef||this,f=d.workflowTabs.find(c=>c.id===n);if(f){try{let c=await d.store.get(n);if(!c){d.libraryError=`${d.t("notFound","Workflow not found")}: ${n}`;return}f.designer.load(c),d.setActiveTab(f),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(c){d.libraryError=c.message}return}await d.openWorkflowTab(n)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async n=>{let d=this.selfRef||this;try{d.workflowTabs.some(f=>f.id===n)&&await d.closeWorkflowTab(n),await this.designer.removeSaved(this.store,n),await d.refreshLibrary()}catch(f){d.libraryError=f.message}},this.closeLibrary=()=>{let n=this.selfRef||this;n.showLibrary=!1},this.handleCanvas=n=>{let d=this.designer;switch(n.type){case"background-down":d.connectionDraft?d.cancelConnection():d.clearSelection();break;case"pointer-move":n.world&&(d.drag?d.dragNodeTo(n.world):d.connectionDraft&&d.updateConnectionDraft(n.world));break;case"pointer-up":d.drag?d.endNodeDrag():d.connectionDraft&&d.cancelConnection();break;case"pointer-leave":d.drag?d.endNodeDrag():d.connectionDraft&&d.cancelConnection();break;case"node-down":d.connectionDraft&&n.nodeId?this.connectToNode(n.nodeId):n.nodeId&&n.world&&d.beginNodeDrag(n.nodeId,n.world);break;case"node-up":d.drag?d.endNodeDrag():d.connectionDraft&&n.nodeId&&this.connectToNode(n.nodeId);break;case"edge-click":n.connectionId&&d.selectConnection(n.connectionId);break;case"port-down":{let f=n.portType==="input"?"input":"output";if(!n.nodeId||!n.portId||!n.world)break;let u=d.connectionDraft;if(u){if((u.sourceSide||"output")!==f){d.completeConnection(n.nodeId,n.portId);break}d.cancelConnection()}d.beginConnection(n.nodeId,n.portId,n.world,f);break}case"port-up":{let f=d.connectionDraft;if(!f||!n.nodeId||!n.portId)break;let u=n.portType==="input"?"input":"output",c=f.sourceSide||"output";u!==c?d.completeConnection(n.nodeId,n.portId):(n.nodeId!==f.sourceNodeId||n.portId!==f.sourcePort)&&d.cancelConnection();break}case"drop":{let f=n.nodeType||this.pendingNodeType;this.pendingNodeType=void 0,f&&n.world&&d.addNode(f,{x:Math.round(n.world.x-92),y:Math.round(n.world.y-32)});break}case"key-down":this.handleKey(n);break;case"wheel":{let f=this.canvasRect();if(n.ctrlKey||n.metaKey)this.zoomAtPoint(n,f);else{let u=!!n.shiftKey,c=Number(n.deltaX)||0,w=Number(n.deltaY)||0,b=u&&!c?w:c,y=u&&!c?0:w;d.panBy(-b,-y)}break}default:break}(n.type==="pointer-up"||n.type==="node-up"||n.type==="drop"||n.type==="port-down"||n.type==="port-up"||n.type==="key-down")&&this.scheduleAutosave()},this.inspectorRestore=()=>{let n=this.designer.selectedNode;n&&(this.designer.resetNodeConfig(n.id),this.scheduleAutosave())},this.inspectorChange=(n,d,f,u)=>{let c=u?this.designer.nodes.find(b=>b.id===u):this.designer.selectedNode;if(!c)return;if(n==="name"){this.designer.renameNode(c.id,String(d)),this.scheduleAutosave();return}if(n==="description"){this.designer.updateNode(c.id,{description:String(d)}),this.scheduleAutosave();return}let w=d;if(f==="json")if(String(d??"").trim()==="")w=void 0;else try{w=JSON.parse(String(d))}catch(b){this.designer.error=`Invalid JSON: ${b.message}`;return}else if(f==="number"){if(w=d===""||d===void 0||d===null?void 0:Number(d),typeof w=="number"&&!Number.isFinite(w)){this.designer.error="Invalid number";return}}else f==="boolean"?w=!!d:w=String(d??"");this.designer.updateNodeConfig(c.id,{[n]:w}),this.scheduleAutosave()},St(a),this.documentRef=o;try{o&&(o[ce]=!0)}catch{}this.registry=e||new L,this.service=t,this.reactiveEffect=i,so(o),It(o),Nt(o),Ct(o),Xe(o,this.themeName);let l=new he({registry:this.registry,service:t,definition:pt(this.registry,this.localeValue,r)});this.designer=i?Ke(l,i):l,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=this.documentRef;e?.removeEventListener&&this.keyHandler&&e.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ke(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=_t(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let o=e.createTab(t);e.workflowTabs.push(o),e.setActiveTab(o),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(r=>r.id===e))return await t.activateWorkflowTab(e),!0;try{let r=await t.store.get(e);if(!r)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let i=t.createTab(r,!0);return t.workflowTabs.push(i),t.setActiveTab(i),t.emitTabs(),!0}catch(r){return t.libraryError=r.message,!1}}async restoreWorkflowTabs(e,t){let o=this.selfRef||this,r=[],i;try{i=new Set((await o.store.list()).map(l=>l.id))}catch{i=new Set(e||[])}for(let l of Array.from(new Set(e||[])))if(!(!l||!i.has(l)))try{let n=await o.store.get(l);n&&r.push(o.createTab(n,!0))}catch{}if(!r.length)return!1;o.workflowTabs=r;let a=r.find(l=>l.id===t)||r[0];return o.setActiveTab(a),o.emitTabs(),!0}createTab(e,t=!1){let o=new he({registry:this.registry,service:this.service,definition:e}),r=this.reactiveEffect?Ke(o,this.reactiveEffect):o;return{id:r.definition.id,designer:r,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.find(r=>r.id===e);!o||o.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(o),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.findIndex(i=>i.id===e);if(o<0)return;let[r]=t.workflowTabs.splice(o,1);if(t.autosave&&r.designer.dirty)try{await t.saveTab(r)}catch{}if(t.activeTabId===e){let i=t.workflowTabs[Math.min(o,t.workflowTabs.length-1)];i?t.setActiveTab(i):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,o=e.id,r=e.designer.definition.id;o!==r&&(e.id=r,t.activeTabId===o&&(t.activeTabId=r),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(r=>r.persisted),o=e.activeTab();e.tabChangeAction?.({openIds:t.map(r=>r.id),activeId:o?.persisted?o.id:t[0]?.id})}setTheme(e){this.theme=ke(e)?e:"light";let t=this.documentRef||globalThis.document;Xe(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return S(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,o=String(e?.key||""),r=!!(e?.ctrlKey||e?.metaKey),i=e?.target,a=String(i?.tagName||"").toLowerCase(),l=a==="input"||a==="textarea"||a==="select"||!!i?.isContentEditable;if(r&&(o==="s"||o==="S")){e.preventDefault(),t.saveWorkflow();return}if(r&&(o==="o"||o==="O")){e.preventDefault(),t.openLibrary();return}if(r&&o==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!l&&(o==="?"||o==="F1")){e.preventDefault(),t.toggleShortcuts();return}o==="Escape"&&t.showShortcuts&&(e.preventDefault(),t.closeShortcuts())}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let o=Ut(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:o},o}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let o=Ht(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:o},o}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,o=this.localeValue,r=this.registry.revision,i=e?.id||"",a=e?.name||"",l=e?.description||"",n=e?.type||"",d=e?.config,f=this.inspectorModelCache;if(f&&f.nodeId===i&&f.name===a&&f.description===l&&f.type===n&&f.config===d&&f.execution===t&&f.locale===o&&f.revision===r)return f.model;let u=Bt(this.designer,this.registry,o,this.translator);return this.inspectorModelCache={nodeId:i,name:a,description:l,type:n,config:d,execution:t,locale:o,revision:r,model:u},u}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let o=Gt(this.designer,this.localeValue,this.translator);return this.toolbarModelCache={key:e,model:o},o}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let o=Kt(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:o},o}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,o=this.localeValue,r=this.runHistoryCache;if(r&&r.history===e&&r.selected===t&&r.locale===o)return r.model;let i=Yt(this.designer,o,this.translator);return this.runHistoryCache={history:e,selected:t,locale:o,model:i},i}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let o=e?.logs||[];return this.runLogsCache={execution:e,logs:o},o}get codeSuggestions(){let e=this.designer.nodes.map(a=>[a.id,a.type,a.config?.action||"",a.config?.field||"",a.config?.target||"",JSON.stringify(a.config?.values||""),JSON.stringify(a.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let o=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),r=a=>{typeof a=="string"&&a.trim()&&o.add(a.trim())};this.designer.nodes.forEach(a=>{let l=a.config||{};if(typeof l.action=="string"){let n=l.action.replace(/^actions\./,"");r(`context.actions.${n}`),r(`input.actions.${n}`)}typeof l.field=="string"&&(r(l.field),l.field.includes(".")||r(`variables.${l.field}`)),typeof l.target=="string"&&r(l.target.includes(".")?l.target:`variables.${l.target}`),l.values&&typeof l.values=="object"&&Object.keys(l.values).forEach(n=>r(`variables.${n}`)),l.result&&typeof l.result=="object"&&Object.keys(l.result).forEach(n=>r(`input.${n}`)),typeof l.event=="string"&&r(`context.events.${l.event}`)});let i=Array.from(o).slice(0,240);return this.codeSuggestionCache={key:e,values:i},i}canvasModelKey(){let e=this.designer,t=e.execution,o=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],r=e.connectionDraft;return o.push(r?`draft:${r.sourceNodeId}:${r.sourcePort}:${r.sourceSide||"output"}:${r.x}:${r.y}`:""),(e.nodes||[]).forEach(i=>{o.push([i.id,i.name,i.type,i.description||"",i.position?.x,i.position?.y,i.dimension?.width||"",i.dimension?.height||"",i.style?.icon||"",i.style?.backgroundColor||"",i.style?.textColor||"",(i.inputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),(i.outputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),t?.nodeStates?.[i.id]?.status||""].join(":"))}),(e.connections||[]).forEach(i=>{o.push([i.id,i.sourceNodeId,i.sourcePort,i.targetNodeId,i.targetPort,i.label||"",t?.edgeStates?.[i.id]?.status||""].join(":"))}),o.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},o=this.viewportBounds(),r=t;return o&&(t.x>=o.left&&t.x+184<=o.right&&t.y>=o.top&&t.y+64<=o.bottom||(r={x:Math.round((o.left+o.right)/2-92),y:Math.round((o.top+o.bottom)/2-32)})),this.findFreePosition(r)}canvasViewport(){let e=this.elementRef?.nativeElement,o=(e?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{width:o.width,height:o.height}}canvasRect(){let e=this.elementRef?.nativeElement,o=(e?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{left:o.left,top:o.top,width:o.width,height:o.height}}zoomAtPoint(e,t){let o=Number(e.deltaY)||0;if(!o)return;let r=this.designer,i=r.zoom||1,a=o<0?1.1:.9,l=Math.max(.2,Math.min(2.5,i*a)),n=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),f=r.pan||{x:0,y:0},u=(n-f.x)/i,c=(d-f.y)/i;r.setZoom(l);let w=r.zoom||l;r.pan={x:Math.round(n-u*w),y:Math.round(d-c*w)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,o=this.designer.pan||{x:0,y:0};return{left:-o.x/t,top:-o.y/t,right:(e.width-o.x)/t,bottom:(e.height-o.y)/t}}findFreePosition(e){let r=[0,1,-1,2,-2,3,-3];for(let i=0;i<30;i++)for(let a of r){let l={x:e.x+a*220,y:e.y+i*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-l.x)<184&&Math.abs(d.position.y-l.y)<64))return l}return e}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await this.designer.listSaved(this.store)}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let o=this.designer.nodes.find(i=>i.id===e);if(!o){this.designer.cancelConnection();return}let r=t.sourceSide==="input"?o.outputs:o.inputs;if(!r?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,r[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.scheduleAutosave()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",Object)(v.prototype,"locale");Reflect.metadata("design:type",Object)(v.prototype,"theme");Reflect.metadata("design:type",Function)(v.prototype,"themeChangeAction");Reflect.metadata("design:type",he)(v.prototype,"designer");Reflect.metadata("design:type",Object)(v.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(v.prototype,"runContext");Reflect.metadata("design:type",Object)(v.prototype,"autoRun");Reflect.metadata("design:type",Object)(v.prototype,"store");Reflect.metadata("design:type",Object)(v.prototype,"autosave");Reflect.metadata("design:type",Object)(v.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(v.prototype,"tabChangeAction");Reflect.metadata("design:type",Object)(v.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(v.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(v.prototype,"keyHandler");Reflect.metadata("design:type",Object)(v.prototype,"documentRef");Reflect.metadata("design:type",Object)(v.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(v.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(v.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(v.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(v.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(v.prototype,"paletteCache");Reflect.metadata("design:type",Object)(v.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(v.prototype,"codeSuggestionCache");Reflect.metadata("design:paramtypes",[L,U,Object,A,xt,Pe])(v);g(v,[[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"designer"],[p(),1,"initialDefinition"],[p(),1,"runContext"],[p(),1,"autoRun"],[p(),1,"store"],[p(),1,"autosave"],[p(),1,"autosaveDelay"],[p(),1,"tabChangeAction"],[D(),1,"autosaveTimer"],[D(),1,"autosaveInFlight"],[D(),1,"keyHandler"],[D(),1,"documentRef"],[D(),1,"canvasModelCache"],[D(),1,"toolbarModelCache"],[D(),1,"inspectorModelCache"],[D(),1,"runHistoryCache"],[D(),1,"statusModelCache"],[D(),1,"paletteCache"],[D(),1,"runLogsCache"],[D(),1,"codeSuggestionCache"],[N(),3,void 0,5],[N(),3,void 0,4],[N(),3,void 0,3],[V(je),3,void 0,2],[N(),3,void 0,2],[N(),3,void 0,1],[N(),3,void 0,0],[x({selector:"workflow-designer",template:`
    <div class="workflow-designer" data-theme="{{themeName}}">
        <tab-bar class="workflow-tabs" :source="workflowTabSource"></tab-bar>
        <workflow-toolbar :model="toolbarModel" :locale="locale" :action="toolbarAction"
            :theme="themeName"
            :themeChangeAction="themeSelectAction"></workflow-toolbar>
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
                <workflow-run-history :items="runHistory" :locale="locale"
                    :selectAction="selectRun"></workflow-run-history>
                <div class="workflow-statusbar">
                    <span class="workflow-status-message">{{statusModel.message}}</span>
                    <span class="workflow-status-error" v-if="statusModel.error">{{statusModel.error}}</span>
                    <span class="workflow-status-spacer"></span>
                    <span class="workflow-save-state" [class]="saveStateClass">{{saveStateLabel}}</span>
                    <span class="workflow-status-selected">{{statusModel.selectedLabel}}</span>
                    <span>{{statusModel.nodeCount}} {{nodeWord}}</span>
                    <span>{{statusModel.executionLabel}}</span>
                    <span>{{statusModel.zoomLabel}}</span>
                </div>
                <workflow-run-log :items="runLogs" :visible="showLogs" :locale="locale"
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
        <workflow-library :items="libraryItems" :visible="showLibrary"
            :currentId="designer.definition.id" :locale="locale" :error="libraryError"
            :saveAction="saveWorkflow" :saveAsAction="saveWorkflowAs"
            :openAction="loadWorkflow" :removeAction="deleteWorkflow"
            :closeAction="closeLibrary"></workflow-library>
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
    </div>`}),0]]);var Me=class{};g(Me,[[Y({imports:[Ge,Ye,tt,Qe,pe],providers:[U,me,L,Q,H],declarations:[C,F,$,Z,B,W,z,v],exports:[Ge,Ye,tt,Qe,pe,U,me,L,Q,H,C,F,$,Z,B,W,z,v]}),0]]);var be={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function ge(s,e,t,o){return{id:s,name:e,type:t,label:o}}var qo=[{type:be.route,label:"Gateway route",labelZh:"\u7F51\u5173\u8DEF\u7531",description:"Forward matching requests to a microservice or static upstream",descriptionZh:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[ge("in","in","input","Input")],outputs:[ge("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",labelZh:"\u5165\u53E3\u8DEF\u5F84",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value.",descriptionZh:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002"},{key:"service",label:"Service",labelZh:"\u670D\u52A1\u540D",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",labelZh:"\u4E0A\u6E38\u5730\u5740",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",labelZh:"\u4E0A\u6E38\u8DEF\u5F84",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",labelZh:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",labelZh:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",type:"number",min:0,step:100},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"headers",label:"Request headers",labelZh:"\u8BF7\u6C42\u5934",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",labelZh:"\u54CD\u5E94\u5934",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",labelZh:"\u9650\u6D41",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",labelZh:"\u7F13\u5B58",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",labelZh:"\u7194\u65AD",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",labelZh:"\u9694\u79BB\u8231",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:be.condition,label:"Gateway condition",labelZh:"\u7F51\u5173\u6761\u4EF6",description:"Match path, method, host, header or query values",descriptionZh:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[ge("in","in","input","Input")],outputs:[ge("true","true","output","True"),ge("false","false","output","False")],fields:[{key:"field",label:"Field",labelZh:"\u5B57\u6BB5",type:"select",defaultValue:"path",options:[{label:"Path",labelZh:"\u8DEF\u5F84",value:"path"},{label:"Method",labelZh:"\u65B9\u6CD5",value:"method"},{label:"Host",labelZh:"\u4E3B\u673A",value:"host"},{label:"Header",labelZh:"\u8BF7\u6C42\u5934",value:"header"},{label:"Query",labelZh:"\u67E5\u8BE2\u53C2\u6570",value:"query"}]},{key:"name",label:"Header / query name",labelZh:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",labelZh:"\u8FD0\u7B97\u7B26",type:"select",defaultValue:"equals",options:[{label:"equals",labelZh:"\u7B49\u4E8E",value:"equals"},{label:"not equals",labelZh:"\u4E0D\u7B49\u4E8E",value:"not-equals"},{label:"prefix",labelZh:"\u524D\u7F00",value:"prefix"},{label:"not prefix",labelZh:"\u975E\u524D\u7F00",value:"not-prefix"},{label:"exists",labelZh:"\u5B58\u5728",value:"exists"},{label:"not exists",labelZh:"\u4E0D\u5B58\u5728",value:"not-exists"}]},{key:"value",label:"Value",labelZh:"\u6BD4\u8F83\u503C",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:be.deny,label:"Gateway deny",labelZh:"\u7F51\u5173\u62D2\u7EDD",description:"Reject matching requests at the gateway",descriptionZh:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[ge("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",labelZh:"\u72B6\u6001\u7801",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",labelZh:"\u6D88\u606F",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",labelZh:"\u4F18\u5148\u7EA7",type:"number",defaultValue:0,description:"Lower runs first.",descriptionZh:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},{key:"body",label:"Body",labelZh:"\u54CD\u5E94\u4F53",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function ze(s){return qo.forEach(e=>s.register(e)),s}function Jo(){return ze(new L)}function mt(s="zh-CN"){let e=s==="zh-CN",t=Jo(),o=(f,u,c,w,b,y)=>t.createNode(f,{x:w,y:b},{id:u,name:c,config:y}),r=o("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),i=o(be.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),a=o(be.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),l=o(be.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),n=(f,u,c,w)=>({id:f,sourceNodeId:u,sourcePort:c,targetNodeId:w,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[r,i,a,l],connections:[n("conn_1","start_1","out","condition_1"),n("conn_2","condition_1","true","route_1"),n("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}async function He(s){let e=typeof s.text=="function"?await s.text():"";if(e)try{return JSON.parse(e)}catch{return e}}var Ue=class{constructor(e="/api/gateway-admin"){this.baseUrl=e}async list(){let e=await this.request("rules",{method:"GET"});if(!e.ok)return[];let t=await He(e);return Array.isArray(t)?t:t?.items??[]}async get(e){let t=await this.request(`rules/${encodeURIComponent(e)}`,{method:"GET"});if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return await He(t)}}async save(e){let t=await this.request(`rules/${encodeURIComponent(e.id)}`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!t.ok){let r=await He(t);throw new Error(r?.message||r?.error||`Failed to apply gateway rules: HTTP ${t.status}`)}return(await He(t))?.summary??jt(e)}async remove(e){let t=await this.request(`rules/${encodeURIComponent(e)}`,{method:"DELETE"});return t.ok||t.status===404}async clear(){if(!(await this.request("rules",{method:"GET"})).ok)return;let t=await this.list();await Promise.all(t.map(o=>this.remove(o.id)))}request(e,t){let o=globalThis.fetch;if(typeof o!="function")return Promise.reject(new Error("fetch is not available"));let r=this.baseUrl.replace(/\/+$/,"");return o(`${r}/${e}`,t)}};var G=class{constructor(){this.routes=[],this.services=[],this.rules=[],this.status="Loading\u2026",this.error="",this.locale="zh-CN",this.store=new Ue,this.loaded=!1}onInit(){this.selfRef=this}async onAfterViewInit(){if(!this.workflow||this.loaded)return;this.loaded=!0,ze(this.workflow.registry);let e=this.workflow.locale;this.workflow.locale=e==="zh-CN"?"en":"zh-CN",this.workflow.locale=e,this.workflow.store=this.store,this.workflow.autosave=!1,await this.reload()}async reload(){let e=this.selfRef??this;e.error="";try{let t=await e.fetchState();e.routes=(t.routes??[]).map(o=>({...o})),e.services=t.services??[],e.rules=t.rules??[],await e.loadRuleDocument(),e.status=`Ready \xB7 ${e.routes.length} route(s) \xB7 ${e.rules.length} rule(s)`}catch(t){if(e.status="Offline",e.error=t.message,e.workflow){let o=mt(e.locale);e.workflow.designer.load(o),e.workflow.syncActiveTabId?.()}}}async fetchState(){let e=await fetch("/api/gateway-admin/state");if(!e.ok)throw new Error(`Gateway admin API unavailable: HTTP ${e.status}`);return await e.json()}async loadRuleDocument(){if(!this.workflow)return;let e=await this.store.list().catch(()=>[]),t;e.length&&(t=await this.store.get(e[0].id)),t||(t=mt(this.locale)),this.workflow.designer.load(t),this.workflow.syncActiveTabId?.()}addRoute(){let e=this.selfRef??this;e.routes=[...e.routes,{path:"/api/new",service:"my-service",stripPrefix:!0}]}removeRoute(e){let t=this.selfRef??this;t.routes=t.routes.filter((o,r)=>r!==e)}updateRoute(e,t,o){let r=this.selfRef??this,i=o.target,a=t==="stripPrefix"?i.checked:t==="timeout"?i.value?Number(i.value):void 0:i.value;e[t]=a,r.routes=[...r.routes]}async saveRoutes(){let e=this.selfRef??this;e.error="";try{let t=await fetch("/api/gateway-admin/routes",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({routes:e.routes})});if(!t.ok)throw new Error(`Failed to apply routes: HTTP ${t.status}`);let o=await t.json();e.routes=(o.routes??[]).map(r=>({...r})),e.services=o.services??[],e.status=`Routes applied \xB7 ${e.routes.length} route(s)`}catch(t){e.error=t.message}}async applyRules(){let e=this.selfRef??this;if(e.workflow){e.error="";try{let t=e.workflow.designer.definition,o=await e.store.save(t);e.status=`Rules applied \xB7 ${o.nodeCount} node(s)`;let r=await e.fetchState();e.rules=r.rules??[],e.services=r.services??[]}catch(t){e.error=t.message}}}};Reflect.metadata("design:type",v)(G.prototype,"workflow");g(G,[[_e("workflow",v),1,"workflow"],[x({selector:"gateway-admin",template:`
    <div class="ga-shell">
        <header class="ga-header">
            <div>
                <h1>Microservice admin</h1>
                <p>Visual gateway routes and activity-based rules</p>
            </div>
            <div class="ga-header-status">
                <span class="ga-status">{{status}}</span>
                <span class="ga-error" v-if="error">{{error}}</span>
            </div>
            <div class="ga-header-actions">
                <button class="ga-btn" type="button" @click="reload">Refresh</button>
            </div>
        </header>

        <div class="ga-layout">
            <section class="ga-panel ga-routes">
                <div class="ga-panel-head">
                    <div>
                        <h2>Routes</h2>
                        <span class="ga-muted">{{routes.length}} route(s) \xB7 {{services.length}} service(s)</span>
                    </div>
                    <div class="ga-actions">
                        <button class="ga-btn" type="button" @click="addRoute">+ Route</button>
                        <button class="ga-btn ga-btn-primary" type="button" @click="saveRoutes">Apply routes</button>
                    </div>
                </div>
                <div class="ga-empty" v-if="!routes.length">
                    No routes yet. Add one or drag route/condition/deny nodes in the rules canvas.
                </div>
                <div class="ga-route-list">
                    <article class="ga-route-card" v-for="(route, index) in routes">
                        <div class="ga-route-card-head">
                            <input class="ga-input ga-input-path" [value]="route.path"
                                placeholder="/api/users" @input="updateRoute(route, 'path', $event)" />
                            <button class="ga-icon-btn" type="button" title="Remove route"
                                @click="removeRoute(index)">\u2715</button>
                        </div>
                        <label class="ga-field">
                            <span>Service</span>
                            <input class="ga-input" [value]="route.service" placeholder="users-service"
                                @input="updateRoute(route, 'service', $event)" />
                        </label>
                        <label class="ga-field">
                            <span>Target URL</span>
                            <input class="ga-input" [value]="route.targetUrl" placeholder="http://127.0.0.1:3001"
                                @input="updateRoute(route, 'targetUrl', $event)" />
                        </label>
                        <div class="ga-field-row">
                            <label class="ga-field">
                                <span>Target path</span>
                                <input class="ga-input" [value]="route.targetPath" placeholder="/users"
                                    @input="updateRoute(route, 'targetPath', $event)" />
                            </label>
                            <label class="ga-field">
                                <span>Timeout (ms)</span>
                                <input class="ga-input" type="number" [value]="route.timeout"
                                    @input="updateRoute(route, 'timeout', $event)" />
                            </label>
                        </div>
                        <label class="ga-check">
                            <input type="checkbox" [checked]="route.stripPrefix === true"
                                @change="updateRoute(route, 'stripPrefix', $event)" />
                            <span>Strip inbound prefix</span>
                        </label>
                    </article>
                </div>
            </section>

            <section class="ga-panel ga-rules">
                <div class="ga-panel-head">
                    <div>
                        <h2>Visual rules</h2>
                        <span class="ga-muted">Conditions, route and deny actions compile to gateway rules</span>
                    </div>
                    <div class="ga-actions">
                        <button class="ga-btn ga-btn-primary" type="button" @click="applyRules">Apply rules</button>
                    </div>
                </div>
                <div class="ga-rules-body">
                    <workflow-designer #workflow locale="zh-CN" theme="light"></workflow-designer>
                </div>
            </section>
        </div>
    </div>`}),0]]);var De=class{};g(De,[[Y({imports:[Me],declarations:[G],providers:[{provide:L,useFactory:()=>ze(new L)}]}),0]]);async function Ho(){let s=document.getElementById("boot-status");s&&(s.textContent="Starting microservice admin\u2026");let e=await kt.run(G,{deps:[Rt,De],providers:[{provide:je,useValue:document}]}),t=e.runners.getRef(G),o=document.getElementById("gateway-admin-app");if(!o)throw new Error("gateway-admin-app container missing");o.appendChild(t.elementRef.nativeElement),s&&s.remove(),window.gatewayAdmin=t.instance,window.gatewayAdminContext=e}Ho().catch(s=>{let e=document.getElementById("boot-status");e&&(e.textContent=`\u542F\u52A8\u5931\u8D25\uFF1A${s.message}`)});
