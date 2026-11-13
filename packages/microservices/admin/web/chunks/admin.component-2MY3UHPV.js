import{a as ne,b as Ie,c as It}from"./chunk-IT4KMVRA.js";import{b as Qt,j as eo,k as to,l as At,m as Tt,n as oo}from"./chunk-NWVUANFD.js";import{$ as U,A as $e,B as Gt,C as Yt,D as xt,O as nt,Z as Xt,_ as St,a as w,aa as lt,ba as z,ca as qe,fa as V,ga as Zt,ka as u,la as Ct,ma as ae,na as S,q as ee,qa as Rt,r as ie,ra as fe,s as at,u as $,v as q,w as v,x as A,y as vt,z as Kt}from"./chunk-SPMG5PJO.js";import"./chunk-U6UJE3IR.js";var I=class{};w(I,[[ie(),0]]);var Ae=ee("I18N_OPTIONS"),Uo=ee("I18N_LOCALE"),ns=ee("I18N_TRANSLATIONS"),We=ee("TRANSLATION_LOADERS");var le=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(le);w(le,[[v(),3,void 0,0],[q(Ae),3,void 0,0],[A(),0]]);var dt=class{format(e,t,o){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,o):this.interpolate(e,t)}interpolate(e,t){let o=e;return"#"in t&&(o=o.replace(/#/g,String(t["#"]))),o=o.replace(/\{(\w+)\}/g,(r,i)=>{if(i in t){let a=t[i];return String(a)}return r}),o}formatICU(e,t,o){let r=e,i=/\{(\w+),\s*(plural|select),\s*/g,a;for(;(a=i.exec(e))!==null;){let n=a.index,l=a[1],d=a[2],c=n+a[0].length,p=this.findMatchingBrace(e,n);if(p===-1)continue;let h=e.substring(c,p),f=e.substring(n,p+1),b=this.parseChoices(h);if(d==="plural"){let y=t[l];if(typeof y=="number"){let k=this.getPluralForm(y,o),R=b[k]||b.other||"",L=this.interpolate(R,{"#":y,...t});r=r.replace(f,L)}}else if(d==="select"){let y=t[l];if(y!==void 0){let k=b[String(y)]||b.other||"",R=this.interpolate(k,t);r=r.replace(f,R)}}}return this.interpolate(r,t)}findMatchingBrace(e,t){let o=1;for(let r=t+1;r<e.length;r++)if(e[r]==="{")o++;else if(e[r]==="}"&&(o--,o===0))return r;return-1}parseChoices(e){let t={},o=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,r;for(;(r=o.exec(e))!==null;){let i=r[1],a=r.index+r[0].length,n=this.findMatchingBrace(e,r.index+r[0].length-1);if(n!==-1){let l=e.substring(a,n);t[i]=l.trim()}}return t}getPluralForm(e,t){let o=t.split("-")[0];return o==="zh"||o==="ja"||o==="ko"?"other":o==="en"||o==="de"||o==="nl"?e===1?"one":"other":o==="ru"||o==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":o==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var he=class extends I{constructor(e,t,o){super(),this.injector=e,this.options=t,this.localeService=o,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new dt,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(We,[]);for(let t of e){let o=await t.load(this.options.basePath,this.options.locales||[]);for(let r of o)this._translations.set(r.locale,r),this.localeService.registerBundle(r.locale,r)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,o){let r=typeof t=="string"?t:this._currentLocale,i=typeof t=="string"?o:t,a=this._translations.get(r);if(!a)return e;let n=this.getMessage(a,e);return n?this._formatter.format(n,i||{},r):e}getMessage(e,t){let o=t.split("."),r=e.messages;for(let i of o)if(r&&typeof r=="object"&&i in r)r=r[i];else return;return typeof r=="string"?r:void 0}has(e,t){let o=t||this._currentLocale,r=this._translations.get(o);return r?this.getMessage(r,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[at,Object,le])(he);w(he,[[q(),3,void 0,2],[v(),3,void 0,1],[q(Ae),3,void 0,1],[q(),3,void 0,0],[A(),0]]);var Je=class{};w(Je,[[ie(),0]]);var me=class extends Je{constructor(e){super(),this.fileAdapter=e}async load(e,t){let o=[];for(let r of t)try{let i=await this.loadLocale(e,r);o.push(i)}catch{}return o}async loadLocale(e,t){let o=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(o))throw new Error(`Translation file not found: ${o}`);let i=await this.fileAdapter.readJSON(o);return{locale:t,messages:i}}};Reflect.metadata("design:paramtypes",[Xt])(me);w(me,[[q(),3,void 0,0],[A(),0]]);var we=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let o,r;return t.length>0&&(typeof t[0]=="object"?o=t[0]:typeof t[0]=="string"&&(r=t[0])),t.length>1&&typeof t[1]=="object"&&(o=t[1]),r?this.translator.translate(e,r,o||{}):this.translator.translate(e,o||{})}};Reflect.metadata("design:paramtypes",[I])(we);w(we,[[A(),0],[Yt("translate"),0]]);var Ko=[le,he,{provide:I,useClass:he},me,{provide:We,useClass:me,multi:!0},we],Te=class s{static withOptions(e){let t=[{provide:Ae,useValue:e}];return e.loader&&t.push({provide:We,useClass:e.loader,multi:!0}),{module:s,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};w(Te,[[$({providers:Ko,exports:[we]}),0]]);var Nt=class{format(e,t,o){return new Intl.NumberFormat(t,o).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,o){return this.format(e,t,{minimumFractionDigits:o,maximumFractionDigits:o})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};w(Nt,[[A(),0]]);var Et=class{format(e,t,o){let r=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,o).format(r)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};w(Et,[[A(),0]]);var Lt=class{format(e,t,o,r){let i={style:"currency",...r};return o&&(i.currency=o),new Intl.NumberFormat(t,i).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};w(Lt,[[A(),0]]);var ct=class{constructor(e){this.translator=e}intercept(e,t,o){let r=t.handle(e,o);return typeof r=="string"&&r.startsWith("i18n:")?this.translator.translate(r.substring(5)):r&&typeof r=="object"?this.translateObject(r):r}translateObject(e){if(Array.isArray(e))return e.map(o=>this.translateObject(o));let t={};for(let[o,r]of Object.entries(e))typeof r=="string"&&r.startsWith("i18n:")?t[o]=this.translator.translate(r.substring(5)):typeof r=="object"?t[o]=this.translateObject(r):t[o]=r;return t}};Reflect.metadata("design:paramtypes",[I])(ct);w(ct,[[A(),0]]);var ro={en:{node:{start:{label:"Start",description:"Optional explicit entry point"},end:{label:"End",description:"Optional explicit end point"},inject:{label:"Inject",description:"Start a flow with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Transform the message with JavaScript"},condition:{label:"Condition",description:"Branch on a value from the flow context"},switch:{label:"Switch",description:"Route to the output matching a value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches"},loop:{label:"Loop",description:"Repeat downstream work"},trigger:{label:"Trigger",description:"Emit a payload after a delay"},delay:{label:"Delay",description:"Pause for a fixed or random time"},log:{label:"Log",description:"Write a message or value to the execution log"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint and read the response"},assign:{label:"Assign",description:"Merge values into flow variables"},transform:{label:"Transform",description:"Map the previous result into a new shape"},template:{label:"Template",description:"Render text from context values"},json:{label:"JSON",description:"Parse or stringify JSON values"},csv:{label:"CSV",description:"Parse or stringify CSV text"},change:{label:"Change",description:"Set, delete or append context fields"},statistics:{label:"Statistics",description:"Aggregate an array into a number"},merge:{label:"Merge",description:"Combine fields or arrays"},"event-emit":{label:"Emit event",description:"Publish an event to the host"},"event-wait":{label:"Wait event",description:"Wait for an event from the host"},command:{label:"Command",description:"Run a host command or function"},split:{label:"Split",description:"Split text or an array into items"},map:{label:"Map",description:"Map each item to a new value"},filter:{label:"Filter",description:"Keep items matching a condition"},sort:{label:"Sort",description:"Sort items by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Group items into batches"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Run another workflow"},comment:{label:"Comment",description:"Canvas note; not executed"},custom:{label:"Custom",description:"Run a custom activity or handler"},"mqtt-publish":{label:"MQTT publish",description:"Publish a message to an MQTT topic"},"mqtt-wait":{label:"MQTT wait",description:"Wait for the next message on an MQTT topic"},"redis-command":{label:"Redis command",description:"Run a Redis command and return its result"},"redis-publish":{label:"Redis publish",description:"Publish a message to a Redis channel"},"nats-publish":{label:"NATS publish",description:"Publish a message to a NATS subject"},"nats-request":{label:"NATS request",description:"Send a NATS request and wait for a reply"},"coap-request":{label:"CoAP request",description:"Send a CoAP request and return the response payload"},"gateway-route":{label:"Gateway route",description:"Forward matching requests to a microservice or static upstream"},"gateway-condition":{label:"Gateway condition",description:"Match path, method, host, header or query values"},"gateway-deny":{label:"Gateway deny",description:"Reject matching requests at the gateway"},debug:{label:"Debug",description:"Inspect a value or the complete message"},junction:{label:"Junction",description:"Merge wires without changing the message"},sequence:{label:"Sequence",description:"Keep downstream steps in order"},link:{label:"Link",description:"Connect distant wire segments by name"},html:{label:"HTML",description:"Extract text or links from HTML"},xml:{label:"XML",description:"Parse or stringify XML documents"}},field:{start:{},end:{},inject:{payload:"Payload (JSON)",topic:"Topic",payloadType:"Payload type"},task:{action:"Action name",result:"Result when no action",fail:"Mark as failed",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},function:{code:"JavaScript code",timeout:"Timeout"},condition:{field:"Value path",operator:"Operator",value:"Compare to"},switch:{field:"Value path",value:"Fallback value"},parallel:{},join:{},loop:{iterations:"Iterations",delay:"Delay"},trigger:{delay:"Delay",payload:"Payload (JSON)"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum",unit:"Unit"},log:{message:"Static message",field:"Value path",complete:"Log full context",level:"Level"},"http-request":{url:"Request URL",method:"Method",headers:"Headers (JSON)",body:"Body",responseType:"Response handling",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",authType:"Authentication",username:"Username",password:"Password"},assign:{values:"Values (JSON)"},transform:{mapping:"Mapping (JSON)",result:"Fixed result (JSON)"},template:{template:"Template",syntax:"Syntax",target:"Write result to",output:"Output type"},json:{mode:"Mode",field:"Value path",pretty:"Pretty print"},csv:{mode:"Mode",field:"Value path",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field path",value:"Value",rules:"Rules"},statistics:{field:"Array path",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event name",payload:"Payload (JSON)"},"event-wait":{event:"Event name",timeout:"Timeout"},command:{command:"Command",args:"Arguments (JSON)",timeout:"Timeout"},split:{field:"Value path",delimiter:"Delimiter"},map:{field:"Array path",path:"Item path"},filter:{field:"Array path",path:"Item path",operator:"Operator",value:"Compare to"},sort:{field:"Array path",path:"Item path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array path",size:"Batch size",overlap:"Overlap"},trycatch:{timeout:"Timeout"},subprocess:{workflow:"Workflow JSON"},comment:{text:"Text"},custom:{result:"Result"},"mqtt-publish":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)",payload:"Payload",retain:"Retain"},"mqtt-wait":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)"},"redis-command":{url:"Redis URL",command:"Command",args:"Arguments"},"redis-publish":{url:"Redis URL",channel:"Channel",message:"Message"},"nats-publish":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"nats-request":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"coap-request":{host:"Host",port:"Port",method:"Method",path:"Path",payload:"Payload",timeout:"Timeout (ms)"},"gateway-route":{path:"Inbound path",service:"Service",targetUrl:"Target URL",targetPath:"Target path",stripPrefix:"Strip prefix",timeout:"Timeout (ms)",priority:"Priority",headers:"Request headers",responseHeaders:"Response headers",rateLimit:"Rate limit",cache:"Cache",circuitBreaker:"Circuit breaker",bulkhead:"Bulkhead"},"gateway-condition":{field:"Field",name:"Header / query name",operator:"Operator",value:"Value"},"gateway-deny":{status:"Status",message:"Message",priority:"Priority",body:"Body"},debug:{field:"Value path",complete:"Complete message",level:"Level",console:"Also print to console",active:"Enabled"},link:{links:"Link names"},html:{field:"HTML path",mode:"Output",target:"Write result to",tag:"Tag"},xml:{mode:"Mode",field:"XML path",target:"Write result to",pretty:"Pretty print"}},fieldPlaceholder:{start:{},end:{},inject:{topic:"orders.created",payload:'{ "value": 1 }'},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{},loop:{},trigger:{payload:'{ "ok": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:","},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{payload:'{ "id": 1 }',event:"order.created"},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{text:"Canvas note"},custom:{result:'{ "ok": true }'},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"/api/users",service:"users-service",targetUrl:"http://127.0.0.1:3001",targetPath:"/users",headers:'{ "x-gateway": "1" }',responseHeaders:'{ "x-served-by": "gateway" }',rateLimit:'{ "limit": 100, "windowMs": 60000 }',cache:'{ "enabled": true, "ttl": 30000 }',circuitBreaker:'{ "failureThreshold": 5 }',bulkhead:'{ "maxConcurrent": 20 }'},"gateway-condition":{name:"x-role",value:"/api/users"},"gateway-deny":{body:'{ "error": "forbidden" }'},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"}},fieldDescription:{start:{},end:{},inject:{topic:"optional label carried with the payload",payload:"Value sent by the trigger. JSON is merged into the context; primitives are sent as-is.",payloadType:"choose the value type; JSON merges into the context, primitives are sent as-is"},task:{action:"name of a function in context.actions; leave empty to return the result below",result:"JSON returned when no action is set",retry:"automatic retries before the step fails",fail:"force this step to fail so error branches can run",retryDelay:"wait time between retries",timeout:"maximum time for this step; 0 means no limit"},function:{code:"return the next message; context and input expose the flow context",timeout:"maximum time for this step; 0 means no limit"},condition:{field:"context path to test, for example approved or user.role",operator:"comparison used to choose the true or false output",value:"value used by the selected operator"},switch:{field:"value used to choose an output port",value:"used when no value path is set"},parallel:{},join:{},loop:{iterations:"number of times downstream steps run",delay:"wait time between iterations"},trigger:{delay:"time to wait before emitting the payload",payload:"JSON emitted when the trigger fires"},delay:{delay:"pause duration before the next node",mode:"fixed waits a set time; random picks a value in the range",randomMin:"minimum random delay",randomMax:"maximum random delay",unit:"unit used by the delay values"},log:{message:"text written when no value path is set",field:"context path to log, for example result.value",complete:"write the complete flow context",level:"log level: info, warn or error"},"http-request":{url:"absolute endpoint or a host path starting with /",method:"HTTP request method",headers:"JSON object of request headers",body:"request body for POST, PUT or PATCH",responseType:"auto parses JSON when possible; text keeps raw text; JSON fails on invalid JSON",retry:"automatic retries after a failed request",retryDelay:"wait time between retries",timeout:"maximum wait time for the request",authType:"choose whether to send a Basic authorization header",username:"Basic authentication user name",password:"Basic authentication password"},assign:{values:"JSON object merged into flow variables"},transform:{mapping:"target field to context path mapping",result:"fixed JSON result"},template:{template:"text with placeholders such as {{name}} or {{user.email}}",target:"context field that receives the rendered value",syntax:"Mustache replaces placeholders; plain text is used as-is",output:"text keeps a string; JSON parses the rendered text"},json:{field:"context path to parse or stringify",mode:"parse JSON text or stringify a value",pretty:"indent the serialized JSON"},csv:{field:"context path to CSV text or an array",delimiter:"single character between columns",mode:"parse CSV text or stringify an array",header:"treat the first row as column names"},change:{field:"context path to modify, for example variables.name",value:"new value; JSON is supported",rules:"rules run in order, one change per row",action:"Set replaces, Delete removes, Append adds to a list or string"},statistics:{field:"context path to the array to aggregate",path:"property of each item used for the calculation",operation:"count, sum, average, min or max",resultField:"field that receives the result"},merge:{fields:"comma-separated context fields to merge",mode:"object merge or array concat",resultField:"field that receives the result"},"event-emit":{event:"event name shared by emitters and waiters",payload:"JSON data sent with the event"},"event-wait":{event:"event name to wait for",timeout:"maximum time to wait for the event"},command:{args:"JSON array passed to the command",command:"host command or function name",timeout:"maximum execution time for the command"},split:{field:"text or array path to split",delimiter:"separator used when splitting text"},map:{path:"property of each item to map",field:"array path to iterate"},filter:{field:"array path to filter",path:"item property used for comparison",operator:"comparison operator",value:"value used for comparison"},sort:{path:"item property used for sorting",field:"array path to sort",order:"ascending or descending"},range:{from:"inclusive start value",to:"exclusive end value",step:"amount added on each step"},batch:{size:"number of items per batch",field:"array path to split into batches",overlap:"items repeated at the start of the next batch; 0 disables overlap"},trycatch:{timeout:"route to the timeout port after this delay"},subprocess:{workflow:"workflow definition to execute"},comment:{},custom:{result:"Value returned by the custom node."},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"JSON array of command arguments."},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"Defaults to the path condition value.",priority:"Lower runs first."},"gateway-condition":{},"gateway-deny":{priority:"Lower runs first."},debug:{field:"context path to inspect",complete:"print the complete workflow context",console:"also write to the host console for development",level:"output level: info, warn or error",active:"turn off to keep the node but skip its output"},link:{links:"optional comma-separated names for remote wires"},html:{field:"context path containing HTML text",mode:"text strips markup; links collects href and src values",target:"context field that receives the extracted value",tag:"only extract content from this tag; leave empty for the whole document"},xml:{mode:"parse XML text or serialize an object back to XML",field:"context path containing XML text or an object",target:"context field that receives the result",pretty:"indent serialized XML"}},group:{reliability:"Reliability",options:"Options",delay:"Delay",request:"Request",template:"Template",output:"Output",payload:"Payload",authentication:"Authentication"},option:{truthy:"is truthy",equals:"equals","not-equals":"not equals",gt:"greater than",lt:"less than",fixed:"Fixed delay",random:"Random delay",info:"info",warn:"warn",error:"error",GET:"GET",POST:"POST",PUT:"PUT",PATCH:"PATCH",DELETE:"DELETE",auto:"Auto (JSON when possible)",json:"Parsed JSON",text:"Text",mustache:"Mustache",plain:"Plain text",parse:"Parse",stringify:"Stringify",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat",asc:"Ascending",desc:"Descending",path:"Path",method:"Method",host:"Host",header:"Header",query:"Query",prefix:"prefix","not-prefix":"not prefix",exists:"exists","not-exists":"not exists",links:"Links",string:"String",number:"Number",boolean:"Boolean",none:"None",basic:"Basic",milliseconds:"Milliseconds",seconds:"Seconds",minutes:"Minutes"}},"zh-CN":{node:{start:{label:"\u5F00\u59CB",description:"\u53EF\u9009\u7684\u663E\u5F0F\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u53EF\u9009\u7684\u663E\u5F0F\u7ED3\u675F\u70B9"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u542F\u52A8\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u4F7F\u7528 JavaScript \u5904\u7406\u6D88\u606F"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u6D41\u7A0B\u4E0A\u4E0B\u6587\u7684\u503C\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u503C\u8DEF\u7531\u5230\u5339\u914D\u7684\u8F93\u51FA"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u4E0B\u6E38\u6B65\u9AA4"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u6570\u636E"},delay:{label:"\u5EF6\u8FDF",description:"\u6309\u56FA\u5B9A\u6216\u968F\u673A\u65F6\u95F4\u6682\u505C"},log:{label:"\u65E5\u5FD7",description:"\u5C06\u6D88\u606F\u6216\u503C\u5199\u5165\u6267\u884C\u65E5\u5FD7"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3\u5E76\u8BFB\u53D6\u54CD\u5E94"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u5C06\u4E0A\u4E00\u6B65\u7ED3\u679C\u6620\u5C04\u4E3A\u65B0\u7ED3\u6784"},template:{label:"\u6A21\u677F",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u503C\u6E32\u67D3\u6587\u672C"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV \u6587\u672C"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u5C06\u6570\u7EC4\u805A\u5408\u4E3A\u6570\u503C"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5B57\u6BB5\u6216\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u5411\u5BBF\u4E3B\u53D1\u5E03\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5BBF\u4E3B\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u6267\u884C\u5BBF\u4E3B\u547D\u4EE4\u6216\u51FD\u6570"},split:{label:"\u62C6\u5206",description:"\u62C6\u5206\u6587\u672C\u6216\u6570\u7EC4"},map:{label:"\u6620\u5C04",description:"\u5C06\u6BCF\u4E2A\u5143\u7D20\u6620\u5C04\u4E3A\u65B0\u503C"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u7B26\u5408\u6761\u4EF6\u7684\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u5143\u7D20\u5206\u6279"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u6267\u884C"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"},"mqtt-publish":{label:"MQTT \u53D1\u5E03",description:"\u5411 MQTT \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"mqtt-wait":{label:"MQTT \u7B49\u5F85",description:"\u7B49\u5F85 MQTT \u4E3B\u9898\u7684\u4E0B\u4E00\u6761\u6D88\u606F"},"redis-command":{label:"Redis \u547D\u4EE4",description:"\u6267\u884C Redis \u547D\u4EE4\u5E76\u8FD4\u56DE\u7ED3\u679C"},"redis-publish":{label:"Redis \u53D1\u5E03",description:"\u5411 Redis \u9891\u9053\u53D1\u5E03\u6D88\u606F"},"nats-publish":{label:"NATS \u53D1\u5E03",description:"\u5411 NATS \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"nats-request":{label:"NATS \u8BF7\u6C42",description:"\u53D1\u9001 NATS \u8BF7\u6C42\u5E76\u7B49\u5F85\u56DE\u590D"},"coap-request":{label:"CoAP \u8BF7\u6C42",description:"\u53D1\u9001 CoAP \u8BF7\u6C42\u5E76\u8FD4\u56DE\u54CD\u5E94\u5185\u5BB9"},"gateway-route":{label:"\u7F51\u5173\u8DEF\u7531",description:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38"},"gateway-condition":{label:"\u7F51\u5173\u6761\u4EF6",description:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570"},"gateway-deny":{label:"\u7F51\u5173\u62D2\u7EDD",description:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42"},debug:{label:"\u8C03\u8BD5",description:"\u67E5\u770B\u6D88\u606F\u5C5E\u6027\u6216\u5B8C\u6574\u6D88\u606F"},junction:{label:"\u6C47\u5408",description:"\u6C47\u5408\u8FDE\u7EBF\uFF0C\u4E0D\u6539\u53D8\u6D88\u606F"},sequence:{label:"\u987A\u5E8F",description:"\u4FDD\u6301\u4E0B\u6E38\u6B65\u9AA4\u987A\u5E8F\u6267\u884C"},link:{label:"\u8FDE\u7EBF",description:"\u6309\u540D\u79F0\u8FDE\u63A5\u753B\u5E03\u4E0A\u7684\u8FDC\u7A0B\u8FDE\u7EBF"},html:{label:"HTML",description:"\u4ECE HTML \u63D0\u53D6\u6587\u672C\u6216\u94FE\u63A5"},xml:{label:"XML",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 XML \u6587\u6863"}},field:{start:{},end:{},inject:{payload:"\u6570\u636E\uFF08JSON\uFF09",topic:"\u4E3B\u9898",payloadType:"\u6570\u636E\u7C7B\u578B"},task:{action:"\u52A8\u4F5C\u540D\u79F0",result:"\u65E0\u52A8\u4F5C\u65F6\u7684\u7ED3\u679C",fail:"\u6807\u8BB0\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},function:{code:"JavaScript \u4EE3\u7801",timeout:"\u8D85\u65F6"},condition:{field:"\u53D6\u503C\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u8DEF\u5F84",value:"\u9ED8\u8BA4\u503C"},parallel:{},join:{},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E\uFF08JSON\uFF09"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C",unit:"\u5355\u4F4D"},log:{message:"\u56FA\u5B9A\u6D88\u606F",field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u8BB0\u5F55\u5B8C\u6574\u4E0A\u4E0B\u6587",level:"\u7EA7\u522B"},"http-request":{url:"\u8BF7\u6C42\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934\uFF08JSON\uFF09",body:"\u8BF7\u6C42\u4F53",responseType:"\u54CD\u5E94\u5904\u7406",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",authType:"\u8BA4\u8BC1",username:"\u7528\u6237\u540D",password:"\u5BC6\u7801"},assign:{values:"\u503C\uFF08JSON\uFF09"},transform:{mapping:"\u6620\u5C04\uFF08JSON\uFF09",result:"\u56FA\u5B9A\u7ED3\u679C\uFF08JSON\uFF09"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5\u8DEF\u5F84",value:"\u503C",rules:"\u89C4\u5219"},statistics:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0",payload:"\u6570\u636E\uFF08JSON\uFF09"},"event-wait":{event:"\u4E8B\u4EF6\u540D\u79F0",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570\uFF08JSON\uFF09",timeout:"\u8D85\u65F6"},split:{field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u8DEF\u5F84",size:"\u6279\u5927\u5C0F",overlap:"\u91CD\u53E0\u6570\u91CF"},trycatch:{timeout:"\u8D85\u65F6"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},comment:{text:"\u6587\u672C"},custom:{result:"\u7ED3\u679C"},"mqtt-publish":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",payload:"\u6D88\u606F\u5185\u5BB9",retain:"\u4FDD\u7559\u6D88\u606F"},"mqtt-wait":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"redis-command":{url:"Redis \u5730\u5740",command:"\u547D\u4EE4",args:"\u53C2\u6570"},"redis-publish":{url:"Redis \u5730\u5740",channel:"\u9891\u9053",message:"\u6D88\u606F"},"nats-publish":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"nats-request":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"coap-request":{host:"\u4E3B\u673A",port:"\u7AEF\u53E3",method:"\u65B9\u6CD5",path:"\u8DEF\u5F84",payload:"\u8BF7\u6C42\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"gateway-route":{path:"\u5165\u53E3\u8DEF\u5F84",service:"\u670D\u52A1\u540D",targetUrl:"\u4E0A\u6E38\u5730\u5740",targetPath:"\u4E0A\u6E38\u8DEF\u5F84",stripPrefix:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",priority:"\u4F18\u5148\u7EA7",headers:"\u8BF7\u6C42\u5934",responseHeaders:"\u54CD\u5E94\u5934",rateLimit:"\u9650\u6D41",cache:"\u7F13\u5B58",circuitBreaker:"\u7194\u65AD",bulkhead:"\u9694\u79BB\u8231"},"gateway-condition":{field:"\u5B57\u6BB5",name:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},"gateway-deny":{status:"\u72B6\u6001\u7801",message:"\u6D88\u606F",priority:"\u4F18\u5148\u7EA7",body:"\u54CD\u5E94\u4F53"},debug:{field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B",console:"\u540C\u65F6\u8F93\u51FA\u5230\u63A7\u5236\u53F0",active:"\u542F\u7528"},link:{links:"\u8FDE\u7EBF\u540D\u79F0"},html:{field:"HTML \u8DEF\u5F84",mode:"\u8F93\u51FA",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",tag:"\u6807\u7B7E"},xml:{mode:"\u6A21\u5F0F",field:"XML \u8DEF\u5F84",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"}},fieldPlaceholder:{start:{},end:{},inject:{payload:'{ "value": 1 }',topic:"orders.created"},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{},loop:{},trigger:{payload:'{ "ok": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:","},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{event:"order.created",payload:'{ "id": 1 }'},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{},custom:{},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{},"gateway-condition":{},"gateway-deny":{},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"}},fieldDescription:{start:{},end:{},inject:{topic:"\u968F\u6570\u636E\u4E00\u8D77\u4F20\u9012\u7684\u53EF\u9009\u6807\u7B7E\u3002",payload:"\u89E6\u53D1\u5668\u53D1\u9001\u7684\u503C\uFF1BJSON \u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\uFF0C\u5176\u4ED6\u7C7B\u578B\u6309\u539F\u503C\u53D1\u9001\u3002",payloadType:"\u9009\u62E9\u6570\u636E\u7684\u7C7B\u578B\uFF1BJSON \u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\uFF0C\u5176\u4ED6\u7C7B\u578B\u6309\u539F\u503C\u53D1\u9001\u3002"},task:{action:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\uFF0C\u7559\u7A7A\u5219\u8FD4\u56DE\u201C\u7ED3\u679C\u201D\u4E2D\u7684\u503C\u3002",result:"\u672A\u8BBE\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u7684 JSON\u3002",retry:"\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",fail:"\u5F3A\u5236\u6B64\u6B65\u9AA4\u5931\u8D25\uFF0C\u4FBF\u4E8E\u6D4B\u8BD5\u5F02\u5E38\u5206\u652F\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002"},function:{code:"\u8FD4\u56DE\u4E0B\u4E00\u6B65\u6D88\u606F\u3002context \u4E0E input \u90FD\u662F\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002"},condition:{field:"\u8981\u5224\u65AD\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\uFF0C\u4F8B\u5982 approved \u6216 user.role\u3002",operator:"\u9009\u62E9\u5224\u65AD\u65B9\u5F0F\uFF0C\u51B3\u5B9A\u8FDB\u5165 true \u8FD8\u662F false \u5206\u652F\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002"},switch:{field:"\u7528\u4E8E\u9009\u62E9\u8F93\u51FA\u7AEF\u53E3\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",value:"\u672A\u8BBE\u7F6E\u53D6\u503C\u8DEF\u5F84\u65F6\u4F7F\u7528\u7684\u5B57\u9762\u503C\u3002"},parallel:{},join:{},loop:{iterations:"\u91CD\u590D\u6267\u884C\u4E0B\u6E38\u6B65\u9AA4\u7684\u6B21\u6570\u3002",delay:"\u6BCF\u6B21\u8FED\u4EE3\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002"},trigger:{delay:"\u53D1\u9001\u6570\u636E\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",payload:"\u89E6\u53D1\u65F6\u8F93\u51FA\u7684 JSON \u6570\u636E\u3002"},delay:{delay:"\u8FDB\u5165\u4E0B\u4E00\u4E2A\u8282\u70B9\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",mode:"\u56FA\u5B9A\u5EF6\u8FDF\u6216\u533A\u95F4\u5185\u968F\u673A\u5EF6\u8FDF\u3002",randomMin:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5C0F\u65F6\u95F4\u3002",randomMax:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5927\u65F6\u95F4\u3002",unit:"\u5EF6\u8FDF\u65F6\u95F4\u7684\u5355\u4F4D\u3002"},log:{message:"\u672A\u8BBE\u7F6E\u53D6\u503C\u8DEF\u5F84\u65F6\u5199\u5165\u7684\u6587\u672C\u3002",field:"\u8981\u8BB0\u5F55\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8BB0\u5F55\u6574\u4E2A\u6D41\u7A0B\u4E0A\u4E0B\u6587\u800C\u4E0D\u662F\u5355\u4E2A\u503C\u3002",level:"\u65E5\u5FD7\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002"},"http-request":{url:"\u7EDD\u5BF9\u5730\u5740\uFF0C\u6216\u4EE5 / \u5F00\u5934\u7684\u5BBF\u4E3B\u8DEF\u5F84\u3002",method:"HTTP \u8BF7\u6C42\u65B9\u6CD5\u3002",headers:"JSON \u5BF9\u8C61\u5F62\u5F0F\u7684\u8BF7\u6C42\u5934\u3002",body:"POST/PUT/PATCH \u7684\u8BF7\u6C42\u4F53\u3002",responseType:"\u81EA\u52A8\uFF1A\u80FD\u89E3\u6790\u5219\u8FD4\u56DE JSON\uFF1B\u6587\u672C\uFF1A\u4FDD\u7559\u539F\u6587\uFF1BJSON\uFF1A\u89E3\u6790\u5931\u8D25\u65F6\u62A5\u9519\u3002",retry:"\u8BF7\u6C42\u5931\u8D25\u540E\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u8BF7\u6C42\u7684\u6700\u957F\u7B49\u5F85\u65F6\u95F4\u3002",authType:"\u9009\u62E9\u662F\u5426\u53D1\u9001 Basic \u8BA4\u8BC1\u5934\u3002",username:"Basic \u8BA4\u8BC1\u7528\u6237\u540D\u3002",password:"Basic \u8BA4\u8BC1\u5BC6\u7801\u3002"},assign:{values:"\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF\u7684 JSON \u5BF9\u8C61\u3002"},transform:{mapping:"\u76EE\u6807\u5B57\u6BB5\u5230\u4E0A\u4E0B\u6587\u8DEF\u5F84\u7684\u6620\u5C04\u3002",result:"\u76F4\u63A5\u8FD4\u56DE\u7684 JSON \u7ED3\u679C\u3002"},template:{template:"\u4F7F\u7528 {{name}} \u6216 {{user.email}} \u8BFB\u53D6\u4E0A\u4E0B\u6587\u503C\u3002",target:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",syntax:"Mustache \u66FF\u6362 {{...}} \u5360\u4F4D\u7B26\uFF1B\u7EAF\u6587\u672C\u539F\u6837\u8F93\u51FA\u3002",output:"\u6587\u672C\u4FDD\u7559\u5B57\u7B26\u4E32\uFF1BJSON \u4F1A\u89E3\u6790\u6E32\u67D3\u7ED3\u679C\u3002"},json:{field:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u89E3\u6790 JSON \u6587\u672C\uFF0C\u6216\u628A\u503C\u5E8F\u5217\u5316\u4E3A JSON\u3002",pretty:"\u4F7F\u7528\u7F29\u8FDB\u8F93\u51FA JSON\u3002"},csv:{field:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",delimiter:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002",mode:"\u89E3\u6790 CSV \u6587\u672C\uFF0C\u6216\u628A\u6570\u7EC4\u5E8F\u5217\u5316\u4E3A CSV\u3002",header:"\u89E3\u6790\u65F6\u628A\u9996\u884C\u4F5C\u4E3A\u5B57\u6BB5\u540D\u3002"},change:{field:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",value:"\u65B0\u503C\uFF0C\u652F\u6301 JSON\u3002",rules:"\u6309\u987A\u5E8F\u6267\u884C\uFF0C\u6BCF\u884C\u4FEE\u6539\u4E00\u4E2A\u5B57\u6BB5\u3002",action:"Set \u66FF\u6362\uFF0CDelete \u5220\u9664\uFF0CAppend \u8FFD\u52A0\u5230\u5217\u8868\u6216\u5B57\u7B26\u4E32\u3002"},statistics:{field:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",path:"\u6570\u7EC4\u5143\u7D20\u4E2D\u7528\u4E8E\u8BA1\u7B97\u7684\u5C5E\u6027\u3002",operation:"\u8BA1\u6570\u3001\u6C42\u548C\u3001\u5E73\u5747\u3001\u6700\u5C0F\u6216\u6700\u5927\u3002",resultField:"\u63A5\u6536\u7EDF\u8BA1\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},merge:{fields:"\u8981\u5408\u5E76\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\uFF0C\u9017\u53F7\u5206\u9694\u3002",mode:"\u5BF9\u8C61\u5408\u5E76\u6216\u6570\u7EC4\u62FC\u63A5\u3002",resultField:"\u63A5\u6536\u5408\u5E76\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0\uFF0C\u53D1\u9001\u4E0E\u7B49\u5F85\u7AEF\u9700\u4E00\u81F4\u3002",payload:"\u968F\u4E8B\u4EF6\u53D1\u9001\u7684 JSON \u6570\u636E\u3002"},"event-wait":{event:"\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u79F0\u3002",timeout:"\u7B49\u5F85\u4E8B\u4EF6\u7684\u6700\u957F\u65F6\u95F4\u3002"},command:{args:"\u4F20\u7ED9\u547D\u4EE4\u7684 JSON \u6570\u7EC4\u3002",command:"\u5BBF\u4E3B\u6CE8\u518C\u7684\u547D\u4EE4\u6216\u51FD\u6570\u540D\u3002",timeout:"\u547D\u4EE4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\u3002"},split:{field:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u8DEF\u5F84\u3002",delimiter:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002"},map:{path:"\u6BCF\u4E2A\u5143\u7D20\u4E2D\u8981\u6620\u5C04\u7684\u5C5E\u6027\u3002",field:"\u8981\u904D\u5386\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"},filter:{field:"\u8981\u8FC7\u6EE4\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",path:"\u7528\u4E8E\u6BD4\u8F83\u7684\u5143\u7D20\u5C5E\u6027\u3002",operator:"\u6BD4\u8F83\u65B9\u5F0F\u3002",value:"\u6BD4\u8F83\u4F7F\u7528\u7684\u503C\u3002"},sort:{path:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002",field:"\u8981\u6392\u5E8F\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",order:"\u5347\u5E8F\u6216\u964D\u5E8F\u3002"},range:{from:"\u533A\u95F4\u8D77\u59CB\u503C\uFF08\u5305\u542B\uFF09\u3002",to:"\u533A\u95F4\u7ED3\u675F\u503C\uFF08\u4E0D\u5305\u542B\uFF09\u3002",step:"\u6BCF\u6B21\u589E\u52A0\u7684\u6570\u91CF\u3002"},batch:{size:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002",field:"\u8981\u5206\u6279\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",overlap:"\u4E0B\u4E00\u6279\u5F00\u5934\u91CD\u590D\u4E0A\u4E00\u6279\u672B\u5C3E\u7684\u5143\u7D20\u6570\u91CF\uFF0C0 \u8868\u793A\u4E0D\u91CD\u53E0\u3002"},trycatch:{timeout:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"},subprocess:{workflow:"\u8981\u6267\u884C\u7684\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u3002"},comment:{},custom:{result:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"\u547D\u4EE4\u53C2\u6570\u7684 JSON \u6570\u7EC4\u3002"},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002",priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},"gateway-condition":{},"gateway-deny":{priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},debug:{field:"\u8981\u67E5\u770B\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8F93\u51FA\u5B8C\u6574\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",console:"\u540C\u65F6\u5199\u5165\u5BBF\u4E3B\u63A7\u5236\u53F0\uFF0C\u4FBF\u4E8E\u5F00\u53D1\u8C03\u8BD5\u3002",level:"\u8F93\u51FA\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002",active:"\u5173\u95ED\u540E\u4FDD\u7559\u8282\u70B9\u4F46\u4E0D\u518D\u8F93\u51FA\u3002"},link:{links:"\u7528\u4E8E\u8BC6\u522B\u8FDC\u7A0B\u8FDE\u7EBF\u7684\u53EF\u9009\u540D\u79F0\uFF0C\u9017\u53F7\u5206\u9694\u3002"},html:{field:"\u5305\u542B HTML \u6587\u672C\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u6587\u672C\uFF1A\u53BB\u9664\u6807\u7B7E\uFF1B\u94FE\u63A5\uFF1A\u6536\u96C6 href/src\u3002",target:"\u63A5\u6536\u63D0\u53D6\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",tag:"\u53EA\u63D0\u53D6\u8BE5 HTML \u6807\u7B7E\u5185\u7684\u5185\u5BB9\uFF0C\u7559\u7A7A\u5219\u5904\u7406\u6574\u4E2A\u6587\u6863\u3002"},xml:{mode:"\u89E3\u6790 XML \u6587\u672C\uFF0C\u6216\u628A\u5BF9\u8C61\u5E8F\u5217\u5316\u4E3A XML\u3002",field:"\u5305\u542B XML \u6216\u5BF9\u8C61\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",target:"\u63A5\u6536\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",pretty:"\u5E8F\u5217\u5316\u65F6\u4F7F\u7528\u7F29\u8FDB\u3002"}},group:{reliability:"\u53EF\u9760\u6027",options:"\u9009\u9879",delay:"\u5EF6\u8FDF",request:"\u8BF7\u6C42",template:"\u6A21\u677F",output:"\u8F93\u51FA",payload:"\u6570\u636E",authentication:"\u8BA4\u8BC1"},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E","not-equals":"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",auto:"\u81EA\u52A8\uFF08\u80FD\u89E3\u6790\u5219 JSON\uFF09",json:"JSON",text:"\u6587\u672C",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",path:"\u8DEF\u5F84",method:"\u65B9\u6CD5",host:"\u4E3B\u673A",header:"\u8BF7\u6C42\u5934",query:"\u67E5\u8BE2\u53C2\u6570",prefix:"\u524D\u7F00","not-prefix":"\u975E\u524D\u7F00",exists:"\u5B58\u5728","not-exists":"\u4E0D\u5B58\u5728",links:"\u94FE\u63A5",string:"\u5B57\u7B26\u4E32",number:"\u6570\u5B57",boolean:"\u5E03\u5C14",none:"\u65E0",basic:"Basic",milliseconds:"\u6BEB\u79D2",seconds:"\u79D2",minutes:"\u5206\u949F"}}};var Go={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",properties:"Properties",appearance:"Appearance",icon:"Icon",color:"Color",addItem:"Add",removeItem:"Remove",logTitle:"Execution log",runHistory:"Runs",canvasEmpty:"Drag a component from the palette, or click one to add it",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",language:"Language",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",zoomIn:"Zoom in",zoomOut:"Zoom out",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",rename:"Rename workflow",renameTitle:"Rename workflow",renamePlaceholder:"Workflow name",renameEmpty:"Enter a workflow name",renameConfirm:"Rename",cancel:"Cancel",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{renamed:'Renamed to "{name}"',added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},inject:{payload:"Payload",topic:"Topic"},trigger:{delay:"Delay",payload:"Payload"},function:{code:"Code",timeout:"Timeout"},template:{template:"Template",syntax:"Syntax",target:"Target field",output:"Output"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout"},command:{command:"Command",args:"Args",timeout:"Timeout"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Value"},loop:{iterations:"Iterations",delay:"Delay"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum"},log:{message:"Message",field:"Message property",complete:"Complete message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",responseType:"Response"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat",fixed:"Fixed delay",random:"Random delay",mustache:"Mustache",plain:"Plain text",text:"Text",auto:"Auto",info:"Info",warn:"Warning",error:"Error"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",properties:"\u5C5E\u6027",appearance:"\u5916\u89C2",icon:"\u56FE\u6807",color:"\u989C\u8272",addItem:"\u6DFB\u52A0",removeItem:"\u5220\u9664",logTitle:"\u6267\u884C\u65E5\u5FD7",runHistory:"\u8FD0\u884C\u5386\u53F2",canvasEmpty:"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",language:"\u8BED\u8A00",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",zoomIn:"\u653E\u5927",zoomOut:"\u7F29\u5C0F",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",rename:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renameTitle:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renamePlaceholder:"\u5DE5\u4F5C\u6D41\u540D\u79F0",renameEmpty:"\u8BF7\u8F93\u5165\u5DE5\u4F5C\u6D41\u540D\u79F0",renameConfirm:"\u91CD\u547D\u540D",cancel:"\u53D6\u6D88",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{renamed:"\u5DF2\u91CD\u547D\u540D\u4E3A\u300C{name}\u300D",added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},inject:{payload:"\u6570\u636E",topic:"\u4E3B\u9898"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u76EE\u6807\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C"},log:{message:"\u6D88\u606F",field:"\u6D88\u606F\u5C5E\u6027",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",responseType:"\u54CD\u5E94\u89E3\u6790"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",text:"\u6587\u672C",auto:"\u81EA\u52A8",info:"\u4FE1\u606F",warn:"\u544A\u8B66",error:"\u9519\u8BEF"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},Yo=Object.fromEntries(Object.entries(Go).map(([s,e])=>{let t=e.messages?.workflow||{};return[s,{...e,messages:{...e.messages,workflow:{...t,...ro[s]||{}}}}]})),Ne=class{};w(Ne,[[$({imports:[Te.withLocales(Yo,"zh-CN")],exports:[Te]}),0]]);function x(s,e,t,o,r){if(!s)return o;try{if(s.has(t,e))return s.translate(t,e,r);let i=s.translate(t,e,r);if(i&&i!==t)return i}catch{}return o}function Ot(s,e,t,o="",r){return t?t.startsWith("workflow.")?x(s,e,t,o||t,r):t:o}var Xo={trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"};function g(s,e,t,o){return{id:s,name:e,type:t,label:o}}function m(s){return{...s}}var X="^\\$?\\.?[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",Zo=184,Qo=64;var er=[{type:"start",label:"Start",description:"Entry point of the workflow",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[g("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",description:"Finish the workflow",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[g("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",description:"Start with a fixed payload",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[g("out","out","output","Payload")],fields:[m({key:"payload",label:"Payload",type:"json",defaultValue:{}}),m({key:"topic",label:"Topic",type:"text",maxLength:200,placeholder:"optional topic",description:"Optional message topic carried with the payload."})],defaultConfig:{payload:{}}},{type:"task",label:"Task",description:"Run a named action or return a fixed result",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"action",label:"Action",type:"text",placeholder:"actions.fetch",pattern:"^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",description:"Function name in context.actions."}),m({key:"result",label:"Mock result",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set."}),m({key:"fail",label:"Fail this step",type:"boolean",defaultValue:!1,group:"Reliability"}),m({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",description:"Automatic retries before the step fails."}),m({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),m({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"function",label:"Function",description:"Run trusted JavaScript against the workflow context",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"code",label:"Code",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions."}),m({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",description:"Branch on a context field",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("true","true","output","True"),g("false","false","output","False")],fields:[m({key:"field",label:"Field",type:"text",required:!0,pattern:X,placeholder:"input.approved",description:"Path to the value to test."}),m({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"}]}),m({key:"value",label:"Compare with",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",description:"Route by a context value",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Matched"),g("default","default","output","Default"),g("error","error","output","Error")],fields:[m({key:"field",label:"Value field",type:"text",required:!0,pattern:X,placeholder:"input.type",description:"Path to the value used for routing."}),m({key:"value",label:"Value",type:"text",placeholder:"approved",description:"Literal value used when no value field is configured."})],defaultConfig:{}},{type:"link",label:"Link",description:"Connect distant wire segments by name",category:"flow",icon:"\u21E2",color:"#0d9488",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"links",label:"Links",type:"text",placeholder:"flow-a, flow-b",description:"Comma separated link names for documentation."})],defaultConfig:{}},{type:"html",label:"HTML",description:"Extract text or links from HTML",category:"data",icon:"H",color:"#ea580c",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"field",label:"HTML field",type:"text",defaultValue:"value",pattern:X,placeholder:"value"}),m({key:"tag",label:"Tag",type:"text",pattern:"^[A-Za-z][A-Za-z0-9-]*$",placeholder:"h1",group:"Options",description:"Only extract content from this HTML tag. Leave empty for the whole document."}),m({key:"mode",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Links",value:"links"}]}),m({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:X,placeholder:"value"})],defaultConfig:{field:"value",mode:"text",target:"value"}},{type:"xml",label:"XML",description:"Parse or stringify XML",category:"data",icon:"X",color:"#dc2626",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),m({key:"field",label:"XML field",type:"text",defaultValue:"value",pattern:X,placeholder:"value"}),m({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:X,placeholder:"value"}),m({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse",field:"value",target:"value"}},{type:"junction",label:"Junction",description:"Route wires without changing the message",category:"flow",icon:"\u2022",color:"#64748b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"sequence",label:"Sequence",description:"Keep steps in a strict order",category:"flow",icon:"\u2261",color:"#475569",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"parallel",label:"Parallel",description:"Run all outgoing branches concurrently",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",description:"Wait for all incoming branches before continuing",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"loop",label:"Loop",description:"Repeat the node body",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Done"),g("error","error","output","Error")],fields:[m({key:"iterations",label:"Iterations",type:"number",defaultValue:1,min:1,max:1e4,step:1}),m({key:"delay",label:"Delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Options"})],defaultConfig:{iterations:1}},{type:"trigger",label:"Trigger",description:"Emit a payload after an optional delay",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"delay",label:"Delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",description:"Time to wait before emitting the payload."}),m({key:"payload",label:"Payload",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'})],defaultConfig:{delay:0,payload:{}}},{type:"delay",label:"Delay",description:"Wait before continuing",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"mode",label:"Mode",type:"select",defaultValue:"fixed",options:[{label:"Fixed delay",value:"fixed"},{label:"Random delay",value:"random"}],group:"Delay"}),m({key:"delay",label:"Delay",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"fixed"},description:"Pause before continuing."}),m({key:"randomMin",label:"Minimum",type:"number",defaultValue:100,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}}),m({key:"randomMax",label:"Maximum",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}})],defaultConfig:{mode:"fixed",delay:500}},{type:"log",label:"Log",description:"Record a message",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"message",label:"Message",type:"text",defaultValue:"Workflow step completed",placeholder:"Workflow step completed",description:"Message written to the execution log when no field is set."}),m({key:"field",label:"Message property",type:"text",pattern:X,placeholder:"value",description:"Optional context path; logs that value instead of the fixed message."}),m({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Log the complete workflow context instead of one property."}),m({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"debug",label:"Debug",description:"Inspect a message property or the complete message",category:"action",icon:"\u25C9",color:"#0284c7",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[],fields:[m({key:"active",label:"Enabled",type:"boolean",defaultValue:!0,group:"Options",description:"Turn off to keep the node but skip its output."}),m({key:"field",label:"Output property",type:"text",pattern:X,placeholder:"payload",description:"Context path to print instead of the complete message."}),m({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Print the complete workflow context."}),m({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]}),m({key:"console",label:"Also print to console",type:"boolean",defaultValue:!1,description:"Mirror the message to the host console."})],defaultConfig:{level:"info",complete:!1,console:!1}},{type:"http-request",label:"HTTP request",description:"Call an HTTP endpoint",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Response"),g("error","error","output","Error")],fields:[m({key:"url",label:"URL",type:"url",required:!0,placeholder:"https://api.example.com",group:"Request",description:"Absolute endpoint or a path resolved by the host."}),m({key:"method",label:"Method",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(s=>({label:s,value:s})),group:"Request"}),m({key:"headers",label:"Headers",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request"}),m({key:"body",label:"Body",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",visibleWhen:{key:"method",notEquals:"GET"}}),m({key:"responseType",label:"Response",type:"select",defaultValue:"auto",options:[{label:"Auto (JSON when possible)",value:"auto"},{label:"Parsed JSON",value:"json"},{label:"UTF-8 text",value:"text"}],group:"Request"}),m({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability"}),m({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),m({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",description:"Merge values into workflow variables",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"values",label:"Values",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",description:"Map the previous result",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"mapping",label:"Mapping",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result."}),m({key:"result",label:"Fixed result",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",description:"Render a message template",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"template",label:"Template",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",group:"Template",description:"Use {{path.to.value}} placeholders."}),m({key:"syntax",label:"Syntax",type:"select",defaultValue:"mustache",options:[{label:"Mustache",value:"mustache"},{label:"Plain text",value:"plain"}],group:"Template"}),m({key:"target",label:"Target field",type:"text",defaultValue:"message",pattern:X,placeholder:"message",group:"Output",description:"Context field that receives the rendered text."}),m({key:"output",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Parsed JSON",value:"json"}],group:"Output"})],defaultConfig:{template:"{{value}}",syntax:"mustache",target:"message",output:"text"}},{type:"json",label:"JSON",description:"Parse or stringify JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),m({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the value to parse or stringify."}),m({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",description:"Parse or stringify CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),m({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the CSV text or array."}),m({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns."}),m({key:"header",label:"First row is header",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",description:"Set, delete or append a context field",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[m({key:"action",label:"Action",type:"select",defaultValue:"set",options:[{label:"Set",value:"set"},{label:"Delete",value:"delete"},{label:"Append",value:"append"}]}),m({key:"field",label:"Field",type:"text",required:!0,pattern:X,placeholder:"variables.name",description:"Context path to modify."}),m({key:"value",label:"Value",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append."})]})],defaultConfig:{rules:[]}},{type:"statistics",label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Result")],fields:[m({key:"field",label:"Array field",type:"text",placeholder:"items",description:"Path to the array to aggregate."}),m({key:"path",label:"Item path",type:"text",placeholder:"value",description:"Numeric property of each item."}),m({key:"operation",label:"Operation",type:"select",defaultValue:"count",options:[{label:"Count",value:"count"},{label:"Sum",value:"sum"},{label:"Average",value:"avg"},{label:"Min",value:"min"},{label:"Max",value:"max"}]}),m({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",description:"Merge objects or concatenate arrays",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"fields",label:"Fields",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second"}),m({key:"mode",label:"Mode",type:"select",defaultValue:"object",options:[{label:"Object merge",value:"object"},{label:"Array concat",value:"array"}]}),m({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",description:"Emit an event through the workflow event bus",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[m({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to publish."}),m({key:"payload",label:"Payload",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload."})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",description:"Wait for a workflow event",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Event"),g("error","error","output","Timeout")],fields:[m({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to wait for."}),m({key:"timeout",label:"Timeout",type:"number",defaultValue:3e4,min:0,step:1e3,unit:"ms",group:"Reliability",description:"Route to the timeout port after this delay."})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",description:"Run a host-provided command executor",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"command",label:"Command",type:"text",required:!0,placeholder:"context.exec"}),m({key:"args",label:"Args",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command."}),m({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"split",label:"Split",description:"Split a string or array into items",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[m({key:"field",label:"Field",type:"text",placeholder:"items",description:"Text or array to split."}),m({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text."})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",description:"Map each array item",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[m({key:"field",label:"Array field",type:"text",placeholder:"items"}),m({key:"path",label:"Item path",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name"})],defaultConfig:{}},{type:"filter",label:"Filter",description:"Keep array items that match a condition",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[m({key:"field",label:"Array field",type:"text",placeholder:"items"}),m({key:"path",label:"Item path",type:"text",defaultValue:""}),m({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"}]}),m({key:"value",label:"Compare with",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",description:"Sort an array by a field",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[m({key:"field",label:"Array field",type:"text",placeholder:"items"}),m({key:"path",label:"Sort path",type:"text",placeholder:"value",description:"Property of each item used for ordering."}),m({key:"order",label:"Order",type:"select",defaultValue:"asc",options:[{label:"Ascending",value:"asc"},{label:"Descending",value:"desc"}]})],defaultConfig:{order:"asc"}},{type:"range",label:"Range",description:"Generate a numeric range",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[m({key:"from",label:"From",type:"number",defaultValue:0}),m({key:"to",label:"To",type:"number",defaultValue:10}),m({key:"step",label:"Step",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",description:"Split an array into chunks",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Batches")],fields:[m({key:"field",label:"Array field",type:"text",placeholder:"items"}),m({key:"size",label:"Batch size",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch."})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",description:"Route failures to an error branch",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",description:"Execute another workflow",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"workflow",label:"Workflow JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute."})],defaultConfig:{}},{type:"comment",label:"Comment",description:"Canvas note; not executed",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[m({key:"text",label:"Text",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",description:"Run a custom activity or handler",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[m({key:"result",label:"Result",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node."})],defaultConfig:{}}],so=0;function tr(s){if(s===null||typeof s!="object")return s;try{return JSON.parse(JSON.stringify(s))}catch{return s}}var N=class{constructor(){this.definitions=new Map,this._revision=0,er.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(o=>({...o})),outputs:(e.outputs||[]).map(o=>({...o})),fields:(e.fields||[]).map(o=>({...o})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let o={...t.defaultConfig||{}};return(t.fields||[]).forEach(r=>{r.defaultValue!==void 0&&o[r.key]===void 0&&(o[r.key]=tr(r.defaultValue))}),o}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let o of this.definitions.values())e.has(o.category)||(e.add(o.category),t.push(o.category));return t}palette(e="zh-CN",t){return this.categories().map(o=>({id:o,label:x(t,e,`workflow.category.${o}`,Xo[o]),items:this.list().filter(r=>r.category===o).map(r=>this.paletteItem(r,e,t))}))}paletteItem(e,t="zh-CN",o){return{type:e.type,label:this.nodeLabel(e.type,t,o),description:this.nodeDescription(e.type,t,o),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",o){let r=this.get(e);return r?x(o,t,`workflow.node.${e}.label`,r.label):e}nodeDescription(e,t="zh-CN",o){let r=this.get(e);return r?x(o,t,`workflow.node.${e}.description`,r.description||r.label):""}createNode(e,t,o={}){let r=this.get(e);if(!r)throw new Error(`Unknown workflow node type: ${e}`);return{id:o.id||this.nextId(e),name:o.name||r.label,type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:Zo,height:Qo},description:r.description,inputs:r.inputs.map(a=>({...a})),outputs:r.outputs.map(a=>({...a})),config:{...r.defaultConfig||{},...o.config||{}},style:{backgroundColor:r.color,textColor:r.textColor||"#ffffff",borderColor:r.color,borderRadius:e==="start"||e==="end"?50:10,icon:r.icon},activityType:r.activityType,pluginId:r.pluginId,requiresServer:r.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return so+=1,`${e}_${so}`}};Reflect.metadata("design:paramtypes",[])(N);w(N,[[A(),0]]);function D(s,e){if(typeof s=="function")return s(e);if(s==null||typeof s!="string")return s;let t=s.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let o=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),r=e;for(let i of o){if(r==null)return;r=r[i]}return r}function io(s,e,t){switch(e){case"equals":return s==t;case"not-equals":return s!=t;case"gt":return Number(s)>Number(t);case"lt":return Number(s)<Number(t);case"gte":return Number(s)>=Number(t);case"lte":return Number(s)<=Number(t);case"truthy":default:return!!s}}function or(s,e){let t=s?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!D(t.condition,e);if(t.field!==void 0){let o=D(t.field,e);return io(o,String(t.operator||"truthy"),t.value)}return!0}function rr(s,e){let t=s?.config||{};if(t.field!==void 0)return D(t.field,e);if(t.value!==void 0)return D(t.value,e)}function H(s){if(typeof s!="string")return s;try{return JSON.parse(s)}catch{return s}}function He(s,e){if(!e)return s;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),o=s;for(let r of t){if(o==null)return;o=o[r]}return o}function Be(s,e){let t=e?D(e,s):s.items??s.value;return Array.isArray(t)?t:[]}function sr(s,e){return String(s??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,o)=>String(D(o,e)??""))}function ir(s){return String(s||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function ar(s,e,t,o){let r=ir(e);if(!r.length)return t==="set"&&o&&typeof o=="object"?(Object.assign(s,o),o):void 0;let i=s;for(let n=0;n<r.length-1;n++){let l=r[n];(i[l]===void 0||i[l]===null)&&(i[l]={}),i=i[l]}let a=r[r.length-1];if(t==="delete"){let n=i[a];return delete i[a],n}if(t==="append"){let n=i[a];return Array.isArray(n)?(n.push(o),n):(i[a]=n==null?[o]:`${n}${o}`,i[a])}return i[a]=o,o}function nr(s,e,t){let o=[],r=[],i="",a=!1,n=String(s??"");for(let d=0;d<n.length;d++){let c=n[d];a?c==='"'?n[d+1]==='"'?(i+='"',d++):a=!1:i+=c:c==='"'?a=!0:c===e?(r.push(i),i=""):c===`
`?(r.push(i),o.push(r),r=[],i=""):c!=="\r"&&(i+=c)}if((i||r.length)&&(r.push(i),o.push(r)),!t||!o.length)return o;let l=o[0];return o.slice(1).map(d=>{let c={};return l.forEach((p,h)=>{c[p]=d[h]??""}),c})}function lr(s,e){let t=Array.isArray(s)?s:[];if(!t.length)return"";let o=r=>{let i=r==null?"":String(r);return/["\n\r]/.test(i)||i.includes(e)?`"${i.replace(/"/g,'""')}"`:i};if(!Array.isArray(t[0])){let r=Object.keys(t[0]||{});return[r.map(o).join(e),...t.map(i=>r.map(a=>o(i?.[a])).join(e))].join(`
`)}return t.map(r=>r.map(o).join(e)).join(`
`)}function dr(s){let e=s.activityType;if(e)try{let t=new e;return Object.assign(t,s.config||{}),t}catch{return}}async function cr(s,e){let t=s.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${s.name}" failed`)),data:{nodeId:s.id,failed:!0}};let o=t.action,r=e.actions||{};if(typeof o=="function")return{success:!0,data:{nodeId:s.id,result:await o(e)}};if(typeof o=="string"&&o&&typeof r[o]=="function")return{success:!0,data:{nodeId:s.id,result:await r[o](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:s.id,result:await t.execute(e)}};if(t.result!==void 0){let i=H(t.result);return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:i}}}return{success:!0,data:{nodeId:s.id,config:t}}}function Ue(s){return s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}function ur(s){let e={},t=[e],o=/<([^>]+)>/g,r=0,i;for(;i=o.exec(s);){let a=s.slice(r,i.index).trim();if(a){let y=t[t.length-1];y["#text"]=y["#text"]?`${y["#text"]} ${Ue(a)}`:Ue(a)}let n=i[1].trim();if(r=o.lastIndex,n.startsWith("?")||n.startsWith("!"))continue;if(n.startsWith("/")){t.length>1&&t.pop();continue}let l=n.endsWith("/");l&&(n=n.slice(0,-1).trim());let d=(n.match(/^([^\s/]+)/)||[])[1]||n,c={},p=/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,h;for(;h=p.exec(n);)c[h[1]]=Ue(h[2]??h[3]??"");let f=Object.keys(c).length?{"@attrs":c}:{},b=t[t.length-1];b[d]===void 0?b[d]=f:Array.isArray(b[d])?b[d].push(f):b[d]=[b[d],f],l||t.push(f)}return e}function _t(s,e,t,o=0){let r=t?"  ".repeat(o):"",i=t?`
`:"";if(Array.isArray(e))return e.map(c=>_t(s,c,t,o)).join(i);if(e==null||typeof e!="object")return`${r}<${s}>${String(e??"")}</${s}>${i}`;let a=e["@attrs"],n=a?Object.entries(a).map(([c,p])=>` ${c}="${String(p).replace(/"/g,"&quot;")}"`).join(""):"",l=e["#text"]===void 0?"":String(e["#text"]),d=Object.entries(e).filter(([c])=>c!=="@attrs"&&c!=="#text").map(([c,p])=>_t(c,p,t,o+1)).join("");return!l&&!d?`${r}<${s}${n}/>${i}`:`${r}<${s}${n}>${i}${d}${l?r+(t?"  ":"")+l+i:""}${r}</${s}>${i}`}function pr(s){return Ue(s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())}function fr(s){let e=[],t=/(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,o;for(;o=t.exec(s);){let r=Ue(o[1]??o[2]??"");r&&!e.includes(r)&&e.push(r)}return e}async function hr(s,e){let t=s.config||{},o=D(t.url,e),r=typeof t.url=="string"?t.url.trim():"",i=o||(/^[a-z][a-z0-9+.-]*:/i.test(r)?r:o);if(!i)return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No URL configured"}};let a=globalThis.fetch;if(typeof a!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:s.id}};try{let n=H(t.headers)||{};if(String(t.authType||"none")==="basic"&&t.username){let h=`${t.username}:${t.password||""}`,f=typeof btoa=="function"?btoa(h):globalThis.Buffer?.from(h).toString("base64")||"";n.Authorization=`Basic ${f}`}let l=await a(String(i),{method:String(t.method||"GET").toUpperCase(),headers:Object.keys(n).length?n:void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),d=await l.text(),c=String(t.responseType||"auto"),p=d;if(c!=="text")try{p=d?JSON.parse(d):null}catch(h){if(c==="json")return{success:!1,error:new Error(`Invalid JSON response: ${h.message}`),data:{nodeId:s.id,status:l.status}};p=d}return{success:l.ok,error:l.ok?void 0:new Error(`HTTP ${l.status}`),data:{nodeId:s.id,status:l.status,body:p}}}catch(n){return{success:!1,error:n,data:{nodeId:s.id}}}}async function Ke(s,e,t){let o=s.config||{};if(t?.executeNode){let i=await t.executeNode(s,e);if(i)return i}let r=dr(s);if(r)return r.execute(e);switch(s.type){case"start":return{success:!0,data:{nodeId:s.id,started:!0}};case"end":return{success:!0,data:{nodeId:s.id,completed:!0}};case"task":return cr(s,e);case"condition":return{success:!0,data:{nodeId:s.id,condition:or(s,e)}};case"switch":return{success:!0,data:{nodeId:s.id,condition:rr(s,e)}};case"delay":{let i=String(o.mode||"fixed"),a=String(o.unit||"ms"),n=a==="s"?1e3:a==="min"?6e4:1,l=Math.max(0,Number(o.delay??o.duration??0)||0)*n;if(i==="random"){let d=Math.max(0,Number(o.randomMin)||0)*n,c=Math.max(d,(Number(o.randomMax)||0)*n||d);l=d+Math.random()*(c-d)}return await new Promise(d=>setTimeout(d,l)),{success:!0,data:{nodeId:s.id,delayed:l,mode:i}}}case"loop":{let i=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0));return{success:!0,data:{nodeId:s.id,iterations:i}}}case"log":case"debug":{if(s.type==="debug"&&o.active===!1)return{success:!0,data:{nodeId:s.id,skipped:!0}};let i=String(o.level||"info"),a=o.field===void 0||o.field===null?"":String(o.field).trim(),n=o.complete===!0?{...e}:D(a||o.message,e),l;if(n!==null&&typeof n=="object")try{l=JSON.stringify(n)}catch{l=String(n)}else l=String(n??"");let d=e.logger;return d&&typeof d[i]=="function"&&d[i](l),s.type==="debug"&&o.console===!0&&typeof console<"u"&&(console[i]||console.log).call(console,l),{success:!0,data:{nodeId:s.id,level:i,message:l}}}case"http-request":return hr(s,e);case"inject":{let i=String(o.payloadType||"json"),a;i==="string"?a=o.payload===void 0||o.payload===null?"":String(o.payload):i==="number"?a=Number(o.payload):i==="boolean"?a=o.payload===!0||o.payload==="true"||o.payload===1||o.payload==="1":a=H(o.payload??{});let n=o.topic===void 0||o.topic===null?"":String(o.topic),l=n?{topic:n}:{};return a&&typeof a=="object"&&!Array.isArray(a)?{success:!0,data:{...l,...a,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,...l,payload:a}}}case"trigger":{let i=Math.max(0,Number(o.delay)||0);await new Promise(n=>setTimeout(n,i));let a=H(o.payload??{});return a&&typeof a=="object"&&!Array.isArray(a)?{success:!0,data:{...a,nodeId:s.id,triggered:!0}}:{success:!0,data:{nodeId:s.id,triggered:!0,payload:a}}}case"function":try{let i=String(o.code||"return input;"),n=await new Function("context","input","msg",`"use strict"; return (async () => { ${i}
 })();`)(e,e,{...e});return n&&typeof n=="object"&&!Array.isArray(n)?{success:!0,data:{...n,nodeId:s.id}}:{success:!0,data:{nodeId:s.id,result:n}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"template":{let i=String(o.template??""),n=String(o.syntax||"mustache")==="plain"?i:sr(i,e),l=String(o.output||"text"),d=n;if(l==="json")try{d=n.trim()?JSON.parse(n):null}catch(p){return{success:!1,error:new Error(`Invalid JSON template output: ${p.message}`),data:{nodeId:s.id}}}let c=String(o.target||"message");return{success:!0,data:{nodeId:s.id,[c]:d,value:d}}}case"json":{let i=D(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let n=JSON.stringify(i,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:s.id,value:n,json:n}}}try{let n=typeof i=="string"?JSON.parse(i):i;return{success:!0,data:n&&typeof n=="object"&&!Array.isArray(n)?{...n,nodeId:s.id,value:n}:{nodeId:s.id,value:n}}}catch(n){return{success:!1,error:n,data:{nodeId:s.id}}}}case"csv":{let i=D(o.field||"value",e),a=String(o.delimiter??",");try{if(String(o.mode||"parse")==="stringify"){let l=lr(i,a);return{success:!0,data:{nodeId:s.id,value:l}}}let n=nr(String(i??""),a,o.header!==!1);return{success:!0,data:{nodeId:s.id,value:n,items:n,count:n.length}}}catch(n){return{success:!1,error:n,data:{nodeId:s.id}}}}case"change":try{let i=Array.isArray(o.rules)&&o.rules.length?o.rules:[{action:o.action,field:o.field,value:o.value}],a=[];for(let n of i)n?.field&&(ar(e,n.field,String(n.action||"set"),H(n.value)),a.push(n.field));return{success:!0,data:{nodeId:s.id,field:i[0]?.field,value:e,changed:a.length>0,rules:a}}}catch(i){return{success:!1,error:i,data:{nodeId:s.id}}}case"statistics":{let i=Be(e,o.field),a=i.map(p=>He(p,o.path)).filter(p=>p!=null),n=a.map(Number).filter(p=>Number.isFinite(p)),l=String(o.operation||"count"),d=a.length;l==="sum"?d=n.reduce((p,h)=>p+h,0):l==="avg"?d=n.length?n.reduce((p,h)=>p+h,0)/n.length:0:l==="min"?d=n.length?Math.min(...n):0:l==="max"&&(d=n.length?Math.max(...n):0);let c=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[c]:d,value:d,count:i.length}}}case"merge":{let a=String(o.fields||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>D(d,e)),n=String(o.mode||"object")==="array"?a.reduce((d,c)=>d.concat(Array.isArray(c)?c:[c]),[]):Object.assign({},...a.filter(d=>d&&typeof d=="object"&&!Array.isArray(d))),l=String(o.resultField||"value");return{success:!0,data:{nodeId:s.id,[l]:n,value:n}}}case"event-emit":{let i=String(o.event||"workflow.event"),a=H(o.payload),n=e.eventBus||e.events;return n&&typeof n.emit=="function"?(n.emit(i,a),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:a}}):typeof e.emit=="function"?(e.emit(i,a),{success:!0,data:{nodeId:s.id,event:i,emitted:!0,payload:a}}):{success:!0,data:{nodeId:s.id,event:i,emitted:!1,payload:a}}}case"event-wait":{let i=String(o.event||"workflow.event"),a=Math.max(0,Number(o.timeout)||0),n=e.eventBus||e.events;try{if(n&&typeof n.wait=="function"){let l=await n.wait(i,a);return{success:!0,data:{nodeId:s.id,event:i,value:l,waited:!0}}}if(typeof e.waitEvent=="function"){let l=a?await Promise.race([Promise.resolve(e.waitEvent(i)),new Promise(d=>setTimeout(()=>d(void 0),a))]):await e.waitEvent(i);return{success:!0,data:{nodeId:s.id,event:i,value:l,waited:!0}}}return{success:!0,data:{nodeId:s.id,event:i,waited:!1}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id,event:i}}}}case"command":{let i=String(o.command||""),a=H(o.args),n=e.exec||e.runCommand||e.commands?.[i];if(typeof n=="function")try{let l=await n(i,a,e);return{success:!0,data:l&&typeof l=="object"?{...l,nodeId:s.id,command:i}:{nodeId:s.id,command:i,result:l}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id,command:i}}}return{success:!0,data:{nodeId:s.id,command:i,skipped:!0,args:a}}}case"split":{let i=D(o.field||"items",e),a=Array.isArray(i)?i:typeof i=="string"?i.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"map":{let a=Be(e,o.field).map(n=>He(n,o.path));return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"filter":{let a=Be(e,o.field).filter(n=>{let l=He(n,o.path);return io(l,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:s.id,items:a,count:a.length}}}case"sort":{let i=Be(e,o.field).slice(),a=String(o.order||"asc")==="desc"?-1:1;return i.sort((n,l)=>{let d=He(n,o.path),c=He(l,o.path);return typeof d=="number"&&typeof c=="number"?(d-c)*a:String(d??"").localeCompare(String(c??""))*a}),{success:!0,data:{nodeId:s.id,items:i,count:i.length}}}case"range":{let i=Number(o.from??0),a=Number(o.to??10),n=Math.max(1,Math.abs(Number(o.step??1))||1),l=[];for(let d=i;d<a;d+=n)l.push(d);return{success:!0,data:{nodeId:s.id,items:l,count:l.length}}}case"batch":{let i=Be(e,o.field),a=Math.max(1,Number(o.size)||10),n=Math.max(0,Math.min(a-1,Number(o.overlap)||0)),l=Math.max(1,a-n),d=[];for(let c=0;c<i.length&&!(n>0&&i.length-c<=n);c+=l)d.push(i.slice(c,c+a));return{success:!0,data:{nodeId:s.id,items:d,count:d.length}}}case"comment":return{success:!0,data:{nodeId:s.id,comment:!0}};case"assign":{let i=H(o.values??o.data??{}),a={...e.variables||{},...i&&typeof i=="object"?i:{}};return e.variables=a,{success:!0,data:{nodeId:s.id,variables:a}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:s.id,result:H(o.result)}};let i=H(o.mapping);if(i&&typeof i=="object"){let a={};return Object.keys(i).forEach(n=>{a[n]=D(i[n],e)}),{success:!0,data:{nodeId:s.id,result:a}}}return{success:!0,data:{nodeId:s.id,result:e}}}case"junction":case"sequence":return{success:!0,data:{nodeId:s.id}};case"link":return{success:!0,data:{nodeId:s.id,links:String(o.links||"").split(",").map(i=>i.trim()).filter(Boolean)}};case"html":{let i=String(D(o.field||"value",e)??""),a=String(o.mode||"text"),n=String(o.tag||"").trim(),l=[];if(n){let f=new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`,"gi"),b;for(;b=f.exec(i);)l.push(b[1])}let c=(n?l:[i]).map(f=>a==="links"?fr(f):pr(f)),p=n?c.length<=1?c[0]||(a==="links"?[]:""):c:c[0],h=String(o.target||"value");return{success:!0,data:{nodeId:s.id,[h]:p,value:p}}}case"xml":{let i=D(o.field||"value",e),a=String(o.mode||"parse"),n=String(o.target||"value");try{if(a==="stringify"){let d=typeof i=="string"?JSON.parse(i):i,c=Object.keys(d||{})[0]||"root",p=_t(c,d?.[c],o.pretty===!0).trim();return{success:!0,data:{nodeId:s.id,[n]:p,value:p}}}let l=ur(String(i??""));return{success:!0,data:{nodeId:s.id,[n]:l,value:l}}}catch(l){return{success:!1,error:l,data:{nodeId:s.id}}}}case"parallel":return{success:!0,data:{nodeId:s.id,parallel:!0}};case"join":return{success:!0,data:{nodeId:s.id,joined:!0}};case"trycatch":return{success:!0,data:{nodeId:s.id,guarded:!0}};case"subprocess":{let i=H(o.workflow);if(i&&t?.executeDefinition){let a=await t.executeDefinition(i,e);return{success:a.success,data:{nodeId:s.id,subprocess:a.data},error:a.error}}return{success:!0,data:{nodeId:s.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:s.id,result:await o.execute(e)}}:s.requiresServer?{success:!1,error:new Error(`Node type "${s.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:s.id,type:s.type,pluginId:s.pluginId}}:{success:!0,data:{nodeId:s.id,type:s.type,result:H(o.result)}}}}function ge(s){let e=[];if(s?.id||e.push("Workflow ID is required"),s?.name||e.push("Workflow name is required"),!s?.nodes||s.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,o=[];for(let r of s.nodes)r.id?t.has(r.id)&&o.push(r.id):e.push("Every node requires an id"),t.add(r.id);o.length&&e.push(`Duplicate node IDs found: ${[...new Set(o)].join(", ")}`);for(let r of s.connections||[])t.has(r.sourceNodeId)||e.push(`Connection references non-existent source node: ${r.sourceNodeId}`),t.has(r.targetNodeId)||e.push(`Connection references non-existent target node: ${r.targetNodeId}`),r.sourceNodeId===r.targetNodeId&&e.push(`Connection cannot link a node to itself: ${r.sourceNodeId}`);return Mt(s)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function Mt(s){let e=new Set,t=new Set,o=new Map;for(let i of s.nodes||[])o.set(i.id,[]);for(let i of s.connections||[]){let a=o.get(i.sourceNodeId);a&&a.push(i.targetNodeId)}let r=i=>{if(e.has(i))return!0;if(t.has(i))return!1;e.add(i);for(let a of o.get(i)||[])if(r(a))return!0;return e.delete(i),t.add(i),!1};for(let i of o.keys())if(r(i))return!0;return!1}function ao(s){let e=s?.nodes||[],t=new Set((s?.connections||[]).map(i=>i.targetNodeId)),o=[],r=i=>{o.includes(i)||o.push(i)};return e.filter(i=>i.type==="start").forEach(r),e.filter(i=>i.type==="inject").forEach(r),e.filter(i=>!t.has(i.id)).forEach(r),o}function ye(s){return s==null||s===""||Array.isArray(s)&&s.length===0}function no(...s){let e=s.filter(Boolean).reduce((t,o)=>({...t,...o}),{});return Object.keys(e).length?e:null}var te={required(s){return ye(s.value)?{required:!0}:null},requiredTrue(s){return s.value===!0?null:{required:!0}},email(s){return ye(s.value)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s.value))?null:{email:!0}},minLength(s){return e=>ye(e.value)||String(e.value).length>=s?null:{minlength:{requiredLength:s,actualLength:String(e.value).length}}},maxLength(s){return e=>ye(e.value)||String(e.value).length<=s?null:{maxlength:{requiredLength:s,actualLength:String(e.value).length}}},pattern(s){let e=s instanceof RegExp?s:new RegExp(s);return t=>ye(t.value)?null:(e.lastIndex=0,e.test(String(t.value))?null:{pattern:{requiredPattern:e.toString(),actualValue:t.value}})},min(s){return e=>ye(e.value)||Number(e.value)>=s?null:{min:{min:s,actual:e.value}}},max(s){return e=>ye(e.value)||Number(e.value)<=s?null:{max:{max:s,actual:e.value}}},nullValidator(){return null},compose(s){return e=>no(...s.filter(t=>typeof t=="function").map(t=>t(e)))},composeAsync(s){return async e=>{let t=await Promise.all(s.filter(o=>typeof o=="function").map(o=>o(e)));return no(...t)}}};function Ge(s){return s==null?[]:Array.isArray(s)?s:[s]}var Ye=class{constructor(e,t){this._status="VALID",this._errors=null,this._validators=[],this._asyncValidators=[],this._asyncSequence=0,this.valueChanges=new St,this.statusChanges=new St,this.touched=!1,this.dirty=!1,this._validators=Ge(e),this._asyncValidators=Ge(t)}get value(){return this._value}get status(){return this._status}get errors(){return this._errors}get valid(){return this._status==="VALID"}get invalid(){return this._status==="INVALID"}get pending(){return this._status==="PENDING"}get disabled(){return this._status==="DISABLED"}get parent(){return this._parent}setParent(e){this._parent=e}patchValue(e,t){this.setValue(e,t)}setValidators(e){this._validators=Ge(e),this.updateValueAndValidity()}addValidators(e){this._validators=[...this._validators,...Ge(e)],this.updateValueAndValidity()}clearValidators(){this._validators=[],this.updateValueAndValidity()}setAsyncValidators(e){this._asyncValidators=Ge(e),this.updateValueAndValidity()}markAsTouched(){this.touched=!0}markAsUntouched(){this.touched=!1}markAsDirty(){this.dirty=!0}markAsPristine(){this.dirty=!1}markAllAsTouched(){this.markAsTouched()}reset(e,t={emitEvent:!0}){this.markAsPristine(),this.markAsUntouched(),this.setValue(e,t)}disable(e={emitEvent:!0}){this.setDisabled(!0,e)}enable(e={emitEvent:!0}){this.setDisabled(!1,e)}setDisabled(e,t){if(this._status=e?"DISABLED":"VALID",e)this._errors=null;else{this.updateValueAndValidity(t);return}t.emitEvent!==!1&&this.statusChanges.emit(this._status)}updateValueAndValidity(e={emitEvent:!0}){if(this._status==="DISABLED"){this._errors=null,e.emitEvent!==!1&&this.statusChanges.emit(this._status);return}let t=this.runSyncValidators();if(this._asyncValidators.length){this._status="PENDING",this._errors=t,e.emitEvent!==!1&&this.statusChanges.emit(this._status);let o=++this._asyncSequence;Promise.all(this._asyncValidators.map(r=>r(this))).then(r=>{o===this._asyncSequence&&(this._errors=this.mergeErrors(t,...r),this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))}).catch(()=>{o===this._asyncSequence&&(this._errors={...t||{},async:!0},this._status="INVALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))});return}this._errors=t,this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e)}notifyParent(e){!e.onlySelf&&this._parent&&this._parent.updateValueAndValidity({...e,onlySelf:!1})}runSyncValidators(){return this.mergeErrors(...this._validators.map(e=>e(this)))}mergeErrors(...e){let t=e.filter(Boolean).reduce((o,r)=>({...o,...r}),{});return Object.keys(t).length?t:null}},be=class extends Ye{constructor(e=null,t,o){let r=Dt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this._value=e,this.updateValueAndValidity({emitEvent:!1})}setValue(e,t={emitEvent:!0}){this._value=e,t.emitEvent!==!1&&this.valueChanges.emit(e),this.updateValueAndValidity(t)}reset(e=null,t={emitEvent:!0}){super.reset(e,t)}},ke=class extends Ye{constructor(e={},t,o){let r=Dt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this.controls=e,Object.values(e).forEach(i=>i.setParent(this)),this._value=this.reduceValue(),this.updateValueAndValidity({emitEvent:!1})}get(e){let t=String(e||"").split(".").filter(Boolean),o=this;for(let r of t){if(!o)return null;o=o.controls?.[r]}return o||null}addControl(e,t){t.setParent(this),this.controls[e]=t,this.updateValueAndValidity()}removeControl(e){this.controls[e]&&(delete this.controls[e],this.updateValueAndValidity())}setControl(e,t){this.controls[e]&&(this.controls[e]=t,t.setParent(this),this.updateValueAndValidity())}contains(e){return!!this.controls[e]}updateValueAndValidity(e={emitEvent:!0}){this._value=this.reduceValue(),super.updateValueAndValidity(e)}setValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(o=>this.controls[o].setValue(e?.[o],{emitEvent:!1,onlySelf:!0})),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}patchValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(o=>{e&&o in e&&this.controls[o].setValue(e[o],{emitEvent:!1,onlySelf:!0})}),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}reset(e={},t={emitEvent:!0}){super.reset(e,t)}markAllAsTouched(){this.markAsTouched(),Object.values(this.controls).forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=Object.keys(this.controls).reduce((t,o)=>{let r=this.controls[o].errors;return r&&(t[o]=r),t},{});return this.mergeErrors(super.runSyncValidators(),Object.keys(e).length?e:null)}reduceValue(){return Object.keys(this.controls).reduce((e,t)=>(e[t]=this.controls[t].value,e),{})}},Xe=class extends Ye{constructor(e=[],t,o){let r=Dt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this.controls=[...e],this.controls.forEach(i=>i.setParent(this)),this._value=this.controls.map(i=>i.value),this.updateValueAndValidity({emitEvent:!1})}updateValueAndValidity(e={emitEvent:!0}){this._value=this.controls.map(t=>t.value),super.updateValueAndValidity(e)}at(e){return this.controls[e]||null}push(e){e.setParent(this),this.controls.push(e),this.updateValueAndValidity()}removeAt(e){this.controls.splice(e,1),this.updateValueAndValidity()}clear(){this.controls.length=0,this.updateValueAndValidity()}setValue(e,t={emitEvent:!0}){this.controls.forEach((o,r)=>o.setValue(e?.[r],{emitEvent:!1,onlySelf:!0})),this._value=this.controls.map(o=>o.value),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}markAllAsTouched(){this.markAsTouched(),this.controls.forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=this.controls.some(t=>t.errors)?{children:this.controls.map(t=>t.errors)}:null;return this.mergeErrors(super.runSyncValidators(),e)}};function Dt(s){return!!s&&typeof s=="object"&&!Array.isArray(s)&&("validators"in s||"asyncValidators"in s)}var Ee=class{control(e=null,t,o){return new be(e,t,o)}group(e,t,o){let r={};return Object.keys(e).forEach(i=>{let a=e[i];r[i]=Array.isArray(a)?this.control(a[0],a[1],a[2]):a instanceof be||a instanceof ke||a instanceof Xe?a:this.control(a)}),new ke(r,t,o)}array(e,t,o){let r=e.map(i=>Array.isArray(i)?this.control(i[0],i[1],i[2]):i);return new Xe(r,t,o)}};w(Ee,[[A(),0]]);var oe=class{constructor(e){this.elementRef=e,this.handleInput=()=>{if(!this.control)return;let o=this.elementRef.nativeElement?.value;this.control.setValue(o),this.control.markAsDirty(),this.control.markAsTouched()};let t=this.elementRef?.nativeElement;t?.addEventListener?.("input",this.handleInput),t?.addEventListener?.("change",this.handleInput)}set formControl(e){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe(),this.control=e,e&&(this.writeValue(e.value),this.subscription=e.valueChanges.subscribe(t=>this.writeValue(t)),this.statusSubscription=e.statusChanges.subscribe(()=>this.syncValidity()),this.syncValidity())}get formControl(){return this.control}onDestroy(){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe();let e=this.elementRef?.nativeElement;e?.removeEventListener?.("input",this.handleInput),e?.removeEventListener?.("change",this.handleInput)}writeValue(e){let t=this.elementRef?.nativeElement;t&&t.value!==e&&(t.value=e??"")}syncValidity(){let e=this.elementRef?.nativeElement,t=!!this.control?.invalid;e?.setAttribute?.("aria-invalid",t?"true":"false"),t?e?.classList?.add?.("is-invalid"):e?.classList?.remove?.("is-invalid")}};Reflect.metadata("design:paramtypes",[V])(oe);Reflect.metadata("design:paramtypes",[Object])(oe.prototype,"formControl");w(oe,[[u(),1,"formControl"],[Ct({selector:"[formControl]"}),0]]);var de=class{set formGroup(e){this.group=e}get formGroup(){return this.group}get value(){return this.group?.value}get valid(){return this.group?.valid!==!1}};Reflect.metadata("design:paramtypes",[Object])(de.prototype,"formGroup");w(de,[[u(),1,"formGroup"],[Ct({selector:"[formGroup]"}),0]]);var Le=class{};w(Le,[[$({providers:[Ee,oe,de],declarations:[oe,de],exports:[Ee,oe,de]}),0]]);var mr={required:"Required",requiredTrue:"Required",email:"Invalid email address",url:"Invalid URL",min:"Value is too small",max:"Value is too large",minlength:"Too short",maxlength:"Too long",pattern:"Invalid format",json:"Invalid JSON",number:"Must be a number",integer:"Must be an integer",color:"Use a hex color such as #2563eb",regex:"Invalid regular expression",minItems:"Too few items",maxItems:"Too many items"};function Oe(s){return s==null||s===""||Array.isArray(s)&&s.length===0}function wr(s){return Oe(s.value)||Number.isFinite(Number(s.value))?null:{number:!0}}function gr(s){if(Oe(s.value))return null;let e=Number(s.value);return Number.isFinite(e)&&Math.floor(e)===e?null:{integer:!0}}function yr(s){return Oe(s.value)||/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s.value))?null:{color:!0}}function br(s){if(Oe(s.value))return null;try{return new RegExp(String(s.value)),null}catch{return{regex:!0}}}function lo(s,e){return t=>{if(!Array.isArray(t.value))return null;let o=t.value.length;return s==="minItems"&&o<e?{minItems:{required:e,actual:o}}:s==="maxItems"&&o>e?{maxItems:{required:e,actual:o}}:null}}function kr(s){return Oe(s.value)||/^(https?:\/\/|\/)[^\s]+$/i.test(String(s.value))?null:{url:!0}}function vr(s){if(Oe(s.value)||typeof s.value!="string")return null;try{return JSON.parse(s.value),null}catch{return{json:!0}}}function xr(s){let e=[],t=new Set,o=r=>{t.has(r.type)||(t.add(r.type),e.push(r))};return(s.rules||[]).forEach(r=>{o(typeof r=="string"?{type:r}:r)}),s.required&&o({type:"required"}),(s.type==="number"||s.type==="range")&&o({type:"number"}),s.type==="email"&&o({type:"email"}),s.type==="url"&&o({type:"url"}),s.type==="json"&&o({type:"json"}),s.type==="color"&&o({type:"color"}),s.min!==void 0&&o({type:"min",value:s.min}),s.max!==void 0&&o({type:"max",value:s.max}),s.minLength!==void 0&&o({type:"minLength",value:s.minLength}),s.maxLength!==void 0&&o({type:"maxLength",value:s.maxLength}),s.pattern&&o({type:"pattern",value:s.pattern}),s.minItems!==void 0&&o({type:"minItems",value:s.minItems}),s.maxItems!==void 0&&o({type:"maxItems",value:s.maxItems}),e}function Sr(s){switch(s.type){case"required":return te.required;case"requiredTrue":return te.requiredTrue;case"email":return te.email;case"url":return kr;case"min":return te.min(Number(s.value));case"max":return te.max(Number(s.value));case"minLength":return te.minLength(Number(s.value));case"maxLength":return te.maxLength(Number(s.value));case"pattern":try{return te.pattern(new RegExp(String(s.value)))}catch{return}case"json":return vr;case"color":return yr;case"regex":return br;case"minItems":return lo("minItems",Number(s.value));case"maxItems":return lo("maxItems",Number(s.value));case"number":return wr;case"integer":return gr;default:return}}function zt(s){let e=[],t={};return xr(s).forEach(o=>{let r=Sr(o);if(r&&(e.push(r),o.message)){let i=o.type==="minLength"?"minlength":o.type==="maxLength"?"maxlength":o.type;t[i]=o.message}}),{validators:e,messages:t}}function Pt(s,e,t,o){if(!e)return"";let r=Object.keys(e);for(let i of r){let a=s.errorMessages?.[i]||t?.[i]||o?.[i]||mr[i];if(a)return a}return""}function jt(s,e={},t){let o=Array.isArray(s)?s:s?.fields||[],r=[];for(let i of o){let a={value:e?.[i.key]},n=zt(i),l={};for(let d of n.validators){let c=d(a);c&&Object.assign(l,c)}Object.keys(l).length&&r.push({key:i.key,errors:l,message:Pt(i,l,n.messages,t)})}return{valid:r.length===0,issues:r}}function Cr(s){return{...s,key:String(s?.key??""),type:s?.type||"text",options:Array.isArray(s?.options)?s.options:void 0,rules:Array.isArray(s?.rules)?s.rules:void 0}}function Rr(s){let e=s;return typeof e=="string"&&(e=JSON.parse(e)),Array.isArray(e)&&(e={fields:e}),!e||typeof e!="object"?{fields:[]}:{...e,fields:(Array.isArray(e.fields)?e.fields:[]).filter(t=>t&&t.key).map(Cr)}}function Ir(s,e){return e.equals!==void 0?String(s)===String(e.equals):e.notEquals!==void 0?String(s)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(s)):e.truthy!==void 0?e.truthy?!!s:!s:e.falsy!==void 0?e.falsy?!s:!!s:!0}function Ar(s,e){return!!s&&Object.prototype.hasOwnProperty.call(s,e)}var Tr=0,E=class{constructor(){this.classPrefix="df",this.showActions=!1,this.submitLabel="",this.resetLabel="",this.resetFieldLabel="Reset to default",this.emptyLabel="No fields",this.messages={},this._schema={fields:[]},this._value={},this._contextKey="",this.formSignature="",this.schemaSignature="",this.valueSignature="",this.schemaError="",this.validationErrors={},this.ruleMessages={},this.submitAttempted=!1,this.valueVersion=0,this.destroyed=!1,this.syncQueued=!1,this.syncMode="none",this.formId=`dynamic-form-${++Tr}`}set schema(e){let t,o="";try{t=Rr(e)}catch(i){t={fields:[]},o=`Invalid form schema: ${i.message}`}let r=JSON.stringify(t);r===this.schemaSignature&&o===this.schemaError||(this.schemaSignature=r,this.schemaError=o,this._schema=t,Promise.resolve().then(()=>{this.destroyed||this.applySchema()}))}get schema(){return this._schema}set value(e){let t=e&&typeof e=="object"?e:{},o=JSON.stringify(t);o!==this.valueSignature&&(this.valueSignature=o,this._value=t,this.scheduleSync(!1))}get value(){return this._value}set contextKey(e){let t=String(e??"");t!==this._contextKey&&(this._contextKey=t,this.scheduleSync(!0))}get contextKey(){return this._contextKey}scheduleSync(e){e?this.syncMode="force":this.syncMode==="none"&&(this.syncMode="soft"),!this.syncQueued&&(this.syncQueued=!0,Promise.resolve().then(()=>{this.syncQueued=!1;let t=this.syncMode;this.syncMode="none",this.destroyed||this.syncValues(t==="force")}))}get submitText(){return this.submitLabel||this._schema?.submitLabel||"Submit"}get resetText(){return this.resetLabel||this._schema?.resetLabel||"Reset"}get formValid(){return!!this.form?.valid}get isDirty(){return!!this.form?.dirty}get visibleGroups(){this.valueVersion;let e=[],t={};return this.schemaFields().forEach(o=>{if(o.hidden||o.type==="hidden"||!this.isVisible(o))return;let r=o.group||this._schema?.defaultGroupLabel||"",i=t[r];i===void 0&&(i=e.length,t[r]=i,e.push({label:r,fields:[]})),e[i].fields.push(o)}),e}schemaFields(){return this._schema?.fields||[]}applySchema(){let e=this.schemaFields(),t=e.map(i=>[i.key,i.type,i.required?1:0,i.defaultValue===void 0?"":JSON.stringify(i.defaultValue),JSON.stringify(i.rules||""),i.min??"",i.max??"",i.minLength??"",i.maxLength??"",i.pattern||""].join(":")).join("|");if(this.form&&t===this.formSignature){this.syncValues(!1);return}let o={};this.ruleMessages={},e.forEach(i=>{let a=zt(i);this.ruleMessages[i.key]=a.messages,o[i.key]=new be(this.initialValue(i),a.validators)});let r=new ke(o);r[U]=!0,Object.values(o).forEach(i=>{i[U]=!0}),this.form=r,this.formSignature=t,this.valueVersion+=1,this.refreshErrors()}syncValues(e){if(!this.form){this.applySchema();return}this.schemaFields().forEach(t=>{let o=this.form?.get(t.key);if(!o)return;let r=this.initialValue(t);e?o.reset(r,{emitEvent:!1}):!o.dirty&&o.value!==r&&o.setValue(r,{emitEvent:!1})}),this.valueVersion+=1,this.refreshErrors()}refreshErrors(){let e={};this.schemaFields().forEach(t=>{e[t.key]=this.form?.get(t.key)?.errors||null}),this.validationErrors=e}fieldDisplayValue(e,t){return e.type==="json"?typeof t=="string"?t:t==null?"":JSON.stringify(t,null,2):e.type==="checkbox"||e.type==="switch"?!!t:t??""}initialValue(e){let t=this._value||{},o=Ar(t,e.key)?t[e.key]:e.defaultValue;return this.fieldDisplayValue(e,o)}resetValue(e){return this.fieldDisplayValue(e,e.defaultValue)}coerceValue(e,t){return e.type==="checkbox"||e.type==="switch"?!!t:e.type==="number"||e.type==="range"?t===""||t===void 0||t===null?"":Number(t):t}updateValue(e,t){let o=this.form?.get(e.key);if(!o)return;o.setValue(this.coerceValue(e,t)),o.markAsDirty(),o.markAsTouched(),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:o.errors};let r={key:e.key,value:o.value,field:e,valid:o.valid,errors:o.errors};this.changeAction?.(r),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}isListInput(e){return e.type==="list"}listIndex(e,t){let o=this.listItems(e).indexOf(t);return o<0?0:o}listItems(e){let t=this.fieldValue(e);return Array.isArray(t)?t:[]}listItemValue(e,t){let o=e?.[t.key];return this.fieldDisplayValue(t,o===void 0?t.defaultValue:o)}listItemChecked(e,t){return e?.[t.key]===!0}isListItemVisible(e,t){let o=e.visibleWhen;if(!o)return!0;let r=t?.[o.key];return o.equals!==void 0?String(r)===String(o.equals):o.notEquals!==void 0?String(r)!==String(o.notEquals):o.in?o.in.map(i=>String(i)).includes(String(r)):o.truthy!==void 0?o.truthy?!!r:!r:o.falsy!==void 0?o.falsy?!r:!!r:!0}listItemError(e,t){let o=this.listItemValue(t,e),r=o==null||o==="";return e.required&&r?this.messages?.required||e.errorMessages?.required||"Required":""}updateList(e,t){let o=[...t],r=e.key;this._value={...this._value||{},[r]:o},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,o)}addListItem(e){let t=this.listItems(e).map(r=>({...r})),o={};(e.itemFields||[]).forEach(r=>{o[r.key]=r.defaultValue!==void 0?r.defaultValue:r.type==="checkbox"||r.type==="switch"?!1:""}),t.push(o),this.updateList(e,t)}removeListItem(e,t){let o=this.listItems(e).map(r=>({...r}));o.splice(t,1),this.updateList(e,o)}changeListItem(e,t,o,r){let i=this.listItems(e).map(n=>({...n})),a=o.type==="checkbox"||o.type==="switch"?!!r?.target?.checked:r?.target?.value;i[t]={...i[t]||{},[o.key]:this.coerceValue(o,a)},this.updateList(e,i)}changeListItemOption(e,t,o,r){let i=this.listItems(e).map(a=>({...a}));i[t]={...i[t]||{},[o.key]:r},this.updateList(e,i)}listClass(){return`${this.classPrefix}-list`}listRowClass(){return`${this.classPrefix}-list-row`}listFieldsClass(){return`${this.classPrefix}-list-fields`}listItemFieldClass(e){return`${this.classPrefix}-list-field`}listAddClass(){return`${this.classPrefix}-list-add`}listRemoveClass(){return`${this.classPrefix}-list-remove`}changeText(e,t){this.updateValue(e,t?.target?.value)}changeBoolean(e,t){this.updateValue(e,!!t?.target?.checked)}chooseOption(e,t){this.updateValue(e,t)}blurField(e){this.blurAction?.(e)}resetField(e){let t=this.form?.get(e.key);t&&(t.reset(this.resetValue(e),{emitEvent:!1}),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:t.errors},this.changeAction?.({key:e.key,value:t.value,field:e,valid:t.valid,errors:t.errors}),this.validityAction?.(!!this.form?.valid,this.form?.errors||null))}reset(e=!0){if(this.schemaFields().forEach(t=>{let o=t.defaultValue!==void 0?this.resetValue(t):this.initialValue(t);this.form?.get(t.key)?.reset(o,{emitEvent:!1})}),this.submitAttempted=!1,this.valueVersion+=1,this.refreshErrors(),e){let t=this.getValue();this.resetAction?.(t),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}return this.getValue()}resetForm(){this.reset(!0)}submit(){this.submitAttempted=!0,this.form?.markAllAsTouched(),this.refreshErrors();let e={value:this.getValue(),valid:!!this.form?.valid,errors:this.form?.errors||null};return this.submitAction?.(e),e}validate(){return{valid:!!this.form?.valid,value:this.getValue(),errors:this.form?.errors||null}}getValue(){let e={};return this.schemaFields().forEach(t=>{let o=this.form?.get(t.key),r=o?o.value:this.initialValue(t);switch(t.type){case"number":case"range":e[t.key]=r===""||r===void 0||r===null?"":Number(r);break;case"checkbox":case"switch":e[t.key]=r===!0;break;case"json":if(typeof r=="string"&&r.trim()!=="")try{e[t.key]=JSON.parse(r)}catch{e[t.key]=r}else e[t.key]=r;break;default:e[t.key]=r;break}}),e}setValue(e){this._value=e&&typeof e=="object"?e:{},this.valueSignature=JSON.stringify(this._value),this.valueVersion+=1,this.syncValues(!0)}patchValue(e){this.setValue({...this._value,...e||{}})}sameOptionValue(e,t){return String(e)===String(t)}isVisible(e){if(!e.visibleWhen)return!0;let t=this.form?.get(e.visibleWhen.key),o=t?t.value:this._value?.[e.visibleWhen.key];return Ir(o,e.visibleWhen)}fieldLabel(e){return e.label||e.key}fieldValue(e){return this.valueVersion,this.form?.get(e.key)?.value??this.initialValue(e)}fieldChecked(e){return this.fieldValue(e)===!0}isRequired(e){return e.required===!0||(e.rules||[]).some(t=>{let o=typeof t=="string"?t:t?.type;return o==="required"||o==="requiredTrue"})}canReset(e){return e.defaultValue!==void 0&&!e.readonly&&!e.disabled}errorFor(e){let t=this.validationErrors[e.key],o=this.form?.get(e.key);if(!o||o.valid||!(o.dirty||o.touched||this.submitAttempted))return"";let r={...this._schema?.messages||{},...this.messages||{}};return Pt(e,t,this.ruleMessages[e.key],r)}encodeValue(e){return encodeURIComponent(String(this.fieldValue(e)??""))}suggestionData(e){return encodeURIComponent(JSON.stringify(e.suggestions||[]))}htmlType(e){switch(e.type){case"number":return"number";case"range":return"range";case"password":case"email":case"url":case"tel":case"search":case"date":case"time":case"datetime-local":case"month":case"week":case"color":return e.type;default:return"text"}}isTextInput(e){return["text","password","email","url","tel","search","date","time","datetime-local","month","week","color"].includes(e.type)}isNumberInput(e){return e.type==="number"||e.type==="range"}isBooleanInput(e){return e.type==="checkbox"||e.type==="switch"}isOptionInput(e){return e.type==="select"||e.type==="radio"}isTextareaInput(e){return e.type==="textarea"||e.type==="json"}isCodeInput(e){return e.type==="code"}formClass(){return`${this.classPrefix}-form dynamic-form`}schemaErrorClass(){return`${this.classPrefix}-schema-error`}groupClass(){return`${this.classPrefix}-field-group`}groupFieldsClass(){return`${this.classPrefix}-fields`}groupTitleClass(){return`${this.classPrefix}-field-group-title`}noFieldsClass(){return`${this.classPrefix}-no-fields`}fieldClass(e){let t=e.span||"full";return[`${this.classPrefix}-field`,t==="half"?"is-half":"is-full",e.fieldClass||""].filter(Boolean).join(" ")}labelRowClass(){return`${this.classPrefix}-field-label-row`}labelClass(){return`${this.classPrefix}-field-label`}requiredClass(){return`${this.classPrefix}-field-required`}resetClass(){return`${this.classPrefix}-field-reset`}inputClass(e){return[`${this.classPrefix}-input`,e.inputClass||""].filter(Boolean).join(" ")}inputWrapClass(e){return`${this.classPrefix}-input-wrap${e.unit?" has-unit":""}`}inputUnitClass(){return`${this.classPrefix}-input-unit`}textareaClass(e){return[`${this.classPrefix}-textarea`,e.inputClass||""].filter(Boolean).join(" ")}codeClass(e){return[`${this.classPrefix}-textarea`,`${this.classPrefix}-code-editor`,e.inputClass||""].filter(Boolean).join(" ")}checkboxRowClass(){return`${this.classPrefix}-checkbox-row`}optionsClass(){return`${this.classPrefix}-options`}optionClass(e,t){return[`${this.classPrefix}-option`,this.sameOptionValue(t.value,this.fieldValue(e))?"is-selected":"",t.disabled||e.disabled||e.readonly?"is-disabled":""].filter(Boolean).join(" ")}errorClass(){return`${this.classPrefix}-field-error`}hintClass(){return`${this.classPrefix}-field-hint`}actionsClass(){return`${this.classPrefix}-actions`}buttonClass(e){return[`${this.classPrefix}-btn`,e?`${this.classPrefix}-btn-primary`:""].filter(Boolean).join(" ")}onDestroy(){this.destroyed=!0}};Reflect.metadata("design:type",Object)(E.prototype,"classPrefix");Reflect.metadata("design:type",Object)(E.prototype,"showActions");Reflect.metadata("design:type",Object)(E.prototype,"submitLabel");Reflect.metadata("design:type",Object)(E.prototype,"resetLabel");Reflect.metadata("design:type",Object)(E.prototype,"resetFieldLabel");Reflect.metadata("design:type",Object)(E.prototype,"emptyLabel");Reflect.metadata("design:type",Object)(E.prototype,"messages");Reflect.metadata("design:type",Function)(E.prototype,"changeAction");Reflect.metadata("design:type",Function)(E.prototype,"blurAction");Reflect.metadata("design:type",Function)(E.prototype,"submitAction");Reflect.metadata("design:type",Function)(E.prototype,"resetAction");Reflect.metadata("design:type",Function)(E.prototype,"validityAction");Reflect.metadata("design:paramtypes",[Object])(E.prototype,"schema");Reflect.metadata("design:paramtypes",[Object])(E.prototype,"value");Reflect.metadata("design:paramtypes",[String])(E.prototype,"contextKey");w(E,[[u(),1,"classPrefix"],[u(),1,"showActions"],[u(),1,"submitLabel"],[u(),1,"resetLabel"],[u(),1,"resetFieldLabel"],[u(),1,"emptyLabel"],[u(),1,"messages"],[u(),1,"changeAction"],[u(),1,"blurAction"],[u(),1,"submitAction"],[u(),1,"resetAction"],[u(),1,"validityAction"],[u(),1,"schema"],[u(),1,"value"],[u(),1,"contextKey"],[S({selector:"dynamic-form",template:`
    <div [class]="formClass()">
        <div [class]="schemaErrorClass()" v-if="schemaError">{{schemaError}}</div>
        <div v-else>
            <div [class]="noFieldsClass()" v-if="!visibleGroups.length">{{emptyLabel}}</div>
            <div [class]="groupClass()" v-for="group in visibleGroups">
                <div [class]="groupTitleClass()" v-if="group.label">{{group.label}}</div>
                <div [class]="groupFieldsClass()">
                <div [class]="fieldClass(field)" v-for="field in group.fields" data-field-key="{{field.key}}">
                    <div [class]="labelRowClass()" v-if="field.type !== 'hidden'">
                        <label [class]="labelClass()">{{fieldLabel(field)}}<span [class]="requiredClass()" v-if="isRequired(field)">*</span></label>
                        <button [class]="resetClass()" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">\u21BA</button>
                    </div>
                    <div [class]="inputWrapClass(field)" v-if="isTextInput(field) || isNumberInput(field)">
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
                        <span [class]="inputUnitClass()" v-if="field.unit">{{field.unit}}</span>
                    </div>
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
                    <div v-if="isListInput(field)" [class]="listClass()">
                        <div [class]="listRowClass()" v-for="(item, index) in listItems(field)">
                            <div [class]="listFieldsClass()">
                                <div v-for="child in field.itemFields" v-if="isListItemVisible(child, item)">
                                    <div [class]="listItemFieldClass(child)" data-field-key="{{child.key}}">
                                        <label [class]="labelClass()">{{fieldLabel(child)}}<span [class]="requiredClass()" v-if="isRequired(child)">*</span></label>
                                        <input v-if="isTextInput(child) || isNumberInput(child)" [class]="inputClass(child)"
                                            type="{{htmlType(child)}}"
                                            [value]="listItemValue(item, child)"
                                            [placeholder]="child.placeholder || ''"
                                            [min]="child.min" [max]="child.max" [step]="child.step"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)" />
                                        <textarea v-if="isTextareaInput(child)" [class]="textareaClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [rows]="child.rows || 2"
                                            [placeholder]="child.placeholder || ''"
                                            @input="changeListItem(field, listIndex(field, item), child, $event)"></textarea>
                                        <label v-if="isBooleanInput(child)" [class]="checkboxRowClass()">
                                            <input type="checkbox" [checked]="listItemChecked(item, child)"
                                                @change="changeListItem(field, listIndex(field, item), child, $event)" />
                                        </label>
                                        <div v-if="isOptionInput(child)" [class]="optionsClass()">
                                            <label v-for="option in child.options" data-option-value="{{option.value}}"
                                                [class]="optionClass(child, listItemValue(item, child))">
                                                <input type="radio" name="{{formId}}-{{field.key}}-{{index}}-{{child.key}}"
                                                    [value]="option.value"
                                                    [checked]="sameOptionValue(option.value, listItemValue(item, child))"
                                                    @change="changeListItemOption(field, listIndex(field, item), child, option.value)" />
                                                <span>{{option.label}}</span>
                                            </label>
                                        </div>
                                        <div [class]="errorClass()" v-if="listItemError(child, item)">{{listItemError(child, item)}}</div>
                                    </div>
                                </div>
                            </div>
                            <button [class]="listRemoveClass()" type="button" @click="removeListItem(field, listIndex(field, item))">{{field.removeLabel || '\u2715'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addListItem(field)">{{field.addLabel || '+ Add'}}</button>
                    </div>
                    <input v-if="field.type === 'hidden'" type="hidden" [value]="fieldValue(field)" />
                    <div [class]="errorClass()" v-if="errorFor(field)">{{errorFor(field)}}</div>
                    <div [class]="hintClass()" v-if="field.description && !isBooleanInput(field)">{{field.description}}</div>
                </div>
                </div>
            </div>
            <div [class]="actionsClass()" v-if="showActions">
                <button type="button" [class]="buttonClass(false)" @click="resetForm()">{{resetText}}</button>
                <button type="button" [class]="buttonClass(true)" @click="submit()">{{submitText}}</button>
            </div>
        </div>
    </div>`}),0]]);var co="tsdi-dynamic-form-styles",Nr=`
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
    margin: 14px 0 8px;
    padding: 2px 0 2px 8px;
    border-left: 3px solid var(--df-border);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
}



.df-field-group {
    margin-bottom: 12px;
}

.df-field-group-title {
    margin: 10px 0 6px;
}

.df-fields {
    display: block;
}

.df-field {
    margin-bottom: 10px;
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
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    margin: 0;
}

.df-field-required {
    margin-left: 2px;
    color: var(--df-danger);
}

.df-field-reset {
    opacity: 0;
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

.df-field:hover .df-field-reset,
.df-field:focus-within .df-field-reset {
    opacity: 1;
}

.df-field-reset:hover {
    color: var(--df-primary);
}

.df-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.df-input-wrap.has-unit .df-input {
    padding-right: 36px;
}

.df-input-unit {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--df-text-hint);
    font-size: 10px;
    line-height: 1;
    pointer-events: none;
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

.df-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.df-list-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    border: 1px dashed var(--df-border);
    border-radius: 8px;
    background: var(--df-bg);
}

.df-list-fields {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
    min-width: 0;
}

.df-list-field {
    min-width: 0;
}

.df-list-remove {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
}

.df-list-remove:hover {
    color: var(--df-danger);
}

.df-list-add {
    align-self: flex-start;
    border: 1px dashed var(--df-border);
    border-radius: 6px;
    background: transparent;
    color: var(--df-primary);
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
}

.df-list-add:hover {
    border-color: var(--df-primary);
    background: var(--df-primary-soft);
}

`;function uo(s){if(!s||typeof s.createElement!="function"||!s.head||s.getElementById&&s.getElementById(co))return;let e=s.createElement("style");e.setAttribute("id",co),e.textContent=Nr,s.head.appendChild(e)}var _e=class{};w(_e,[[$({declarations:[E],exports:[E]}),0]]);function po(s,e){return e.equals!==void 0?String(s)===String(e.equals):e.notEquals!==void 0?String(s)!==String(e.notEquals):e.in?e.in.map(t=>String(t)).includes(String(s)):e.truthy!==void 0?e.truthy?!!s:!s:e.falsy!==void 0?e.falsy?!s:!!s:!0}function Er(s){return{...s,type:s.type==="boolean"?"checkbox":s.type}}function fo(s,e){let t=[];for(let o of s?.nodes||[]){let r=e.get(o.type);if(!r?.fields?.length)continue;let i=o.config||{},a={};for(let d of r.fields)a[d.key]=i[d.key]!==void 0?i[d.key]:d.defaultValue;let n=r.fields.filter(d=>!d.visibleWhen||po(a[d.visibleWhen.key],d.visibleWhen)).map(Er),l=jt(n,a);for(let d of l.issues)t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:d.key,label:n.find(c=>c.key===d.key)?.label||d.key,message:d.message});for(let d of n){if(!d.itemFields?.length)continue;let c=Array.isArray(a[d.key])?a[d.key]:[];if(d.required&&!c.length){t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:d.key,label:d.label||d.key,message:"Required"});continue}c.forEach((p,h)=>{let f=d.itemFields.filter(y=>!y.visibleWhen||po(p?.[y.visibleWhen.key],y.visibleWhen)),b=jt(f,p||{});for(let y of b.issues){let k=f.find(R=>R.key===y.key)?.label||y.key;t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:`${d.key}[${h}].${y.key}`,label:`${d.label||d.key} ${h+1} \xB7 ${k}`,message:y.message})}})}}return t}function Ze(s){let e=ge(s),t=new Map,o=new Map,r=new Map,i=(s?.connections||[]).slice();for(let p of s?.nodes||[])t.set(p.id,p),o.set(p.id,[]),r.set(p.id,[]);for(let p of i)o.get(p.sourceNodeId)?.push(p),r.get(p.targetNodeId)?.push(p);let a=ao(s),n=a[0],l=[],d=new Set,c=a.map(p=>p.id);for(c.forEach(p=>d.add(p));c.length;){let p=c.shift();l.push(p);for(let h of o.get(p)||[])!d.has(h.targetNodeId)&&t.has(h.targetNodeId)&&(d.add(h.targetNodeId),c.push(h.targetNodeId))}for(let p of t.keys())d.has(p)||l.push(p);return{definition:s,entry:n,entries:a,nodes:t,outgoing:o,incoming:r,edges:i,order:l,reachable:d,valid:e.valid,errors:e.errors}}function ho(s,e={}){let t=Ze(s),o=e.originX??80,r=e.originY??80,i=e.columnGap??240,a=e.rowGap??140,n=new Map,l=[],d=(t.entries.length?t.entries:t.entry?[t.entry]:[]).map(h=>h.id),c=[...d];for(d.forEach(h=>n.set(h,0));c.length;){let h=c.shift(),f=n.get(h)||0;for(let b of t.outgoing.get(h)||[]){let y=b.targetNodeId;if(!t.nodes.has(y))continue;let k=f+1,R=n.get(y);(R===void 0||R<k)&&(R===void 0&&c.push(y),n.set(y,k))}}for(let h of t.order){n.has(h)||n.set(h,Lr(n,0));let f=n.get(h)||0;l[f]||(l[f]=[]),l[f].push(h)}let p={};return l.forEach((h,f)=>{h.forEach((b,y)=>{p[b]={x:o+f*i,y:r+y*a}})}),p}function Lr(s,e){let t=e;return s.forEach(o=>{t=Math.max(t,o)}),t+1}var mo,wo,Or;function Qe(s){return{id:s.id,name:s.name,description:s.description,nodeCount:s.nodes?.length||0,connectionCount:s.connections?.length||0,updatedAt:s.metadata?.updatedAt||new Date().toISOString()}}function Vt(s){return JSON.parse(JSON.stringify(s))}var Ft=class{constructor(){this[mo]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(Qe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?Vt(t):void 0}async save(e){let t={...Vt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),Qe(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};mo=U;var $t=class{constructor(e="tsdi.workflow.definitions.v1",t=go()){this.key=e,this.storage=t,this[wo]=!0}async list(){return this.readAll().map(Qe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(r=>r.id!==e.id),o={...Vt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(o),this.writeAll(t),Qe(o)}async remove(e){let t=this.readAll(),o=t.filter(r=>r.id!==e);return o.length===t.length?!1:(this.writeAll(o),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};wo=U;function go(){try{return globalThis.localStorage}catch{return}}function yo(){return go()?new $t:new Ft}Or=U;function bo(s){return Qe(s)}var J=class{};w(J,[[ie(),0]]);var Z=class extends J{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return Ke(this.node,e,this.runtimeHost)}};var qt=class extends Gt{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return Z}getBackend(){return e=>Ke(e.node,e.context,e.host)}handleNode(e){return Promise.resolve(this.handle(e,vt(this.injector)))}};function ko(s,e){let t=s.get($e,null);if(t)return e.forEach(r=>t.addInterceptor(Z,r)),new qt(s);let o=new Kt(r=>Ke(r.node,r.context,r.host),()=>e);return{handleNode:r=>Promise.resolve(o.handle(r,vt(s)))}}function _r(s){return{nodeId:s,status:"pending"}}var ut=class{intercept(e,t,o){let{node:r,state:i,emit:a}=e,n=i.nodeStates?.get(r.id)||_r(r.id);return n.status="running",n.startedAt=Date.now(),i.nodeStates?.set(r.id,n),i.currentNodeId=r.id,i.activeNodeIds=[...i.activeNodeIds||[],r.id],a({type:"node-start",nodeId:r.id,status:"running"}),Promise.resolve(t.handle(e,o)).then(l=>(this.finish(e,n,l),l),l=>{let d={success:!1,error:l,data:{nodeId:r.id}};return this.finish(e,n,d),d})}finish(e,t,o){let{node:r,state:i,emit:a}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=o.success?"success":"failed",t.result=o,t.error=o.error?.message,i.nodeStates?.set(r.id,t),i.nodeResults.set(r.id,o),i.activeNodeIds=(i.activeNodeIds||[]).filter(n=>n!==r.id),a({type:"node-end",nodeId:r.id,status:t.status,result:o})}};function Mr(s){return s>0?new Promise(e=>setTimeout(e,s)):Promise.resolve()}var Wt=class{constructor(e={}){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(0,Number(this.options.retries??1)||0),i=Math.max(0,Number(this.options.delayMs??0)||0),a=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,n=this.options.shouldRetry||((d,c)=>c?!0:d?.success===!1),l=async d=>{try{let c=await t.handle(e,o);if(d>=r||!n(c,void 0,e,d))return c}catch(c){if(d>=r||!n(void 0,c,e,d))throw c}return await Mr(i*Math.pow(a,d)),l(d+1)};return l(0)}},pt=class{intercept(e,t,o){let r=e.node.config||{},i=Math.max(0,Math.min(20,Number(r.retry??r.retries)||0)),a=Math.max(0,Number(r.retryDelay)||0),n=Math.max(0,Number(r.timeout)||0);if(!i&&!n)return Promise.resolve(t.handle(e,o));let l={handle:(d,c)=>t.handle(d,c)};if(n>0){let d=new Jt({timeoutMs:n}),c=l;l={handle:(p,h)=>d.intercept(p,c,h)}}if(i>0){let d=new Wt({retries:i,delayMs:a}),c=l;l={handle:(p,h)=>d.intercept(p,c,h)}}return Promise.resolve(l.handle(e,o))}},Jt=class{constructor(e){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(i=>{let a=!1,n=setTimeout(()=>{a||(a=!0,i({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${r}ms`),data:{nodeId:e.node.id,timeoutMs:r}}))},r);Promise.resolve(t.handle(e,o)).then(l=>{a||(a=!0,clearTimeout(n),i(l))},l=>{a||(a=!0,clearTimeout(n),i({success:!1,error:l,data:{nodeId:e.node.id}}))})})}};var Dr=100,zr=.35,Pr=2.5;function jr(s){return JSON.parse(JSON.stringify(s))}function Vr(s){return`${s}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function Ht(s,e="zh-CN",t){let o=(h,f)=>x(t,e,`workflow.demo.${h}`,f),r=(h,f,b,y,k,R)=>s.createNode(h,{x:y,y:k},{id:f,name:b,config:R}),i=r("start","start_1",o("start","Start"),80,220),a=r("task","task_1",o("loadInput","Load input"),330,220,{action:"loadInput",result:{approved:!0}}),n=r("condition","condition_1",o("approved","Approved?"),590,220,{field:"approved",operator:"truthy"}),l=r("task","task_2",o("approve","Approve"),850,120,{result:{approved:!0}}),d=r("task","task_3",o("reject","Reject"),850,320,{result:{approved:!1}}),c=r("end","end_1",o("end","End"),1110,220),p=(h,f,b,y)=>({id:h,sourceNodeId:f,sourcePort:b,targetNodeId:y,targetPort:"in"});return{id:"workflow_demo",name:o("name","Approval workflow"),description:o("description","Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[i,a,n,l,d,c],connections:[p("conn_1","start_1","out","task_1"),p("conn_2","task_1","out","condition_1"),p("conn_3","condition_1","true","task_2"),p("conn_4","condition_1","false","task_3"),p("conn_5","task_2","out","end_1"),p("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function vo(s="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||"New workflow",description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var K=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new N,this.service=e.service,this.definition=e.definition||Ht(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,o={}){let r=this.registry.get(e);if(!r){this.setError("workflow.error.unknownType",{type:e});return}if(r.singleton&&this.definition.nodes.some(a=>a.type===e)){this.setError("workflow.error.singleton",{label:r.label});return}let i=this.registry.createNode(e,t,{id:this.nextNodeId(e),...o});return this.commit(a=>({...a,nodes:[...a.nodes,i],metadata:{...a.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:i.id},this.clearError(),this.setMessage("workflow.message.added",{name:i.name}),i}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(o=>o.id!==e),connections:t.connections.filter(o=>o.sourceNodeId!==e&&o.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let o=Number.isFinite(t?.x)?t.x:0,r=Number.isFinite(t?.y)?t.y:0,i=this.definition.nodes.find(n=>n.id===e);if(!i)return!1;let a=this.snapPosition({x:o,y:r});return i.position.x===a.x&&i.position.y===a.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(n=>n.id===e?{...n,position:a}:n)}),!0)}updateNode(e,t){return this.definition.nodes.find(r=>r.id===e)?(this.commit(r=>({...r,nodes:r.nodes.map(i=>i.id===e?{...i,...t,id:i.id}:i),metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?this.updateNode(e,{config:{...o.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(o=>o.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}renameWorkflow(e){let t=String(e??"").trim();return!t||t===this.definition.name?!1:(this.commit(o=>({...o,name:t})),this.setMessage("workflow.message.renamed",{name:t}),!0)}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,o,r){let i=this.definition.nodes.find(h=>h.id===e),a=this.definition.nodes.find(h=>h.id===o);if(!i||!a){this.setError("workflow.error.endpoints");return}if(e===o){this.setError("workflow.error.selfLink");return}let n=t||i.outputs?.[0]?.id||"out",l=r||a.inputs?.[0]?.id||"in";if(i.outputs?.length&&!i.outputs.some(h=>h.id===n)){this.setError("workflow.error.unknownOutput",{port:n});return}if(a.inputs?.length&&!a.inputs.some(h=>h.id===l)){this.setError("workflow.error.unknownInput",{port:l});return}let d=this.definition.connections.find(h=>h.sourceNodeId===e&&h.sourcePort===n&&h.targetNodeId===o&&h.targetPort===l);if(d)return this.selection={connectionId:d.id},d;let c={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:n,targetNodeId:o,targetPort:l},p={...this.definition,connections:[...this.definition.connections,c]};if(Mt(p)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...p,metadata:{...p.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:c.id},this.clearError(),this.setMessage("workflow.message.connected"),c}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(o=>o.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?(this.selection={nodeId:e},this.drag={nodeId:e,startX:o.position.x,startY:o.position.y,offsetX:t.x-o.position.x,offsetY:t.y-o.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),o=Math.round(e.y-this.drag.offsetY),r=this.snapPosition({x:t,y:o});r.x===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.x&&r.y===this.definition.nodes.find(i=>i.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(i=>i.id===this.drag.nodeId?{...i,position:r}:i)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,o,r="output"){let i=this.definition.nodes.find(n=>n.id===e),a=r==="input"?i?.inputs:i?.outputs;return!i||!(a||[]).some(n=>n.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:r,x:o.x,y:o.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let o=this.connectionDraft;if(o)return this.connectionDraft=void 0,o.sourceSide==="input"?this.addConnection(e,t,o.sourceNodeId,o.sourcePort):this.addConnection(o.sourceNodeId,o.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(zr,Math.min(Pr,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return Ze(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=ho(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(o=>({...o,position:e[o.id]||o.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(o=>({...o,nodes:[...o.nodes,t],metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(o=>o.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let o;try{o=typeof e=="string"?JSON.parse(e):jr(e)}catch(i){return this.setError(i.message),!1}let r=ge(o);return!o||!Array.isArray(o.nodes)||!Array.isArray(o.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=o,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(r.valid?"":r.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let o=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(o={...o,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let r=JSON.stringify(o),i=await e.save(o),a=this.definition,n=a===o||JSON.stringify(a)===r;return n?this.definition=o:t.as&&(this.definition={...a,id:o.id,name:o.name}),this.normalize(),this.dirty=!n,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:o.name}),i}async openFrom(e,t){let o=await e.get(t);return o?this.load(o,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){let e=ge(this.definition),t=fo(this.definition,this.registry).map(r=>`${r.nodeName} \xB7 ${r.label}: ${r.message}`),o=[...e.errors,...t];return{valid:o.length===0,errors:o}}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let o=new Error("workflow.error.noService");return this.setError(o.message),{success:!1,error:o}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let o=await this.service.execute(this.definition,e.context||{},{...e,onEvent:i=>{this.activeExecutionId=i.executionId,this.execution=i.snapshot,e.onEvent?.(i)},onCheckpoint:i=>{i.status==="running"&&(this.checkpoint=i),e.onCheckpoint?.(i)}}),r=o.data?.executionState;return r&&(this.execution=r,this.recordExecution(r)),o.success&&(this.checkpoint=void 0),this.activeExecutionId=o.data?.executionId,this.running=!1,this.setMessage(o.success?"workflow.message.completed":"workflow.message.failed"),o.success||this.setError(o.error?.message||"workflow.message.failed"),o}catch(o){return this.running=!1,this.setError(o.message),this.setMessage("workflow.message.failed"),{success:!1,error:o}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=Vr("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),o=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(r=>({...r})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(r=>({...r})),config:{...o||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>Dr&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(o=>o&&o.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,o=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(o)};let r=this.gridSize;return{x:Math.round(t/r)*r,y:Math.round(o/r)*r}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(r=>r.id)),o=1;for(;t.has(`${e}_${o}`);)o++;return`${e}_${o}`}nextConnectionId(){let e=new Set(this.definition.connections.map(o=>o.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var Fr=184;var Ro=20,Io=48,xo={idle:"Idle",pending:"Pending",running:"Running",success:"Done",failed:"Failed",skipped:"Skipped",cancelled:"Cancelled"};function $r(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-")}function Ao(s,e,t){return x(t,e,`workflow.status.${s}`,xo[s]||xo.idle)}function Bt(s,e,t){let o=s||"idle",r={running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",pending:"Pending",idle:"Idle"};return x(t,e,`workflow.status.${o}`,r[o]||r.idle)}function ft(s){let e=s.dimension?.width||Fr,t=Math.max(s.inputs?.length||0,s.outputs?.length||0,1),o=Math.max(s.dimension?.height||64,Io+t*Ro+10);return{width:e,height:o}}function qr(s){let{width:e,height:t}=ft(s),o=(r,i)=>(r||[]).map((a,n)=>({id:a.id,label:a.label||a.name||a.id,type:a.type,x:i,y:s.position.y+Io+n*Ro-5}));return{width:e,height:t,inputs:o(s.inputs,s.position.x),outputs:o(s.outputs,s.position.x+e)}}function So(s,e){let t=Math.max(48,Math.abs(e.x-s.x)/2);return`M ${s.x} ${s.y} C ${s.x+t} ${s.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function Wr(s){return{class:["workflow-node",s.selected?"is-selected":""].filter(Boolean).join(" "),"data-node-id":s.id,"data-node-type":s.type,"data-status":s.status,role:"button",tabindex:"0","aria-label":s.name,style:[`left:${s.x}px`,`top:${s.y}px`,`width:${s.width}px`,`min-height:${s.height}px`].join(";")}}function To(s,e,t="zh-CN",o){let r=[],i=new Map,a=s.execution;for(let p of s.nodes){let h=qr(p);i.set(p.id,h);let f=a?.nodeStates?.[p.id]?.status||"idle",b={id:p.id,name:p.name,type:p.type,typeLabel:e.nodeLabel(p.type,t,o),description:p.description||e.nodeDescription(p.type,t,o),x:p.position.x,y:p.position.y,width:h.width,height:h.height,icon:p.style?.icon||e.get(p.type)?.icon||"\u25C6",color:p.style?.backgroundColor||e.get(p.type)?.color||"#64748b",textColor:p.style?.textColor||e.get(p.type)?.textColor||"#ffffff",selected:s.selection.nodeId===p.id,status:f,statusLabel:Ao(f,t,o),inputs:h.inputs,outputs:h.outputs};r.push({...b,attrs:Wr(b)})}let n=s.connections.map(p=>{let h=s.nodes.find(pe=>pe.id===p.sourceNodeId),f=s.nodes.find(pe=>pe.id===p.targetNodeId),b=h?i.get(h.id):void 0,y=f?i.get(f.id):void 0,k=b?.outputs.find(pe=>pe.id===p.sourcePort)||b?.outputs[0],R=y?.inputs.find(pe=>pe.id===p.targetPort)||y?.inputs[0],L=a?.edgeStates?.[p.id]?.status||"idle",j=s.selection.connectionId===p.id,Re=k&&R?So(k,R):"M 0 0",it=k&&R?(k.x+R.x)/2:0,Ho=k&&R?(k.y+R.y)/2:0,Bo={class:`workflow-edge workflow-edge-${L}${j?" is-selected":""}`,"data-edge-id":p.id,"data-status":L,d:Re,"marker-end":`url(#wf-arrow-${L})`};return{id:p.id,sourceNodeId:p.sourceNodeId,targetNodeId:p.targetNodeId,sourcePort:p.sourcePort,targetPort:p.targetPort,label:p.label||"",d:Re,status:L,selected:j,attrs:Bo,hitAttrs:{class:"workflow-edge-hit","data-edge-id":p.id,d:Re},labelAttrs:{x:String(it),y:String(Ho-6),class:"workflow-edge-label"}}}),l;if(s.connectionDraft){let p=s.nodes.find(y=>y.id===s.connectionDraft.sourceNodeId),h=p?i.get(p.id):void 0,b=(s.connectionDraft.sourceSide==="input"?h?.inputs:h?.outputs)?.find(y=>y.id===s.connectionDraft.sourcePort);b&&(l={d:So(b,{x:s.connectionDraft.x,y:s.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=r.reduce((p,h)=>Math.max(p,h.x+h.width),0),c=r.reduce((p,h)=>Math.max(p,h.y+h.height),0);return{nodes:r,edges:n,draft:l,connecting:!!s.connectionDraft,connectingSide:s.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,c+240),zoom:s.zoom,pan:{...s.pan},gridStyle:{"--wf-grid-size":`${24*s.zoom}px`,"--wf-grid-x":`${s.pan.x}px`,"--wf-grid-y":`${s.pan.y}px`}}}function No(s,e="zh-CN",t){return s.palette(e,t)}function Jr(s,e){return e.equals!==void 0?String(s)===String(e.equals):e.notEquals!==void 0?String(s)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(s)):e.truthy!==void 0?e.truthy?!!s:!s:e.falsy!==void 0?e.falsy?!s:!!s:!0}function Hr(s){let e=s.defaultValue;return s.type==="json"?typeof e=="string"?e:JSON.stringify(e??{},null,2):s.type==="boolean"?e===!0:e==null?"":String(e)}function Eo(s,e,t="zh-CN",o){let r=s.selectedNode;if(!r)return{hasSelection:!1,nodeId:"",name:"",description:"",icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let i=e.get(r.type),a=s.execution?.nodeStates?.[r.id],n=a?.status||"idle",l={};(i?.fields||[]).forEach(f=>{l[f.key]=r.config?.[f.key]!==void 0?r.config[f.key]:f.defaultValue});let d=(f,b=!1)=>{let y=b?void 0:l[f.key];return{key:f.key,label:x(o,t,`workflow.field.${r.type}.${f.key}`,f.label),type:f.type,value:y,displayValue:f.type==="json"?typeof y=="string"?y:JSON.stringify(y??{},null,2):y==null?"":String(y),checked:y===!0,options:(f.options||[]).map(k=>({label:x(o,t,`workflow.option.${k.value}`,k.label),value:k.value})),placeholder:x(o,t,`workflow.fieldPlaceholder.${r.type}.${f.key}`,f.placeholder||""),description:x(o,t,`workflow.fieldDescription.${r.type}.${f.key}`,f.description||""),group:f.group?x(o,t,`workflow.group.${$r(f.group)}`,f.group):"",visible:b||!f.visibleWhen?!0:Jr(l[f.visibleWhen.key],f.visibleWhen),min:f.min,max:f.max,step:f.step,unit:f.unit,span:f.span,minLength:f.minLength,maxLength:f.maxLength,rows:f.rows||(f.type==="json"?4:f.type==="code"?8:3),required:f.required===!0,readonly:f.readonly===!0,disabled:f.disabled===!0,pattern:f.pattern,rules:f.rules,errorMessages:f.errorMessages,inputClass:f.inputClass,fieldClass:f.fieldClass,language:f.language,itemFields:f.itemFields?.map(k=>d(k,!0)),addLabel:x(o,t,"workflow.ui.addItem",f.addLabel||"Add"),removeLabel:x(o,t,"workflow.ui.removeItem",f.removeLabel||"Remove"),minItems:f.minItems,maxItems:f.maxItems,visibleWhen:f.visibleWhen,hasDefault:f.defaultValue!==void 0,resetValue:Hr(f)}},c=(i?.fields||[]).map(f=>d(f)),p="";if(a?.result?.data!==void 0)try{p=JSON.stringify(a.result.data,null,2)}catch{p=String(a.result.data)}let h=a?.durationMs||0;return{hasSelection:!0,nodeId:r.id,name:r.name,description:r.description||"",icon:r.style?.icon||i?.icon||"\u25C6",color:r.style?.backgroundColor||i?.color||"#64748b",typeLabel:e.nodeLabel(r.type,t,o),typeDescription:e.nodeDescription(r.type,t,o),status:n,statusLabel:Ao(n,t,o),durationLabel:h?`${h} ms`:"",fields:c,resultText:p,errorText:a?.error||""}}function Lo(s,e="zh-CN",t){let o=s.execution;return{name:s.definition.name,nodeCount:s.nodes.length,connectionCount:s.connections.length,hasSelection:!!s.selection?.nodeId||!!s.selection?.connectionId,canUndo:s.canUndo,canRedo:s.canRedo,canResume:s.canResume,running:s.running,zoomLabel:`${Math.round(s.zoom*100)}%`,statusLabel:Bt(o?.status,e,t)}}function Oo(s,e="zh-CN",t){let o=s.selectedNode,r=s.execution,i=o?s.registry.nodeLabel(o.type,e,t):"";return{message:Ot(t,e,s.message,"",s.messageParams),error:Ot(t,e,s.error,"",s.errorParams),running:s.running,nodeCount:s.nodes.length,selectedLabel:o?`${o.name} \xB7 ${i}`:x(t,e,"workflow.ui.noSelection","No node selected"),zoomLabel:`${Math.round(s.zoom*100)}%`,executionLabel:Bt(r?.status,e,t)}}function Co(s){if(!s)return"";let e=new Date(s),t=o=>String(o).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function Br(s,e){if(!s||!e||e<s)return"";let t=e-s;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function _o(s,e="zh-CN",t){return(s.executionHistory||[]).filter(Boolean).map(o=>{let r=o.status==="completed"?"success":o.status==="failed"?"failed":o.status==="cancelled"?"cancelled":o.status==="running"?"running":"idle";return{executionId:o.executionId,label:Co(o.startTime),status:o.status,statusLabel:Bt(o.status,e,t),timeLabel:Co(o.startTime),durationLabel:Br(o.startTime,o.endTime),nodeCount:Object.keys(o.nodeStates||{}).length,tone:r,active:s.selectedExecutionId===o.executionId}})}var Ln=ee("VISUAL_NODE"),_=class extends J{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(_.prototype,"id");Reflect.metadata("design:type",String)(_.prototype,"name");Reflect.metadata("design:type",Object)(_.prototype,"type");Reflect.metadata("design:type",Object)(_.prototype,"position");Reflect.metadata("design:type",String)(_.prototype,"description");Reflect.metadata("design:type",Array)(_.prototype,"inputs");Reflect.metadata("design:type",Array)(_.prototype,"outputs");Reflect.metadata("design:type",Object)(_.prototype,"config");Reflect.metadata("design:type",Object)(_.prototype,"style");w(_,[[u(),1,"id"],[u(),1,"name"],[u(),1,"type"],[u(),1,"position"],[u(),1,"description"],[u(),1,"inputs"],[u(),1,"outputs"],[u(),1,"config"],[u(),1,"style"],[ie(),0]]);var ht=class extends _{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(ht);w(ht,[[S({selector:"start-node"}),0]]);var mt=class extends _{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(mt);w(mt,[[S({selector:"end-node"}),0]]);var Me=class extends _{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(Me.prototype,"action");Reflect.metadata("design:type",String)(Me.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(Me);w(Me,[[u(),1,"action"],[u(),1,"taskName"],[S({selector:"task-node"}),0]]);var et=class extends _{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(et.prototype,"condition");Reflect.metadata("design:paramtypes",[])(et);w(et,[[u(),1,"condition"],[S({selector:"condition-node"}),0]]);var ve=class extends _{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=[],r=[...this.branches],i=[];for(;r.length>0||i.length>0;){for(;r.length>0&&i.length<this.maxConcurrent;){let n=r.shift().execute(e).then(l=>{t.push(l),!l.success&&l.error&&o.push(l.error)});i.push(n)}i.length>0&&(await Promise.race(i),i.splice(0,i.findIndex(a=>!r.includes(a))))}return{success:o.length===0,data:{results:t,errors:o.length>0?o:void 0,nodeId:this.id},error:o.length>0?o[0]:void 0}}};Reflect.metadata("design:type",Array)(ve.prototype,"branches");Reflect.metadata("design:type",Object)(ve.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(ve.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(ve);w(ve,[[u(),1,"branches"],[u(),1,"maxConcurrent"],[u(),1,"waitAll"],[S({selector:"parallel-node"}),0]]);var tt=class extends _{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(tt.prototype,"delay");Reflect.metadata("design:paramtypes",[])(tt);w(tt,[[u(),1,"delay"],[S({selector:"delay-node"}),0]]);var xe=class extends _{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=0;for(;o<this.maxIterations&&await this.condition(e,o);){let i=await this.body.execute(e);t.push(i),o++}return{success:!0,data:{iterations:o,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",J)(xe.prototype,"body");Reflect.metadata("design:type",Function)(xe.prototype,"condition");Reflect.metadata("design:type",Object)(xe.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(xe);w(xe,[[u(),1,"body"],[u(),1,"condition"],[u(),1,"maxIterations"],[S({selector:"loop-node"}),0]]);var Se=class extends _{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),o=this.cases.get(t)||this.defaultCase;if(!o)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let r=await o.execute(e);return{success:r.success,data:{value:t,caseResult:r.data,nodeId:this.id},error:r.error}}};Reflect.metadata("design:type",Function)(Se.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(Se.prototype,"cases");Reflect.metadata("design:type",J)(Se.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(Se);w(Se,[[u(),1,"value"],[u(),1,"cases"],[u(),1,"defaultCase"],[S({selector:"switch-node"}),0]]);var Ce=class extends _{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,o;try{t=await this.tryActivity.execute(e)}catch(r){o=r,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:o,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:o,nodeId:this.id}}}};Reflect.metadata("design:type",J)(Ce.prototype,"tryActivity");Reflect.metadata("design:type",J)(Ce.prototype,"catchActivity");Reflect.metadata("design:type",J)(Ce.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(Ce);w(Ce,[[u(),1,"tryActivity"],[u(),1,"catchActivity"],[u(),1,"finallyActivity"],[S({selector:"trycatch-node"}),0]]);var ot=class extends _{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(ot.prototype,"workflow");Reflect.metadata("design:paramtypes",[])(ot);w(ot,[[u(),1,"workflow"],[S({selector:"subprocess-node"}),0]]);var ce=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};w(ce,[[A(),0]]);function Mo(s){return{id:s.id,name:s.name,description:s.description,version:s.version,nodes:(s.nodes||[]).map(e=>{let{execute:t,activityType:o,...r}=e;return JSON.parse(JSON.stringify(r))})}}var re=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>Mo(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let a of e.nodes||[])a?.type&&(this.nodes.register({...a,pluginId:e.id,requiresServer:a.requiresServer!==!1}),t.push(a.type));let o=typeof e.services=="function"?e.services():e.services,r=[];Object.entries(o||{}).forEach(([a,n])=>{this.services.set(a,n),r.push(a)});let i={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(i)}catch(a){throw t.forEach(n=>this.nodes.unregister(n)),r.forEach(n=>this.services.remove(n)),a}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:r}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let o={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(o)}finally{t.nodeTypes.forEach(r=>this.nodes.unregister(r));for(let r of t.serviceNames){let i=this.services.get(r);try{await i?.dispose?.()}finally{this.services.remove(r)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[N,ce])(re);w(re,[[A(),0]]);var Do=30,zo=300;function rt(s){let e={};s.nodeStates?.forEach((o,r)=>{e[r]={...o,result:o.result?{success:o.result.success,data:o.result.data,error:o.result.error?.message}:void 0}});let t={};return s.edgeStates?.forEach((o,r)=>{t[r]={...o}}),{executionId:s.executionId,workflowId:s.workflowId,status:s.status,currentNodeId:s.currentNodeId,startTime:s.startTime,endTime:s.endTime,error:s.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...s.activeNodeIds||[]],logs:[...s.logs||[]]}}var se=class{constructor(e,t,o){this.injector=e,this.plugins=o,this.executions=new Map,this.pathInterceptor=new ut,this.policyInterceptor=new pt,this.interceptors=[],this.registry=t||new N;let r=this.injector.get($e,null);r&&(r.addInterceptor(Z,this.pathInterceptor),r.addInterceptor(Z,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get($e,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(Z,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(Z,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},o={}){let r=o.executionId||o.resumeFrom?.executionId||this.generateExecutionId(),i=this.withPluginServices(t),a=o.resumeFrom?this.createStateFromCheckpoint(e,o.resumeFrom,r):this.createState(e,r);this.executions.set(r,a),this.trimHistory(o.maxHistory),this.emit(o,a,{type:"workflow-start",status:"running"}),this.checkpoint(o,a);try{let n=Ze(e),l=n.entries.length?n.entries:n.entry?[n.entry]:[];if(!l.length)throw new Error("No entry node found in workflow");let d={executeDefinition:(y,k)=>this.execute(y,k,{...o,executionId:void 0}),executeNode:async(y,k)=>{let R=this.registry.executor(y.type);return R?R(y,k):void 0}},c=new Set,p=new Set,h=ko(this.injector,this.nodeInterceptors()),f={success:!0};for(let y of l)if(f=await this.executeFromNode(y,n,i,a,o,d,c,h,!!o.resumeFrom,p),!f.success)break;a.status==="cancelled"||this.isCancelled(a)?(a.status="cancelled",this.finishPendingNodes(a,"skipped"),this.emit(o,a,{type:"workflow-cancelled",status:"cancelled"})):(a.status=f.success?"completed":"failed",!f.success&&f.error&&(a.error=f.error),this.finishPendingNodes(a,(f.success,"skipped")),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:f.success?"workflow-end":"workflow-error",status:a.status,error:f.error})),a.endTime=Date.now(),a.currentNodeId=void 0,this.checkpoint(o,a);let b=rt(a);return{success:a.status==="completed",data:{executionId:r,workflowId:e.id,status:a.status,nodeResults:Object.fromEntries(a.nodeResults),executionState:b,...f.data||{}},error:f.error||a.error}}catch(n){return a.status="failed",a.endTime=Date.now(),a.currentNodeId=void 0,a.error=n,this.finishPendingNodes(a,"skipped"),this.finishIdleEdges(a,"skipped"),this.emit(o,a,{type:"workflow-error",status:"failed",error:n}),this.checkpoint(o,a),{success:!1,error:n,data:{executionId:r,workflowId:e?.id,status:a.status,executionState:rt(a)}}}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let o=e?.services||{};return{...e,services:{...t,...o}}}createState(e,t){let o=new Map;(e.nodes||[]).forEach(i=>{o.set(i.id,{nodeId:i.id,status:"pending"})});let r=new Map;return(e.connections||[]).forEach(i=>{r.set(i.id,{connectionId:i.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:o,edgeStates:r,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,o){let r=this.createState(e,o);r.status="running",r.startTime=t.startTime||r.startTime,r.endTime=void 0,r.currentNodeId=void 0,r.activeNodeIds=[],r.logs=[...t.logs||[]];let i=t.nodeStates||{};for(let n of e.nodes||[]){let l=i[n.id];l&&(r.nodeStates?.set(n.id,{...l}),l.result&&r.nodeResults.set(n.id,{success:l.result.success,data:l.result.data,error:l.error?new Error(String(l.error)):void 0}))}let a=t.edgeStates||{};for(let n of e.connections||[]){let l=a[n.id];l&&r.edgeStates?.set(n.id,{...l})}return r}existingNodeResult(e,t,o){return o.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(rt(t))}catch{}}async executeFromNode(e,t,o,r,i,a,n,l,d=!1,c=new Set){if(r.status==="cancelled"||this.isCancelled(r))return r.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(n.has(e.id))return r.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};let p=r.nodeStates?.get(e.id),h=p&&(p.status==="success"||p.status==="failed"||p.status==="skipped"||p.status==="cancelled"),f;if(h&&d&&(p.status==="success"||p.status==="failed")){if(c.has(e.id))return this.existingNodeResult(e.id,p,r);c.add(e.id),n.add(e.id),f=this.existingNodeResult(e.id,p,r)}else{if(h)return n.add(e.id),this.existingNodeResult(e.id,p,r);if(e.type==="join"&&!this.isJoinReady(t,r,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};n.add(e.id),f=await l.handleNode({node:e,context:o,host:a,state:r,options:i,emit:k=>this.emit(i,r,k)}),this.checkpoint(i,r)}if(!f.success){let k=t.outgoing.get(e.id)||[],R=k.filter(j=>j.sourcePort==="error");if(!R.length)return f;for(let j of k)j.sourcePort!=="error"&&this.markEdgeSkipped(r,j.id,i);let L={...o,error:f.error,errorMessage:f.error?.message,failedNodeId:e.id,failedResult:f};for(let j of R){let Re=t.nodes.get(j.targetNodeId);if(!Re)continue;this.markEdgeTraversed(r,j,i);let it=await this.executeFromNode(Re,t,L,r,i,a,n,l,d,c);if(!it.success)return it}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return f;let b=this.selectNextConnections(e,t,o,f),y=new Set(b.map(k=>k.id));for(let k of t.outgoing.get(e.id)||[])y.has(k.id)||this.markEdgeSkipped(r,k.id,i);if(e.type==="parallel"&&b.length>1)return(await Promise.all(b.map(L=>{let j=t.nodes.get(L.targetNodeId);return j?(this.markEdgeTraversed(r,L,i),this.executeFromNode(j,t,this.mergeContext(o,f,L),r,i,a,n,l,d,c)):Promise.resolve({success:!1,error:new Error(`Missing node ${L.targetNodeId}`)})}))).find(L=>!L.success)||f;for(let k of b){let R=t.nodes.get(k.targetNodeId);if(!R)continue;this.markEdgeTraversed(r,k,i);let L=await this.executeFromNode(R,t,this.mergeContext(o,f,k),r,i,a,n,l,d,c);if(!L.success)return L}return f}mergeContext(e,t,o){return{...e,...t.data||{}}}isJoinReady(e,t,o){let r=e.incoming.get(o)||[];if(!r.length)return!0;let i=r.map(n=>t.nodeStates?.get(n.sourceNodeId)?.status);return i.every(n=>n==="success"||n==="failed"||n==="skipped"||n==="cancelled")&&i.some(n=>n==="success")}selectNextConnections(e,t,o,r){let i=t.outgoing.get(e.id)||[];if(!i.length)return[];if(e.type==="condition"){let a=r.data?.condition?"true":"false",n=i.filter(l=>l.sourcePort===a);return n.length?n:i.filter(l=>l.sourcePort!=="true"&&l.sourcePort!=="false")}if(e.type==="switch"){let a=r.data?.condition,n=a==null?"":String(a),l=i.filter(c=>c.sourcePort===n);if(l.length)return l;let d=i.filter(c=>c.sourcePort==="default");return d.length?d:i.filter(c=>c.sourcePort==="out")}return i.filter(a=>a.sourcePort==="error"?!1:a.condition===void 0||a.condition===null?!0:typeof a.condition=="function"?!!a.condition(o):typeof a.condition=="boolean"?a.condition:!!D(a.condition,o))}markEdgeTraversed(e,t,o){let r=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};r.status!=="traversed"&&(r.status="traversed",r.traversedAt=Date.now(),r.count=(r.count||0)+1,e.edgeStates?.set(t.id,r),this.emit(o,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"}))}markEdgeSkipped(e,t,o){let r=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};r.status!=="traversed"&&(r.status="skipped",e.edgeStates?.set(t,r),this.emit(o,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((o,r)=>{(o.status==="pending"||o.status==="idle")&&(o.status=t,e.nodeStates?.set(r,o))})}finishIdleEdges(e,t){e.edgeStates?.forEach((o,r)=>{(o.status==="idle"||o.status==="active")&&(o.status=t,e.edgeStates?.set(r,o))})}emit(e,t,o){let r=Date.now(),i={...o,executionId:t.executionId,workflowId:t.workflowId,timestamp:r,snapshot:rt(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:r,level:this.logLevelFor(o.type,o.status),event:o.type,message:this.logMessageFor(t,o),nodeId:o.nodeId,connectionId:o.connectionId}),t.logs.length>zo&&t.logs.splice(0,t.logs.length-zo)),e.onEvent)try{e.onEvent(i)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let o=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return o?.success===!1?`Node ${t.nodeId} failed: ${o.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=Do){let t=Math.max(1,Number(e)||Do),o=Array.from(this.executions.values()).filter(r=>r.status!=="running").sort((r,i)=>(r.endTime||0)-(i.endTime||0));for(;o.length>t;){let r=o.shift();r&&this.executions.delete(r.executionId)}}validate(e){return ge(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?rt(t):void 0}getExecutions(){return Array.from(this.executions.values())}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[at,N,re])(se);w(se,[[v(),3,void 0,2],[v(),3,void 0,1],[A(),0]]);var De=class s{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,o){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,o){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,o){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,o){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:o||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,o){let r={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:o?.sourcePort||"out",targetNodeId:t,targetPort:o?.targetPort||"in",label:o?.label,condition:o?.condition};return this.connections.push(r),this}connectNodes(e,t,o="out",r="in"){return this.connect(e,t,{sourcePort:o,targetPort:r})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new s}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};w(De,[[A(),0]]);var Ur={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},T=class{constructor(e){this.translator=e,this.model=Ur,this.locale="zh-CN",this.theme="light",this.hiddenActions=[]}visible(e){return!(Array.isArray(this.hiddenActions)?this.hiddenActions:[]).includes(e)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,o){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,o)}get runLabel(){return this.t("run","Run")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get zoomInLabel(){return this.t("zoomIn","Zoom in")}get zoomOutLabel(){return this.t("zoomOut","Zoom out")}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}run(){(this.runAction||(()=>this.action?.("run")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(T.prototype,"model");Reflect.metadata("design:type",Object)(T.prototype,"locale");Reflect.metadata("design:type",Object)(T.prototype,"theme");Reflect.metadata("design:type",Function)(T.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(T.prototype,"runAction");Reflect.metadata("design:type",Function)(T.prototype,"resumeAction");Reflect.metadata("design:type",Function)(T.prototype,"cancelAction");Reflect.metadata("design:type",Function)(T.prototype,"undoAction");Reflect.metadata("design:type",Function)(T.prototype,"redoAction");Reflect.metadata("design:type",Function)(T.prototype,"deleteAction");Reflect.metadata("design:type",Function)(T.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(T.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(T.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(T.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(T.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(T.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(T.prototype,"saveAction");Reflect.metadata("design:type",Function)(T.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(T.prototype,"clearAction");Reflect.metadata("design:type",Function)(T.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(T.prototype,"action");Reflect.metadata("design:type",Array)(T.prototype,"hiddenActions");Reflect.metadata("design:paramtypes",[I])(T);w(T,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"themeChangeAction"],[u(),1,"runAction"],[u(),1,"resumeAction"],[u(),1,"cancelAction"],[u(),1,"undoAction"],[u(),1,"redoAction"],[u(),1,"deleteAction"],[u(),1,"zoomInAction"],[u(),1,"zoomOutAction"],[u(),1,"resetViewAction"],[u(),1,"autoLayoutAction"],[u(),1,"duplicateAction"],[u(),1,"toggleLogsAction"],[u(),1,"saveAction"],[u(),1,"openLibraryAction"],[u(),1,"clearAction"],[u(),1,"toggleJsonAction"],[u(),1,"action"],[u(),1,"hiddenActions"],[v(),3,void 0,0],[S({selector:"workflow-toolbar",template:`
    <div class="workflow-toolbar">
        <span class="workflow-toolbar-title">{{model.name}}</span>
        <span class="workflow-toolbar-meta">{{nodeLabel}} \xB7 {{connectionLabel}}</span>
        <span class="workflow-toolbar-status">{{model.statusLabel}}</span>
        <span class="workflow-status-spacer"></span>
        <button v-if="visible('run')" class="workflow-btn workflow-btn-primary" [disabled]="model.running || !model.nodeCount" @click="run"><icon class="workflow-btn-icon" name="run" size="sm"></icon>{{runLabel}}</button>
        <button v-if="visible('resume')" class="workflow-btn" [disabled]="!model.canResume" @click="resume"><icon class="workflow-btn-icon" name="resume" size="sm"></icon>{{resumeLabel}}</button>
        <button v-if="visible('cancel')" class="workflow-btn" [disabled]="!model.running" @click="cancel"><icon class="workflow-btn-icon" name="stop" size="sm"></icon>{{stopLabel}}</button>
        <button v-if="visible('undo')" class="workflow-btn" [disabled]="!model.canUndo" @click="undo"><icon class="workflow-btn-icon" name="undo" size="sm"></icon>{{undoLabel}}</button>
        <button v-if="visible('redo')" class="workflow-btn" [disabled]="!model.canRedo" @click="redo"><icon class="workflow-btn-icon" name="redo" size="sm"></icon>{{redoLabel}}</button>
        <button v-if="visible('delete')" class="workflow-btn workflow-btn-danger" [disabled]="!model.hasSelection" @click="remove"><icon class="workflow-btn-icon" name="delete" size="sm"></icon>{{deleteLabel}}</button>
        <button v-if="visible('zoom')" class="workflow-btn" [title]="zoomOutLabel" [aria-label]="zoomOutLabel" @click="zoomOut"><icon class="workflow-btn-icon workflow-btn-icon-only" name="minus" size="sm"></icon></button>
        <span v-if="visible('zoom')" class="workflow-toolbar-zoom">{{model.zoomLabel}}</span>
        <button v-if="visible('zoom')" class="workflow-btn" [title]="zoomInLabel" [aria-label]="zoomInLabel" @click="zoomIn"><icon class="workflow-btn-icon workflow-btn-icon-only" name="plus" size="sm"></icon></button>
        <button v-if="visible('reset-view')" class="workflow-btn" @click="resetView"><icon class="workflow-btn-icon" name="fit" size="sm"></icon>{{resetLabel}}</button>
        <button v-if="visible('auto-layout')" class="workflow-btn" @click="autoLayout"><icon class="workflow-btn-icon" name="layout" size="sm"></icon>{{layoutLabel}}</button>
        <button v-if="visible('duplicate')" class="workflow-btn" [disabled]="!model.hasSelection" @click="duplicate"><icon class="workflow-btn-icon" name="duplicate" size="sm"></icon>{{duplicateLabel}}</button>
        <button v-if="visible('toggle-logs')" class="workflow-btn" @click="toggleLogs"><icon class="workflow-btn-icon" name="logs" size="sm"></icon>{{logsLabel}}</button>
        <button v-if="visible('save')" class="workflow-btn" @click="save"><icon class="workflow-btn-icon" name="save" size="sm"></icon>{{saveLabel}}</button>
        <button v-if="visible('open-library')" class="workflow-btn" @click="openLibrary"><icon class="workflow-btn-icon" name="library" size="sm"></icon>{{libraryLabel}}</button>
        <button v-if="visible('toggle-json')" class="workflow-btn" @click="toggleJson"><icon class="workflow-btn-icon" name="json" size="sm"></icon>JSON</button>
        <button v-if="visible('clear')" class="workflow-btn" [disabled]="!model.nodeCount" @click="clear"><icon class="workflow-btn-icon" name="clear" size="sm"></icon>{{clearLabel}}</button>
    </div>`}),0]]);var ze=class{constructor(){this.listeners=new Set}emit(e){for(let t of[...this.listeners])t(e)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}};w(ze,[[A(),0]]);var wt=new ze;var Po=["light","dark","solarized","high-contrast"],jo={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},W=class{constructor(e){this.translator=e,this.model=jo,this.locale="zh-CN",this.theme="light",this.actionBus=wt,this.menuSelect=t=>{if(globalThis.__workflowMenuHandled=t,t.startsWith("language:")){let o=t.slice(9);(o==="en"||o==="zh-CN")&&(!this.actionBus&&this.localeChangeAction?this.localeChangeAction(o):this.dispatch(t));return}if(t.startsWith("theme:")){let o=t.slice(6);Po.includes(o)&&(!this.actionBus&&this.themeChangeAction?this.themeChangeAction(o):this.dispatch(t));return}this.dispatch(t)}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get themeName(){return ne(this.theme)?this.theme:"light"}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get menuLabel(){return this.t("menu","Menu")}get menuGroups(){let e=this.model||jo,t=this.cache;if(t&&t.model===e&&t.theme===this.theme&&t.locale===this.locale)return t.groups;let o=(i,a)=>this.t(i,a),r=[{items:[{id:"save",label:o("save","Save"),shortcut:"Ctrl+S"},{id:"rename",label:o("rename","Rename workflow"),icon:"rename"},{id:"open-library",label:o("library","Workflows")},{id:"toggle-json",label:o("jsonMenu","Import / Export JSON")}]},{items:[{id:"run",label:o("run","Run"),icon:"run",disabled:e.running||!e.nodeCount},{id:"resume",label:o("resume","Resume"),icon:"resume",disabled:!e.canResume},{id:"cancel",label:o("stop","Stop"),icon:"stop",disabled:!e.running}]},{items:[{id:"undo",label:o("undo","Undo"),shortcut:"Ctrl+Z",disabled:!e.canUndo},{id:"redo",label:o("redo","Redo"),shortcut:"Ctrl+Y",disabled:!e.canRedo},{id:"duplicate",label:o("duplicate","Duplicate"),shortcut:"Ctrl+D",disabled:!e.hasSelection},{id:"delete",label:o("delete","Delete"),shortcut:"Del",disabled:!e.hasSelection,danger:!0},{id:"clear",label:o("clear","Clear"),disabled:!e.nodeCount}]},{items:[{id:"reset-view",label:o("fit","Fit")},{id:"auto-layout",label:o("layout","Auto layout")},{id:"toggle-logs",label:o("logs","Logs")},{id:"theme",label:o("themeMenu","Theme"),icon:"theme",children:Po.map(i=>({id:`theme:${i}`,label:this.themeOptionLabel(i),checked:this.themeName===i}))}]},{items:[{id:"language",label:o("language","Language"),icon:"language",children:[{id:"language:en",label:"English",checked:!this.isZh},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.isZh}]},{id:"shortcuts",label:o("shortcuts","Keyboard shortcuts"),shortcut:"?"}]}];return this.cache={model:e,theme:this.theme,locale:this.locale,groups:r},r}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}dispatch(e){this.actionBus?this.actionBus.emit(e):this.action?.(e)}};Reflect.metadata("design:type",Object)(W.prototype,"model");Reflect.metadata("design:type",Object)(W.prototype,"locale");Reflect.metadata("design:type",Object)(W.prototype,"theme");Reflect.metadata("design:type",Function)(W.prototype,"action");Reflect.metadata("design:type",Function)(W.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(W.prototype,"localeChangeAction");Reflect.metadata("design:type",Object)(W.prototype,"cache");Reflect.metadata("design:paramtypes",[I])(W);w(W,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"action"],[u(),1,"themeChangeAction"],[u(),1,"localeChangeAction"],[z(),1,"cache"],[v(),3,void 0,0],[S({selector:"workflow-management-menu",template:`
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="menu" label="" caret="caret-down" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var G=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes","Search nodes\u2026")}get noMatchesLabel(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches","No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(o=>this.matches(o,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(o=>String(o).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(G.prototype,"groups");Reflect.metadata("design:type",Object)(G.prototype,"locale");Reflect.metadata("design:type",Function)(G.prototype,"addAction");Reflect.metadata("design:type",Function)(G.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[I])(G);w(G,[[u(),1,"groups"],[u(),1,"locale"],[u(),1,"addAction"],[u(),1,"dragStartAction"],[v(),3,void 0,0],[S({selector:"workflow-palette",template:`
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
                <span class="workflow-palette-icon" data-node-type="{{entry.type}}"><icon [name]="entry.type" [glyph]="entry.icon" size="sm"></icon></span>
                <span class="workflow-palette-text">
                    <span class="workflow-palette-label">{{entry.label}}</span>
                    <span class="workflow-palette-desc">{{entry.description}}</span>
                </span>
            </div>
        </div>
    </div>`}),0]]);var Kr={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},B=class{constructor(e,t){this.elementRef=e,this.translator=t,this.model=Kr,this.locale="zh-CN"}onAfterViewInit(){fe(this.canvasRoot)}get emptyHint(){let e=String(this.locale||"").toLowerCase().startsWith("zh")?"zh-CN":"en";return x(this.translator,e,"workflow.ui.canvasEmpty","Drag a component from the palette, or click one to add it")}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,o){return{class:`workflow-node-port workflow-node-port-${o}`,"data-port-id":t.id,"data-port-side":o,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,o=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,o-this.panStart.clientY),this.panStart={clientX:t,clientY:o}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,o,r){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}portUp(e,t,o,r){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,o=this.model.pan||{x:0,y:0},r=globalThis.document,i=this.canvasRoot?.nativeElement||this.elementRef?.nativeElement?.querySelector?.(".workflow-canvas")||r?.querySelector?.(".workflow-canvas")||this.elementRef?.nativeElement,a=i?.getBoundingClientRect?.()||{left:0,top:0},n=Number(e?.clientX),l=Number(e?.clientY),d=(Number.isFinite(n)?n:0)-(a.left||0)+(i?.scrollLeft||0),c=(Number.isFinite(l)?l:0)-(a.top||0)+(i?.scrollTop||0);return{x:(d-o.x)/t,y:(c-o.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)(B.prototype,"model");Reflect.metadata("design:type",Object)(B.prototype,"locale");Reflect.metadata("design:type",Function)(B.prototype,"pointerAction");Reflect.metadata("design:type",Function)(B.prototype,"panAction");Reflect.metadata("design:type",V)(B.prototype,"canvasRoot");Reflect.metadata("design:paramtypes",[V,I])(B);w(B,[[u(),1,"model"],[u(),1,"locale"],[u(),1,"pointerAction"],[u(),1,"panAction"],[ae("canvasRoot",V),1,"canvasRoot"],[v(),3,void 0,1],[v(),3,void 0,0],[S({selector:"workflow-canvas",template:`
    <div #canvasRoot class="workflow-canvas"
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
                        <span class="workflow-node-icon"><icon [name]="node.type" [glyph]="node.icon" size="sm"></icon></span>
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
    </div>`}),0]]);var Vo={hasSelection:!1,nodeId:"",name:"",description:"",icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function Gr(s){return s.hasSelection?JSON.stringify([s.nodeId,s.name,s.description,s.icon,s.color,s.typeLabel,s.status,s.statusLabel,s.durationLabel,s.resultText,s.errorText,s.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var F=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=Vo,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let o=this.changeType(t.field);if(o==="code"){this.queueChange(t.key,t.value,o);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,o,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||Vo,o=Gr(t);o!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=o,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get appearanceLabel(){return this.t("appearance","Appearance")}get iconLabel(){return this.t("icon","Icon")}get colorLabel(){return this.t("color","Color")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage","Required")}get numberMessage(){return this.t("numberMessage","Number out of range")}get patternMessage(){return this.t("patternMessage","Invalid format")}get jsonMessage(){return this.t("jsonMessage","Invalid JSON")}get emailMessage(){return this.t("invalidEmail","Invalid email address")}get urlMessage(){return this.t("invalidUrl","Invalid URL")}get integerMessage(){return this.t("integerMessage","Must be an integer")}get formSchema(){let e=[];if(!this._model.hasSelection)return{fields:e};let t=this.t("properties","Properties");return e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),e.push({key:"icon",type:"text",label:this.iconLabel,group:this.appearanceLabel,maxLength:4,defaultValue:"\u25C6",placeholder:"\u25C6",inputClass:"workflow-inspector-icon"}),e.push({key:"color",type:"color",label:this.colorLabel,group:this.appearanceLabel,defaultValue:"#64748b",inputClass:"workflow-inspector-color"}),this._model.fields.forEach(o=>{e.push(this.toDynamicField(o))}),{fields:e,defaultGroupLabel:t}}toDynamicField(e){return{key:e.key,type:this.dynamicType(e),label:e.label,placeholder:e.placeholder,description:e.description,group:e.group,options:e.options.map(t=>({label:t.label,value:t.value})),defaultValue:e.hasDefault?e.resetValue:void 0,rows:e.rows,min:e.min,max:e.max,step:e.step,unit:e.unit,span:e.span,minLength:e.minLength,maxLength:e.maxLength,required:e.required,readonly:e.readonly,disabled:e.disabled,pattern:e.pattern,rules:e.rules,errorMessages:e.errorMessages,itemFields:e.itemFields?.map(t=>this.toDynamicField(t)),addLabel:e.addLabel,removeLabel:e.removeLabel,minItems:e.minItems,maxItems:e.maxItems,visibleWhen:e.visibleWhen,inputClass:e.inputClass,fieldClass:e.fieldClass,language:e.language,suggestions:this.codeSuggestions,hidden:e.visible===!1}}get formValue(){let e={name:this._model.name,description:this._model.description,icon:this._model.icon,color:this._model.color};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){return e.type==="boolean"?"checkbox":e.type==="select"?"radio":e.type}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"list":return"list";case"code":return"code";default:return"text"}}queueChange(e,t,o){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:o,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let r=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),r)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(F.prototype,"locale");Reflect.metadata("design:type",Object)(F.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(F.prototype,"changeAction");Reflect.metadata("design:type",Function)(F.prototype,"restoreAction");Reflect.metadata("design:type",Array)(F.prototype,"codeSuggestions");Reflect.metadata("design:type",E)(F.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[I])(F);Reflect.metadata("design:paramtypes",[])(F.prototype,"model");Reflect.metadata("design:returntype",Object)(F.prototype,"model");w(F,[[u(),1,"locale"],[u(),1,"codeChangeDelay"],[u(),1,"changeAction"],[u(),1,"restoreAction"],[u(),1,"codeSuggestions"],[ae("nodeForm",E),1,"nodeForm"],[v(),3,void 0,0],[u(),1,"model"],[S({selector:"workflow-inspector",template:`
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
            <div class="workflow-inspector-description" v-if="model.typeDescription">{{model.typeDescription}}</div>
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
    </div>`}),0]]);var Q=class{constructor(e){this.translator=e,this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.runHistory","Runs")}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(Q.prototype,"items");Reflect.metadata("design:type",Object)(Q.prototype,"locale");Reflect.metadata("design:type",Function)(Q.prototype,"selectAction");Reflect.metadata("design:paramtypes",[I])(Q);w(Q,[[u(),1,"items"],[u(),1,"locale"],[u(),1,"selectAction"],[v(),3,void 0,0],[S({selector:"workflow-run-history",template:`
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
    </div>`}),0]]);var Y=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle","Execution log")}get closeLabel(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close","Close")}levelLabel(e){let t={info:"INFO",success:"OK",warning:"WARN",error:"ERROR"};return x(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),o=r=>String(r).padStart(2,"0");return`${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(Y.prototype,"items");Reflect.metadata("design:type",Object)(Y.prototype,"visible");Reflect.metadata("design:type",Object)(Y.prototype,"locale");Reflect.metadata("design:type",Function)(Y.prototype,"closeAction");Reflect.metadata("design:paramtypes",[I])(Y);w(Y,[[u(),1,"items"],[u(),1,"visible"],[u(),1,"locale"],[u(),1,"closeAction"],[v(),3,void 0,0],[S({selector:"workflow-run-log",template:`
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
    </div>`}),0]]);var P=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(P.prototype,"items");Reflect.metadata("design:type",Object)(P.prototype,"visible");Reflect.metadata("design:type",Object)(P.prototype,"currentId");Reflect.metadata("design:type",Object)(P.prototype,"locale");Reflect.metadata("design:type",Object)(P.prototype,"error");Reflect.metadata("design:type",Function)(P.prototype,"saveAction");Reflect.metadata("design:type",Function)(P.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(P.prototype,"openAction");Reflect.metadata("design:type",Function)(P.prototype,"removeAction");Reflect.metadata("design:type",Function)(P.prototype,"closeAction");Reflect.metadata("design:paramtypes",[I])(P);w(P,[[u(),1,"items"],[u(),1,"visible"],[u(),1,"currentId"],[u(),1,"locale"],[u(),1,"error"],[u(),1,"saveAction"],[u(),1,"saveAsAction"],[u(),1,"openAction"],[u(),1,"removeAction"],[u(),1,"closeAction"],[v(),3,void 0,0],[S({selector:"workflow-library",template:`
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
    </div>`}),0]]);var Fo="tsdi-workflow-designer-styles",Yr=`
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
    --wf-theme-shadow: rgba(15, 23, 42, 0.28);
    --wf-theme-overlay: rgba(15, 23, 42, 0.42);
    --wf-theme-focus-ring: rgba(37, 99, 235, 0.15);
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
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
    color: var(--wf-theme-text, #0f172a);
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

/* Rename workflow dialog */
.workflow-rename {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wf-theme-overlay, rgba(15, 23, 42, 0.42));
    color: var(--wf-theme-text, #0f172a);
    padding: 24px;
}

.workflow-rename-panel {
    width: min(380px, 100%);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--wf-theme-surface, #ffffff);
    border: 1px solid var(--wf-theme-border, #e2e8f0);
    border-radius: 12px;
    padding: 14px 16px;
    color: var(--wf-theme-text, #0f172a);
    box-shadow: 0 24px 60px var(--wf-theme-shadow, rgba(15, 23, 42, 0.28));
}

.workflow-rename-head {
    display: flex;
    align-items: center;
    gap: 12px;
}

.workflow-rename-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--wf-theme-text, #0f172a);
}

.workflow-rename-close {
    padding: 2px 7px;
    line-height: 1;
}

.workflow-rename-input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--wf-theme-border, #cbd5e1);
    border-radius: 6px;
    padding: 7px 9px;
    background: var(--wf-theme-input, #ffffff);
    color: var(--wf-theme-text, #0f172a);
    font-size: 12px;
}

.workflow-rename-input::placeholder {
    color: var(--wf-theme-muted, #94a3b8);
}

.workflow-rename-input:focus {
    outline: none;
    border-color: var(--wf-theme-primary, #2563eb);
    box-shadow: 0 0 0 3px var(--wf-theme-focus-ring, rgba(37, 99, 235, 0.15));
}

.workflow-rename-error {
    font-size: 11px;
    color: var(--wf-theme-danger, #dc2626);
}

.workflow-rename-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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

.workflow-btn-icon {
    display: inline-block;
    width: 13px;
    height: 13px;
    margin-right: 5px;
    flex: none;
    overflow: visible;
    vertical-align: -2px;
}

.workflow-btn-icon-only {
    margin-right: 0;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 14px;
    height: 14px;
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

.workflow-field-group {
    margin-bottom: 12px;
}

.workflow-field-group .workflow-field-group-title {
    margin: 10px 0 6px;
}

.workflow-fields {
    display: block;
}

.workflow-field {
    margin-bottom: 10px;
}

.workflow-inspector-description {
    margin: 2px 0 10px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.45;
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
    font-size: 11px;
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
    opacity: 0;
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
}

.workflow-field:hover .workflow-field-reset,
.workflow-field:focus-within .workflow-field-reset {
    opacity: 1;
}

.workflow-field-reset:hover {
    color: #2563eb;
}

.workflow-field-group-title {
    margin: 16px 0 8px;
    padding: 2px 0 2px 8px;
    border-left: 3px solid #cbd5e1;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #475569;
}



.workflow-inspector-no-fields,
.workflow-no-fields {
    padding: 6px 0;
    font-size: 11px;
    color: #94a3b8;
}

.workflow-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}

.workflow-input-wrap.has-unit .workflow-input {
    padding-right: 36px;
}

.workflow-input-unit {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 10px;
    line-height: 1;
    pointer-events: none;
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
    font-size: 11px;
    line-height: 1.4;
    color: #64748b;
    margin-top: 3px;
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
    --wf-theme-overlay: rgba(0, 0, 0, 0.62);
    --wf-theme-shadow: rgba(0, 0, 0, 0.55);
    --wf-theme-focus-ring: rgba(59, 130, 246, 0.25);
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
    --wf-theme-overlay: rgba(0, 0, 0, 0.62);
    --wf-theme-shadow: rgba(0, 0, 0, 0.55);
    --wf-theme-focus-ring: rgba(38, 139, 210, 0.28);
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
    --wf-theme-overlay: rgba(0, 0, 0, 0.82);
    --wf-theme-shadow: rgba(255, 255, 255, 0.3);
    --wf-theme-focus-ring: rgba(255, 255, 0, 0.35);
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

.workflow-designer[data-theme="dark"] .workflow-field-group-title,
.workflow-designer[data-theme="solarized"] .workflow-field-group-title,
.workflow-designer[data-theme="high-contrast"] .workflow-field-group-title {
    border-left-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-inspector-description,
.workflow-designer[data-theme="solarized"] .workflow-inspector-description,
.workflow-designer[data-theme="high-contrast"] .workflow-inspector-description,
.workflow-designer[data-theme="dark"] .workflow-field-hint,
.workflow-designer[data-theme="solarized"] .workflow-field-hint,
.workflow-designer[data-theme="high-contrast"] .workflow-field-hint,
.workflow-designer[data-theme="dark"] .workflow-input-unit,
.workflow-designer[data-theme="solarized"] .workflow-input-unit,
.workflow-designer[data-theme="high-contrast"] .workflow-input-unit,
.workflow-designer[data-theme="dark"] .workflow-list-remove,
.workflow-designer[data-theme="solarized"] .workflow-list-remove,
.workflow-designer[data-theme="high-contrast"] .workflow-list-remove {
    color: var(--wf-theme-muted);
}

.workflow-designer[data-theme="dark"] .workflow-list-row,
.workflow-designer[data-theme="solarized"] .workflow-list-row,
.workflow-designer[data-theme="high-contrast"] .workflow-list-row {
    background: var(--wf-theme-surface);
    border-color: var(--wf-theme-border);
}

.workflow-designer[data-theme="dark"] .workflow-list-add,
.workflow-designer[data-theme="solarized"] .workflow-list-add,
.workflow-designer[data-theme="high-contrast"] .workflow-list-add {
    background: transparent;
    border-color: var(--wf-theme-border);
    color: var(--wf-theme-primary);
}

.workflow-designer[data-theme="dark"] .workflow-list-add:hover,
.workflow-designer[data-theme="solarized"] .workflow-list-add:hover,
.workflow-designer[data-theme="high-contrast"] .workflow-list-add:hover {
    background: rgba(59, 130, 246, 0.18);
}

.workflow-designer[data-theme="dark"] .workflow-field-error,
.workflow-designer[data-theme="solarized"] .workflow-field-error,
.workflow-designer[data-theme="high-contrast"] .workflow-field-error {
    color: var(--wf-theme-danger);
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

.workflow-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.workflow-list-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    border: 1px dashed #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
}

.workflow-list-fields {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px 8px;
    min-width: 0;
}

.workflow-list-field {
    min-width: 0;
}

.workflow-list-remove {
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
}

.workflow-list-remove:hover {
    color: #dc2626;
}

.workflow-list-add {
    align-self: flex-start;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    background: transparent;
    color: #2563eb;
    font-size: 11px;
    padding: 4px 8px;
    cursor: pointer;
}

.workflow-list-add:hover {
    border-color: #2563eb;
    background: #eff6ff;
}

`;function gt(s){if(!s||typeof s.createElement!="function"||!s.head||s.getElementById&&s.getElementById(Fo))return;let e=s.createElement("style");e.setAttribute("id",Fo),e.textContent=Yr,s.head.appendChild(e)}var $o=.08,qo=.6,Xr=.7,M=class{constructor(e){this.elementRef=e,this.leftRatio=.2,this.rightRatio=.24,this.bottomRatio=.26,this.minLeft=160,this.minRight=180,this.minBottom=80,this.resizable=!0,this.leftCollapsed=!1,this.rightCollapsed=!1,this.bottomCollapsed=!1,this.projected=!1,fe(e)}get layoutStyle(){return{"--workspace-left":`${this.leftRatio*100}%`,"--workspace-right":`${this.rightRatio*100}%`,"--workspace-bottom":`${this.bottomRatio*100}%`}}onAfterViewInit(){fe(this.layoutRoot),this.mountProjectedContent(),this.bindResizeListeners()}onDestroy(){this.unbindResizeListeners()}mountProjectedContent(){if(this.projected)return;let e=this.layoutRoot?.nativeElement;if(!e)return;let o=(e.closest?.("workspace-layout")||e.parentElement||this.hostElement)?.[Zt]||[];if(!o.length)return;let r={};e.querySelectorAll?.("[data-workspace-slot]")?.forEach?.(i=>{r[i.getAttribute("data-workspace-slot")]=i}),Object.keys(r).length&&(o.forEach((i,a)=>{let n=String(i.tagName||"").toLowerCase(),l=n.startsWith("workspace-")?n.slice(10):"",d=["left","center","right","bottom"][a],c=r[l]||r[d];c&&typeof c.appendChild=="function"&&c.appendChild(i)}),this.projected=!0)}beginResize(e,t){if(!this.resizable||this.isCollapsed(t))return;e?.preventDefault?.(),e?.stopPropagation?.();let r=(this.layoutRoot?.nativeElement||this.hostElement)?.getBoundingClientRect?.()||{width:0,height:0};this.resizing={pane:t,startX:Number(e?.clientX)||0,startY:Number(e?.clientY)||0,startLeft:this.leftRatio,startRight:this.rightRatio,startBottom:this.bottomRatio,width:r.width||0,height:r.height||0}}resizeMove(e){let t=this.resizing;if(t)if(t.pane==="left"){let o=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setLeftRatio(t.startLeft+o)}else if(t.pane==="right"){let o=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setRightRatio(t.startRight-o)}else{let o=t.height?(Number(e?.clientY)-t.startY)/t.height:0;this.setBottomRatio(t.startBottom-o)}}endResize(){this.resizing&&(this.resizing=void 0)}resizePane(e,t){e==="left"?this.setLeftRatio(t):e==="right"?this.setRightRatio(t):this.setBottomRatio(t)}isCollapsed(e){return e==="left"?this.leftCollapsed:e==="right"?this.rightCollapsed:this.bottomCollapsed}togglePane(e){this.isCollapsed(e)?this.expandPane(e):this.collapsePane(e)}collapsePane(e){this.setCollapsed(e,!0)}expandPane(e){this.setCollapsed(e,!1)}setCollapsed(e,t){e==="left"?this.leftCollapsed=t:e==="right"?this.rightCollapsed=t:this.bottomCollapsed=t,this.collapseAction?.(e,t)}stopEvent(e){e?.preventDefault?.(),e?.stopPropagation?.()}setLeftRatio(e){let t=this.layoutSize().width,o=this.minRatio(this.minLeft,t),r=Math.min(qo,1-this.rightRatio-o);this.leftRatio=this.clamp(e,o,r),this.resizeAction?.("left",this.leftRatio)}setRightRatio(e){let t=this.layoutSize().width,o=this.minRatio(this.minRight,t),r=Math.min(qo,1-this.leftRatio-o);this.rightRatio=this.clamp(e,o,r),this.resizeAction?.("right",this.rightRatio)}setBottomRatio(e){let t=this.layoutSize().height,o=this.minRatio(this.minBottom,t);this.bottomRatio=this.clamp(e,o,Xr),this.resizeAction?.("bottom",this.bottomRatio)}layoutSize(){let e=this.layoutRoot?.nativeElement?.getBoundingClientRect?.();return{width:Number(e?.width)||0,height:Number(e?.height)||0}}minRatio(e,t){let o=Math.max(0,Number(e)||0);return t>0?Math.max($o,o/t):$o}get hostElement(){return this.elementRef?.nativeElement}clamp(e,t,o){let r=Number(e);return Number.isFinite(r)?Math.max(t,Math.min(Math.max(t,o),r)):t}bindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.addEventListener!="function"||this.moveHandler||(this.moveHandler=t=>this.resizeMove(t),this.upHandler=()=>this.endResize(),e.addEventListener("mousemove",this.moveHandler),e.addEventListener("mouseup",this.upHandler))}unbindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.removeEventListener!="function"||(this.moveHandler&&e.removeEventListener("mousemove",this.moveHandler),this.upHandler&&e.removeEventListener("mouseup",this.upHandler),this.moveHandler=void 0,this.upHandler=void 0)}};Reflect.metadata("design:type",Object)(M.prototype,"leftRatio");Reflect.metadata("design:type",Object)(M.prototype,"rightRatio");Reflect.metadata("design:type",Object)(M.prototype,"bottomRatio");Reflect.metadata("design:type",Object)(M.prototype,"minLeft");Reflect.metadata("design:type",Object)(M.prototype,"minRight");Reflect.metadata("design:type",Object)(M.prototype,"minBottom");Reflect.metadata("design:type",Object)(M.prototype,"resizable");Reflect.metadata("design:type",Object)(M.prototype,"leftCollapsed");Reflect.metadata("design:type",Object)(M.prototype,"rightCollapsed");Reflect.metadata("design:type",Object)(M.prototype,"bottomCollapsed");Reflect.metadata("design:type",Function)(M.prototype,"resizeAction");Reflect.metadata("design:type",Function)(M.prototype,"collapseAction");Reflect.metadata("design:type",V)(M.prototype,"layoutRoot");Reflect.metadata("design:paramtypes",[V])(M);w(M,[[u(),1,"leftRatio"],[u(),1,"rightRatio"],[u(),1,"bottomRatio"],[u(),1,"minLeft"],[u(),1,"minRight"],[u(),1,"minBottom"],[u(),1,"resizable"],[u(),1,"leftCollapsed"],[u(),1,"rightCollapsed"],[u(),1,"bottomCollapsed"],[u(),1,"resizeAction"],[u(),1,"collapseAction"],[ae("layoutRoot",V),1,"layoutRoot"],[v(),3,void 0,0],[S({selector:"workspace-layout",template:`
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
    </div>`}),0]]);var Wo="tsdi-workspace-layout-styles",Zr=`
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
`;function Jo(s){if(!s||typeof s.createElement!="function"||!s.head||s.getElementById&&s.getElementById(Wo))return;let e=s.createElement("style");e.setAttribute("id",Wo),e.textContent=Zr,s.head.appendChild(e)}var Pe=class{};w(Pe,[[$({declarations:[M],exports:[M]}),0]]);var C=class{constructor(e,t,o){this.translator=t,this.elementRef=o,this.locale="zh-CN",this.theme="light",this.applyDocumentTheme=!0,this.runContext={},this.autoRun=!1,this.saveState="saved",this.hiddenActions=[],this.showRunHistory=!0,this.showStatusbar=!0,this.showRunLogs=!0,this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.jsonText="",this.jsonError="",this.notifyChange=()=>{this.autosaveAction?.()},this.handleToolbarAction=r=>{let i=this.selfRef||this;switch(r){case"run":this.designer.run({context:this.runContext});break;case"resume":i.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":i.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":i.showLogs=!i.showLogs;break;case"save":i.hostAction?.("save");break;case"open-library":i.hostAction?.("open-library");break;case"clear":this.designer.clear();break;case"toggle-json":i.toggleJson();break;case"shortcuts":i.toggleShortcuts();break;default:break}i.notifyChange()},this.fitView=()=>{let r=this.canvasViewport(),i=this.designer.nodes;if(!r||!i.length){this.designer.resetView();return}let a=48,n=1/0,l=1/0,d=-1/0,c=-1/0;i.forEach(L=>{let j=ft(L);n=Math.min(n,L.position.x),l=Math.min(l,L.position.y),d=Math.max(d,L.position.x+j.width),c=Math.max(c,L.position.y+j.height)});let p=Math.max(1,d-n),h=Math.max(1,c-l),f=Math.max(.25,Math.min(1.25,Math.min((r.width-a*2)/p,(r.height-a*2)/h)));this.designer.setZoom(f);let b=this.designer.zoom||1;this.designer.pan={x:Math.round((r.width-p*b)/2-n*b),y:Math.round((r.height-h*b)/2-l*b)};let y=this.elementRef?.nativeElement,k=globalThis.document,R=y?.querySelector?.(".workflow-canvas")||k?.querySelector?.(".workflow-canvas");R&&(R.scrollLeft=0,R.scrollTop=0)},this.addFromPalette=r=>{let i=this.selfRef||this;this.designer.addNode(r.type,this.nextAddPosition()),i.notifyChange()},this.paletteDragStart=(r,i)=>{this.pendingNodeType=i.type,r?.dataTransfer&&(r.dataTransfer.setData("application/x-tsdi-workflow-node",i.type),r.dataTransfer.effectAllowed="copy"),this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:i.label}},this.handlePan=(r,i)=>{this.designer.panBy(r,i)},this.selectRun=r=>{this.designer.selectExecution(r)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let r=this.selfRef||this;r.showLogs=!1},this.handleCanvas=r=>{let i=this.designer;switch(r.type){case"background-down":i.connectionDraft?i.cancelConnection():i.clearSelection();break;case"pointer-move":r.world&&(i.drag?i.dragNodeTo(r.world):i.connectionDraft&&i.updateConnectionDraft(r.world));break;case"pointer-up":i.drag?i.endNodeDrag():i.connectionDraft&&i.cancelConnection();break;case"pointer-leave":i.drag?i.endNodeDrag():i.connectionDraft&&i.cancelConnection();break;case"node-down":i.connectionDraft&&r.nodeId?this.connectToNode(r.nodeId):r.nodeId&&r.world&&i.beginNodeDrag(r.nodeId,r.world);break;case"node-up":i.drag?i.endNodeDrag():i.connectionDraft&&r.nodeId&&this.connectToNode(r.nodeId);break;case"edge-click":r.connectionId&&i.selectConnection(r.connectionId);break;case"port-down":{let a=r.portType==="input"?"input":"output";if(!r.nodeId||!r.portId||!r.world)break;let n=i.connectionDraft;if(n){if((n.sourceSide||"output")!==a){i.completeConnection(r.nodeId,r.portId);break}i.cancelConnection()}i.beginConnection(r.nodeId,r.portId,r.world,a);break}case"port-up":{let a=i.connectionDraft;if(!a||!r.nodeId||!r.portId)break;let n=r.portType==="input"?"input":"output",l=a.sourceSide||"output";n!==l?i.completeConnection(r.nodeId,r.portId):(r.nodeId!==a.sourceNodeId||r.portId!==a.sourcePort)&&i.cancelConnection();break}case"drop":{let a=r.nodeType||this.pendingNodeType;if(this.pendingNodeType=void 0,a&&r.world){let n=this.registry.get(a),l=n?ft({type:n.type,position:{x:0,y:0},inputs:n.inputs||[],outputs:n.outputs||[]}):{width:184,height:64};i.addNode(a,{x:Math.round(r.world.x-l.width/2),y:Math.round(r.world.y-l.height/2)})}break}case"key-down":this.handleKey(r);break;case"wheel":{let a=this.canvasRect();if(r.ctrlKey||r.metaKey)this.zoomAtPoint(r,a);else{let n=!!r.shiftKey,l=Number(r.deltaX)||0,d=Number(r.deltaY)||0,c=n&&!l?d:l,p=n&&!l?0:d;i.panBy(-c,-p)}break}default:break}(r.type==="pointer-up"||r.type==="node-up"||r.type==="drop"||r.type==="port-down"||r.type==="port-up"||r.type==="key-down")&&this.notifyChange()},this.inspectorRestore=()=>{let r=this.designer.selectedNode;r&&(this.designer.resetNodeConfig(r.id),this.notifyChange())},this.inspectorChange=(r,i,a,n)=>{let l=n?this.designer.nodes.find(c=>c.id===n):this.designer.selectedNode;if(!l)return;if(r==="name"){this.designer.renameNode(l.id,String(i)),this.notifyChange();return}if(r==="description"){this.designer.updateNode(l.id,{description:String(i)}),this.notifyChange();return}if(r==="icon"||r==="color"){let c={...l.style||{}},p=String(i??"").trim();r==="icon"?p?c.icon=p:delete c.icon:p?c.backgroundColor=p:delete c.backgroundColor,this.designer.updateNode(l.id,{style:c}),this.notifyChange();return}if(a==="list"){this.designer.updateNodeConfig(l.id,{[r]:Array.isArray(i)?i:[]}),this.notifyChange();return}let d=i;if(a==="json")if(String(i??"").trim()==="")d=void 0;else try{d=JSON.parse(String(i))}catch(c){this.designer.error=`Invalid JSON: ${c.message}`;return}else if(a==="number"){if(d=i===""||i===void 0||i===null?void 0:Number(i),typeof d=="number"&&!Number.isFinite(d)){this.designer.error="Invalid number";return}}else a==="boolean"?d=!!i:a==="list"?d=Array.isArray(i)?i:[]:d=String(i??"");this.designer.updateNodeConfig(l.id,{[r]:d}),this.notifyChange()},fe(o),this.documentRef=e;try{e&&(e[U]=!0)}catch{}gt(e),Jo(e),uo(e),to(e)}onAfterViewInit(){if(this.applyDocumentTheme!==!1){let e=this.documentRef||globalThis.document;Ie(e,this.themeName)}}onInit(){this.selfRef=this,this.registry||(this.registry=new N),this.autoRun&&this.designer&&this.designer.run({context:this.runContext})}onDestroy(){}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ne(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}setTheme(e){if(this.theme=ne(e)?e:"light",this.applyDocumentTheme!==!1){let t=this.documentRef||globalThis.document;Ie(t,this.theme)}this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return x(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get visibleActions(){return Array.isArray(this.hiddenActions)?this.hiddenActions:[]}visibleAction(e){return!this.visibleActions.includes(e)}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let o=No(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:o},o}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let o=To(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:o},o}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,o=this.localeValue,r=this.registry.revision,i=e?.id||"",a=e?.name||"",n=e?.description||"",l=e?.type||"",d=e?.config,c=this.inspectorModelCache;if(c&&c.nodeId===i&&c.name===a&&c.description===n&&c.type===l&&c.config===d&&c.execution===t&&c.locale===o&&c.revision===r)return c.model;let p=Eo(this.designer,this.registry,o,this.translator);return this.inspectorModelCache={nodeId:i,name:a,description:n,type:l,config:d,execution:t,locale:o,revision:r,model:p},p}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let o=Lo(this.designer,this.localeValue,this.translator);return this.toolbarModelCache={key:e,model:o},o}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let o=Oo(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:o},o}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,o=this.localeValue,r=this.runHistoryCache;if(r&&r.history===e&&r.selected===t&&r.locale===o)return r.model;let i=_o(this.designer,o,this.translator);return this.runHistoryCache={history:e,selected:t,locale:o,model:i},i}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let o=e?.logs||[];return this.runLogsCache={execution:e,logs:o},o}get codeSuggestions(){let e=this.designer.nodes.map(a=>[a.id,a.type,a.config?.action||"",a.config?.field||"",a.config?.target||"",JSON.stringify(a.config?.values||""),JSON.stringify(a.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let o=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),r=a=>{typeof a=="string"&&a.trim()&&o.add(a.trim())};this.designer.nodes.forEach(a=>{let n=a.config||{};if(typeof n.action=="string"){let l=n.action.replace(/^actions\./,"");r(`context.actions.${l}`),r(`input.actions.${l}`)}typeof n.field=="string"&&(r(n.field),n.field.includes(".")||r(`variables.${n.field}`)),typeof n.target=="string"&&r(n.target.includes(".")?n.target:`variables.${n.target}`),n.values&&typeof n.values=="object"&&Object.keys(n.values).forEach(l=>r(`variables.${l}`)),n.result&&typeof n.result=="object"&&Object.keys(n.result).forEach(l=>r(`input.${l}`)),typeof n.event=="string"&&r(`context.events.${n.event}`)});let i=Array.from(o).slice(0,240);return this.codeSuggestionCache={key:e,values:i},i}canvasModelKey(){let e=this.designer,t=e.execution,o=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],r=e.connectionDraft;return o.push(r?`draft:${r.sourceNodeId}:${r.sourcePort}:${r.sourceSide||"output"}:${r.x}:${r.y}`:""),(e.nodes||[]).forEach(i=>{o.push([i.id,i.name,i.type,i.description||"",i.position?.x,i.position?.y,i.dimension?.width||"",i.dimension?.height||"",i.style?.icon||"",i.style?.backgroundColor||"",i.style?.textColor||"",(i.inputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),(i.outputs||[]).map(a=>`${a.id}:${a.label||""}:${a.name||""}:${a.type||""}`).join(","),t?.nodeStates?.[i.id]?.status||""].join(":"))}),(e.connections||[]).forEach(i=>{o.push([i.id,i.sourceNodeId,i.sourcePort,i.targetNodeId,i.targetPort,i.label||"",t?.edgeStates?.[i.id]?.status||""].join(":"))}),o.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},o=this.viewportBounds(),r=t;return o&&(t.x>=o.left&&t.x+184<=o.right&&t.y>=o.top&&t.y+64<=o.bottom||(r={x:Math.round((o.left+o.right)/2-92),y:Math.round((o.top+o.bottom)/2-32)})),this.findFreePosition(r)}canvasViewport(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{width:r.width,height:r.height}}canvasRect(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{left:r.left,top:r.top,width:r.width,height:r.height}}zoomAtPoint(e,t){let o=Number(e.deltaY)||0;if(!o)return;let r=this.designer,i=r.zoom||1,a=o<0?1.1:.9,n=Math.max(.2,Math.min(2.5,i*a)),l=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),c=r.pan||{x:0,y:0},p=(l-c.x)/i,h=(d-c.y)/i;r.setZoom(n);let f=r.zoom||n;r.pan={x:Math.round(l-p*f),y:Math.round(d-h*f)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,o=this.designer.pan||{x:0,y:0};return{left:-o.x/t,top:-o.y/t,right:(e.width-o.x)/t,bottom:(e.height-o.y)/t}}findFreePosition(e){let r=[0,1,-1,2,-2,3,-3];for(let i=0;i<30;i++)for(let a of r){let n={x:e.x+a*220,y:e.y+i*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-n.x)<184&&Math.abs(d.position.y-n.y)<64))return n}return e}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let o=this.designer.nodes.find(i=>i.id===e);if(!o){this.designer.cancelConnection();return}let r=t.sourceSide==="input"?o.outputs:o.inputs;if(!r?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,r[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.notifyChange()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",K)(C.prototype,"designer");Reflect.metadata("design:type",N)(C.prototype,"registry");Reflect.metadata("design:type",Object)(C.prototype,"locale");Reflect.metadata("design:type",Object)(C.prototype,"theme");Reflect.metadata("design:type",Object)(C.prototype,"applyDocumentTheme");Reflect.metadata("design:type",Function)(C.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(C.prototype,"runContext");Reflect.metadata("design:type",Object)(C.prototype,"autoRun");Reflect.metadata("design:type",Object)(C.prototype,"saveState");Reflect.metadata("design:type",Array)(C.prototype,"hiddenActions");Reflect.metadata("design:type",Object)(C.prototype,"showRunHistory");Reflect.metadata("design:type",Object)(C.prototype,"showStatusbar");Reflect.metadata("design:type",Object)(C.prototype,"showRunLogs");Reflect.metadata("design:type",Function)(C.prototype,"hostAction");Reflect.metadata("design:type",Function)(C.prototype,"autosaveAction");Reflect.metadata("design:type",Object)(C.prototype,"documentRef");Reflect.metadata("design:type",Object)(C.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(C.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(C.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(C.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(C.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(C.prototype,"paletteCache");Reflect.metadata("design:type",Object)(C.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(C.prototype,"codeSuggestionCache");Reflect.metadata("design:paramtypes",[Object,I,V])(C);w(C,[[u(),1,"designer"],[u(),1,"registry"],[u(),1,"locale"],[u(),1,"theme"],[u(),1,"applyDocumentTheme"],[u(),1,"themeChangeAction"],[u(),1,"runContext"],[u(),1,"autoRun"],[u(),1,"saveState"],[u(),1,"hiddenActions"],[u(),1,"showRunHistory"],[u(),1,"showStatusbar"],[u(),1,"showRunLogs"],[u(),1,"hostAction"],[u(),1,"autosaveAction"],[z(),1,"documentRef"],[z(),1,"canvasModelCache"],[z(),1,"toolbarModelCache"],[z(),1,"inspectorModelCache"],[z(),1,"runHistoryCache"],[z(),1,"statusModelCache"],[z(),1,"paletteCache"],[z(),1,"runLogsCache"],[z(),1,"codeSuggestionCache"],[v(),3,void 0,2],[v(),3,void 0,1],[q(nt),3,void 0,0],[v(),3,void 0,0],[S({selector:"workflow-designer-preview",template:`
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
    </div>`}),0]]);var O=class{constructor(e,t,o,r,i,a){this.translator=r,this.elementRef=a,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=yo(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.previewHiddenActions=["save","open-library"],this.showLibrary=!1,this.showRename=!1,this.renameValue="",this.renameError="",this.libraryError="",this.libraryItems=[],this.autosaveInFlight=!1,this.changeLocale=l=>{let d=this.selfRef||this;d.locale=l,d.localeChangeAction?.(l)},this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let l=this.selfRef||this;l.designer?.dirty&&(l.saveState!=="saving"&&(l.saveState="dirty"),l.autosave&&(l.clearAutosaveTimer(),l.autosaveTimer=setTimeout(()=>{l.autosaveTimer=void 0,l.performAutosave()},Math.max(0,Number(l.autosaveDelay)||0))))},this.toolbarAction=l=>{let d=this.selfRef||this;if(l.startsWith("language:")){let c=l.slice(9);(c==="en"||c==="zh-CN")&&d.changeLocale(c);return}if(l.startsWith("theme:")){let c=l.slice(6);(c==="light"||c==="dark"||c==="solarized"||c==="high-contrast")&&d.setTheme(c);return}if(l==="rename"){d.openRename();return}if(l==="save"){d.saveWorkflow();return}if(l==="open-library"){d.openLibrary();return}d.preview?.handleToolbarAction(l)},this.previewHostAction=l=>{this.toolbarAction(l)},this.fitView=()=>{this.preview?.fitView()},this.openLibrary=async()=>{let l=this.selfRef||this;try{l.libraryItems=await l.designer.listSaved(l.store),l.libraryError=""}catch(d){l.libraryError=d.message}l.showLibrary=!0},this.openRename=()=>{let l=this.selfRef||this;l.renameValue=l.designer?.definition?.name||"",l.renameError="",l.showRename=!0},this.renameInput=l=>{let d=this.selfRef||this;d.renameValue=String(l?.target?.value??""),d.renameError=""},this.renameKey=l=>{let d=String(l?.key||"");if(d==="Enter"){l?.preventDefault?.(),this.commitRename();return}d==="Escape"&&(l?.preventDefault?.(),this.cancelRename())},this.cancelRename=()=>{let l=this.selfRef||this;l.showRename=!1,l.renameError=""},this.commitRename=()=>{let l=this.selfRef||this,d=String(l.renameValue||"").trim();if(!d){l.renameError=l.t("renameEmpty","Enter a workflow name");return}let c=l.activeTab();if(!c){l.showRename=!1;return}c.designer.renameWorkflow(d),l.showRename=!1,l.renameError="",l.emitTabs(),l.scheduleAutosave()},this.saveWorkflow=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store);let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.saveWorkflowAs=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store,{as:!0,name:`${l.designer.definition.name} copy`});let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.loadWorkflow=async l=>{let d=this.selfRef||this,c=d.workflowTabs.find(h=>h.id===l);if(c){try{let h=await d.store.get(l);if(!h){d.libraryError=`${d.t("notFound","Workflow not found")}: ${l}`;return}c.designer.load(h),d.setActiveTab(c),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(h){d.libraryError=h.message}return}await d.openWorkflowTab(l)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async l=>{let d=this.selfRef||this;try{d.workflowTabs.some(c=>c.id===l)&&await d.closeWorkflowTab(l),await d.designer.removeSaved(d.store,l),await d.refreshLibrary()}catch(c){d.libraryError=c.message}},this.closeLibrary=()=>{let l=this.selfRef||this;l.showLibrary=!1},this.documentRef=o;try{o&&(o[U]=!0)}catch{}this.registry=e||new N,this.service=t,this.reactiveEffect=i,gt(o),Ie(o,this.themeName);let n=new K({registry:this.registry,service:t,definition:Ht(this.registry,this.localeValue,r)});this.designer=i?qe(n,i):n,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,wt.subscribe(t=>this.toolbarAction(t));let e=globalThis.document;e?.addEventListener&&(this.menuClickHandler=t=>{let r=t?.target?.closest?.("[data-menu-id]")?.getAttribute?.("data-menu-id");r&&setTimeout(()=>{globalThis.__workflowMenuHandled!==r&&this.toolbarAction(r)},0)},e.addEventListener("click",this.menuClickHandler,!0)),this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=globalThis.document;this.menuClickHandler&&e?.removeEventListener&&e.removeEventListener("click",this.menuClickHandler,!0);let t=this.documentRef;t?.removeEventListener&&this.keyHandler&&t.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ne(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get toolbarModel(){return this.preview?.toolbarModel}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=vo(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let o=e.createTab(t);e.workflowTabs.push(o),e.setActiveTab(o),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(r=>r.id===e))return await t.activateWorkflowTab(e),!0;try{let r=await t.store.get(e);if(!r)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let i=t.createTab(r,!0);return t.workflowTabs.push(i),t.setActiveTab(i),t.emitTabs(),!0}catch(r){return t.libraryError=r.message,!1}}async restoreWorkflowTabs(e,t){let o=this.selfRef||this,r=[],i;try{i=new Set((await o.store.list()).map(n=>n.id))}catch{i=new Set(e||[])}for(let n of Array.from(new Set(e||[])))if(!(!n||!i.has(n)))try{let l=await o.store.get(n);l&&r.push(o.createTab(l,!0))}catch{}if(!r.length)return!1;o.workflowTabs=r;let a=r.find(n=>n.id===t)||r[0];return o.setActiveTab(a),o.emitTabs(),!0}createTab(e,t=!1){let o=new K({registry:this.registry,service:this.service,definition:e}),r=this.reactiveEffect?qe(o,this.reactiveEffect):o;return{id:r.definition.id,designer:r,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.find(r=>r.id===e);!o||o.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(o),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.findIndex(i=>i.id===e);if(o<0)return;let[r]=t.workflowTabs.splice(o,1);if(t.autosave&&r.designer.dirty)try{await t.saveTab(r)}catch{}if(t.activeTabId===e){let i=t.workflowTabs[Math.min(o,t.workflowTabs.length-1)];i?t.setActiveTab(i):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,o=e.id,r=e.designer.definition.id;o!==r&&(e.id=r,t.activeTabId===o&&(t.activeTabId=r),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(r=>r.persisted),o=e.activeTab();e.tabChangeAction?.({openIds:t.map(r=>r.id),activeId:o?.persisted?o.id:t[0]?.id})}setTheme(e){this.theme=ne(e)?e:"light";let t=this.documentRef||globalThis.document;Ie(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}get renameTitle(){return this.t("renameTitle","Rename workflow")}get renamePlaceholder(){return this.t("renamePlaceholder","Workflow name")}get renameConfirmLabel(){return this.t("renameConfirm","Rename")}get cancelLabel(){return this.t("cancel","Cancel")}t(e,t){return x(this.translator,this.localeValue,`workflow.ui.${e}`,t)}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,o=String(e?.key||""),r=!!(e?.ctrlKey||e?.metaKey),i=e?.target,a=String(i?.tagName||"").toLowerCase(),n=a==="input"||a==="textarea"||a==="select"||!!i?.isContentEditable;if(r&&(o==="s"||o==="S")){e.preventDefault(),t.saveWorkflow();return}if(r&&(o==="o"||o==="O")){e.preventDefault(),t.openLibrary();return}if(r&&o==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!n&&(o==="?"||o==="F1")){e.preventDefault(),t.preview?.toggleShortcuts();return}o==="Escape"&&t.preview?.showShortcuts&&(e.preventDefault(),t.preview?.closeShortcuts())}get canvasModel(){return this.preview?.canvasModel}get inspectorModel(){return this.preview?.inspectorModel}get statusModel(){return this.preview?.statusModel}get codeSuggestions(){return this.preview?.codeSuggestions??[]}get saveStateLabel(){return this.preview?.saveStateLabel??""}get showLogs(){return!!this.preview?.showLogs}set showLogs(e){this.preview&&(this.preview.showLogs=e)}get jsonText(){return this.preview?.jsonText??""}set jsonText(e){this.preview&&(this.preview.jsonText=e)}toggleJson(){this.preview?.toggleJson()}handleCanvas(e){this.preview?.handleCanvas(e)}toggleShortcuts(){this.preview?.toggleShortcuts()}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await e.designer.listSaved(e.store)}};Reflect.metadata("design:type",Object)(O.prototype,"locale");Reflect.metadata("design:type",Object)(O.prototype,"theme");Reflect.metadata("design:type",Function)(O.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(O.prototype,"localeChangeAction");Reflect.metadata("design:type",K)(O.prototype,"designer");Reflect.metadata("design:type",Object)(O.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(O.prototype,"runContext");Reflect.metadata("design:type",Object)(O.prototype,"autoRun");Reflect.metadata("design:type",Object)(O.prototype,"store");Reflect.metadata("design:type",Object)(O.prototype,"autosave");Reflect.metadata("design:type",Object)(O.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(O.prototype,"tabChangeAction");Reflect.metadata("design:type",C)(O.prototype,"preview");Reflect.metadata("design:type",Object)(O.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(O.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(O.prototype,"keyHandler");Reflect.metadata("design:type",Object)(O.prototype,"documentRef");Reflect.metadata("design:paramtypes",[N,se,Object,I,lt,V])(O);w(O,[[u(),1,"locale"],[u(),1,"theme"],[u(),1,"themeChangeAction"],[u(),1,"localeChangeAction"],[u(),1,"designer"],[u(),1,"initialDefinition"],[u(),1,"runContext"],[u(),1,"autoRun"],[u(),1,"store"],[u(),1,"autosave"],[u(),1,"autosaveDelay"],[u(),1,"tabChangeAction"],[ae("preview",C),1,"preview"],[z(),1,"autosaveTimer"],[z(),1,"autosaveInFlight"],[z(),1,"keyHandler"],[z(),1,"documentRef"],[v(),3,void 0,5],[v(),3,void 0,4],[v(),3,void 0,3],[q(nt),3,void 0,2],[v(),3,void 0,2],[v(),3,void 0,1],[v(),3,void 0,0],[S({selector:"workflow-designer",template:`
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
        <div class="workflow-rename" v-if="showRename">
            <div class="workflow-rename-panel">
                <div class="workflow-rename-head">
                    <span class="workflow-rename-title">{{renameTitle}}</span>
                    <button class="workflow-btn workflow-rename-close" type="button"
                        [aria-label]="cancelLabel" [title]="cancelLabel" @click="cancelRename"><icon name="close" size="sm"></icon></button>
                </div>
                <input class="workflow-rename-input" type="text" [value]="renameValue"
                    placeholder="{{renamePlaceholder}}" aria-label="{{renameTitle}}"
                    @input="renameInput" @keydown="renameKey" />
                <div class="workflow-rename-error" v-if="renameError">{{renameError}}</div>
                <div class="workflow-rename-actions">
                    <button class="workflow-btn" type="button" @click="cancelRename">{{cancelLabel}}</button>
                    <button class="workflow-btn workflow-btn-primary" type="button" @click="commitRename">{{renameConfirmLabel}}</button>
                </div>
            </div>
        </div>
    </div>`}),0]]);var Qr=ee("TAB_BAR_SOURCE"),ue=class{constructor(e){this.injectedSource=e}get activeSource(){return this.source||this.injectedSource}get visible(){return this.activeSource?this.activeSource.visible:!0}get items(){return this.activeSource?.items||[]}get showCreate(){return this.activeSource?this.activeSource.showCreate!==!1:!0}get createLabel(){return this.activeSource?.createLabel||"+"}get closeLabel(){return this.activeSource?.closeLabel||"\u2715"}select(e,t){!e||(this.activeSource?.items||[]).some(r=>r.id===e&&r.disabled)||t?.target?.closest?.(".tab-close")||this.activeSource?.select?.(e)}closeTab(e,t){t?.stopPropagation?.(),this.close(e)}create(){this.activeSource?.create?.()}close(e){this.activeSource?.close?.(e)}};Reflect.metadata("design:type",Object)(ue.prototype,"source");Reflect.metadata("design:paramtypes",[Object])(ue);w(ue,[[u(),1,"source"],[q(Qr),3,void 0,0],[v(),3,void 0,0],[S({selector:"tab-bar",template:`
    <p class="tab-bar" role="tablist" v-show="visible">
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" v-for="tab in items" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-cell-width="3" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `}),0]]);var je=class{};w(je,[[$({declarations:[ue],exports:[ue]}),0]]);var st=class{};w(st,[[$({imports:[xt,Rt,It,je,Tt,At,_e,Pe,Le,Ne],providers:[se,De,N,ce,ze,re],declarations:[T,G,B,F,Q,Y,P,C,W,O],exports:[xt,Rt,It,je,Tt,At,_e,Pe,Le,Ne,se,De,N,ce,re,T,G,B,F,Q,Y,P,C,W,O]}),0]]);var Fe={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function Ve(s,e,t,o){return{id:s,name:e,type:t,label:o}}var es=[{type:Fe.route,label:"Gateway route",description:"Forward matching requests to a microservice or static upstream",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[Ve("in","in","input","Input")],outputs:[Ve("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value."},{key:"service",label:"Service",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",type:"number",min:0,step:100},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"headers",label:"Request headers",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:Fe.condition,label:"Gateway condition",description:"Match path, method, host, header or query values",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[Ve("in","in","input","Input")],outputs:[Ve("true","true","output","True"),Ve("false","false","output","False")],fields:[{key:"field",label:"Field",type:"select",defaultValue:"path",options:[{label:"Path",value:"path"},{label:"Method",value:"method"},{label:"Host",value:"host"},{label:"Header",value:"header"},{label:"Query",value:"query"}]},{key:"name",label:"Header / query name",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"prefix",value:"prefix"},{label:"not prefix",value:"not-prefix"},{label:"exists",value:"exists"},{label:"not exists",value:"not-exists"}]},{key:"value",label:"Value",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:Fe.deny,label:"Gateway deny",description:"Reject matching requests at the gateway",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[Ve("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"body",label:"Body",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function Ut(s){return es.forEach(e=>s.register(e)),s}function ts(){return Ut(new N)}function yt(s="zh-CN"){let e=s==="zh-CN",t=ts(),o=(c,p,h,f,b,y)=>t.createNode(c,{x:f,y:b},{id:p,name:h,config:y}),r=o("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),i=o(Fe.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),a=o(Fe.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),n=o(Fe.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),l=(c,p,h,f)=>({id:c,sourceNodeId:p,sourcePort:h,targetNodeId:f,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[r,i,a,n],connections:[l("conn_1","start_1","out","condition_1"),l("conn_2","condition_1","true","route_1"),l("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}var bt=class{constructor(e){this.http=e}async list(){let e=await this.http.listRules();if(!e.ok)return[];let t=e.body;return Array.isArray(t)?t:Array.isArray(t?.items)?t.items:[]}async get(e){let t=await this.http.getRule(e);if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return t.body}}async save(e){let t=await this.http.saveRule(e);if(!t.ok)throw new Error(t.body?.message||t.body?.error||`Failed to apply gateway rules: HTTP ${t.status}`);return t.body?.summary??bo(e)}async remove(e){let t=await this.http.removeRule(e);return t.ok||t.status===404}async clear(){let e=await this.list();await Promise.all(e.map(t=>this.remove(t.id)))}};var os=["run","resume","cancel","toggle-logs","save","open-library","clear","menu"],kt=class{constructor(e,t,o){this.state=e,this.http=o,this.designerOpen=!1,this.designerHiddenActions=os,this.store=new bt(o),this.registry=Ut(new N);let r=new K({registry:this.registry,definition:yt("zh-CN")});this.designer=t?qe(r,t):r}onInit(){this.state.openDesigner=()=>this.editRules(),this.state.init()}async onAfterViewInit(){await this.state.start()}onDestroy(){this.state.destroy()}async editRules(){this.state.error="",await this.loadRuleDocument(),this.designerOpen=!0}async loadRuleDocument(){if(this.state.creatingRuleWorkflow){this.state.creatingRuleWorkflow=!1;let r=yt("zh-CN");r.id=`gateway_rules_${Date.now().toString(36)}`,this.state.ruleWorkflowId=r.id,this.designer.load(r);return}let e=await this.store.list().catch(()=>[]),t=this.state.ruleWorkflowId||e[0]?.id||"",o;t&&(o=await this.store.get(t)),this.state.ruleWorkflowId=t,this.designer.load(o??yt("zh-CN"))}closeDesigner(){this.designerOpen=!1}async applyRules(){this.state.error="";try{let e=await this.store.save(this.designer.definition);this.designerOpen=!1,this.state.ruleWorkflowId=this.designer.definition.id,await this.state.loadRuleWorkflows(),this.state.status=this.state.t("status.rulesApplied",{count:e.nodeCount});let t=await this.state.fetchState();this.state.rules=t.rules??[],this.state.services=t.services??[]}catch(e){this.state.error=e.message}}};Reflect.metadata("design:paramtypes",[oo,lt,eo])(kt);w(kt,[[v(),3,void 0,2],[v(),3,void 0,1],[S({selector:"gateway-admin",imports:[st,Qt],template:`
    <div class="ga-shell">
        <aside class="ga-sidebar">
            <div class="ga-brand">
                <div class="ga-brand-mark">TS</div>
                <div>
                    {{state.t('brand.name')}}
                    {{state.t('brand.subtitle')}}
                </div>
            </div>
            <nav class="ga-nav">
                <button class="ga-nav-item" [class]="state.dashboardNavClass" type="button" @click="state.goDashboard">
                    <span class="ga-nav-icon">\u25EB</span>{{state.t('nav.overview')}}
                </button>
                <button class="ga-nav-item" [class]="state.routesNavClass" type="button" @click="state.goRoutes">
                    <span class="ga-nav-icon">\u21C4</span>{{state.t('nav.routes')}}
                </button>
                <button class="ga-nav-item" [class]="state.rulesNavClass" type="button" @click="state.goRules">
                    <span class="ga-nav-icon">\u2442</span>{{state.t('nav.rules')}}
                </button>
            </nav>
            <div class="ga-sidebar-foot">
                <span class="ga-env-dot"></span>
                <span>{{state.authEnabled ? state.t('sidebar.sso') : state.t('sidebar.live')}}</span>
                <a v-if="state.authEnabled" class="ga-signout" href="/admin/auth/logout">{{state.t('sidebar.signOut')}}</a>
            </div>
        </aside>

        <main class="ga-main">
            <header class="ga-topbar">
                <div class="ga-topbar-title">
                    <h1>{{state.pageTitle}}</h1>
                    <span>{{state.pageSubtitle}}</span>
                </div>
                <div class="ga-topbar-right">
                    <span class="ga-status">{{state.status}}</span>
                    <span class="ga-error" v-if="state.error">{{state.error}}</span>
                    <menu-bar class="ga-global-menu" icon="menu" label="" caret="caret-down"
                        :triggerTitle="state.t('top.menu')" :groups="state.globalMenuGroups"
                        :selectAction="state.globalMenuSelect"></menu-bar>
                    <button class="ga-btn" type="button" @click="state.reload">{{state.t('top.refresh')}}</button>
                </div>
            </header>

            <div class="ga-content">
                <section class="ga-login" v-if="state.needsLogin">
                    <div class="ga-login-card">
                        <div class="ga-login-mark">TS</div>
                        <h2>{{state.t('login.title')}}</h2>
                        <p>{{state.t('login.desc')}}</p>
                        <a class="ga-btn ga-btn-primary" href="/admin/auth/login?redirect=/admin/">{{state.t('login.button')}}</a>
                    </div>
                </section>

                <router-outlet></router-outlet>
            </div>
        </main>

        <div class="ga-modal" v-if="state.routeEditorOpen">
            <div class="ga-modal-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.editingIndex >= 0 ? state.t('editor.editTitle') : state.t('editor.addTitle')}}</h2>
                        <p>{{state.t('editor.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeRouteEditor">\u2715</button>
                </header>
                <div class="ga-form-grid">
                    <label class="ga-field">
                        <span>{{state.t('editor.path')}}</span>
                        <input data-field="path" [value]="state.editingRoute.path" placeholder="/api/users"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.path">{{state.routeErrors.path}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.service')}}</span>
                        <input data-field="service" [value]="state.editingRoute.service" placeholder="users-service"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.service">{{state.routeErrors.service}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.targetUrl')}}</span>
                        <input data-field="targetUrl" [value]="state.editingRoute.targetUrl" placeholder="http://127.0.0.1:3001"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.targetUrl">{{state.routeErrors.targetUrl}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.targetPath')}}</span>
                        <input data-field="targetPath" [value]="state.editingRoute.targetPath" placeholder="/users"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.targetPath">{{state.routeErrors.targetPath}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.methods')}}</span>
                        <input data-field="methods" [value]="state.routeMethods(state.editingRoute)" placeholder="GET, POST"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.methods">{{state.routeErrors.methods}}</div>
                    </label>
                    <label class="ga-field">
                        <span>{{state.t('editor.timeout')}}</span>
                        <input data-field="timeout" type="number" [value]="state.editingRoute.timeout"
                            @input="state.editRouteField($event)" />
                        <div class="ga-field-error" v-if="state.routeErrors.timeout">{{state.routeErrors.timeout}}</div>
                    </label>
                </div>
                <div class="ga-form-row">
                    <label class="ga-check">
                        <input type="checkbox" data-field="stripPrefix" [checked]="state.editingRoute.stripPrefix === true"
                            @change="state.editRouteField($event)" />
                        <span>{{state.t('editor.stripPrefix')}}</span>
                    </label>
                    <label class="ga-check">
                        <input type="checkbox" data-field="enabled" [checked]="state.editingRoute.enabled !== false"
                            @change="state.editRouteField($event)" />
                        <span>{{state.t('editor.enabled')}}</span>
                    </label>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeRouteEditor">{{state.t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-route-save" type="button" @click="state.saveRouteEditor">{{state.t('editor.save')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-designer-page" v-if="designerOpen">
            <header class="ga-designer-head">
                <div>
                    <h2>{{state.t('designer.title')}}</h2>
                    <p>{{state.t('designer.desc')}}</p>
                </div>
                <div class="ga-actions">
                    <button class="ga-btn ga-rules-cancel" type="button" @click="closeDesigner">{{state.t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-rules-apply" type="button" @click="applyRules">{{state.t('designer.apply')}}</button>
                </div>
            </header>
            <div class="ga-designer-body">
                <workflow-designer-preview
                    :designer="designer"
                    :registry="registry"
                    :locale="state.locale"
                    :theme="state.theme"
                    :applyDocumentTheme="false"
                    :hiddenActions="designerHiddenActions"
                    :showRunHistory="false"
                    :showRunLogs="false"
                    :showStatusbar="true"></workflow-designer-preview>
            </div>
        </div>
    </div>`}),0]]);export{kt as GatewayAdminComponent};
