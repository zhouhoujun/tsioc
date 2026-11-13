import{a as ne,b as Ie,c as It}from"./chunk-IT4KMVRA.js";import{b as eo,j as to,k as oo,l as At,m as Tt,n as ro}from"./chunk-TBV7WHO4.js";import{$ as K,A as qe,B as Xt,C as Yt,D as xt,O as nt,Z as Zt,_ as St,a as w,aa as lt,ba as V,ca as We,fa as P,ga as Qt,ka as p,la as Ct,ma as ie,na as S,q as ee,qa as Rt,r as se,ra as fe,s as it,u as $,v as q,w as v,x as A,y as vt,z as Gt}from"./chunk-SPMG5PJO.js";import"./chunk-U6UJE3IR.js";var I=class{};w(I,[[se(),0]]);var Ae=ee("I18N_OPTIONS"),Ko=ee("I18N_LOCALE"),ca=ee("I18N_TRANSLATIONS"),Je=ee("TRANSLATION_LOADERS");var le=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(le);w(le,[[v(),3,void 0,0],[q(Ae),3,void 0,0],[A(),0]]);var dt=class{format(e,t,o){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,o):this.interpolate(e,t)}interpolate(e,t){let o=e;return"#"in t&&(o=o.replace(/#/g,String(t["#"]))),o=o.replace(/\{(\w+)\}/g,(r,s)=>{if(s in t){let i=t[s];return String(i)}return r}),o}formatICU(e,t,o){let r=e,s=/\{(\w+),\s*(plural|select),\s*/g,i;for(;(i=s.exec(e))!==null;){let n=i.index,l=i[1],d=i[2],c=n+i[0].length,u=this.findMatchingBrace(e,n);if(u===-1)continue;let m=e.substring(c,u),f=e.substring(n,u+1),b=this.parseChoices(m);if(d==="plural"){let y=t[l];if(typeof y=="number"){let k=this.getPluralForm(y,o),R=b[k]||b.other||"",O=this.interpolate(R,{"#":y,...t});r=r.replace(f,O)}}else if(d==="select"){let y=t[l];if(y!==void 0){let k=b[String(y)]||b.other||"",R=this.interpolate(k,t);r=r.replace(f,R)}}}return this.interpolate(r,t)}findMatchingBrace(e,t){let o=1;for(let r=t+1;r<e.length;r++)if(e[r]==="{")o++;else if(e[r]==="}"&&(o--,o===0))return r;return-1}parseChoices(e){let t={},o=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,r;for(;(r=o.exec(e))!==null;){let s=r[1],i=r.index+r[0].length,n=this.findMatchingBrace(e,r.index+r[0].length-1);if(n!==-1){let l=e.substring(i,n);t[s]=l.trim()}}return t}getPluralForm(e,t){let o=t.split("-")[0];return o==="zh"||o==="ja"||o==="ko"?"other":o==="en"||o==="de"||o==="nl"?e===1?"one":"other":o==="ru"||o==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":o==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var he=class extends I{constructor(e,t,o){super(),this.injector=e,this.options=t,this.localeService=o,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new dt,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(Je,[]);for(let t of e){let o=await t.load(this.options.basePath,this.options.locales||[]);for(let r of o)this._translations.set(r.locale,r),this.localeService.registerBundle(r.locale,r)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,o){let r=typeof t=="string"?t:this._currentLocale,s=typeof t=="string"?o:t,i=this._translations.get(r);if(!i)return e;let n=this.getMessage(i,e);return n?this._formatter.format(n,s||{},r):e}getMessage(e,t){let o=t.split("."),r=e.messages;for(let s of o)if(r&&typeof r=="object"&&s in r)r=r[s];else return;return typeof r=="string"?r:void 0}has(e,t){let o=t||this._currentLocale,r=this._translations.get(o);return r?this.getMessage(r,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[it,Object,le])(he);w(he,[[q(),3,void 0,2],[v(),3,void 0,1],[q(Ae),3,void 0,1],[q(),3,void 0,0],[A(),0]]);var He=class{};w(He,[[se(),0]]);var me=class extends He{constructor(e){super(),this.fileAdapter=e}async load(e,t){let o=[];for(let r of t)try{let s=await this.loadLocale(e,r);o.push(s)}catch{}return o}async loadLocale(e,t){let o=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(o))throw new Error(`Translation file not found: ${o}`);let s=await this.fileAdapter.readJSON(o);return{locale:t,messages:s}}};Reflect.metadata("design:paramtypes",[Zt])(me);w(me,[[q(),3,void 0,0],[A(),0]]);var ge=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let o,r;return t.length>0&&(typeof t[0]=="object"?o=t[0]:typeof t[0]=="string"&&(r=t[0])),t.length>1&&typeof t[1]=="object"&&(o=t[1]),r?this.translator.translate(e,r,o||{}):this.translator.translate(e,o||{})}};Reflect.metadata("design:paramtypes",[I])(ge);w(ge,[[A(),0],[Yt("translate"),0]]);var Go=[le,he,{provide:I,useClass:he},me,{provide:Je,useClass:me,multi:!0},ge],Te=class a{static withOptions(e){let t=[{provide:Ae,useValue:e}];return e.loader&&t.push({provide:Je,useClass:e.loader,multi:!0}),{module:a,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};w(Te,[[$({providers:Go,exports:[ge]}),0]]);var Nt=class{format(e,t,o){return new Intl.NumberFormat(t,o).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,o){return this.format(e,t,{minimumFractionDigits:o,maximumFractionDigits:o})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};w(Nt,[[A(),0]]);var Et=class{format(e,t,o){let r=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,o).format(r)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};w(Et,[[A(),0]]);var Ot=class{format(e,t,o,r){let s={style:"currency",...r};return o&&(s.currency=o),new Intl.NumberFormat(t,s).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};w(Ot,[[A(),0]]);var ct=class{constructor(e){this.translator=e}intercept(e,t,o){let r=t.handle(e,o);return typeof r=="string"&&r.startsWith("i18n:")?this.translator.translate(r.substring(5)):r&&typeof r=="object"?this.translateObject(r):r}translateObject(e){if(Array.isArray(e))return e.map(o=>this.translateObject(o));let t={};for(let[o,r]of Object.entries(e))typeof r=="string"&&r.startsWith("i18n:")?t[o]=this.translator.translate(r.substring(5)):typeof r=="object"?t[o]=this.translateObject(r):t[o]=r;return t}};Reflect.metadata("design:paramtypes",[I])(ct);w(ct,[[A(),0]]);var ao={en:{node:{start:{label:"Start",description:"Optional explicit entry point"},end:{label:"End",description:"Optional explicit end point"},inject:{label:"Inject",description:"Start a flow with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Transform the message with JavaScript"},condition:{label:"Condition",description:"Branch on a value from the flow context"},switch:{label:"Switch",description:"Route to the output matching a value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches"},loop:{label:"Loop",description:"Repeat downstream work"},trigger:{label:"Trigger",description:"Emit a payload after a delay"},delay:{label:"Delay",description:"Pause for a fixed or random time"},log:{label:"Log",description:"Write a message or value to the execution log"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint and read the response"},assign:{label:"Assign",description:"Merge values into flow variables"},transform:{label:"Transform",description:"Map the previous result into a new shape"},template:{label:"Template",description:"Render text from context values"},json:{label:"JSON",description:"Parse or stringify JSON values"},csv:{label:"CSV",description:"Parse or stringify CSV text"},change:{label:"Change",description:"Set, delete or append context fields"},statistics:{label:"Statistics",description:"Aggregate an array into a number"},merge:{label:"Merge",description:"Combine fields or arrays"},"event-emit":{label:"Emit event",description:"Publish an event to the host"},"event-wait":{label:"Wait event",description:"Wait for an event from the host"},command:{label:"Command",description:"Run a host command or function"},split:{label:"Split",description:"Split text or an array into items"},map:{label:"Map",description:"Map each item to a new value"},filter:{label:"Filter",description:"Keep items matching a condition"},sort:{label:"Sort",description:"Sort items by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Group items into batches"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Run another workflow"},comment:{label:"Comment",description:"Canvas note; not executed"},custom:{label:"Custom",description:"Run a custom activity or handler"},"mqtt-publish":{label:"MQTT publish",description:"Publish a message to an MQTT topic"},"mqtt-wait":{label:"MQTT wait",description:"Wait for the next message on an MQTT topic"},"redis-command":{label:"Redis command",description:"Run a Redis command and return its result"},"redis-publish":{label:"Redis publish",description:"Publish a message to a Redis channel"},"nats-publish":{label:"NATS publish",description:"Publish a message to a NATS subject"},"nats-request":{label:"NATS request",description:"Send a NATS request and wait for a reply"},"coap-request":{label:"CoAP request",description:"Send a CoAP request and return the response payload"},"gateway-route":{label:"Gateway route",description:"Forward matching requests to a microservice or static upstream"},"gateway-condition":{label:"Gateway condition",description:"Match path, method, host, header or query values"},"gateway-deny":{label:"Gateway deny",description:"Reject matching requests at the gateway"},debug:{label:"Debug",description:"Inspect a value or the complete message"},junction:{label:"Junction",description:"Merge wires without changing the message"},sequence:{label:"Sequence",description:"Keep downstream steps in order"},link:{label:"Link",description:"Connect distant wire segments by name"},html:{label:"HTML",description:"Extract text or links from HTML"},xml:{label:"XML",description:"Parse or stringify XML documents"},scale:{label:"Scale",description:"Map a number from one range to another"},router:{label:"Router",description:"Route to one of four outputs using ordered rules"}},field:{start:{},end:{},inject:{payload:"Payload (JSON)",topic:"Topic",payloadType:"Payload type"},task:{action:"Action name",result:"Result when no action",fail:"Mark as failed",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},function:{code:"JavaScript code",timeout:"Timeout",initialize:"Initialize code",finalize:"Finalize code"},condition:{field:"Value path",operator:"Operator",value:"Compare to"},switch:{field:"Value path",value:"Fallback value"},parallel:{},join:{},loop:{iterations:"Iterations",delay:"Delay"},trigger:{delay:"Delay",payload:"Payload (JSON)"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum",unit:"Unit"},log:{message:"Static message",field:"Value path",complete:"Log full context",level:"Level"},"http-request":{url:"Request URL",method:"Method",headers:"Headers (JSON)",body:"Body",responseType:"Response handling",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",authType:"Authentication",username:"Username",password:"Password"},assign:{values:"Values (JSON)"},transform:{mapping:"Mapping (JSON)",result:"Fixed result (JSON)"},template:{template:"Template",syntax:"Syntax",target:"Write result to",output:"Output type"},json:{mode:"Mode",field:"Value path",pretty:"Pretty print"},csv:{mode:"Mode",field:"Value path",delimiter:"Delimiter",header:"First row is header",columns:"Columns"},change:{action:"Action",field:"Field path",value:"Value",rules:"Rules"},statistics:{field:"Array path",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event name",payload:"Payload (JSON)"},"event-wait":{event:"Event name",timeout:"Timeout"},command:{command:"Command",args:"Arguments (JSON)",timeout:"Timeout"},split:{field:"Value path",delimiter:"Delimiter"},map:{field:"Array path",path:"Item path"},filter:{field:"Array path",path:"Item path",operator:"Operator",value:"Compare to"},sort:{field:"Array path",path:"Item path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array path",size:"Batch size",overlap:"Overlap"},trycatch:{timeout:"Timeout"},subprocess:{workflow:"Workflow JSON"},comment:{text:"Text"},custom:{result:"Result"},"mqtt-publish":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)",payload:"Payload",retain:"Retain"},"mqtt-wait":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)"},"redis-command":{url:"Redis URL",command:"Command",args:"Arguments"},"redis-publish":{url:"Redis URL",channel:"Channel",message:"Message"},"nats-publish":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"nats-request":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"coap-request":{host:"Host",port:"Port",method:"Method",path:"Path",payload:"Payload",timeout:"Timeout (ms)"},"gateway-route":{path:"Inbound path",service:"Service",targetUrl:"Target URL",targetPath:"Target path",stripPrefix:"Strip prefix",timeout:"Timeout (ms)",priority:"Priority",headers:"Request headers",responseHeaders:"Response headers",rateLimit:"Rate limit",cache:"Cache",circuitBreaker:"Circuit breaker",bulkhead:"Bulkhead"},"gateway-condition":{field:"Field",name:"Header / query name",operator:"Operator",value:"Value"},"gateway-deny":{status:"Status",message:"Message",priority:"Priority",body:"Body"},debug:{field:"Value path",complete:"Complete message",level:"Level",console:"Also print to console",active:"Enabled"},link:{links:"Link names"},html:{field:"HTML path",mode:"Output",target:"Write result to",tag:"Tag",attribute:"Attribute name"},xml:{mode:"Mode",field:"XML path",target:"Write result to",pretty:"Pretty print",attributes:"Include attributes",text:"Include text"},scale:{field:"Value path",inMin:"Input minimum",inMax:"Input maximum",outMin:"Output minimum",outMax:"Output maximum",clamp:"Clamp to range",round:"Round result",target:"Write result to"},router:{field:"Value path",rules:"Rules",operator:"Operator",value:"Compare to"}},fieldPlaceholder:{start:{},end:{},inject:{topic:"orders.created",payload:'{ "value": 1 }'},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{},loop:{},trigger:{payload:'{ "ok": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:",",columns:"name, age"},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{payload:'{ "id": 1 }',event:"order.created"},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{text:"Canvas note"},custom:{result:'{ "ok": true }'},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"/api/users",service:"users-service",targetUrl:"http://127.0.0.1:3001",targetPath:"/users",headers:'{ "x-gateway": "1" }',responseHeaders:'{ "x-served-by": "gateway" }',rateLimit:'{ "limit": 100, "windowMs": 60000 }',cache:'{ "enabled": true, "ttl": 30000 }',circuitBreaker:'{ "failureThreshold": 5 }',bulkhead:'{ "maxConcurrent": 20 }'},"gateway-condition":{name:"x-role",value:"/api/users"},"gateway-deny":{body:'{ "error": "forbidden" }'},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1",attribute:"href"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"},scale:{field:"value",target:"value"},router:{field:"result.status"}},fieldDescription:{start:{},end:{},inject:{topic:"optional label carried with the payload",payload:"Value sent by the trigger. JSON is merged into the context; primitives are sent as-is.",payloadType:"choose the value type; JSON merges into the context, primitives are sent as-is"},task:{action:"name of a function in context.actions; leave empty to return the result below",result:"JSON returned when no action is set",retry:"automatic retries before the step fails",fail:"force this step to fail so error branches can run",retryDelay:"wait time between retries",timeout:"maximum time for this step; 0 means no limit"},function:{code:"return the next message; context and input expose the flow context",timeout:"maximum time for this step; 0 means no limit",initialize:"Optional code that runs before the main function. Returned objects are merged into the context.",finalize:"Optional code that runs after the main function for cleanup or metrics."},condition:{field:"context path to test, for example approved or user.role",operator:"comparison used to choose the true or false output",value:"value used by the selected operator"},switch:{field:"value used to choose an output port",value:"used when no value path is set"},parallel:{},join:{},loop:{iterations:"number of times downstream steps run",delay:"wait time between iterations"},trigger:{delay:"time to wait before emitting the payload",payload:"JSON emitted when the trigger fires"},delay:{delay:"pause duration before the next node",mode:"fixed waits a set time; random picks a value in the range",randomMin:"minimum random delay",randomMax:"maximum random delay",unit:"unit used by the delay values"},log:{message:"text written when no value path is set",field:"context path to log, for example result.value",complete:"write the complete flow context",level:"log level: info, warn or error"},"http-request":{url:"absolute endpoint or a host path starting with /",method:"HTTP request method",headers:"JSON object of request headers",body:"request body for POST, PUT or PATCH",responseType:"auto parses JSON when possible; text keeps raw text; JSON fails on invalid JSON",retry:"automatic retries after a failed request",retryDelay:"wait time between retries",timeout:"maximum wait time for the request",authType:"choose whether to send a Basic authorization header",username:"Basic authentication user name",password:"Basic authentication password"},assign:{values:"JSON object merged into flow variables"},transform:{mapping:"target field to context path mapping",result:"fixed JSON result"},template:{template:"text with placeholders such as {{name}} or {{user.email}}",target:"context field that receives the rendered value",syntax:"Mustache replaces placeholders; plain text is used as-is",output:"text keeps a string; JSON parses the rendered text"},json:{field:"context path to parse or stringify",mode:"parse JSON text or stringify a value",pretty:"indent the serialized JSON"},csv:{field:"context path to CSV text or an array",delimiter:"single character between columns",mode:"parse CSV text or stringify an array",header:"treat the first row as column names",columns:"Optional comma-separated columns to keep when parsing or stringifying."},change:{field:"context path to modify, for example variables.name",value:"new value; JSON is supported",rules:"rules run in order, one change per row",action:"Set replaces, Delete removes, Append adds to a list or string"},statistics:{field:"context path to the array to aggregate",path:"property of each item used for the calculation",operation:"count, sum, average, min or max",resultField:"field that receives the result"},merge:{fields:"comma-separated context fields to merge",mode:"object merge or array concat",resultField:"field that receives the result"},"event-emit":{event:"event name shared by emitters and waiters",payload:"JSON data sent with the event"},"event-wait":{event:"event name to wait for",timeout:"maximum time to wait for the event"},command:{args:"JSON array passed to the command",command:"host command or function name",timeout:"maximum execution time for the command"},split:{field:"text or array path to split",delimiter:"separator used when splitting text"},map:{path:"property of each item to map",field:"array path to iterate"},filter:{field:"array path to filter",path:"item property used for comparison",operator:"comparison operator",value:"value used for comparison"},sort:{path:"item property used for sorting",field:"array path to sort",order:"ascending or descending"},range:{from:"inclusive start value",to:"exclusive end value",step:"amount added on each step"},batch:{size:"number of items per batch",field:"array path to split into batches",overlap:"items repeated at the start of the next batch; 0 disables overlap"},trycatch:{timeout:"route to the timeout port after this delay"},subprocess:{workflow:"workflow definition to execute"},comment:{},custom:{result:"Value returned by the custom node."},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"JSON array of command arguments."},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"Defaults to the path condition value.",priority:"Lower runs first."},"gateway-condition":{},"gateway-deny":{priority:"Lower runs first."},debug:{field:"context path to inspect",complete:"print the complete workflow context",console:"also write to the host console for development",level:"output level: info, warn or error",active:"turn off to keep the node but skip its output"},link:{links:"optional comma-separated names for remote wires"},html:{field:"context path containing HTML text",mode:"text strips markup; links collects href and src values",target:"context field that receives the extracted value",tag:"only extract content from this tag; leave empty for the whole document",attribute:"Attribute to collect when output is Attribute, for example href or src."},xml:{mode:"parse XML text or serialize an object back to XML",field:"context path containing XML text or an object",target:"context field that receives the result",pretty:"indent serialized XML",attributes:"Include XML attributes as @attrs in the parsed result.",text:"Include element text as #text in the parsed result."},scale:{field:"context path of the number to map",inMin:"minimum of the input range",inMax:"maximum of the input range",outMin:"minimum of the output range",outMax:"maximum of the output range",clamp:"keep the result inside the output range",round:"round the result to an integer",target:"field that receives the mapped value"},router:{field:"Context value compared against each rule.",rules:"Rules are checked from top to bottom; the first match selects the numbered output.",operator:"Comparison used by this rule.",value:"Value used by the selected operator."}},group:{reliability:"Reliability",options:"Options",delay:"Delay",request:"Request",template:"Template",output:"Output",payload:"Payload",authentication:"Authentication","input-range":"Input range","output-range":"Output range"},option:{truthy:"is truthy",equals:"equals","not-equals":"not equals",gt:"greater than",lt:"less than",fixed:"Fixed delay",random:"Random delay",info:"info",warn:"warn",error:"error",GET:"GET",POST:"POST",PUT:"PUT",PATCH:"PATCH",DELETE:"DELETE",auto:"Auto (JSON when possible)",json:"Parsed JSON",text:"Text",mustache:"Mustache",plain:"Plain text",parse:"Parse",stringify:"Stringify",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat",asc:"Ascending",desc:"Descending",path:"Path",method:"Method",host:"Host",header:"Header",query:"Query",prefix:"prefix","not-prefix":"not prefix",exists:"exists","not-exists":"not exists",links:"Links",string:"String",number:"Number",boolean:"Boolean",none:"None",basic:"Basic",milliseconds:"Milliseconds",seconds:"Seconds",minutes:"Minutes",attribute:"Attribute",contains:"contains",regex:"matches regex"}},"zh-CN":{node:{start:{label:"\u5F00\u59CB",description:"\u53EF\u9009\u7684\u663E\u5F0F\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u53EF\u9009\u7684\u663E\u5F0F\u7ED3\u675F\u70B9"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u542F\u52A8\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u4F7F\u7528 JavaScript \u5904\u7406\u6D88\u606F"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u6D41\u7A0B\u4E0A\u4E0B\u6587\u7684\u503C\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u503C\u8DEF\u7531\u5230\u5339\u914D\u7684\u8F93\u51FA"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u4E0B\u6E38\u6B65\u9AA4"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u6570\u636E"},delay:{label:"\u5EF6\u8FDF",description:"\u6309\u56FA\u5B9A\u6216\u968F\u673A\u65F6\u95F4\u6682\u505C"},log:{label:"\u65E5\u5FD7",description:"\u5C06\u6D88\u606F\u6216\u503C\u5199\u5165\u6267\u884C\u65E5\u5FD7"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3\u5E76\u8BFB\u53D6\u54CD\u5E94"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u5C06\u4E0A\u4E00\u6B65\u7ED3\u679C\u6620\u5C04\u4E3A\u65B0\u7ED3\u6784"},template:{label:"\u6A21\u677F",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u503C\u6E32\u67D3\u6587\u672C"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV \u6587\u672C"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u5C06\u6570\u7EC4\u805A\u5408\u4E3A\u6570\u503C"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5B57\u6BB5\u6216\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u5411\u5BBF\u4E3B\u53D1\u5E03\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5BBF\u4E3B\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u6267\u884C\u5BBF\u4E3B\u547D\u4EE4\u6216\u51FD\u6570"},split:{label:"\u62C6\u5206",description:"\u62C6\u5206\u6587\u672C\u6216\u6570\u7EC4"},map:{label:"\u6620\u5C04",description:"\u5C06\u6BCF\u4E2A\u5143\u7D20\u6620\u5C04\u4E3A\u65B0\u503C"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u7B26\u5408\u6761\u4EF6\u7684\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u5143\u7D20\u5206\u6279"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u6267\u884C"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"},"mqtt-publish":{label:"MQTT \u53D1\u5E03",description:"\u5411 MQTT \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"mqtt-wait":{label:"MQTT \u7B49\u5F85",description:"\u7B49\u5F85 MQTT \u4E3B\u9898\u7684\u4E0B\u4E00\u6761\u6D88\u606F"},"redis-command":{label:"Redis \u547D\u4EE4",description:"\u6267\u884C Redis \u547D\u4EE4\u5E76\u8FD4\u56DE\u7ED3\u679C"},"redis-publish":{label:"Redis \u53D1\u5E03",description:"\u5411 Redis \u9891\u9053\u53D1\u5E03\u6D88\u606F"},"nats-publish":{label:"NATS \u53D1\u5E03",description:"\u5411 NATS \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"nats-request":{label:"NATS \u8BF7\u6C42",description:"\u53D1\u9001 NATS \u8BF7\u6C42\u5E76\u7B49\u5F85\u56DE\u590D"},"coap-request":{label:"CoAP \u8BF7\u6C42",description:"\u53D1\u9001 CoAP \u8BF7\u6C42\u5E76\u8FD4\u56DE\u54CD\u5E94\u5185\u5BB9"},"gateway-route":{label:"\u7F51\u5173\u8DEF\u7531",description:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38"},"gateway-condition":{label:"\u7F51\u5173\u6761\u4EF6",description:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570"},"gateway-deny":{label:"\u7F51\u5173\u62D2\u7EDD",description:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42"},debug:{label:"\u8C03\u8BD5",description:"\u67E5\u770B\u6D88\u606F\u5C5E\u6027\u6216\u5B8C\u6574\u6D88\u606F"},junction:{label:"\u6C47\u5408",description:"\u6C47\u5408\u8FDE\u7EBF\uFF0C\u4E0D\u6539\u53D8\u6D88\u606F"},sequence:{label:"\u987A\u5E8F",description:"\u4FDD\u6301\u4E0B\u6E38\u6B65\u9AA4\u987A\u5E8F\u6267\u884C"},link:{label:"\u8FDE\u7EBF",description:"\u6309\u540D\u79F0\u8FDE\u63A5\u753B\u5E03\u4E0A\u7684\u8FDC\u7A0B\u8FDE\u7EBF"},html:{label:"HTML",description:"\u4ECE HTML \u63D0\u53D6\u6587\u672C\u6216\u94FE\u63A5"},xml:{label:"XML",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 XML \u6587\u6863"},scale:{label:"\u533A\u95F4\u6620\u5C04",description:"\u5C06\u6570\u503C\u4ECE\u4E00\u4E2A\u533A\u95F4\u6620\u5C04\u5230\u53E6\u4E00\u4E2A\u533A\u95F4"},router:{label:"\u89C4\u5219\u8DEF\u7531",description:"\u6309\u987A\u5E8F\u5339\u914D\u89C4\u5219\u5E76\u9009\u62E9\u56DB\u4E2A\u8F93\u51FA\u4E4B\u4E00"}},field:{start:{},end:{},inject:{payload:"\u6570\u636E\uFF08JSON\uFF09",topic:"\u4E3B\u9898",payloadType:"\u6570\u636E\u7C7B\u578B"},task:{action:"\u52A8\u4F5C\u540D\u79F0",result:"\u65E0\u52A8\u4F5C\u65F6\u7684\u7ED3\u679C",fail:"\u6807\u8BB0\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},function:{code:"JavaScript \u4EE3\u7801",timeout:"\u8D85\u65F6",initialize:"\u521D\u59CB\u5316\u4EE3\u7801",finalize:"\u6536\u5C3E\u4EE3\u7801"},condition:{field:"\u53D6\u503C\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u8DEF\u5F84",value:"\u9ED8\u8BA4\u503C"},parallel:{},join:{},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E\uFF08JSON\uFF09"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C",unit:"\u5355\u4F4D"},log:{message:"\u56FA\u5B9A\u6D88\u606F",field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u8BB0\u5F55\u5B8C\u6574\u4E0A\u4E0B\u6587",level:"\u7EA7\u522B"},"http-request":{url:"\u8BF7\u6C42\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934\uFF08JSON\uFF09",body:"\u8BF7\u6C42\u4F53",responseType:"\u54CD\u5E94\u5904\u7406",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",authType:"\u8BA4\u8BC1",username:"\u7528\u6237\u540D",password:"\u5BC6\u7801"},assign:{values:"\u503C\uFF08JSON\uFF09"},transform:{mapping:"\u6620\u5C04\uFF08JSON\uFF09",result:"\u56FA\u5B9A\u7ED3\u679C\uFF08JSON\uFF09"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934",columns:"\u5217"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5\u8DEF\u5F84",value:"\u503C",rules:"\u89C4\u5219"},statistics:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0",payload:"\u6570\u636E\uFF08JSON\uFF09"},"event-wait":{event:"\u4E8B\u4EF6\u540D\u79F0",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570\uFF08JSON\uFF09",timeout:"\u8D85\u65F6"},split:{field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u8DEF\u5F84",size:"\u6279\u5927\u5C0F",overlap:"\u91CD\u53E0\u6570\u91CF"},trycatch:{timeout:"\u8D85\u65F6"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},comment:{text:"\u6587\u672C"},custom:{result:"\u7ED3\u679C"},"mqtt-publish":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",payload:"\u6D88\u606F\u5185\u5BB9",retain:"\u4FDD\u7559\u6D88\u606F"},"mqtt-wait":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"redis-command":{url:"Redis \u5730\u5740",command:"\u547D\u4EE4",args:"\u53C2\u6570"},"redis-publish":{url:"Redis \u5730\u5740",channel:"\u9891\u9053",message:"\u6D88\u606F"},"nats-publish":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"nats-request":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"coap-request":{host:"\u4E3B\u673A",port:"\u7AEF\u53E3",method:"\u65B9\u6CD5",path:"\u8DEF\u5F84",payload:"\u8BF7\u6C42\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"gateway-route":{path:"\u5165\u53E3\u8DEF\u5F84",service:"\u670D\u52A1\u540D",targetUrl:"\u4E0A\u6E38\u5730\u5740",targetPath:"\u4E0A\u6E38\u8DEF\u5F84",stripPrefix:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",priority:"\u4F18\u5148\u7EA7",headers:"\u8BF7\u6C42\u5934",responseHeaders:"\u54CD\u5E94\u5934",rateLimit:"\u9650\u6D41",cache:"\u7F13\u5B58",circuitBreaker:"\u7194\u65AD",bulkhead:"\u9694\u79BB\u8231"},"gateway-condition":{field:"\u5B57\u6BB5",name:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},"gateway-deny":{status:"\u72B6\u6001\u7801",message:"\u6D88\u606F",priority:"\u4F18\u5148\u7EA7",body:"\u54CD\u5E94\u4F53"},debug:{field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B",console:"\u540C\u65F6\u8F93\u51FA\u5230\u63A7\u5236\u53F0",active:"\u542F\u7528"},link:{links:"\u8FDE\u7EBF\u540D\u79F0"},html:{field:"HTML \u8DEF\u5F84",mode:"\u8F93\u51FA",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",tag:"\u6807\u7B7E",attribute:"\u5C5E\u6027\u540D"},xml:{mode:"\u6A21\u5F0F",field:"XML \u8DEF\u5F84",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA",attributes:"\u5305\u542B\u5C5E\u6027",text:"\u5305\u542B\u6587\u672C"},scale:{field:"\u53D6\u503C\u8DEF\u5F84",inMin:"\u8F93\u5165\u6700\u5C0F\u503C",inMax:"\u8F93\u5165\u6700\u5927\u503C",outMin:"\u8F93\u51FA\u6700\u5C0F\u503C",outMax:"\u8F93\u51FA\u6700\u5927\u503C",clamp:"\u9650\u5236\u5728\u533A\u95F4\u5185",round:"\u53D6\u6574",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5"},router:{field:"\u53D6\u503C\u8DEF\u5F84",rules:"\u89C4\u5219",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"}},fieldPlaceholder:{start:{},end:{},inject:{payload:'{ "value": 1 }',topic:"orders.created"},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{},loop:{},trigger:{payload:'{ "ok": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:",",columns:"name, age"},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{event:"order.created",payload:'{ "id": 1 }'},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{},custom:{},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{},"gateway-condition":{},"gateway-deny":{},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1",attribute:"href"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"},scale:{field:"value",target:"value"},router:{field:"result.status"}},fieldDescription:{start:{},end:{},inject:{topic:"\u968F\u6570\u636E\u4E00\u8D77\u4F20\u9012\u7684\u53EF\u9009\u6807\u7B7E\u3002",payload:"\u89E6\u53D1\u5668\u53D1\u9001\u7684\u503C\uFF1BJSON \u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\uFF0C\u5176\u4ED6\u7C7B\u578B\u6309\u539F\u503C\u53D1\u9001\u3002",payloadType:"\u9009\u62E9\u6570\u636E\u7684\u7C7B\u578B\uFF1BJSON \u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\uFF0C\u5176\u4ED6\u7C7B\u578B\u6309\u539F\u503C\u53D1\u9001\u3002"},task:{action:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\uFF0C\u7559\u7A7A\u5219\u8FD4\u56DE\u201C\u7ED3\u679C\u201D\u4E2D\u7684\u503C\u3002",result:"\u672A\u8BBE\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u7684 JSON\u3002",retry:"\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",fail:"\u5F3A\u5236\u6B64\u6B65\u9AA4\u5931\u8D25\uFF0C\u4FBF\u4E8E\u6D4B\u8BD5\u5F02\u5E38\u5206\u652F\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002"},function:{code:"\u8FD4\u56DE\u4E0B\u4E00\u6B65\u6D88\u606F\u3002context \u4E0E input \u90FD\u662F\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002",initialize:"\u53EF\u9009\uFF1A\u5728\u4E3B\u51FD\u6570\u524D\u6267\u884C\uFF0C\u8FD4\u56DE\u7684\u5BF9\u8C61\u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\u3002",finalize:"\u53EF\u9009\uFF1A\u5728\u4E3B\u51FD\u6570\u540E\u6267\u884C\uFF0C\u7528\u4E8E\u6E05\u7406\u6216\u6307\u6807\u3002"},condition:{field:"\u8981\u5224\u65AD\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\uFF0C\u4F8B\u5982 approved \u6216 user.role\u3002",operator:"\u9009\u62E9\u5224\u65AD\u65B9\u5F0F\uFF0C\u51B3\u5B9A\u8FDB\u5165 true \u8FD8\u662F false \u5206\u652F\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002"},switch:{field:"\u7528\u4E8E\u9009\u62E9\u8F93\u51FA\u7AEF\u53E3\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",value:"\u672A\u8BBE\u7F6E\u53D6\u503C\u8DEF\u5F84\u65F6\u4F7F\u7528\u7684\u5B57\u9762\u503C\u3002"},parallel:{},join:{},loop:{iterations:"\u91CD\u590D\u6267\u884C\u4E0B\u6E38\u6B65\u9AA4\u7684\u6B21\u6570\u3002",delay:"\u6BCF\u6B21\u8FED\u4EE3\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002"},trigger:{delay:"\u53D1\u9001\u6570\u636E\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",payload:"\u89E6\u53D1\u65F6\u8F93\u51FA\u7684 JSON \u6570\u636E\u3002"},delay:{delay:"\u8FDB\u5165\u4E0B\u4E00\u4E2A\u8282\u70B9\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",mode:"\u56FA\u5B9A\u5EF6\u8FDF\u6216\u533A\u95F4\u5185\u968F\u673A\u5EF6\u8FDF\u3002",randomMin:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5C0F\u65F6\u95F4\u3002",randomMax:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5927\u65F6\u95F4\u3002",unit:"\u5EF6\u8FDF\u65F6\u95F4\u7684\u5355\u4F4D\u3002"},log:{message:"\u672A\u8BBE\u7F6E\u53D6\u503C\u8DEF\u5F84\u65F6\u5199\u5165\u7684\u6587\u672C\u3002",field:"\u8981\u8BB0\u5F55\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8BB0\u5F55\u6574\u4E2A\u6D41\u7A0B\u4E0A\u4E0B\u6587\u800C\u4E0D\u662F\u5355\u4E2A\u503C\u3002",level:"\u65E5\u5FD7\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002"},"http-request":{url:"\u7EDD\u5BF9\u5730\u5740\uFF0C\u6216\u4EE5 / \u5F00\u5934\u7684\u5BBF\u4E3B\u8DEF\u5F84\u3002",method:"HTTP \u8BF7\u6C42\u65B9\u6CD5\u3002",headers:"JSON \u5BF9\u8C61\u5F62\u5F0F\u7684\u8BF7\u6C42\u5934\u3002",body:"POST/PUT/PATCH \u7684\u8BF7\u6C42\u4F53\u3002",responseType:"\u81EA\u52A8\uFF1A\u80FD\u89E3\u6790\u5219\u8FD4\u56DE JSON\uFF1B\u6587\u672C\uFF1A\u4FDD\u7559\u539F\u6587\uFF1BJSON\uFF1A\u89E3\u6790\u5931\u8D25\u65F6\u62A5\u9519\u3002",retry:"\u8BF7\u6C42\u5931\u8D25\u540E\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u8BF7\u6C42\u7684\u6700\u957F\u7B49\u5F85\u65F6\u95F4\u3002",authType:"\u9009\u62E9\u662F\u5426\u53D1\u9001 Basic \u8BA4\u8BC1\u5934\u3002",username:"Basic \u8BA4\u8BC1\u7528\u6237\u540D\u3002",password:"Basic \u8BA4\u8BC1\u5BC6\u7801\u3002"},assign:{values:"\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF\u7684 JSON \u5BF9\u8C61\u3002"},transform:{mapping:"\u76EE\u6807\u5B57\u6BB5\u5230\u4E0A\u4E0B\u6587\u8DEF\u5F84\u7684\u6620\u5C04\u3002",result:"\u76F4\u63A5\u8FD4\u56DE\u7684 JSON \u7ED3\u679C\u3002"},template:{template:"\u4F7F\u7528 {{name}} \u6216 {{user.email}} \u8BFB\u53D6\u4E0A\u4E0B\u6587\u503C\u3002",target:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",syntax:"Mustache \u66FF\u6362 {{...}} \u5360\u4F4D\u7B26\uFF1B\u7EAF\u6587\u672C\u539F\u6837\u8F93\u51FA\u3002",output:"\u6587\u672C\u4FDD\u7559\u5B57\u7B26\u4E32\uFF1BJSON \u4F1A\u89E3\u6790\u6E32\u67D3\u7ED3\u679C\u3002"},json:{field:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u89E3\u6790 JSON \u6587\u672C\uFF0C\u6216\u628A\u503C\u5E8F\u5217\u5316\u4E3A JSON\u3002",pretty:"\u4F7F\u7528\u7F29\u8FDB\u8F93\u51FA JSON\u3002"},csv:{field:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",delimiter:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002",mode:"\u89E3\u6790 CSV \u6587\u672C\uFF0C\u6216\u628A\u6570\u7EC4\u5E8F\u5217\u5316\u4E3A CSV\u3002",header:"\u89E3\u6790\u65F6\u628A\u9996\u884C\u4F5C\u4E3A\u5B57\u6BB5\u540D\u3002",columns:"\u53EF\u9009\uFF1A\u89E3\u6790\u6216\u5E8F\u5217\u5316\u65F6\u4FDD\u7559\u7684\u5217\uFF0C\u9017\u53F7\u5206\u9694\u3002"},change:{field:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",value:"\u65B0\u503C\uFF0C\u652F\u6301 JSON\u3002",rules:"\u6309\u987A\u5E8F\u6267\u884C\uFF0C\u6BCF\u884C\u4FEE\u6539\u4E00\u4E2A\u5B57\u6BB5\u3002",action:"Set \u66FF\u6362\uFF0CDelete \u5220\u9664\uFF0CAppend \u8FFD\u52A0\u5230\u5217\u8868\u6216\u5B57\u7B26\u4E32\u3002"},statistics:{field:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",path:"\u6570\u7EC4\u5143\u7D20\u4E2D\u7528\u4E8E\u8BA1\u7B97\u7684\u5C5E\u6027\u3002",operation:"\u8BA1\u6570\u3001\u6C42\u548C\u3001\u5E73\u5747\u3001\u6700\u5C0F\u6216\u6700\u5927\u3002",resultField:"\u63A5\u6536\u7EDF\u8BA1\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},merge:{fields:"\u8981\u5408\u5E76\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\uFF0C\u9017\u53F7\u5206\u9694\u3002",mode:"\u5BF9\u8C61\u5408\u5E76\u6216\u6570\u7EC4\u62FC\u63A5\u3002",resultField:"\u63A5\u6536\u5408\u5E76\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0\uFF0C\u53D1\u9001\u4E0E\u7B49\u5F85\u7AEF\u9700\u4E00\u81F4\u3002",payload:"\u968F\u4E8B\u4EF6\u53D1\u9001\u7684 JSON \u6570\u636E\u3002"},"event-wait":{event:"\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u79F0\u3002",timeout:"\u7B49\u5F85\u4E8B\u4EF6\u7684\u6700\u957F\u65F6\u95F4\u3002"},command:{args:"\u4F20\u7ED9\u547D\u4EE4\u7684 JSON \u6570\u7EC4\u3002",command:"\u5BBF\u4E3B\u6CE8\u518C\u7684\u547D\u4EE4\u6216\u51FD\u6570\u540D\u3002",timeout:"\u547D\u4EE4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\u3002"},split:{field:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u8DEF\u5F84\u3002",delimiter:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002"},map:{path:"\u6BCF\u4E2A\u5143\u7D20\u4E2D\u8981\u6620\u5C04\u7684\u5C5E\u6027\u3002",field:"\u8981\u904D\u5386\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"},filter:{field:"\u8981\u8FC7\u6EE4\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",path:"\u7528\u4E8E\u6BD4\u8F83\u7684\u5143\u7D20\u5C5E\u6027\u3002",operator:"\u6BD4\u8F83\u65B9\u5F0F\u3002",value:"\u6BD4\u8F83\u4F7F\u7528\u7684\u503C\u3002"},sort:{path:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002",field:"\u8981\u6392\u5E8F\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",order:"\u5347\u5E8F\u6216\u964D\u5E8F\u3002"},range:{from:"\u533A\u95F4\u8D77\u59CB\u503C\uFF08\u5305\u542B\uFF09\u3002",to:"\u533A\u95F4\u7ED3\u675F\u503C\uFF08\u4E0D\u5305\u542B\uFF09\u3002",step:"\u6BCF\u6B21\u589E\u52A0\u7684\u6570\u91CF\u3002"},batch:{size:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002",field:"\u8981\u5206\u6279\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",overlap:"\u4E0B\u4E00\u6279\u5F00\u5934\u91CD\u590D\u4E0A\u4E00\u6279\u672B\u5C3E\u7684\u5143\u7D20\u6570\u91CF\uFF0C0 \u8868\u793A\u4E0D\u91CD\u53E0\u3002"},trycatch:{timeout:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"},subprocess:{workflow:"\u8981\u6267\u884C\u7684\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u3002"},comment:{},custom:{result:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"\u547D\u4EE4\u53C2\u6570\u7684 JSON \u6570\u7EC4\u3002"},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002",priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},"gateway-condition":{},"gateway-deny":{priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},debug:{field:"\u8981\u67E5\u770B\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8F93\u51FA\u5B8C\u6574\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",console:"\u540C\u65F6\u5199\u5165\u5BBF\u4E3B\u63A7\u5236\u53F0\uFF0C\u4FBF\u4E8E\u5F00\u53D1\u8C03\u8BD5\u3002",level:"\u8F93\u51FA\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002",active:"\u5173\u95ED\u540E\u4FDD\u7559\u8282\u70B9\u4F46\u4E0D\u518D\u8F93\u51FA\u3002"},link:{links:"\u7528\u4E8E\u8BC6\u522B\u8FDC\u7A0B\u8FDE\u7EBF\u7684\u53EF\u9009\u540D\u79F0\uFF0C\u9017\u53F7\u5206\u9694\u3002"},html:{field:"\u5305\u542B HTML \u6587\u672C\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u6587\u672C\uFF1A\u53BB\u9664\u6807\u7B7E\uFF1B\u94FE\u63A5\uFF1A\u6536\u96C6 href/src\u3002",target:"\u63A5\u6536\u63D0\u53D6\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",tag:"\u53EA\u63D0\u53D6\u8BE5 HTML \u6807\u7B7E\u5185\u7684\u5185\u5BB9\uFF0C\u7559\u7A7A\u5219\u5904\u7406\u6574\u4E2A\u6587\u6863\u3002",attribute:"\u8F93\u51FA\u4E3A\u5C5E\u6027\u65F6\u6536\u96C6\u7684\u5C5E\u6027\u540D\uFF0C\u4F8B\u5982 href \u6216 src\u3002"},xml:{mode:"\u89E3\u6790 XML \u6587\u672C\uFF0C\u6216\u628A\u5BF9\u8C61\u5E8F\u5217\u5316\u4E3A XML\u3002",field:"\u5305\u542B XML \u6216\u5BF9\u8C61\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",target:"\u63A5\u6536\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",pretty:"\u5E8F\u5217\u5316\u65F6\u4F7F\u7528\u7F29\u8FDB\u3002",attributes:"\u89E3\u6790\u7ED3\u679C\u4E2D\u5305\u542B XML \u5C5E\u6027\uFF08@attrs\uFF09\u3002",text:"\u89E3\u6790\u7ED3\u679C\u4E2D\u5305\u542B\u5143\u7D20\u6587\u672C\uFF08#text\uFF09\u3002"},scale:{field:"\u8981\u6620\u5C04\u7684\u6570\u503C\u8DEF\u5F84\u3002",inMin:"\u8F93\u5165\u533A\u95F4\u7684\u6700\u5C0F\u503C\u3002",inMax:"\u8F93\u5165\u533A\u95F4\u7684\u6700\u5927\u503C\u3002",outMin:"\u8F93\u51FA\u533A\u95F4\u7684\u6700\u5C0F\u503C\u3002",outMax:"\u8F93\u51FA\u533A\u95F4\u7684\u6700\u5927\u503C\u3002",clamp:"\u628A\u7ED3\u679C\u9650\u5236\u5728\u8F93\u51FA\u533A\u95F4\u5185\u3002",round:"\u628A\u7ED3\u679C\u56DB\u820D\u4E94\u5165\u4E3A\u6574\u6570\u3002",target:"\u63A5\u6536\u6620\u5C04\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},router:{field:"\u4E0E\u6BCF\u6761\u89C4\u5219\u6BD4\u8F83\u7684\u4E0A\u4E0B\u6587\u503C\u3002",rules:"\u4ECE\u4E0A\u5230\u4E0B\u4F9D\u6B21\u5339\u914D\uFF0C\u7B2C\u4E00\u6761\u547D\u4E2D\u7684\u89C4\u5219\u9009\u62E9\u5BF9\u5E94\u7F16\u53F7\u8F93\u51FA\u3002",operator:"\u8BE5\u89C4\u5219\u4F7F\u7528\u7684\u6BD4\u8F83\u65B9\u5F0F\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002"}},group:{reliability:"\u53EF\u9760\u6027",options:"\u9009\u9879",delay:"\u5EF6\u8FDF",request:"\u8BF7\u6C42",template:"\u6A21\u677F",output:"\u8F93\u51FA",payload:"\u6570\u636E",authentication:"\u8BA4\u8BC1","input-range":"\u8F93\u5165\u8303\u56F4","output-range":"\u8F93\u51FA\u8303\u56F4"},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E","not-equals":"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",auto:"\u81EA\u52A8\uFF08\u80FD\u89E3\u6790\u5219 JSON\uFF09",json:"JSON",text:"\u6587\u672C",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",path:"\u8DEF\u5F84",method:"\u65B9\u6CD5",host:"\u4E3B\u673A",header:"\u8BF7\u6C42\u5934",query:"\u67E5\u8BE2\u53C2\u6570",prefix:"\u524D\u7F00","not-prefix":"\u975E\u524D\u7F00",exists:"\u5B58\u5728","not-exists":"\u4E0D\u5B58\u5728",links:"\u94FE\u63A5",string:"\u5B57\u7B26\u4E32",number:"\u6570\u5B57",boolean:"\u5E03\u5C14",none:"\u65E0",basic:"Basic",milliseconds:"\u6BEB\u79D2",seconds:"\u79D2",minutes:"\u5206\u949F",attribute:"\u5C5E\u6027",contains:"\u5305\u542B",regex:"\u5339\u914D\u6B63\u5219"}}};var Xo={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",properties:"Properties",appearance:"Appearance",icon:"Icon",color:"Color",addItem:"Add",fields:"Fields",json:"JSON",removeItem:"Remove",logTitle:"Execution log",runHistory:"Runs",canvasEmpty:"Drag a component from the palette, or click one to add it",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",language:"Language",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",zoomIn:"Zoom in",zoomOut:"Zoom out",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",rename:"Rename workflow",renameTitle:"Rename workflow",renamePlaceholder:"Workflow name",renameEmpty:"Enter a workflow name",renameConfirm:"Rename",cancel:"Cancel",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{renamed:'Renamed to "{name}"',added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},inject:{payload:"Payload",topic:"Topic"},trigger:{delay:"Delay",payload:"Payload"},function:{code:"Code",timeout:"Timeout"},template:{template:"Template",syntax:"Syntax",target:"Target field",output:"Output"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout"},command:{command:"Command",args:"Args",timeout:"Timeout"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Value"},loop:{iterations:"Iterations",delay:"Delay"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum"},log:{message:"Message",field:"Message property",complete:"Complete message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",responseType:"Response"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat",fixed:"Fixed delay",random:"Random delay",mustache:"Mustache",plain:"Plain text",text:"Text",auto:"Auto",info:"Info",warn:"Warning",error:"Error"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",properties:"\u5C5E\u6027",appearance:"\u5916\u89C2",icon:"\u56FE\u6807",color:"\u989C\u8272",addItem:"\u6DFB\u52A0",fields:"\u5B57\u6BB5",json:"JSON",removeItem:"\u5220\u9664",logTitle:"\u6267\u884C\u65E5\u5FD7",runHistory:"\u8FD0\u884C\u5386\u53F2",canvasEmpty:"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",language:"\u8BED\u8A00",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",zoomIn:"\u653E\u5927",zoomOut:"\u7F29\u5C0F",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",rename:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renameTitle:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renamePlaceholder:"\u5DE5\u4F5C\u6D41\u540D\u79F0",renameEmpty:"\u8BF7\u8F93\u5165\u5DE5\u4F5C\u6D41\u540D\u79F0",renameConfirm:"\u91CD\u547D\u540D",cancel:"\u53D6\u6D88",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{renamed:"\u5DF2\u91CD\u547D\u540D\u4E3A\u300C{name}\u300D",added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},inject:{payload:"\u6570\u636E",topic:"\u4E3B\u9898"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u76EE\u6807\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C"},log:{message:"\u6D88\u606F",field:"\u6D88\u606F\u5C5E\u6027",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",responseType:"\u54CD\u5E94\u89E3\u6790"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",text:"\u6587\u672C",auto:"\u81EA\u52A8",info:"\u4FE1\u606F",warn:"\u544A\u8B66",error:"\u9519\u8BEF"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},Yo=Object.fromEntries(Object.entries(Xo).map(([a,e])=>{let t=e.messages?.workflow||{};return[a,{...e,messages:{...e.messages,workflow:{...t,...ao[a]||{}}}}]})),Ne=class{};w(Ne,[[$({imports:[Te.withLocales(Yo,"zh-CN")],exports:[Te]}),0]]);function x(a,e,t,o,r){if(!a)return o;try{if(a.has(t,e))return a.translate(t,e,r);let s=a.translate(t,e,r);if(s&&s!==t)return s}catch{}return o}function Lt(a,e,t,o="",r){return t?t.startsWith("workflow.")?x(a,e,t,o||t,r):t:o}var Zo={trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",error:"Error handling",advanced:"Advanced"};function g(a,e,t,o){return{id:a,name:e,type:t,label:o}}function h(a){return{...a}}var J="^\\$?\\.?[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",Qo=184,er=64;var tr=[{type:"start",label:"Start",description:"Entry point of the workflow",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[g("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",description:"Finish the workflow",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[g("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",description:"Start with a fixed payload",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[g("out","out","output","Payload")],fields:[h({key:"payload",label:"Payload",type:"json",defaultValue:{}}),h({key:"topic",label:"Topic",type:"text",maxLength:200,placeholder:"optional topic",description:"Optional message topic carried with the payload."})],defaultConfig:{payload:{}}},{type:"task",label:"Task",description:"Run a named action or return a fixed result",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"action",label:"Action",type:"text",placeholder:"actions.fetch",pattern:"^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",description:"Function name in context.actions."}),h({key:"result",label:"Mock result",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set."}),h({key:"fail",label:"Fail this step",type:"boolean",defaultValue:!1,group:"Reliability"}),h({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",description:"Automatic retries before the step fails."}),h({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"function",label:"Function",description:"Run trusted JavaScript against the workflow context",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"code",label:"Code",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions."}),h({key:"initialize",label:"Initialize code",type:"code",language:"javascript",rows:5,group:"Options",description:"Optional code that runs before the main function. Returned objects are merged into the context."}),h({key:"finalize",label:"Finalize code",type:"code",language:"javascript",rows:5,group:"Options",description:"Optional code that runs after the main function for cleanup or metrics."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",description:"Branch on a context field",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("true","true","output","True"),g("false","false","output","False")],fields:[h({key:"field",label:"Field",type:"text",required:!0,pattern:J,placeholder:"input.approved",description:"Path to the value to test."}),h({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"}]}),h({key:"value",label:"Compare with",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",description:"Route by a context value",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Matched"),g("default","default","output","Default"),g("error","error","output","Error")],fields:[h({key:"field",label:"Value field",type:"text",required:!0,pattern:J,placeholder:"input.type",description:"Path to the value used for routing."}),h({key:"value",label:"Value",type:"text",placeholder:"approved",description:"Literal value used when no value field is configured."})],defaultConfig:{}},{type:"link",label:"Link",description:"Connect distant wire segments by name",category:"flow",icon:"\u21E2",color:"#0d9488",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"links",label:"Links",type:"text",placeholder:"flow-a, flow-b",description:"Comma separated link names for documentation."})],defaultConfig:{}},{type:"scale",label:"Scale",description:"Map a number from one range to another",category:"data",icon:"\u21D4",color:"#7c3aed",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"field",label:"Value path",type:"text",defaultValue:"value",pattern:J,placeholder:"value",description:"Context path of the number to map."}),h({key:"inMin",label:"Input minimum",type:"number",defaultValue:0,group:"Input range"}),h({key:"inMax",label:"Input maximum",type:"number",defaultValue:100,group:"Input range"}),h({key:"outMin",label:"Output minimum",type:"number",defaultValue:0,group:"Output range"}),h({key:"outMax",label:"Output maximum",type:"number",defaultValue:1,group:"Output range"}),h({key:"clamp",label:"Clamp to range",type:"boolean",defaultValue:!0,group:"Options"}),h({key:"round",label:"Round result",type:"boolean",defaultValue:!1,group:"Options"}),h({key:"target",label:"Write result to",type:"text",defaultValue:"value",pattern:J,placeholder:"value",description:"Context field that receives the mapped value."})],defaultConfig:{field:"value",inMin:0,inMax:100,outMin:0,outMax:1,clamp:!0,round:!1,target:"value"}},{type:"html",label:"HTML",description:"Extract text or links from HTML",category:"data",icon:"H",color:"#ea580c",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"field",label:"HTML field",type:"text",defaultValue:"value",pattern:J,placeholder:"value"}),h({key:"tag",label:"Tag",type:"text",pattern:"^[A-Za-z][A-Za-z0-9-]*$",placeholder:"h1",group:"Options",description:"Only extract content from this HTML tag. Leave empty for the whole document."}),h({key:"mode",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Links",value:"links"},{label:"Attribute",value:"attribute"}]}),h({key:"attribute",label:"Attribute name",type:"text",placeholder:"href",pattern:"^[A-Za-z_:][A-Za-z0-9_:.-]*$",visibleWhen:{key:"mode",equals:"attribute"}}),h({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:J,placeholder:"value"})],defaultConfig:{field:"value",mode:"text",target:"value"}},{type:"xml",label:"XML",description:"Parse or stringify XML",category:"data",icon:"X",color:"#dc2626",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"XML field",type:"text",defaultValue:"value",pattern:J,placeholder:"value"}),h({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:J,placeholder:"value"}),h({key:"attributes",label:"Include attributes",type:"boolean",defaultValue:!0,group:"Options",description:"Include XML attributes as @attrs in the parsed result.",visibleWhen:{key:"mode",equals:"parse"}}),h({key:"text",label:"Include text",type:"boolean",defaultValue:!0,group:"Options",description:"Include element text as #text in the parsed result.",visibleWhen:{key:"mode",equals:"parse"}}),h({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,group:"Options",visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse",field:"value",target:"value",attributes:!0,text:!0}},{type:"junction",label:"Junction",description:"Route wires without changing the message",category:"flow",icon:"\u2022",color:"#64748b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"sequence",label:"Sequence",description:"Keep steps in a strict order",category:"flow",icon:"\u2261",color:"#475569",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"router",label:"Router",description:"Route to one of four outputs using ordered rules",category:"flow",icon:"\u21F6",color:"#d97706",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("route-1","route-1","output","1"),g("route-2","route-2","output","2"),g("route-3","route-3","output","3"),g("route-4","route-4","output","4"),g("default","default","output","Default"),g("error","error","output","Error")],fields:[h({key:"field",label:"Value path",type:"text",required:!0,pattern:J,placeholder:"result.status",description:"Context value compared against each rule."}),h({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[h({key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"contains",value:"contains"},{label:"matches regex",value:"regex"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"},{label:"is truthy",value:"truthy"}]}),h({key:"value",label:"Compare to",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})]})],defaultConfig:{rules:[]}},{type:"parallel",label:"Parallel",description:"Run all outgoing branches concurrently",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",description:"Wait for all incoming branches before continuing",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],defaultConfig:{}},{type:"loop",label:"Loop",description:"Repeat the node body",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Done"),g("error","error","output","Error")],fields:[h({key:"iterations",label:"Iterations",type:"number",defaultValue:1,min:1,max:1e4,step:1}),h({key:"delay",label:"Delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Options"})],defaultConfig:{iterations:1}},{type:"trigger",label:"Trigger",description:"Emit a payload after an optional delay",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"delay",label:"Delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",description:"Time to wait before emitting the payload."}),h({key:"payload",label:"Payload",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'})],defaultConfig:{delay:0,payload:{}}},{type:"delay",label:"Delay",description:"Wait before continuing",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"fixed",options:[{label:"Fixed delay",value:"fixed"},{label:"Random delay",value:"random"}],group:"Delay"}),h({key:"delay",label:"Delay",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"fixed"},description:"Pause before continuing."}),h({key:"randomMin",label:"Minimum",type:"number",defaultValue:100,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}}),h({key:"randomMax",label:"Maximum",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}})],defaultConfig:{mode:"fixed",delay:500}},{type:"log",label:"Log",description:"Record a message",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"message",label:"Message",type:"text",defaultValue:"Workflow step completed",placeholder:"Workflow step completed",description:"Message written to the execution log when no field is set."}),h({key:"field",label:"Message property",type:"text",pattern:J,placeholder:"value",description:"Optional context path; logs that value instead of the fixed message."}),h({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Log the complete workflow context instead of one property."}),h({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"debug",label:"Debug",description:"Inspect a message property or the complete message",category:"action",icon:"\u25C9",color:"#0284c7",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[],fields:[h({key:"active",label:"Enabled",type:"boolean",defaultValue:!0,group:"Options",description:"Turn off to keep the node but skip its output."}),h({key:"field",label:"Output property",type:"text",pattern:J,placeholder:"payload",description:"Context path to print instead of the complete message."}),h({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Print the complete workflow context."}),h({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]}),h({key:"console",label:"Also print to console",type:"boolean",defaultValue:!1,description:"Mirror the message to the host console."})],defaultConfig:{level:"info",complete:!1,console:!1}},{type:"http-request",label:"HTTP request",description:"Call an HTTP endpoint",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Response"),g("error","error","output","Error")],fields:[h({key:"url",label:"URL",type:"url",required:!0,placeholder:"https://api.example.com",group:"Request",description:"Absolute endpoint or a path resolved by the host."}),h({key:"method",label:"Method",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(a=>({label:a,value:a})),group:"Request"}),h({key:"headers",label:"Headers",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request"}),h({key:"body",label:"Body",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",visibleWhen:{key:"method",notEquals:"GET"}}),h({key:"responseType",label:"Response",type:"select",defaultValue:"auto",options:[{label:"Auto (JSON when possible)",value:"auto"},{label:"Parsed JSON",value:"json"},{label:"UTF-8 text",value:"text"}],group:"Request"}),h({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability"}),h({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",description:"Merge values into workflow variables",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"values",label:"Values",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",description:"Map the previous result",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"mapping",label:"Mapping",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result."}),h({key:"result",label:"Fixed result",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",description:"Render a message template",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"template",label:"Template",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",group:"Template",description:"Use {{path.to.value}} placeholders."}),h({key:"syntax",label:"Syntax",type:"select",defaultValue:"mustache",options:[{label:"Mustache",value:"mustache"},{label:"Plain text",value:"plain"}],group:"Template"}),h({key:"target",label:"Target field",type:"text",defaultValue:"message",pattern:J,placeholder:"message",group:"Output",description:"Context field that receives the rendered text."}),h({key:"output",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Parsed JSON",value:"json"}],group:"Output"})],defaultConfig:{template:"{{value}}",syntax:"mustache",target:"message",output:"text"}},{type:"json",label:"JSON",description:"Parse or stringify JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the value to parse or stringify."}),h({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",description:"Parse or stringify CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the CSV text or array."}),h({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns."}),h({key:"header",label:"First row is header",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}}),h({key:"columns",label:"Columns",type:"text",placeholder:"name, age",group:"Options",description:"Optional comma-separated columns to keep when parsing or stringifying."})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",description:"Set, delete or append a context field",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[h({key:"action",label:"Action",type:"select",defaultValue:"set",options:[{label:"Set",value:"set"},{label:"Delete",value:"delete"},{label:"Append",value:"append"}]}),h({key:"field",label:"Field",type:"text",required:!0,pattern:J,placeholder:"variables.name",description:"Context path to modify."}),h({key:"value",label:"Value",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append."})]})],defaultConfig:{rules:[]}},{type:"statistics",label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Result")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items",description:"Path to the array to aggregate."}),h({key:"path",label:"Item path",type:"text",placeholder:"value",description:"Numeric property of each item."}),h({key:"operation",label:"Operation",type:"select",defaultValue:"count",options:[{label:"Count",value:"count"},{label:"Sum",value:"sum"},{label:"Average",value:"avg"},{label:"Min",value:"min"},{label:"Max",value:"max"}]}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",description:"Merge objects or concatenate arrays",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"fields",label:"Fields",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second"}),h({key:"mode",label:"Mode",type:"select",defaultValue:"object",options:[{label:"Object merge",value:"object"},{label:"Array concat",value:"array"}]}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",description:"Emit an event through the workflow event bus",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output")],fields:[h({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to publish."}),h({key:"payload",label:"Payload",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload."})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",description:"Wait for a workflow event",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Event"),g("error","error","output","Timeout")],fields:[h({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to wait for."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:3e4,min:0,step:1e3,unit:"ms",group:"Reliability",description:"Route to the timeout port after this delay."})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",description:"Run a host-provided command executor",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"command",label:"Command",type:"text",required:!0,placeholder:"context.exec"}),h({key:"args",label:"Args",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"split",label:"Split",description:"Split a string or array into items",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[h({key:"field",label:"Field",type:"text",placeholder:"items",description:"Text or array to split."}),h({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text."})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",description:"Map each array item",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Item path",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name"})],defaultConfig:{}},{type:"filter",label:"Filter",description:"Keep array items that match a condition",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Item path",type:"text",defaultValue:""}),h({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"}]}),h({key:"value",label:"Compare with",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",description:"Sort an array by a field",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Sort path",type:"text",placeholder:"value",description:"Property of each item used for ordering."}),h({key:"order",label:"Order",type:"select",defaultValue:"asc",options:[{label:"Ascending",value:"asc"},{label:"Descending",value:"desc"}]})],defaultConfig:{order:"asc"}},{type:"range",label:"Range",description:"Generate a numeric range",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Items")],fields:[h({key:"from",label:"From",type:"number",defaultValue:0}),h({key:"to",label:"To",type:"number",defaultValue:10}),h({key:"step",label:"Step",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",description:"Split an array into chunks",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Batches")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"size",label:"Batch size",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch."})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",description:"Route failures to an error branch",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",description:"Execute another workflow",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"workflow",label:"Workflow JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute."})],defaultConfig:{}},{type:"comment",label:"Comment",description:"Canvas note; not executed",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[h({key:"text",label:"Text",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",description:"Run a custom activity or handler",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[g("in","in","input","Input")],outputs:[g("out","out","output","Output"),g("error","error","output","Error")],fields:[h({key:"result",label:"Result",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node."})],defaultConfig:{}}],so=0;function or(a){if(a===null||typeof a!="object")return a;try{return JSON.parse(JSON.stringify(a))}catch{return a}}var N=class{constructor(){this.definitions=new Map,this._revision=0,tr.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(o=>({...o})),outputs:(e.outputs||[]).map(o=>({...o})),fields:(e.fields||[]).map(o=>({...o})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let o={...t.defaultConfig||{}};return(t.fields||[]).forEach(r=>{r.defaultValue!==void 0&&o[r.key]===void 0&&(o[r.key]=or(r.defaultValue))}),o}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let o of this.definitions.values())e.has(o.category)||(e.add(o.category),t.push(o.category));return t}palette(e="zh-CN",t){return this.categories().map(o=>({id:o,label:x(t,e,`workflow.category.${o}`,Zo[o]),items:this.list().filter(r=>r.category===o).map(r=>this.paletteItem(r,e,t))}))}paletteItem(e,t="zh-CN",o){return{type:e.type,label:this.nodeLabel(e.type,t,o),description:this.nodeDescription(e.type,t,o),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",o){let r=this.get(e);return r?x(o,t,`workflow.node.${e}.label`,r.label):e}nodeDescription(e,t="zh-CN",o){let r=this.get(e);return r?x(o,t,`workflow.node.${e}.description`,r.description||r.label):""}createNode(e,t,o={}){let r=this.get(e);if(!r)throw new Error(`Unknown workflow node type: ${e}`);return{id:o.id||this.nextId(e),name:o.name||r.label,type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:Qo,height:er},description:r.description,inputs:r.inputs.map(i=>({...i})),outputs:r.outputs.map(i=>({...i})),config:{...r.defaultConfig||{},...o.config||{}},style:{backgroundColor:r.color,textColor:r.textColor||"#ffffff",borderColor:r.color,borderRadius:e==="start"||e==="end"?50:10,icon:r.icon},activityType:r.activityType,pluginId:r.pluginId,requiresServer:r.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return so+=1,`${e}_${so}`}};Reflect.metadata("design:paramtypes",[])(N);w(N,[[A(),0]]);function M(a,e){if(typeof a=="function")return a(e);if(a==null||typeof a!="string")return a;let t=a.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let o=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),r=e;for(let s of o){if(r==null)return;r=r[s]}return r}function rr(a,e,t){switch(e){case"equals":return a==t;case"not-equals":return a!=t;case"contains":return Array.isArray(a)?a.some(o=>String(o)===String(t)):String(a??"").includes(String(t??""));case"regex":try{return new RegExp(String(t??"")).test(String(a??""))}catch{return!1}case"gt":return Number(a)>Number(t);case"lt":return Number(a)<Number(t);case"truthy":return!!a;default:return!1}}function io(a,e,t){switch(e){case"equals":return a==t;case"not-equals":return a!=t;case"gt":return Number(a)>Number(t);case"lt":return Number(a)<Number(t);case"gte":return Number(a)>=Number(t);case"lte":return Number(a)<=Number(t);case"truthy":default:return!!a}}function ar(a,e){let t=a?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!M(t.condition,e);if(t.field!==void 0){let o=M(t.field,e);return io(o,String(t.operator||"truthy"),t.value)}return!0}function sr(a,e){let t=a?.config||{};if(t.field!==void 0)return M(t.field,e);if(t.value!==void 0)return M(t.value,e)}function B(a){if(typeof a!="string")return a;try{return JSON.parse(a)}catch{return a}}function Be(a,e){if(!e)return a;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),o=a;for(let r of t){if(o==null)return;o=o[r]}return o}function Ue(a,e){let t=e?M(e,a):a.items??a.value;return Array.isArray(t)?t:[]}function ir(a,e){return String(a??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,o)=>String(M(o,e)??""))}function nr(a){return String(a||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function lr(a,e,t,o){let r=nr(e);if(!r.length)return t==="set"&&o&&typeof o=="object"?(Object.assign(a,o),o):void 0;let s=a;for(let n=0;n<r.length-1;n++){let l=r[n];(s[l]===void 0||s[l]===null)&&(s[l]={}),s=s[l]}let i=r[r.length-1];if(t==="delete"){let n=s[i];return delete s[i],n}if(t==="append"){let n=s[i];return Array.isArray(n)?(n.push(o),n):(s[i]=n==null?[o]:`${n}${o}`,s[i])}return s[i]=o,o}function dr(a,e,t){let o=[],r=[],s="",i=!1,n=String(a??"");for(let d=0;d<n.length;d++){let c=n[d];i?c==='"'?n[d+1]==='"'?(s+='"',d++):i=!1:s+=c:c==='"'?i=!0:c===e?(r.push(s),s=""):c===`
`?(r.push(s),o.push(r),r=[],s=""):c!=="\r"&&(s+=c)}if((s||r.length)&&(r.push(s),o.push(r)),!t||!o.length)return o;let l=o[0];return o.slice(1).map(d=>{let c={};return l.forEach((u,m)=>{c[u]=d[m]??""}),c})}function cr(a,e){let t=Array.isArray(a)?a:[];if(!t.length)return"";let o=r=>{let s=r==null?"":String(r);return/["\n\r]/.test(s)||s.includes(e)?`"${s.replace(/"/g,'""')}"`:s};if(!Array.isArray(t[0])){let r=Object.keys(t[0]||{});return[r.map(o).join(e),...t.map(s=>r.map(i=>o(s?.[i])).join(e))].join(`
`)}return t.map(r=>r.map(o).join(e)).join(`
`)}function ur(a){let e=a.activityType;if(e)try{let t=new e;return Object.assign(t,a.config||{}),t}catch{return}}async function pr(a,e){let t=a.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${a.name}" failed`)),data:{nodeId:a.id,failed:!0}};let o=t.action,r=e.actions||{};if(typeof o=="function")return{success:!0,data:{nodeId:a.id,result:await o(e)}};if(typeof o=="string"&&o&&typeof r[o]=="function")return{success:!0,data:{nodeId:a.id,result:await r[o](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:a.id,result:await t.execute(e)}};if(t.result!==void 0){let s=B(t.result);return s&&typeof s=="object"&&!Array.isArray(s)?{success:!0,data:{...s,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,result:s}}}return{success:!0,data:{nodeId:a.id,config:t}}}function Ee(a){return a.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}function fr(a){let e={},t=[e],o=/<([^>]+)>/g,r=0,s;for(;s=o.exec(a);){let i=a.slice(r,s.index).trim();if(i){let y=t[t.length-1];y["#text"]=y["#text"]?`${y["#text"]} ${Ee(i)}`:Ee(i)}let n=s[1].trim();if(r=o.lastIndex,n.startsWith("?")||n.startsWith("!"))continue;if(n.startsWith("/")){t.length>1&&t.pop();continue}let l=n.endsWith("/");l&&(n=n.slice(0,-1).trim());let d=(n.match(/^([^\s/]+)/)||[])[1]||n,c={},u=/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,m;for(;m=u.exec(n);)c[m[1]]=Ee(m[2]??m[3]??"");let f=Object.keys(c).length?{"@attrs":c}:{},b=t[t.length-1];b[d]===void 0?b[d]=f:Array.isArray(b[d])?b[d].push(f):b[d]=[b[d],f],l||t.push(f)}return e}function _t(a,e,t,o=0){let r=t?"  ".repeat(o):"",s=t?`
`:"";if(Array.isArray(e))return e.map(c=>_t(a,c,t,o)).join(s);if(e==null||typeof e!="object")return`${r}<${a}>${String(e??"")}</${a}>${s}`;let i=e["@attrs"],n=i?Object.entries(i).map(([c,u])=>` ${c}="${String(u).replace(/"/g,"&quot;")}"`).join(""):"",l=e["#text"]===void 0?"":String(e["#text"]),d=Object.entries(e).filter(([c])=>c!=="@attrs"&&c!=="#text").map(([c,u])=>_t(c,u,t,o+1)).join("");return!l&&!d?`${r}<${a}${n}/>${s}`:`${r}<${a}${n}>${s}${d}${l?r+(t?"  ":"")+l+s:""}${r}</${a}>${s}`}function Mt(a,e,t){if(Array.isArray(a))return a.map(r=>Mt(r,e,t));if(!a||typeof a!="object")return a;let o={};return Object.entries(a).forEach(([r,s])=>{r==="@attrs"&&!e||r==="#text"&&!t||(o[r]=Mt(s,e,t))}),o}function hr(a,e){let t=[],o=new RegExp(`\\b${e}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,"gi"),r;for(;r=o.exec(a);){let s=Ee(r[1]??r[2]??"");s&&!t.includes(s)&&t.push(s)}return t}function mr(a){return Ee(a.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())}function gr(a){let e=[],t=/(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,o;for(;o=t.exec(a);){let r=Ee(o[1]??o[2]??"");r&&!e.includes(r)&&e.push(r)}return e}async function wr(a,e){let t=a.config||{},o=M(t.url,e),r=typeof t.url=="string"?t.url.trim():"",s=o||(/^[a-z][a-z0-9+.-]*:/i.test(r)?r:o);if(!s)return{success:!0,data:{nodeId:a.id,skipped:!0,reason:"No URL configured"}};let i=globalThis.fetch;if(typeof i!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:a.id}};try{let n=B(t.headers)||{};if(String(t.authType||"none")==="basic"&&t.username){let m=`${t.username}:${t.password||""}`,f=typeof btoa=="function"?btoa(m):globalThis.Buffer?.from(m).toString("base64")||"";n.Authorization=`Basic ${f}`}let l=await i(String(s),{method:String(t.method||"GET").toUpperCase(),headers:Object.keys(n).length?n:void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),d=await l.text(),c=String(t.responseType||"auto"),u=d;if(c!=="text")try{u=d?JSON.parse(d):null}catch(m){if(c==="json")return{success:!1,error:new Error(`Invalid JSON response: ${m.message}`),data:{nodeId:a.id,status:l.status}};u=d}return{success:l.ok,error:l.ok?void 0:new Error(`HTTP ${l.status}`),data:{nodeId:a.id,status:l.status,body:u}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}async function Ke(a,e,t){let o=a.config||{};if(t?.executeNode){let s=await t.executeNode(a,e);if(s)return s}let r=ur(a);if(r)return r.execute(e);switch(a.type){case"start":return{success:!0,data:{nodeId:a.id,started:!0}};case"end":return{success:!0,data:{nodeId:a.id,completed:!0}};case"task":return pr(a,e);case"condition":return{success:!0,data:{nodeId:a.id,condition:ar(a,e)}};case"switch":return{success:!0,data:{nodeId:a.id,condition:sr(a,e)}};case"delay":{let s=String(o.mode||"fixed"),i=String(o.unit||"ms"),n=i==="s"?1e3:i==="min"?6e4:1,l=Math.max(0,Number(o.delay??o.duration??0)||0)*n;if(s==="random"){let d=Math.max(0,Number(o.randomMin)||0)*n,c=Math.max(d,(Number(o.randomMax)||0)*n||d);l=d+Math.random()*(c-d)}return await new Promise(d=>setTimeout(d,l)),{success:!0,data:{nodeId:a.id,delayed:l,mode:s}}}case"loop":{let s=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0));return{success:!0,data:{nodeId:a.id,iterations:s}}}case"log":case"debug":{if(a.type==="debug"&&o.active===!1)return{success:!0,data:{nodeId:a.id,skipped:!0}};let s=String(o.level||"info"),i=o.field===void 0||o.field===null?"":String(o.field).trim(),n=o.complete===!0?{...e}:M(i||o.message,e),l;if(n!==null&&typeof n=="object")try{l=JSON.stringify(n)}catch{l=String(n)}else l=String(n??"");let d=e.logger;return d&&typeof d[s]=="function"&&d[s](l),a.type==="debug"&&o.console===!0&&typeof console<"u"&&(console[s]||console.log).call(console,l),{success:!0,data:{nodeId:a.id,level:s,message:l}}}case"http-request":return wr(a,e);case"inject":{let s=String(o.payloadType||"json"),i;s==="string"?i=o.payload===void 0||o.payload===null?"":String(o.payload):s==="number"?i=Number(o.payload):s==="boolean"?i=o.payload===!0||o.payload==="true"||o.payload===1||o.payload==="1":i=B(o.payload??{});let n=o.topic===void 0||o.topic===null?"":String(o.topic),l=n?{topic:n}:{};return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...l,...i,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,...l,payload:i}}}case"trigger":{let s=Math.max(0,Number(o.delay)||0);await new Promise(n=>setTimeout(n,s));let i=B(o.payload??{});return i&&typeof i=="object"&&!Array.isArray(i)?{success:!0,data:{...i,nodeId:a.id,triggered:!0}}:{success:!0,data:{nodeId:a.id,triggered:!0,payload:i}}}case"function":try{let s=String(o.code||"return input;"),i=async l=>new Function("context","input","msg",`"use strict"; return (async () => { ${l}
 })();`)(e,e,{...e});if(String(o.initialize||"").trim()){let l=await i(String(o.initialize));l&&typeof l=="object"&&!Array.isArray(l)&&Object.assign(e,l)}let n=await i(s);if(String(o.finalize||"").trim()){let l=await i(String(o.finalize));l&&typeof l=="object"&&!Array.isArray(l)&&Object.assign(e,l)}return n&&typeof n=="object"&&!Array.isArray(n)?{success:!0,data:{...n,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,result:n}}}catch(s){return{success:!1,error:s,data:{nodeId:a.id}}}case"template":{let s=String(o.template??""),n=String(o.syntax||"mustache")==="plain"?s:ir(s,e),l=String(o.output||"text"),d=n;if(l==="json")try{d=n.trim()?JSON.parse(n):null}catch(u){return{success:!1,error:new Error(`Invalid JSON template output: ${u.message}`),data:{nodeId:a.id}}}let c=String(o.target||"message");return{success:!0,data:{nodeId:a.id,[c]:d,value:d}}}case"json":{let s=M(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let n=JSON.stringify(s,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:a.id,value:n,json:n}}}try{let n=typeof s=="string"?JSON.parse(s):s;return{success:!0,data:n&&typeof n=="object"&&!Array.isArray(n)?{...n,nodeId:a.id,value:n}:{nodeId:a.id,value:n}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}case"csv":{let s=M(o.field||"value",e),i=String(o.delimiter??",");try{let n=String(o.columns||"").split(",").map(d=>d.trim()).filter(Boolean);if(String(o.mode||"parse")==="stringify"){let d=n.length&&Array.isArray(s)?s.map(u=>Object.fromEntries(n.map(m=>[m,u?.[m]]))):s,c=cr(d,i);return{success:!0,data:{nodeId:a.id,value:c}}}let l=dr(String(s??""),i,o.header!==!1);return n.length&&(l=l.map(d=>Object.fromEntries(n.map(c=>[c,d?.[c]])))),{success:!0,data:{nodeId:a.id,value:l,items:l,count:l.length}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}case"change":try{let s=Array.isArray(o.rules)&&o.rules.length?o.rules:[{action:o.action,field:o.field,value:o.value}],i=[];for(let n of s)n?.field&&(lr(e,n.field,String(n.action||"set"),B(n.value)),i.push(n.field));return{success:!0,data:{nodeId:a.id,field:s[0]?.field,value:e,changed:i.length>0,rules:i}}}catch(s){return{success:!1,error:s,data:{nodeId:a.id}}}case"statistics":{let s=Ue(e,o.field),i=s.map(u=>Be(u,o.path)).filter(u=>u!=null),n=i.map(Number).filter(u=>Number.isFinite(u)),l=String(o.operation||"count"),d=i.length;l==="sum"?d=n.reduce((u,m)=>u+m,0):l==="avg"?d=n.length?n.reduce((u,m)=>u+m,0)/n.length:0:l==="min"?d=n.length?Math.min(...n):0:l==="max"&&(d=n.length?Math.max(...n):0);let c=String(o.resultField||"value");return{success:!0,data:{nodeId:a.id,[c]:d,value:d,count:s.length}}}case"merge":{let i=String(o.fields||"").split(",").map(d=>d.trim()).filter(Boolean).map(d=>M(d,e)),n=String(o.mode||"object")==="array"?i.reduce((d,c)=>d.concat(Array.isArray(c)?c:[c]),[]):Object.assign({},...i.filter(d=>d&&typeof d=="object"&&!Array.isArray(d))),l=String(o.resultField||"value");return{success:!0,data:{nodeId:a.id,[l]:n,value:n}}}case"event-emit":{let s=String(o.event||"workflow.event"),i=B(o.payload),n=e.eventBus||e.events;return n&&typeof n.emit=="function"?(n.emit(s,i),{success:!0,data:{nodeId:a.id,event:s,emitted:!0,payload:i}}):typeof e.emit=="function"?(e.emit(s,i),{success:!0,data:{nodeId:a.id,event:s,emitted:!0,payload:i}}):{success:!0,data:{nodeId:a.id,event:s,emitted:!1,payload:i}}}case"event-wait":{let s=String(o.event||"workflow.event"),i=Math.max(0,Number(o.timeout)||0),n=e.eventBus||e.events;try{if(n&&typeof n.wait=="function"){let l=await n.wait(s,i);return{success:!0,data:{nodeId:a.id,event:s,value:l,waited:!0}}}if(typeof e.waitEvent=="function"){let l=i?await Promise.race([Promise.resolve(e.waitEvent(s)),new Promise(d=>setTimeout(()=>d(void 0),i))]):await e.waitEvent(s);return{success:!0,data:{nodeId:a.id,event:s,value:l,waited:!0}}}return{success:!0,data:{nodeId:a.id,event:s,waited:!1}}}catch(l){return{success:!1,error:l,data:{nodeId:a.id,event:s}}}}case"command":{let s=String(o.command||""),i=B(o.args),n=e.exec||e.runCommand||e.commands?.[s];if(typeof n=="function")try{let l=await n(s,i,e);return{success:!0,data:l&&typeof l=="object"?{...l,nodeId:a.id,command:s}:{nodeId:a.id,command:s,result:l}}}catch(l){return{success:!1,error:l,data:{nodeId:a.id,command:s}}}return{success:!0,data:{nodeId:a.id,command:s,skipped:!0,args:i}}}case"split":{let s=M(o.field||"items",e),i=Array.isArray(s)?s:typeof s=="string"?s.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:a.id,items:i,count:i.length}}}case"map":{let i=Ue(e,o.field).map(n=>Be(n,o.path));return{success:!0,data:{nodeId:a.id,items:i,count:i.length}}}case"filter":{let i=Ue(e,o.field).filter(n=>{let l=Be(n,o.path);return io(l,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:a.id,items:i,count:i.length}}}case"sort":{let s=Ue(e,o.field).slice(),i=String(o.order||"asc")==="desc"?-1:1;return s.sort((n,l)=>{let d=Be(n,o.path),c=Be(l,o.path);return typeof d=="number"&&typeof c=="number"?(d-c)*i:String(d??"").localeCompare(String(c??""))*i}),{success:!0,data:{nodeId:a.id,items:s,count:s.length}}}case"range":{let s=Number(o.from??0),i=Number(o.to??10),n=Math.max(1,Math.abs(Number(o.step??1))||1),l=[];for(let d=s;d<i;d+=n)l.push(d);return{success:!0,data:{nodeId:a.id,items:l,count:l.length}}}case"batch":{let s=Ue(e,o.field),i=Math.max(1,Number(o.size)||10),n=Math.max(0,Math.min(i-1,Number(o.overlap)||0)),l=Math.max(1,i-n),d=[];for(let c=0;c<s.length&&!(n>0&&s.length-c<=n);c+=l)d.push(s.slice(c,c+i));return{success:!0,data:{nodeId:a.id,items:d,count:d.length}}}case"comment":return{success:!0,data:{nodeId:a.id,comment:!0}};case"assign":{let s=B(o.values??o.data??{}),i={...e.variables||{},...s&&typeof s=="object"?s:{}};return e.variables=i,{success:!0,data:{nodeId:a.id,variables:i}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:a.id,result:B(o.result)}};let s=B(o.mapping);if(s&&typeof s=="object"){let i={};return Object.keys(s).forEach(n=>{i[n]=M(s[n],e)}),{success:!0,data:{nodeId:a.id,result:i}}}return{success:!0,data:{nodeId:a.id,result:e}}}case"junction":case"sequence":return{success:!0,data:{nodeId:a.id}};case"router":{let s=M(o.field,e),i=Array.isArray(o.rules)?o.rules:[];for(let n=0;n<i.length&&n<4;n++)if(rr(s,String(i[n]?.operator||"equals"),i[n]?.value))return{success:!0,data:{nodeId:a.id,route:n+1,value:s}};return{success:!0,data:{nodeId:a.id,route:0,value:s}}}case"link":return{success:!0,data:{nodeId:a.id,links:String(o.links||"").split(",").map(s=>s.trim()).filter(Boolean)}};case"scale":{let s=Number(M(o.field||"value",e));if(!Number.isFinite(s))return{success:!1,error:new Error("Scale input is not a number"),data:{nodeId:a.id}};let i=Number(o.inMin??0),n=Number(o.inMax??100),l=Number(o.outMin??0),d=Number(o.outMax??1),c=n-i,u=c===0?l:l+(s-i)/c*(d-l);if(o.clamp!==!1){let f=Math.min(l,d),b=Math.max(l,d);u=Math.min(b,Math.max(f,u))}o.round===!0&&(u=Math.round(u));let m=String(o.target||"value");return{success:!0,data:{nodeId:a.id,[m]:u,value:u}}}case"html":{let s=String(M(o.field||"value",e)??""),i=String(o.mode||"text"),n=String(o.tag||"").trim(),l=[];if(n){let f=new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`,"gi"),b;for(;b=f.exec(s);)l.push(b[1])}let c=(n?l:[s]).map(f=>i==="links"?gr(f):i==="attribute"?hr(f,String(o.attribute||"href")):mr(f)),u=n?c.length<=1?c[0]||(i==="links"?[]:""):c:c[0],m=String(o.target||"value");return{success:!0,data:{nodeId:a.id,[m]:u,value:u}}}case"xml":{let s=M(o.field||"value",e),i=String(o.mode||"parse"),n=String(o.target||"value");try{if(i==="stringify"){let d=typeof s=="string"?JSON.parse(s):s,c=Object.keys(d||{})[0]||"root",u=_t(c,d?.[c],o.pretty===!0).trim();return{success:!0,data:{nodeId:a.id,[n]:u,value:u}}}let l=Mt(fr(String(s??"")),o.attributes!==!1,o.text!==!1);return{success:!0,data:{nodeId:a.id,[n]:l,value:l}}}catch(l){return{success:!1,error:l,data:{nodeId:a.id}}}}case"parallel":return{success:!0,data:{nodeId:a.id,parallel:!0}};case"join":return{success:!0,data:{nodeId:a.id,joined:!0}};case"trycatch":return{success:!0,data:{nodeId:a.id,guarded:!0}};case"subprocess":{let s=B(o.workflow);if(s&&t?.executeDefinition){let i=await t.executeDefinition(s,e);return{success:i.success,data:{nodeId:a.id,subprocess:i.data},error:i.error}}return{success:!0,data:{nodeId:a.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:a.id,result:await o.execute(e)}}:a.requiresServer?{success:!1,error:new Error(`Node type "${a.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:a.id,type:a.type,pluginId:a.pluginId}}:{success:!0,data:{nodeId:a.id,type:a.type,result:B(o.result)}}}}function we(a){let e=[];if(a?.id||e.push("Workflow ID is required"),a?.name||e.push("Workflow name is required"),!a?.nodes||a.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,o=[];for(let r of a.nodes)r.id?t.has(r.id)&&o.push(r.id):e.push("Every node requires an id"),t.add(r.id);o.length&&e.push(`Duplicate node IDs found: ${[...new Set(o)].join(", ")}`);for(let r of a.connections||[])t.has(r.sourceNodeId)||e.push(`Connection references non-existent source node: ${r.sourceNodeId}`),t.has(r.targetNodeId)||e.push(`Connection references non-existent target node: ${r.targetNodeId}`),r.sourceNodeId===r.targetNodeId&&e.push(`Connection cannot link a node to itself: ${r.sourceNodeId}`);return Dt(a)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function Dt(a){let e=new Set,t=new Set,o=new Map;for(let s of a.nodes||[])o.set(s.id,[]);for(let s of a.connections||[]){let i=o.get(s.sourceNodeId);i&&i.push(s.targetNodeId)}let r=s=>{if(e.has(s))return!0;if(t.has(s))return!1;e.add(s);for(let i of o.get(s)||[])if(r(i))return!0;return e.delete(s),t.add(s),!1};for(let s of o.keys())if(r(s))return!0;return!1}function no(a){let e=a?.nodes||[],t=new Set((a?.connections||[]).map(s=>s.targetNodeId)),o=[],r=s=>{o.includes(s)||o.push(s)};return e.filter(s=>s.type==="start").forEach(r),e.filter(s=>s.type==="inject").forEach(r),e.filter(s=>!t.has(s.id)).forEach(r),o}function ye(a){return a==null||a===""||Array.isArray(a)&&a.length===0}function lo(...a){let e=a.filter(Boolean).reduce((t,o)=>({...t,...o}),{});return Object.keys(e).length?e:null}var te={required(a){return ye(a.value)?{required:!0}:null},requiredTrue(a){return a.value===!0?null:{required:!0}},email(a){return ye(a.value)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a.value))?null:{email:!0}},minLength(a){return e=>ye(e.value)||String(e.value).length>=a?null:{minlength:{requiredLength:a,actualLength:String(e.value).length}}},maxLength(a){return e=>ye(e.value)||String(e.value).length<=a?null:{maxlength:{requiredLength:a,actualLength:String(e.value).length}}},pattern(a){let e=a instanceof RegExp?a:new RegExp(a);return t=>ye(t.value)?null:(e.lastIndex=0,e.test(String(t.value))?null:{pattern:{requiredPattern:e.toString(),actualValue:t.value}})},min(a){return e=>ye(e.value)||Number(e.value)>=a?null:{min:{min:a,actual:e.value}}},max(a){return e=>ye(e.value)||Number(e.value)<=a?null:{max:{max:a,actual:e.value}}},nullValidator(){return null},compose(a){return e=>lo(...a.filter(t=>typeof t=="function").map(t=>t(e)))},composeAsync(a){return async e=>{let t=await Promise.all(a.filter(o=>typeof o=="function").map(o=>o(e)));return lo(...t)}}};function Ge(a){return a==null?[]:Array.isArray(a)?a:[a]}var Xe=class{constructor(e,t){this._status="VALID",this._errors=null,this._validators=[],this._asyncValidators=[],this._asyncSequence=0,this.valueChanges=new St,this.statusChanges=new St,this.touched=!1,this.dirty=!1,this._validators=Ge(e),this._asyncValidators=Ge(t)}get value(){return this._value}get status(){return this._status}get errors(){return this._errors}get valid(){return this._status==="VALID"}get invalid(){return this._status==="INVALID"}get pending(){return this._status==="PENDING"}get disabled(){return this._status==="DISABLED"}get parent(){return this._parent}setParent(e){this._parent=e}patchValue(e,t){this.setValue(e,t)}setValidators(e){this._validators=Ge(e),this.updateValueAndValidity()}addValidators(e){this._validators=[...this._validators,...Ge(e)],this.updateValueAndValidity()}clearValidators(){this._validators=[],this.updateValueAndValidity()}setAsyncValidators(e){this._asyncValidators=Ge(e),this.updateValueAndValidity()}markAsTouched(){this.touched=!0}markAsUntouched(){this.touched=!1}markAsDirty(){this.dirty=!0}markAsPristine(){this.dirty=!1}markAllAsTouched(){this.markAsTouched()}reset(e,t={emitEvent:!0}){this.markAsPristine(),this.markAsUntouched(),this.setValue(e,t)}disable(e={emitEvent:!0}){this.setDisabled(!0,e)}enable(e={emitEvent:!0}){this.setDisabled(!1,e)}setDisabled(e,t){if(this._status=e?"DISABLED":"VALID",e)this._errors=null;else{this.updateValueAndValidity(t);return}t.emitEvent!==!1&&this.statusChanges.emit(this._status)}updateValueAndValidity(e={emitEvent:!0}){if(this._status==="DISABLED"){this._errors=null,e.emitEvent!==!1&&this.statusChanges.emit(this._status);return}let t=this.runSyncValidators();if(this._asyncValidators.length){this._status="PENDING",this._errors=t,e.emitEvent!==!1&&this.statusChanges.emit(this._status);let o=++this._asyncSequence;Promise.all(this._asyncValidators.map(r=>r(this))).then(r=>{o===this._asyncSequence&&(this._errors=this.mergeErrors(t,...r),this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))}).catch(()=>{o===this._asyncSequence&&(this._errors={...t||{},async:!0},this._status="INVALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))});return}this._errors=t,this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e)}notifyParent(e){!e.onlySelf&&this._parent&&this._parent.updateValueAndValidity({...e,onlySelf:!1})}runSyncValidators(){return this.mergeErrors(...this._validators.map(e=>e(this)))}mergeErrors(...e){let t=e.filter(Boolean).reduce((o,r)=>({...o,...r}),{});return Object.keys(t).length?t:null}},be=class extends Xe{constructor(e=null,t,o){let r=Vt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this._value=e,this.updateValueAndValidity({emitEvent:!1})}setValue(e,t={emitEvent:!0}){this._value=e,t.emitEvent!==!1&&this.valueChanges.emit(e),this.updateValueAndValidity(t)}reset(e=null,t={emitEvent:!0}){super.reset(e,t)}},ke=class extends Xe{constructor(e={},t,o){let r=Vt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this.controls=e,Object.values(e).forEach(s=>s.setParent(this)),this._value=this.reduceValue(),this.updateValueAndValidity({emitEvent:!1})}get(e){let t=String(e||"").split(".").filter(Boolean),o=this;for(let r of t){if(!o)return null;o=o.controls?.[r]}return o||null}addControl(e,t){t.setParent(this),this.controls[e]=t,this.updateValueAndValidity()}removeControl(e){this.controls[e]&&(delete this.controls[e],this.updateValueAndValidity())}setControl(e,t){this.controls[e]&&(this.controls[e]=t,t.setParent(this),this.updateValueAndValidity())}contains(e){return!!this.controls[e]}updateValueAndValidity(e={emitEvent:!0}){this._value=this.reduceValue(),super.updateValueAndValidity(e)}setValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(o=>this.controls[o].setValue(e?.[o],{emitEvent:!1,onlySelf:!0})),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}patchValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(o=>{e&&o in e&&this.controls[o].setValue(e[o],{emitEvent:!1,onlySelf:!0})}),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}reset(e={},t={emitEvent:!0}){super.reset(e,t)}markAllAsTouched(){this.markAsTouched(),Object.values(this.controls).forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=Object.keys(this.controls).reduce((t,o)=>{let r=this.controls[o].errors;return r&&(t[o]=r),t},{});return this.mergeErrors(super.runSyncValidators(),Object.keys(e).length?e:null)}reduceValue(){return Object.keys(this.controls).reduce((e,t)=>(e[t]=this.controls[t].value,e),{})}},Ye=class extends Xe{constructor(e=[],t,o){let r=Vt(t)?t:void 0;super(r?.validators??t,r?.asyncValidators??o),this.controls=[...e],this.controls.forEach(s=>s.setParent(this)),this._value=this.controls.map(s=>s.value),this.updateValueAndValidity({emitEvent:!1})}updateValueAndValidity(e={emitEvent:!0}){this._value=this.controls.map(t=>t.value),super.updateValueAndValidity(e)}at(e){return this.controls[e]||null}push(e){e.setParent(this),this.controls.push(e),this.updateValueAndValidity()}removeAt(e){this.controls.splice(e,1),this.updateValueAndValidity()}clear(){this.controls.length=0,this.updateValueAndValidity()}setValue(e,t={emitEvent:!0}){this.controls.forEach((o,r)=>o.setValue(e?.[r],{emitEvent:!1,onlySelf:!0})),this._value=this.controls.map(o=>o.value),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}markAllAsTouched(){this.markAsTouched(),this.controls.forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=this.controls.some(t=>t.errors)?{children:this.controls.map(t=>t.errors)}:null;return this.mergeErrors(super.runSyncValidators(),e)}};function Vt(a){return!!a&&typeof a=="object"&&!Array.isArray(a)&&("validators"in a||"asyncValidators"in a)}var Oe=class{control(e=null,t,o){return new be(e,t,o)}group(e,t,o){let r={};return Object.keys(e).forEach(s=>{let i=e[s];r[s]=Array.isArray(i)?this.control(i[0],i[1],i[2]):i instanceof be||i instanceof ke||i instanceof Ye?i:this.control(i)}),new ke(r,t,o)}array(e,t,o){let r=e.map(s=>Array.isArray(s)?this.control(s[0],s[1],s[2]):s);return new Ye(r,t,o)}};w(Oe,[[A(),0]]);var oe=class{constructor(e){this.elementRef=e,this.handleInput=()=>{if(!this.control)return;let o=this.elementRef.nativeElement?.value;this.control.setValue(o),this.control.markAsDirty(),this.control.markAsTouched()};let t=this.elementRef?.nativeElement;t?.addEventListener?.("input",this.handleInput),t?.addEventListener?.("change",this.handleInput)}set formControl(e){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe(),this.control=e,e&&(this.writeValue(e.value),this.subscription=e.valueChanges.subscribe(t=>this.writeValue(t)),this.statusSubscription=e.statusChanges.subscribe(()=>this.syncValidity()),this.syncValidity())}get formControl(){return this.control}onDestroy(){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe();let e=this.elementRef?.nativeElement;e?.removeEventListener?.("input",this.handleInput),e?.removeEventListener?.("change",this.handleInput)}writeValue(e){let t=this.elementRef?.nativeElement;t&&t.value!==e&&(t.value=e??"")}syncValidity(){let e=this.elementRef?.nativeElement,t=!!this.control?.invalid;e?.setAttribute?.("aria-invalid",t?"true":"false"),t?e?.classList?.add?.("is-invalid"):e?.classList?.remove?.("is-invalid")}};Reflect.metadata("design:paramtypes",[P])(oe);Reflect.metadata("design:paramtypes",[Object])(oe.prototype,"formControl");w(oe,[[p(),1,"formControl"],[Ct({selector:"[formControl]"}),0]]);var de=class{set formGroup(e){this.group=e}get formGroup(){return this.group}get value(){return this.group?.value}get valid(){return this.group?.valid!==!1}};Reflect.metadata("design:paramtypes",[Object])(de.prototype,"formGroup");w(de,[[p(),1,"formGroup"],[Ct({selector:"[formGroup]"}),0]]);var Le=class{};w(Le,[[$({providers:[Oe,oe,de],declarations:[oe,de],exports:[Oe,oe,de]}),0]]);var yr={required:"Required",requiredTrue:"Required",email:"Invalid email address",url:"Invalid URL",min:"Value is too small",max:"Value is too large",minlength:"Too short",maxlength:"Too long",pattern:"Invalid format",json:"Invalid JSON",number:"Must be a number",integer:"Must be an integer",color:"Use a hex color such as #2563eb",regex:"Invalid regular expression",minItems:"Too few items",maxItems:"Too many items"};function _e(a){return a==null||a===""||Array.isArray(a)&&a.length===0}function br(a){return _e(a.value)||Number.isFinite(Number(a.value))?null:{number:!0}}function kr(a){if(_e(a.value))return null;let e=Number(a.value);return Number.isFinite(e)&&Math.floor(e)===e?null:{integer:!0}}function vr(a){return _e(a.value)||/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(a.value))?null:{color:!0}}function xr(a){if(_e(a.value))return null;try{return new RegExp(String(a.value)),null}catch{return{regex:!0}}}function co(a,e){return t=>{if(!Array.isArray(t.value))return null;let o=t.value.length;return a==="minItems"&&o<e?{minItems:{required:e,actual:o}}:a==="maxItems"&&o>e?{maxItems:{required:e,actual:o}}:null}}function Sr(a){return _e(a.value)||/^(https?:\/\/|\/)[^\s]+$/i.test(String(a.value))?null:{url:!0}}function Cr(a){if(_e(a.value)||typeof a.value!="string")return null;try{return JSON.parse(a.value),null}catch{return{json:!0}}}function Rr(a){let e=[],t=new Set,o=r=>{t.has(r.type)||(t.add(r.type),e.push(r))};return(a.rules||[]).forEach(r=>{o(typeof r=="string"?{type:r}:r)}),a.required&&o({type:"required"}),(a.type==="number"||a.type==="range")&&o({type:"number"}),a.type==="email"&&o({type:"email"}),a.type==="url"&&o({type:"url"}),a.type==="json"&&o({type:"json"}),a.type==="color"&&o({type:"color"}),a.min!==void 0&&o({type:"min",value:a.min}),a.max!==void 0&&o({type:"max",value:a.max}),a.minLength!==void 0&&o({type:"minLength",value:a.minLength}),a.maxLength!==void 0&&o({type:"maxLength",value:a.maxLength}),a.pattern&&o({type:"pattern",value:a.pattern}),a.minItems!==void 0&&o({type:"minItems",value:a.minItems}),a.maxItems!==void 0&&o({type:"maxItems",value:a.maxItems}),e}function Ir(a){switch(a.type){case"required":return te.required;case"requiredTrue":return te.requiredTrue;case"email":return te.email;case"url":return Sr;case"min":return te.min(Number(a.value));case"max":return te.max(Number(a.value));case"minLength":return te.minLength(Number(a.value));case"maxLength":return te.maxLength(Number(a.value));case"pattern":try{return te.pattern(new RegExp(String(a.value)))}catch{return}case"json":return Cr;case"color":return vr;case"regex":return xr;case"minItems":return co("minItems",Number(a.value));case"maxItems":return co("maxItems",Number(a.value));case"number":return br;case"integer":return kr;default:return}}function jt(a){let e=[],t={};return Rr(a).forEach(o=>{let r=Ir(o);if(r&&(e.push(r),o.message)){let s=o.type==="minLength"?"minlength":o.type==="maxLength"?"maxlength":o.type;t[s]=o.message}}),{validators:e,messages:t}}function zt(a,e,t,o){if(!e)return"";let r=Object.keys(e);for(let s of r){let i=a.errorMessages?.[s]||t?.[s]||o?.[s]||yr[s];if(i)return i}return""}function Pt(a,e={},t){let o=Array.isArray(a)?a:a?.fields||[],r=[];for(let s of o){let i={value:e?.[s.key]},n=jt(s),l={};for(let d of n.validators){let c=d(i);c&&Object.assign(l,c)}Object.keys(l).length&&r.push({key:s.key,errors:l,message:zt(s,l,n.messages,t)})}return{valid:r.length===0,issues:r}}function Ar(a){return{...a,key:String(a?.key??""),type:a?.type||"text",options:Array.isArray(a?.options)?a.options:void 0,rules:Array.isArray(a?.rules)?a.rules:void 0}}function Tr(a){let e=a;return typeof e=="string"&&(e=JSON.parse(e)),Array.isArray(e)&&(e={fields:e}),!e||typeof e!="object"?{fields:[]}:{...e,fields:(Array.isArray(e.fields)?e.fields:[]).filter(t=>t&&t.key).map(Ar)}}function Nr(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function Er(a,e){return!!a&&Object.prototype.hasOwnProperty.call(a,e)}var Or=0,E=class{constructor(){this.classPrefix="df",this.showActions=!1,this.submitLabel="",this.resetLabel="",this.resetFieldLabel="Reset to default",this.emptyLabel="No fields",this.messages={},this._schema={fields:[]},this._value={},this._contextKey="",this.formSignature="",this.schemaSignature="",this.valueSignature="",this.schemaError="",this.validationErrors={},this.ruleMessages={},this.submitAttempted=!1,this.valueVersion=0,this.destroyed=!1,this.syncQueued=!1,this.syncMode="none",this.formId=`dynamic-form-${++Or}`,this.jsonRawFields={}}set schema(e){let t,o="";try{t=Tr(e)}catch(s){t={fields:[]},o=`Invalid form schema: ${s.message}`}let r=JSON.stringify(t);r===this.schemaSignature&&o===this.schemaError||(this.schemaSignature=r,this.schemaError=o,this._schema=t,Promise.resolve().then(()=>{this.destroyed||this.applySchema()}))}get schema(){return this._schema}set value(e){let t=e&&typeof e=="object"?e:{},o=JSON.stringify(t);o!==this.valueSignature&&(this.valueSignature=o,this._value=t,this.scheduleSync(!1))}get value(){return this._value}set contextKey(e){let t=String(e??"");t!==this._contextKey&&(this._contextKey=t,this.scheduleSync(!0))}get contextKey(){return this._contextKey}scheduleSync(e){e?this.syncMode="force":this.syncMode==="none"&&(this.syncMode="soft"),!this.syncQueued&&(this.syncQueued=!0,Promise.resolve().then(()=>{this.syncQueued=!1;let t=this.syncMode;this.syncMode="none",this.destroyed||this.syncValues(t==="force")}))}get submitText(){return this.submitLabel||this._schema?.submitLabel||"Submit"}get resetText(){return this.resetLabel||this._schema?.resetLabel||"Reset"}get formValid(){return!!this.form?.valid}get isDirty(){return!!this.form?.dirty}get visibleGroups(){this.valueVersion;let e=[],t={};return this.schemaFields().forEach(o=>{if(o.hidden||o.type==="hidden"||!this.isVisible(o))return;let r=o.group||this._schema?.defaultGroupLabel||"",s=t[r];s===void 0&&(s=e.length,t[r]=s,e.push({label:r,fields:[]})),e[s].fields.push(o)}),e}schemaFields(){return this._schema?.fields||[]}applySchema(){let e=this.schemaFields(),t=e.map(s=>[s.key,s.type,s.required?1:0,s.defaultValue===void 0?"":JSON.stringify(s.defaultValue),JSON.stringify(s.rules||""),s.min??"",s.max??"",s.minLength??"",s.maxLength??"",s.pattern||""].join(":")).join("|");if(this.form&&t===this.formSignature){this.syncValues(!1);return}let o={};this.ruleMessages={},e.forEach(s=>{let i=jt(s);this.ruleMessages[s.key]=i.messages,o[s.key]=new be(this.initialValue(s),i.validators)});let r=new ke(o);r[K]=!0,Object.values(o).forEach(s=>{s[K]=!0}),this.form=r,this.formSignature=t,this.valueVersion+=1,this.refreshErrors()}syncValues(e){if(!this.form){this.applySchema();return}this.schemaFields().forEach(t=>{let o=this.form?.get(t.key);if(!o)return;let r=this.initialValue(t);e?o.reset(r,{emitEvent:!1}):!o.dirty&&o.value!==r&&o.setValue(r,{emitEvent:!1})}),this.valueVersion+=1,this.refreshErrors()}refreshErrors(){let e={};this.schemaFields().forEach(t=>{e[t.key]=this.form?.get(t.key)?.errors||null}),this.validationErrors=e}fieldDisplayValue(e,t){return e.type==="json"?typeof t=="string"?t:t==null?"":JSON.stringify(t,null,2):e.type==="checkbox"||e.type==="switch"?!!t:t??""}initialValue(e){let t=this._value||{},o=Er(t,e.key)?t[e.key]:e.defaultValue;return e.type==="json"?o:this.fieldDisplayValue(e,o)}resetValue(e){return e.type==="json"?e.defaultValue:this.fieldDisplayValue(e,e.defaultValue)}coerceValue(e,t){return e.type==="checkbox"||e.type==="switch"?!!t:e.type==="number"||e.type==="range"?t===""||t===void 0||t===null?"":Number(t):t}updateValue(e,t){let o=this.form?.get(e.key);if(!o)return;o.setValue(this.coerceValue(e,t)),o.markAsDirty(),o.markAsTouched(),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:o.errors};let r={key:e.key,value:o.value,field:e,valid:o.valid,errors:o.errors};this.changeAction?.(r),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}isJsonRaw(e){return this.jsonRawFields[e.key]===!0}isJsonObjectValue(e){let t=this.fieldValue(e);return t==null||t===""||typeof t=="object"&&!Array.isArray(t)}isJsonObjectEditor(e){return e.type==="json"&&!this.isJsonRaw(e)&&this.isJsonObjectValue(e)}isJsonTextArea(e){return e.type==="json"&&!this.isJsonObjectEditor(e)}jsonTextValue(e){let t=this.fieldValue(e);if(typeof t=="string")return t;try{return JSON.stringify(t??{},null,2)}catch{return""}}toggleJsonMode(e){if(this.isJsonRaw(e)){let t={...this.jsonRawFields};delete t[e.key],this.jsonRawFields=t;let o=this.fieldValue(e);if(typeof o=="string"&&o.trim())try{this.updateValue(e,JSON.parse(o))}catch{}return}this.jsonRawFields={...this.jsonRawFields,[e.key]:!0}}jsonEntries(e){let t=this.fieldValue(e);return!t||typeof t!="object"||Array.isArray(t)?[]:Object.entries(t).map(([o,r])=>({key:o,value:r,display:typeof r=="object"&&r!==null?JSON.stringify(r):String(r??"")}))}updateJsonObject(e,t){let o={};for(let r of t)o[r.key]=r.value;this._value={...this._value||{},[e.key]:o},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,o)}addJsonEntry(e){let t=this.jsonEntries(e).map(s=>({key:s.key,value:s.value})),o=new Set(t.map(s=>s.key)),r=t.length+1;for(;o.has(`field${r}`);)r+=1;t.push({key:`field${r}`,value:""}),this.updateJsonObject(e,t)}removeJsonEntry(e,t){let o=this.jsonEntries(e).map(r=>({key:r.key,value:r.value}));o.splice(t,1),this.updateJsonObject(e,o)}changeJsonEntryKey(e,t,o){let r=this.jsonEntries(e).map(s=>({key:s.key,value:s.value}));r[t]={...r[t],key:String(o?.target?.value??"")},this.updateJsonObject(e,r)}changeJsonEntryValue(e,t,o){let r=this.jsonEntries(e).map(n=>({key:n.key,value:n.value})),s=String(o?.target?.value??""),i=s;if(s!=="")try{i=JSON.parse(s)}catch{i=s}else i="";r[t]={...r[t],value:i},this.updateJsonObject(e,r)}jsonModeClass(){return`${this.classPrefix}-field-mode`}isKeyValueInput(e){return e.type==="keyvalue"}keyValueValueType(e){return e.valueType==="number"||e.valueType==="boolean"?e.valueType:"text"}keyValueEntries(e){let t=this.fieldValue(e);return!t||typeof t!="object"||Array.isArray(t)?[]:Object.entries(t).map(([o,r])=>({key:o,value:r}))}updateKeyValue(e,t){let o={};for(let r of t)o[r.key]=r.value;this._value={...this._value||{},[e.key]:o},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,o)}addKeyValue(e){let t=this.keyValueEntries(e),o=new Set(t.map(i=>i.key)),r=t.length+1;for(;o.has(`field${r}`);)r+=1;let s=this.keyValueValueType(e);t.push({key:`field${r}`,value:s==="number"?0:s==="boolean"?!1:""}),this.updateKeyValue(e,t)}removeKeyValue(e,t){let o=this.keyValueEntries(e);o.splice(t,1),this.updateKeyValue(e,o)}changeKeyValueKey(e,t,o){let r=this.keyValueEntries(e);r[t]={...r[t],key:String(o?.target?.value??"")},this.updateKeyValue(e,r)}changeKeyValueValue(e,t,o){let r=this.keyValueEntries(e),s=this.keyValueValueType(e),i=s==="boolean"?!!o?.target?.checked:o?.target?.value,n=s==="number"?i===""?0:Number(i):s==="boolean"?!!i:i;r[t]={...r[t],value:n},this.updateKeyValue(e,r)}keyValueClass(){return`${this.classPrefix}-keyvalue`}keyValueRowClass(){return`${this.classPrefix}-keyvalue-row`}keyValueKeyClass(){return`${this.classPrefix}-input ${this.classPrefix}-keyvalue-key`}keyValueValueClass(){return`${this.classPrefix}-input ${this.classPrefix}-keyvalue-value`}isListInput(e){return e.type==="list"}listIndex(e,t){let o=this.listItems(e).indexOf(t);return o<0?0:o}listItems(e){let t=this.fieldValue(e);return Array.isArray(t)?t:[]}listItemValue(e,t){let o=e?.[t.key];return this.fieldDisplayValue(t,o===void 0?t.defaultValue:o)}listItemChecked(e,t){return e?.[t.key]===!0}isListItemVisible(e,t){let o=e.visibleWhen;if(!o)return!0;let r=t?.[o.key];return o.equals!==void 0?String(r)===String(o.equals):o.notEquals!==void 0?String(r)!==String(o.notEquals):o.in?o.in.map(s=>String(s)).includes(String(r)):o.truthy!==void 0?o.truthy?!!r:!r:o.falsy!==void 0?o.falsy?!r:!!r:!0}listItemError(e,t){let o=this.listItemValue(t,e),r=o==null||o==="";return e.required&&r?this.messages?.required||e.errorMessages?.required||"Required":""}updateList(e,t){let o=[...t],r=e.key;this._value={...this._value||{},[r]:o},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,o)}addListItem(e){let t=this.listItems(e).map(r=>({...r})),o={};(e.itemFields||[]).forEach(r=>{o[r.key]=r.defaultValue!==void 0?r.defaultValue:r.type==="checkbox"||r.type==="switch"?!1:""}),t.push(o),this.updateList(e,t)}removeListItem(e,t){let o=this.listItems(e).map(r=>({...r}));o.splice(t,1),this.updateList(e,o)}changeListItem(e,t,o,r){let s=this.listItems(e).map(n=>({...n})),i=o.type==="checkbox"||o.type==="switch"?!!r?.target?.checked:r?.target?.value;s[t]={...s[t]||{},[o.key]:this.coerceValue(o,i)},this.updateList(e,s)}changeListItemOption(e,t,o,r){let s=this.listItems(e).map(i=>({...i}));s[t]={...s[t]||{},[o.key]:r},this.updateList(e,s)}listClass(){return`${this.classPrefix}-list`}listRowClass(){return`${this.classPrefix}-list-row`}listFieldsClass(){return`${this.classPrefix}-list-fields`}listItemFieldClass(e){return`${this.classPrefix}-list-field`}listAddClass(){return`${this.classPrefix}-list-add`}listRemoveClass(){return`${this.classPrefix}-list-remove`}changeText(e,t){this.updateValue(e,t?.target?.value)}changeBoolean(e,t){this.updateValue(e,!!t?.target?.checked)}chooseOption(e,t){this.updateValue(e,t)}blurField(e){this.blurAction?.(e)}resetField(e){let t=this.form?.get(e.key);t&&(t.reset(this.resetValue(e),{emitEvent:!1}),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:t.errors},this.changeAction?.({key:e.key,value:t.value,field:e,valid:t.valid,errors:t.errors}),this.validityAction?.(!!this.form?.valid,this.form?.errors||null))}reset(e=!0){if(this.schemaFields().forEach(t=>{let o=t.defaultValue!==void 0?this.resetValue(t):this.initialValue(t);this.form?.get(t.key)?.reset(o,{emitEvent:!1})}),this.submitAttempted=!1,this.valueVersion+=1,this.refreshErrors(),e){let t=this.getValue();this.resetAction?.(t),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}return this.getValue()}resetForm(){this.reset(!0)}submit(){this.submitAttempted=!0,this.form?.markAllAsTouched(),this.refreshErrors();let e={value:this.getValue(),valid:!!this.form?.valid,errors:this.form?.errors||null};return this.submitAction?.(e),e}validate(){return{valid:!!this.form?.valid,value:this.getValue(),errors:this.form?.errors||null}}getValue(){let e={};return this.schemaFields().forEach(t=>{let o=this.form?.get(t.key),r=o?o.value:this.initialValue(t);switch(t.type){case"number":case"range":e[t.key]=r===""||r===void 0||r===null?"":Number(r);break;case"checkbox":case"switch":e[t.key]=r===!0;break;case"json":if(typeof r=="string"&&r.trim()!=="")try{e[t.key]=JSON.parse(r)}catch{e[t.key]=r}else e[t.key]=r;break;default:e[t.key]=r;break}}),e}setValue(e){this._value=e&&typeof e=="object"?e:{},this.valueSignature=JSON.stringify(this._value),this.valueVersion+=1,this.syncValues(!0)}patchValue(e){this.setValue({...this._value,...e||{}})}sameOptionValue(e,t){return String(e)===String(t)}isVisible(e){if(!e.visibleWhen)return!0;let t=this.form?.get(e.visibleWhen.key),o=t?t.value:this._value?.[e.visibleWhen.key];return Nr(o,e.visibleWhen)}fieldLabel(e){return e.label||e.key}fieldValue(e){return this.valueVersion,this.form?.get(e.key)?.value??this.initialValue(e)}fieldChecked(e){return this.fieldValue(e)===!0}isRequired(e){return e.required===!0||(e.rules||[]).some(t=>{let o=typeof t=="string"?t:t?.type;return o==="required"||o==="requiredTrue"})}canReset(e){return e.defaultValue!==void 0&&!e.readonly&&!e.disabled}errorFor(e){let t=this.validationErrors[e.key],o=this.form?.get(e.key);if(!o||o.valid||!(o.dirty||o.touched||this.submitAttempted))return"";let r={...this._schema?.messages||{},...this.messages||{}};return zt(e,t,this.ruleMessages[e.key],r)}encodeValue(e){return encodeURIComponent(String(this.fieldValue(e)??""))}suggestionData(e){return encodeURIComponent(JSON.stringify(e.suggestions||[]))}htmlType(e){switch(e.type){case"number":return"number";case"range":return"range";case"password":case"email":case"url":case"tel":case"search":case"date":case"time":case"datetime-local":case"month":case"week":case"color":return e.type;default:return"text"}}isTextInput(e){return["text","password","email","url","tel","search","date","time","datetime-local","month","week","color"].includes(e.type)}isNumberInput(e){return e.type==="number"||e.type==="range"}isBooleanInput(e){return e.type==="checkbox"||e.type==="switch"}isOptionInput(e){return e.type==="select"||e.type==="radio"}isTextareaInput(e){return e.type==="textarea"}isCodeInput(e){return e.type==="code"}formClass(){return`${this.classPrefix}-form dynamic-form`}schemaErrorClass(){return`${this.classPrefix}-schema-error`}groupClass(){return`${this.classPrefix}-field-group`}groupFieldsClass(){return`${this.classPrefix}-fields`}groupTitleClass(){return`${this.classPrefix}-field-group-title`}noFieldsClass(){return`${this.classPrefix}-no-fields`}fieldClass(e){let t=e.span||"full";return[`${this.classPrefix}-field`,t==="half"?"is-half":"is-full",e.fieldClass||""].filter(Boolean).join(" ")}labelRowClass(){return`${this.classPrefix}-field-label-row`}labelClass(){return`${this.classPrefix}-field-label`}requiredClass(){return`${this.classPrefix}-field-required`}resetClass(){return`${this.classPrefix}-field-reset`}inputClass(e){return[`${this.classPrefix}-input`,e.inputClass||""].filter(Boolean).join(" ")}inputWrapClass(e){return`${this.classPrefix}-input-wrap${e.unit?" has-unit":""}`}inputUnitClass(){return`${this.classPrefix}-input-unit`}textareaClass(e){return[`${this.classPrefix}-textarea`,e.inputClass||""].filter(Boolean).join(" ")}codeClass(e){return[`${this.classPrefix}-textarea`,`${this.classPrefix}-code-editor`,e.inputClass||""].filter(Boolean).join(" ")}checkboxRowClass(){return`${this.classPrefix}-checkbox-row`}optionsClass(){return`${this.classPrefix}-options`}optionClass(e,t){return[`${this.classPrefix}-option`,this.sameOptionValue(t.value,this.fieldValue(e))?"is-selected":"",t.disabled||e.disabled||e.readonly?"is-disabled":""].filter(Boolean).join(" ")}errorClass(){return`${this.classPrefix}-field-error`}hintClass(){return`${this.classPrefix}-field-hint`}actionsClass(){return`${this.classPrefix}-actions`}buttonClass(e){return[`${this.classPrefix}-btn`,e?`${this.classPrefix}-btn-primary`:""].filter(Boolean).join(" ")}onDestroy(){this.destroyed=!0}};Reflect.metadata("design:type",Object)(E.prototype,"classPrefix");Reflect.metadata("design:type",Object)(E.prototype,"showActions");Reflect.metadata("design:type",Object)(E.prototype,"submitLabel");Reflect.metadata("design:type",Object)(E.prototype,"resetLabel");Reflect.metadata("design:type",Object)(E.prototype,"resetFieldLabel");Reflect.metadata("design:type",Object)(E.prototype,"emptyLabel");Reflect.metadata("design:type",Object)(E.prototype,"messages");Reflect.metadata("design:type",Function)(E.prototype,"changeAction");Reflect.metadata("design:type",Function)(E.prototype,"blurAction");Reflect.metadata("design:type",Function)(E.prototype,"submitAction");Reflect.metadata("design:type",Function)(E.prototype,"resetAction");Reflect.metadata("design:type",Function)(E.prototype,"validityAction");Reflect.metadata("design:paramtypes",[Object])(E.prototype,"schema");Reflect.metadata("design:paramtypes",[Object])(E.prototype,"value");Reflect.metadata("design:paramtypes",[String])(E.prototype,"contextKey");w(E,[[p(),1,"classPrefix"],[p(),1,"showActions"],[p(),1,"submitLabel"],[p(),1,"resetLabel"],[p(),1,"resetFieldLabel"],[p(),1,"emptyLabel"],[p(),1,"messages"],[p(),1,"changeAction"],[p(),1,"blurAction"],[p(),1,"submitAction"],[p(),1,"resetAction"],[p(),1,"validityAction"],[p(),1,"schema"],[p(),1,"value"],[p(),1,"contextKey"],[S({selector:"dynamic-form",template:`
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
                        <span class="df-field-actions">
                        <button [class]="jsonModeClass()" v-if="field.type === 'json'" type="button"
                            @click="toggleJsonMode(field)">{{isJsonRaw(field) ? (schema.jsonFieldsLabel || 'Fields') : (schema.jsonTextLabel || 'JSON')}}</button>
                        <button [class]="resetClass()" v-if="canReset(field)" type="button"
                            title="{{resetFieldLabel}}" aria-label="{{resetFieldLabel}}"
                            @click="resetField(field)">\u21BA</button>
                        </span>
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
                    <textarea v-if="isJsonTextArea(field)" [class]="textareaClass(field)"
                        data-dynamic-code="json"
                        [value]="jsonTextValue(field)" [rows]="field.rows || 4"
                        [placeholder]="field.placeholder || ''" [readOnly]="field.readonly" [disabled]="field.disabled"
                        aria-required="{{isRequired(field) ? 'true' : 'false'}}"
                        aria-invalid="{{errorFor(field) ? 'true' : 'false'}}"
                        @input="changeText(field, $event)" @blur="blurField(field)"></textarea>
                    <div v-if="isJsonObjectEditor(field)" [class]="keyValueClass()">
                        <div [class]="keyValueRowClass()" v-for="(entry, index) in jsonEntries(field)">
                            <input [class]="keyValueKeyClass()" type="text" [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeJsonEntryKey(field, index, $event)" />
                            <input [class]="keyValueValueClass()" type="text" [value]="entry.display"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeJsonEntryValue(field, index, $event)" />
                            <button [class]="listRemoveClass()" type="button" @click="removeJsonEntry(field, index)">{{field.removeLabel || '\u2715'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addJsonEntry(field)">{{field.addLabel || '+ Add'}}</button>
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
                                        <textarea v-if="isTextareaInput(child) || isJsonInput(child)" [class]="textareaClass(child)"
                                            [value]="listItemValue(item, child)"
                                            [rows]="child.rows || (isJsonInput(child) ? 3 : 2)"
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
                    <div v-if="isKeyValueInput(field)" [class]="keyValueClass()">
                        <div [class]="keyValueRowClass()" v-for="(entry, index) in keyValueEntries(field)">
                            <input [class]="keyValueKeyClass()" type="text"
                                [value]="entry.key"
                                [placeholder]="field.keyPlaceholder || 'Key'"
                                @input="changeKeyValueKey(field, index, $event)" />
                            <label v-if="keyValueValueType(field) === 'boolean'" [class]="checkboxRowClass()">
                                <input type="checkbox" [checked]="entry.value === true"
                                    @change="changeKeyValueValue(field, index, $event)" />
                            </label>
                            <input v-else [class]="keyValueValueClass()"
                                type="{{keyValueValueType(field) === 'number' ? 'number' : 'text'}}"
                                [value]="entry.value"
                                [placeholder]="field.valuePlaceholder || 'Value'"
                                @input="changeKeyValueValue(field, index, $event)" />
                            <button [class]="listRemoveClass()" type="button" @click="removeKeyValue(field, index)">{{field.removeLabel || '\u2715'}}</button>
                        </div>
                        <button [class]="listAddClass()" type="button" @click="addKeyValue(field)">{{field.addLabel || '+ Add'}}</button>
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
    </div>`}),0]]);var uo="tsdi-dynamic-form-styles",Lr=`
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


.df-keyvalue {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.df-keyvalue-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
}


.df-field-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.df-field-mode {
    border: 0;
    background: transparent;
    color: var(--df-text-hint);
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
}

.df-field-mode:hover {
    color: var(--df-primary);
}

`;function po(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById(uo))return;let e=a.createElement("style");e.setAttribute("id",uo),e.textContent=Lr,a.head.appendChild(e)}var Me=class{};w(Me,[[$({declarations:[E],exports:[E]}),0]]);function fo(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(t=>String(t)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function _r(a){return{...a,type:a.type==="boolean"?"checkbox":a.type}}function ho(a,e){let t=[];for(let o of a?.nodes||[]){let r=e.get(o.type);if(!r?.fields?.length)continue;let s=o.config||{},i={};for(let d of r.fields)i[d.key]=s[d.key]!==void 0?s[d.key]:d.defaultValue;let n=r.fields.filter(d=>!d.visibleWhen||fo(i[d.visibleWhen.key],d.visibleWhen)).map(_r),l=Pt(n,i);for(let d of l.issues)t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:d.key,label:n.find(c=>c.key===d.key)?.label||d.key,message:d.message});for(let d of n){if(!d.itemFields?.length)continue;let c=Array.isArray(i[d.key])?i[d.key]:[];if(d.required&&!c.length){t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:d.key,label:d.label||d.key,message:"Required"});continue}c.forEach((u,m)=>{let f=d.itemFields.filter(y=>!y.visibleWhen||fo(u?.[y.visibleWhen.key],y.visibleWhen)),b=Pt(f,u||{});for(let y of b.issues){let k=f.find(R=>R.key===y.key)?.label||y.key;t.push({nodeId:o.id,nodeName:o.name||o.id,fieldKey:`${d.key}[${m}].${y.key}`,label:`${d.label||d.key} ${m+1} \xB7 ${k}`,message:y.message})}})}}return t}function Ze(a){let e=we(a),t=new Map,o=new Map,r=new Map,s=(a?.connections||[]).slice();for(let u of a?.nodes||[])t.set(u.id,u),o.set(u.id,[]),r.set(u.id,[]);for(let u of s)o.get(u.sourceNodeId)?.push(u),r.get(u.targetNodeId)?.push(u);let i=no(a),n=i[0],l=[],d=new Set,c=i.map(u=>u.id);for(c.forEach(u=>d.add(u));c.length;){let u=c.shift();l.push(u);for(let m of o.get(u)||[])!d.has(m.targetNodeId)&&t.has(m.targetNodeId)&&(d.add(m.targetNodeId),c.push(m.targetNodeId))}for(let u of t.keys())d.has(u)||l.push(u);return{definition:a,entry:n,entries:i,nodes:t,outgoing:o,incoming:r,edges:s,order:l,reachable:d,valid:e.valid,errors:e.errors}}function mo(a,e={}){let t=Ze(a),o=e.originX??80,r=e.originY??80,s=e.columnGap??240,i=e.rowGap??140,n=new Map,l=[],d=(t.entries.length?t.entries:t.entry?[t.entry]:[]).map(m=>m.id),c=[...d];for(d.forEach(m=>n.set(m,0));c.length;){let m=c.shift(),f=n.get(m)||0;for(let b of t.outgoing.get(m)||[]){let y=b.targetNodeId;if(!t.nodes.has(y))continue;let k=f+1,R=n.get(y);(R===void 0||R<k)&&(R===void 0&&c.push(y),n.set(y,k))}}for(let m of t.order){n.has(m)||n.set(m,Mr(n,0));let f=n.get(m)||0;l[f]||(l[f]=[]),l[f].push(m)}let u={};return l.forEach((m,f)=>{m.forEach((b,y)=>{u[b]={x:o+f*s,y:r+y*i}})}),u}function Mr(a,e){let t=e;return a.forEach(o=>{t=Math.max(t,o)}),t+1}var go,wo,Dr;function Qe(a){return{id:a.id,name:a.name,description:a.description,nodeCount:a.nodes?.length||0,connectionCount:a.connections?.length||0,updatedAt:a.metadata?.updatedAt||new Date().toISOString()}}function Ft(a){return JSON.parse(JSON.stringify(a))}var $t=class{constructor(){this[go]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(Qe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?Ft(t):void 0}async save(e){let t={...Ft(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),Qe(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};go=K;var qt=class{constructor(e="tsdi.workflow.definitions.v1",t=yo()){this.key=e,this.storage=t,this[wo]=!0}async list(){return this.readAll().map(Qe).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(r=>r.id!==e.id),o={...Ft(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(o),this.writeAll(t),Qe(o)}async remove(e){let t=this.readAll(),o=t.filter(r=>r.id!==e);return o.length===t.length?!1:(this.writeAll(o),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};wo=K;function yo(){try{return globalThis.localStorage}catch{return}}function bo(){return yo()?new qt:new $t}Dr=K;function ko(a){return Qe(a)}var H=class{};w(H,[[se(),0]]);var Z=class extends H{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return Ke(this.node,e,this.runtimeHost)}};var Wt=class extends Xt{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return Z}getBackend(){return e=>Ke(e.node,e.context,e.host)}handleNode(e){return Promise.resolve(this.handle(e,vt(this.injector)))}};function vo(a,e){let t=a.get(qe,null);if(t)return e.forEach(r=>t.addInterceptor(Z,r)),new Wt(a);let o=new Gt(r=>Ke(r.node,r.context,r.host),()=>e);return{handleNode:r=>Promise.resolve(o.handle(r,vt(a)))}}function Vr(a){return{nodeId:a,status:"pending"}}var ut=class{intercept(e,t,o){let{node:r,state:s,emit:i}=e,n=s.nodeStates?.get(r.id)||Vr(r.id);return n.status="running",n.startedAt=Date.now(),s.nodeStates?.set(r.id,n),s.currentNodeId=r.id,s.activeNodeIds=[...s.activeNodeIds||[],r.id],i({type:"node-start",nodeId:r.id,status:"running"}),Promise.resolve(t.handle(e,o)).then(l=>(this.finish(e,n,l),l),l=>{let d={success:!1,error:l,data:{nodeId:r.id}};return this.finish(e,n,d),d})}finish(e,t,o){let{node:r,state:s,emit:i}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=o.success?"success":"failed",t.result=o,t.error=o.error?.message,s.nodeStates?.set(r.id,t),s.nodeResults.set(r.id,o),s.activeNodeIds=(s.activeNodeIds||[]).filter(n=>n!==r.id),i({type:"node-end",nodeId:r.id,status:t.status,result:o})}};function jr(a){return a>0?new Promise(e=>setTimeout(e,a)):Promise.resolve()}var Jt=class{constructor(e={}){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(0,Number(this.options.retries??1)||0),s=Math.max(0,Number(this.options.delayMs??0)||0),i=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,n=this.options.shouldRetry||((d,c)=>c?!0:d?.success===!1),l=async d=>{try{let c=await t.handle(e,o);if(d>=r||!n(c,void 0,e,d))return c}catch(c){if(d>=r||!n(void 0,c,e,d))throw c}return await jr(s*Math.pow(i,d)),l(d+1)};return l(0)}},pt=class{intercept(e,t,o){let r=e.node.config||{},s=Math.max(0,Math.min(20,Number(r.retry??r.retries)||0)),i=Math.max(0,Number(r.retryDelay)||0),n=Math.max(0,Number(r.timeout)||0);if(!s&&!n)return Promise.resolve(t.handle(e,o));let l={handle:(d,c)=>t.handle(d,c)};if(n>0){let d=new Ht({timeoutMs:n}),c=l;l={handle:(u,m)=>d.intercept(u,c,m)}}if(s>0){let d=new Jt({retries:s,delayMs:i}),c=l;l={handle:(u,m)=>d.intercept(u,c,m)}}return Promise.resolve(l.handle(e,o))}},Ht=class{constructor(e){this.options=e}intercept(e,t,o){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,o));let r=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(s=>{let i=!1,n=setTimeout(()=>{i||(i=!0,s({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${r}ms`),data:{nodeId:e.node.id,timeoutMs:r}}))},r);Promise.resolve(t.handle(e,o)).then(l=>{i||(i=!0,clearTimeout(n),s(l))},l=>{i||(i=!0,clearTimeout(n),s({success:!1,error:l,data:{nodeId:e.node.id}}))})})}};var zr=100,Pr=.35,Fr=2.5;function $r(a){return JSON.parse(JSON.stringify(a))}function qr(a){return`${a}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function Bt(a,e="zh-CN",t){let o=(m,f)=>x(t,e,`workflow.demo.${m}`,f),r=(m,f,b,y,k,R)=>a.createNode(m,{x:y,y:k},{id:f,name:b,config:R}),s=r("start","start_1",o("start","Start"),80,220),i=r("task","task_1",o("loadInput","Load input"),330,220,{action:"loadInput",result:{approved:!0}}),n=r("condition","condition_1",o("approved","Approved?"),590,220,{field:"approved",operator:"truthy"}),l=r("task","task_2",o("approve","Approve"),850,120,{result:{approved:!0}}),d=r("task","task_3",o("reject","Reject"),850,320,{result:{approved:!1}}),c=r("end","end_1",o("end","End"),1110,220),u=(m,f,b,y)=>({id:m,sourceNodeId:f,sourcePort:b,targetNodeId:y,targetPort:"in"});return{id:"workflow_demo",name:o("name","Approval workflow"),description:o("description","Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[s,i,n,l,d,c],connections:[u("conn_1","start_1","out","task_1"),u("conn_2","task_1","out","condition_1"),u("conn_3","condition_1","true","task_2"),u("conn_4","condition_1","false","task_3"),u("conn_5","task_2","out","end_1"),u("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function xo(a="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||"New workflow",description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var G=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new N,this.service=e.service,this.definition=e.definition||Bt(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,o={}){let r=this.registry.get(e);if(!r){this.setError("workflow.error.unknownType",{type:e});return}if(r.singleton&&this.definition.nodes.some(i=>i.type===e)){this.setError("workflow.error.singleton",{label:r.label});return}let s=this.registry.createNode(e,t,{id:this.nextNodeId(e),...o});return this.commit(i=>({...i,nodes:[...i.nodes,s],metadata:{...i.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:s.id},this.clearError(),this.setMessage("workflow.message.added",{name:s.name}),s}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(o=>o.id!==e),connections:t.connections.filter(o=>o.sourceNodeId!==e&&o.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let o=Number.isFinite(t?.x)?t.x:0,r=Number.isFinite(t?.y)?t.y:0,s=this.definition.nodes.find(n=>n.id===e);if(!s)return!1;let i=this.snapPosition({x:o,y:r});return s.position.x===i.x&&s.position.y===i.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(n=>n.id===e?{...n,position:i}:n)}),!0)}updateNode(e,t){return this.definition.nodes.find(r=>r.id===e)?(this.commit(r=>({...r,nodes:r.nodes.map(s=>s.id===e?{...s,...t,id:s.id}:s),metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?this.updateNode(e,{config:{...o.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(o=>o.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}renameWorkflow(e){let t=String(e??"").trim();return!t||t===this.definition.name?!1:(this.commit(o=>({...o,name:t})),this.setMessage("workflow.message.renamed",{name:t}),!0)}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,o,r){let s=this.definition.nodes.find(m=>m.id===e),i=this.definition.nodes.find(m=>m.id===o);if(!s||!i){this.setError("workflow.error.endpoints");return}if(e===o){this.setError("workflow.error.selfLink");return}let n=t||s.outputs?.[0]?.id||"out",l=r||i.inputs?.[0]?.id||"in";if(s.outputs?.length&&!s.outputs.some(m=>m.id===n)){this.setError("workflow.error.unknownOutput",{port:n});return}if(i.inputs?.length&&!i.inputs.some(m=>m.id===l)){this.setError("workflow.error.unknownInput",{port:l});return}let d=this.definition.connections.find(m=>m.sourceNodeId===e&&m.sourcePort===n&&m.targetNodeId===o&&m.targetPort===l);if(d)return this.selection={connectionId:d.id},d;let c={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:n,targetNodeId:o,targetPort:l},u={...this.definition,connections:[...this.definition.connections,c]};if(Dt(u)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...u,metadata:{...u.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:c.id},this.clearError(),this.setMessage("workflow.message.connected"),c}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(o=>o.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let o=this.definition.nodes.find(r=>r.id===e);return o?(this.selection={nodeId:e},this.drag={nodeId:e,startX:o.position.x,startY:o.position.y,offsetX:t.x-o.position.x,offsetY:t.y-o.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),o=Math.round(e.y-this.drag.offsetY),r=this.snapPosition({x:t,y:o});r.x===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.x&&r.y===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(s=>s.id===this.drag.nodeId?{...s,position:r}:s)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,o,r="output"){let s=this.definition.nodes.find(n=>n.id===e),i=r==="input"?s?.inputs:s?.outputs;return!s||!(i||[]).some(n=>n.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:r,x:o.x,y:o.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let o=this.connectionDraft;if(o)return this.connectionDraft=void 0,o.sourceSide==="input"?this.addConnection(e,t,o.sourceNodeId,o.sourcePort):this.addConnection(o.sourceNodeId,o.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(Pr,Math.min(Fr,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return Ze(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=mo(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(o=>({...o,position:e[o.id]||o.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(o=>({...o,nodes:[...o.nodes,t],metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(o=>o.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let o;try{o=typeof e=="string"?JSON.parse(e):$r(e)}catch(s){return this.setError(s.message),!1}let r=we(o);return!o||!Array.isArray(o.nodes)||!Array.isArray(o.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=o,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(r.valid?"":r.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let o=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(o={...o,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let r=JSON.stringify(o),s=await e.save(o),i=this.definition,n=i===o||JSON.stringify(i)===r;return n?this.definition=o:t.as&&(this.definition={...i,id:o.id,name:o.name}),this.normalize(),this.dirty=!n,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:o.name}),s}async openFrom(e,t){let o=await e.get(t);return o?this.load(o,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){let e=we(this.definition),t=ho(this.definition,this.registry).map(r=>`${r.nodeName} \xB7 ${r.label}: ${r.message}`),o=[...e.errors,...t];return{valid:o.length===0,errors:o}}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let o=new Error("workflow.error.noService");return this.setError(o.message),{success:!1,error:o}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let o=await this.service.execute(this.definition,e.context||{},{...e,onEvent:s=>{this.activeExecutionId=s.executionId,this.execution=s.snapshot,e.onEvent?.(s)},onCheckpoint:s=>{s.status==="running"&&(this.checkpoint=s),e.onCheckpoint?.(s)}}),r=o.data?.executionState;return r&&(this.execution=r,this.recordExecution(r)),o.success&&(this.checkpoint=void 0),this.activeExecutionId=o.data?.executionId,this.running=!1,this.setMessage(o.success?"workflow.message.completed":"workflow.message.failed"),o.success||this.setError(o.error?.message||"workflow.message.failed"),o}catch(o){return this.running=!1,this.setError(o.message),this.setMessage("workflow.message.failed"),{success:!1,error:o}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=qr("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),o=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(r=>({...r})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(r=>({...r})),config:{...o||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>zr&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(o=>o&&o.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,o=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(o)};let r=this.gridSize;return{x:Math.round(t/r)*r,y:Math.round(o/r)*r}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(r=>r.id)),o=1;for(;t.has(`${e}_${o}`);)o++;return`${e}_${o}`}nextConnectionId(){let e=new Set(this.definition.connections.map(o=>o.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var Wr=184;var Io=20,Ao=48,So={idle:"Idle",pending:"Pending",running:"Running",success:"Done",failed:"Failed",skipped:"Skipped",cancelled:"Cancelled"};function Jr(a){return String(a).toLowerCase().replace(/[^a-z0-9]+/g,"-")}function To(a,e,t){return x(t,e,`workflow.status.${a}`,So[a]||So.idle)}function Ut(a,e,t){let o=a||"idle",r={running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",pending:"Pending",idle:"Idle"};return x(t,e,`workflow.status.${o}`,r[o]||r.idle)}function ft(a){let e=a.dimension?.width||Wr,t=Math.max(a.inputs?.length||0,a.outputs?.length||0,1),o=Math.max(a.dimension?.height||64,Ao+t*Io+10);return{width:e,height:o}}function Hr(a){let{width:e,height:t}=ft(a),o=(r,s)=>(r||[]).map((i,n)=>({id:i.id,label:i.label||i.name||i.id,type:i.type,x:s,y:a.position.y+Ao+n*Io-5}));return{width:e,height:t,inputs:o(a.inputs,a.position.x),outputs:o(a.outputs,a.position.x+e)}}function Co(a,e){let t=Math.max(48,Math.abs(e.x-a.x)/2);return`M ${a.x} ${a.y} C ${a.x+t} ${a.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function Br(a){return{class:["workflow-node",a.selected?"is-selected":""].filter(Boolean).join(" "),"data-node-id":a.id,"data-node-type":a.type,"data-status":a.status,role:"button",tabindex:"0","aria-label":a.name,style:[`left:${a.x}px`,`top:${a.y}px`,`width:${a.width}px`,`min-height:${a.height}px`].join(";")}}function No(a,e,t="zh-CN",o){let r=[],s=new Map,i=a.execution;for(let u of a.nodes){let m=Hr(u);s.set(u.id,m);let f=i?.nodeStates?.[u.id]?.status||"idle",b={id:u.id,name:u.name,type:u.type,typeLabel:e.nodeLabel(u.type,t,o),description:u.description||e.nodeDescription(u.type,t,o),x:u.position.x,y:u.position.y,width:m.width,height:m.height,icon:u.style?.icon||e.get(u.type)?.icon||"\u25C6",color:u.style?.backgroundColor||e.get(u.type)?.color||"#64748b",textColor:u.style?.textColor||e.get(u.type)?.textColor||"#ffffff",selected:a.selection.nodeId===u.id,status:f,statusLabel:To(f,t,o),inputs:m.inputs,outputs:m.outputs};r.push({...b,attrs:Br(b)})}let n=a.connections.map(u=>{let m=a.nodes.find(pe=>pe.id===u.sourceNodeId),f=a.nodes.find(pe=>pe.id===u.targetNodeId),b=m?s.get(m.id):void 0,y=f?s.get(f.id):void 0,k=b?.outputs.find(pe=>pe.id===u.sourcePort)||b?.outputs[0],R=y?.inputs.find(pe=>pe.id===u.targetPort)||y?.inputs[0],O=i?.edgeStates?.[u.id]?.status||"idle",z=a.selection.connectionId===u.id,Re=k&&R?Co(k,R):"M 0 0",st=k&&R?(k.x+R.x)/2:0,Bo=k&&R?(k.y+R.y)/2:0,Uo={class:`workflow-edge workflow-edge-${O}${z?" is-selected":""}`,"data-edge-id":u.id,"data-status":O,d:Re,"marker-end":`url(#wf-arrow-${O})`};return{id:u.id,sourceNodeId:u.sourceNodeId,targetNodeId:u.targetNodeId,sourcePort:u.sourcePort,targetPort:u.targetPort,label:u.label||"",d:Re,status:O,selected:z,attrs:Uo,hitAttrs:{class:"workflow-edge-hit","data-edge-id":u.id,d:Re},labelAttrs:{x:String(st),y:String(Bo-6),class:"workflow-edge-label"}}}),l;if(a.connectionDraft){let u=a.nodes.find(y=>y.id===a.connectionDraft.sourceNodeId),m=u?s.get(u.id):void 0,b=(a.connectionDraft.sourceSide==="input"?m?.inputs:m?.outputs)?.find(y=>y.id===a.connectionDraft.sourcePort);b&&(l={d:Co(b,{x:a.connectionDraft.x,y:a.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=r.reduce((u,m)=>Math.max(u,m.x+m.width),0),c=r.reduce((u,m)=>Math.max(u,m.y+m.height),0);return{nodes:r,edges:n,draft:l,connecting:!!a.connectionDraft,connectingSide:a.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,c+240),zoom:a.zoom,pan:{...a.pan},gridStyle:{"--wf-grid-size":`${24*a.zoom}px`,"--wf-grid-x":`${a.pan.x}px`,"--wf-grid-y":`${a.pan.y}px`}}}function Eo(a,e="zh-CN",t){return a.palette(e,t)}function Ur(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(o=>String(o)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function Kr(a){let e=a.defaultValue;return a.type==="json"?e??{}:a.type==="boolean"?e===!0:e==null?"":String(e)}function Oo(a,e,t="zh-CN",o){let r=a.selectedNode;if(!r)return{hasSelection:!1,nodeId:"",name:"",description:"",icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let s=e.get(r.type),i=a.execution?.nodeStates?.[r.id],n=i?.status||"idle",l={};(s?.fields||[]).forEach(f=>{l[f.key]=r.config?.[f.key]!==void 0?r.config[f.key]:f.defaultValue});let d=(f,b=!1)=>{let y=b?void 0:l[f.key];return{key:f.key,label:x(o,t,`workflow.field.${r.type}.${f.key}`,f.label),type:f.type,value:y,displayValue:f.type==="json"?typeof y=="string"?y:JSON.stringify(y??{},null,2):y==null?"":String(y),checked:y===!0,options:(f.options||[]).map(k=>({label:x(o,t,`workflow.option.${k.value}`,k.label),value:k.value})),placeholder:x(o,t,`workflow.fieldPlaceholder.${r.type}.${f.key}`,f.placeholder||""),description:x(o,t,`workflow.fieldDescription.${r.type}.${f.key}`,f.description||""),group:f.group?x(o,t,`workflow.group.${Jr(f.group)}`,f.group):"",visible:b||!f.visibleWhen?!0:Ur(l[f.visibleWhen.key],f.visibleWhen),min:f.min,max:f.max,step:f.step,unit:f.unit,span:f.span,minLength:f.minLength,maxLength:f.maxLength,rows:f.rows||(f.type==="json"?4:f.type==="code"?8:3),required:f.required===!0,readonly:f.readonly===!0,disabled:f.disabled===!0,pattern:f.pattern,rules:f.rules,errorMessages:f.errorMessages,inputClass:f.inputClass,fieldClass:f.fieldClass,language:f.language,itemFields:f.itemFields?.map(k=>d(k,!0)),addLabel:x(o,t,"workflow.ui.addItem",f.addLabel||"Add"),removeLabel:x(o,t,"workflow.ui.removeItem",f.removeLabel||"Remove"),minItems:f.minItems,maxItems:f.maxItems,visibleWhen:f.visibleWhen,hasDefault:f.defaultValue!==void 0,resetValue:Kr(f)}},c=(s?.fields||[]).map(f=>d(f)),u="";if(i?.result?.data!==void 0)try{u=JSON.stringify(i.result.data,null,2)}catch{u=String(i.result.data)}let m=i?.durationMs||0;return{hasSelection:!0,nodeId:r.id,name:r.name,description:r.description||"",icon:r.style?.icon||s?.icon||"\u25C6",color:r.style?.backgroundColor||s?.color||"#64748b",typeLabel:e.nodeLabel(r.type,t,o),typeDescription:e.nodeDescription(r.type,t,o),status:n,statusLabel:To(n,t,o),durationLabel:m?`${m} ms`:"",fields:c,resultText:u,errorText:i?.error||""}}function Lo(a,e="zh-CN",t){let o=a.execution;return{name:a.definition.name,nodeCount:a.nodes.length,connectionCount:a.connections.length,hasSelection:!!a.selection?.nodeId||!!a.selection?.connectionId,canUndo:a.canUndo,canRedo:a.canRedo,canResume:a.canResume,running:a.running,zoomLabel:`${Math.round(a.zoom*100)}%`,statusLabel:Ut(o?.status,e,t)}}function _o(a,e="zh-CN",t){let o=a.selectedNode,r=a.execution,s=o?a.registry.nodeLabel(o.type,e,t):"";return{message:Lt(t,e,a.message,"",a.messageParams),error:Lt(t,e,a.error,"",a.errorParams),running:a.running,nodeCount:a.nodes.length,selectedLabel:o?`${o.name} \xB7 ${s}`:x(t,e,"workflow.ui.noSelection","No node selected"),zoomLabel:`${Math.round(a.zoom*100)}%`,executionLabel:Ut(r?.status,e,t)}}function Ro(a){if(!a)return"";let e=new Date(a),t=o=>String(o).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function Gr(a,e){if(!a||!e||e<a)return"";let t=e-a;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function Mo(a,e="zh-CN",t){return(a.executionHistory||[]).filter(Boolean).map(o=>{let r=o.status==="completed"?"success":o.status==="failed"?"failed":o.status==="cancelled"?"cancelled":o.status==="running"?"running":"idle";return{executionId:o.executionId,label:Ro(o.startTime),status:o.status,statusLabel:Ut(o.status,e,t),timeLabel:Ro(o.startTime),durationLabel:Gr(o.startTime,o.endTime),nodeCount:Object.keys(o.nodeStates||{}).length,tone:r,active:a.selectedExecutionId===o.executionId}})}var Mn=ee("VISUAL_NODE"),_=class extends H{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(_.prototype,"id");Reflect.metadata("design:type",String)(_.prototype,"name");Reflect.metadata("design:type",Object)(_.prototype,"type");Reflect.metadata("design:type",Object)(_.prototype,"position");Reflect.metadata("design:type",String)(_.prototype,"description");Reflect.metadata("design:type",Array)(_.prototype,"inputs");Reflect.metadata("design:type",Array)(_.prototype,"outputs");Reflect.metadata("design:type",Object)(_.prototype,"config");Reflect.metadata("design:type",Object)(_.prototype,"style");w(_,[[p(),1,"id"],[p(),1,"name"],[p(),1,"type"],[p(),1,"position"],[p(),1,"description"],[p(),1,"inputs"],[p(),1,"outputs"],[p(),1,"config"],[p(),1,"style"],[se(),0]]);var ht=class extends _{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(ht);w(ht,[[S({selector:"start-node"}),0]]);var mt=class extends _{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(mt);w(mt,[[S({selector:"end-node"}),0]]);var De=class extends _{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(De.prototype,"action");Reflect.metadata("design:type",String)(De.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(De);w(De,[[p(),1,"action"],[p(),1,"taskName"],[S({selector:"task-node"}),0]]);var et=class extends _{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(et.prototype,"condition");Reflect.metadata("design:paramtypes",[])(et);w(et,[[p(),1,"condition"],[S({selector:"condition-node"}),0]]);var ve=class extends _{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=[],r=[...this.branches],s=[];for(;r.length>0||s.length>0;){for(;r.length>0&&s.length<this.maxConcurrent;){let n=r.shift().execute(e).then(l=>{t.push(l),!l.success&&l.error&&o.push(l.error)});s.push(n)}s.length>0&&(await Promise.race(s),s.splice(0,s.findIndex(i=>!r.includes(i))))}return{success:o.length===0,data:{results:t,errors:o.length>0?o:void 0,nodeId:this.id},error:o.length>0?o[0]:void 0}}};Reflect.metadata("design:type",Array)(ve.prototype,"branches");Reflect.metadata("design:type",Object)(ve.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(ve.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(ve);w(ve,[[p(),1,"branches"],[p(),1,"maxConcurrent"],[p(),1,"waitAll"],[S({selector:"parallel-node"}),0]]);var tt=class extends _{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(tt.prototype,"delay");Reflect.metadata("design:paramtypes",[])(tt);w(tt,[[p(),1,"delay"],[S({selector:"delay-node"}),0]]);var xe=class extends _{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],o=0;for(;o<this.maxIterations&&await this.condition(e,o);){let s=await this.body.execute(e);t.push(s),o++}return{success:!0,data:{iterations:o,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",H)(xe.prototype,"body");Reflect.metadata("design:type",Function)(xe.prototype,"condition");Reflect.metadata("design:type",Object)(xe.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(xe);w(xe,[[p(),1,"body"],[p(),1,"condition"],[p(),1,"maxIterations"],[S({selector:"loop-node"}),0]]);var Se=class extends _{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),o=this.cases.get(t)||this.defaultCase;if(!o)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let r=await o.execute(e);return{success:r.success,data:{value:t,caseResult:r.data,nodeId:this.id},error:r.error}}};Reflect.metadata("design:type",Function)(Se.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(Se.prototype,"cases");Reflect.metadata("design:type",H)(Se.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(Se);w(Se,[[p(),1,"value"],[p(),1,"cases"],[p(),1,"defaultCase"],[S({selector:"switch-node"}),0]]);var Ce=class extends _{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,o;try{t=await this.tryActivity.execute(e)}catch(r){o=r,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:o,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:o,nodeId:this.id}}}};Reflect.metadata("design:type",H)(Ce.prototype,"tryActivity");Reflect.metadata("design:type",H)(Ce.prototype,"catchActivity");Reflect.metadata("design:type",H)(Ce.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(Ce);w(Ce,[[p(),1,"tryActivity"],[p(),1,"catchActivity"],[p(),1,"finallyActivity"],[S({selector:"trycatch-node"}),0]]);var ot=class extends _{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(ot.prototype,"workflow");Reflect.metadata("design:paramtypes",[])(ot);w(ot,[[p(),1,"workflow"],[S({selector:"subprocess-node"}),0]]);var ce=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};w(ce,[[A(),0]]);function Do(a){return{id:a.id,name:a.name,description:a.description,version:a.version,nodes:(a.nodes||[]).map(e=>{let{execute:t,activityType:o,...r}=e;return JSON.parse(JSON.stringify(r))})}}var re=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>Do(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let i of e.nodes||[])i?.type&&(this.nodes.register({...i,pluginId:e.id,requiresServer:i.requiresServer!==!1}),t.push(i.type));let o=typeof e.services=="function"?e.services():e.services,r=[];Object.entries(o||{}).forEach(([i,n])=>{this.services.set(i,n),r.push(i)});let s={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(s)}catch(i){throw t.forEach(n=>this.nodes.unregister(n)),r.forEach(n=>this.services.remove(n)),i}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:r}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let o={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(o)}finally{t.nodeTypes.forEach(r=>this.nodes.unregister(r));for(let r of t.serviceNames){let s=this.services.get(r);try{await s?.dispose?.()}finally{this.services.remove(r)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[N,ce])(re);w(re,[[A(),0]]);var Vo=30,jo=300;function rt(a){let e={};a.nodeStates?.forEach((o,r)=>{e[r]={...o,result:o.result?{success:o.result.success,data:o.result.data,error:o.result.error?.message}:void 0}});let t={};return a.edgeStates?.forEach((o,r)=>{t[r]={...o}}),{executionId:a.executionId,workflowId:a.workflowId,status:a.status,currentNodeId:a.currentNodeId,startTime:a.startTime,endTime:a.endTime,error:a.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...a.activeNodeIds||[]],logs:[...a.logs||[]]}}var ae=class{constructor(e,t,o){this.injector=e,this.plugins=o,this.executions=new Map,this.pathInterceptor=new ut,this.policyInterceptor=new pt,this.interceptors=[],this.registry=t||new N;let r=this.injector.get(qe,null);r&&(r.addInterceptor(Z,this.pathInterceptor),r.addInterceptor(Z,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get(qe,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(Z,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(Z,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},o={}){let r=o.executionId||o.resumeFrom?.executionId||this.generateExecutionId(),s=this.withPluginServices(t),i=o.resumeFrom?this.createStateFromCheckpoint(e,o.resumeFrom,r):this.createState(e,r);this.executions.set(r,i),this.trimHistory(o.maxHistory),this.emit(o,i,{type:"workflow-start",status:"running"}),this.checkpoint(o,i);try{let n=Ze(e),l=n.entries.length?n.entries:n.entry?[n.entry]:[];if(!l.length)throw new Error("No entry node found in workflow");let d={executeDefinition:(y,k)=>this.execute(y,k,{...o,executionId:void 0}),executeNode:async(y,k)=>{let R=this.registry.executor(y.type);return R?R(y,k):void 0}},c=new Set,u=new Set,m=vo(this.injector,this.nodeInterceptors()),f={success:!0};for(let y of l)if(f=await this.executeFromNode(y,n,s,i,o,d,c,m,!!o.resumeFrom,u),!f.success)break;i.status==="cancelled"||this.isCancelled(i)?(i.status="cancelled",this.finishPendingNodes(i,"skipped"),this.emit(o,i,{type:"workflow-cancelled",status:"cancelled"})):(i.status=f.success?"completed":"failed",!f.success&&f.error&&(i.error=f.error),this.finishPendingNodes(i,(f.success,"skipped")),this.finishIdleEdges(i,"skipped"),this.emit(o,i,{type:f.success?"workflow-end":"workflow-error",status:i.status,error:f.error})),i.endTime=Date.now(),i.currentNodeId=void 0,this.checkpoint(o,i);let b=rt(i);return{success:i.status==="completed",data:{executionId:r,workflowId:e.id,status:i.status,nodeResults:Object.fromEntries(i.nodeResults),executionState:b,...f.data||{}},error:f.error||i.error}}catch(n){return i.status="failed",i.endTime=Date.now(),i.currentNodeId=void 0,i.error=n,this.finishPendingNodes(i,"skipped"),this.finishIdleEdges(i,"skipped"),this.emit(o,i,{type:"workflow-error",status:"failed",error:n}),this.checkpoint(o,i),{success:!1,error:n,data:{executionId:r,workflowId:e?.id,status:i.status,executionState:rt(i)}}}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let o=e?.services||{};return{...e,services:{...t,...o}}}createState(e,t){let o=new Map;(e.nodes||[]).forEach(s=>{o.set(s.id,{nodeId:s.id,status:"pending"})});let r=new Map;return(e.connections||[]).forEach(s=>{r.set(s.id,{connectionId:s.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:o,edgeStates:r,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,o){let r=this.createState(e,o);r.status="running",r.startTime=t.startTime||r.startTime,r.endTime=void 0,r.currentNodeId=void 0,r.activeNodeIds=[],r.logs=[...t.logs||[]];let s=t.nodeStates||{};for(let n of e.nodes||[]){let l=s[n.id];l&&(r.nodeStates?.set(n.id,{...l}),l.result&&r.nodeResults.set(n.id,{success:l.result.success,data:l.result.data,error:l.error?new Error(String(l.error)):void 0}))}let i=t.edgeStates||{};for(let n of e.connections||[]){let l=i[n.id];l&&r.edgeStates?.set(n.id,{...l})}return r}existingNodeResult(e,t,o){return o.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(rt(t))}catch{}}async executeFromNode(e,t,o,r,s,i,n,l,d=!1,c=new Set){if(r.status==="cancelled"||this.isCancelled(r))return r.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(n.has(e.id))return r.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};let u=r.nodeStates?.get(e.id),m=u&&(u.status==="success"||u.status==="failed"||u.status==="skipped"||u.status==="cancelled"),f;if(m&&d&&(u.status==="success"||u.status==="failed")){if(c.has(e.id))return this.existingNodeResult(e.id,u,r);c.add(e.id),n.add(e.id),f=this.existingNodeResult(e.id,u,r)}else{if(m)return n.add(e.id),this.existingNodeResult(e.id,u,r);if(e.type==="join"&&!this.isJoinReady(t,r,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};n.add(e.id),f=await l.handleNode({node:e,context:o,host:i,state:r,options:s,emit:k=>this.emit(s,r,k)}),this.checkpoint(s,r)}if(!f.success){let k=t.outgoing.get(e.id)||[],R=k.filter(z=>z.sourcePort==="error");if(!R.length)return f;for(let z of k)z.sourcePort!=="error"&&this.markEdgeSkipped(r,z.id,s);let O={...o,error:f.error,errorMessage:f.error?.message,failedNodeId:e.id,failedResult:f};for(let z of R){let Re=t.nodes.get(z.targetNodeId);if(!Re)continue;this.markEdgeTraversed(r,z,s);let st=await this.executeFromNode(Re,t,O,r,s,i,n,l,d,c);if(!st.success)return st}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return f;let b=this.selectNextConnections(e,t,o,f),y=new Set(b.map(k=>k.id));for(let k of t.outgoing.get(e.id)||[])y.has(k.id)||this.markEdgeSkipped(r,k.id,s);if(e.type==="parallel"&&b.length>1)return(await Promise.all(b.map(O=>{let z=t.nodes.get(O.targetNodeId);return z?(this.markEdgeTraversed(r,O,s),this.executeFromNode(z,t,this.mergeContext(o,f,O),r,s,i,n,l,d,c)):Promise.resolve({success:!1,error:new Error(`Missing node ${O.targetNodeId}`)})}))).find(O=>!O.success)||f;for(let k of b){let R=t.nodes.get(k.targetNodeId);if(!R)continue;this.markEdgeTraversed(r,k,s);let O=await this.executeFromNode(R,t,this.mergeContext(o,f,k),r,s,i,n,l,d,c);if(!O.success)return O}return f}mergeContext(e,t,o){return{...e,...t.data||{}}}isJoinReady(e,t,o){let r=e.incoming.get(o)||[];if(!r.length)return!0;let s=r.map(n=>t.nodeStates?.get(n.sourceNodeId)?.status);return s.every(n=>n==="success"||n==="failed"||n==="skipped"||n==="cancelled")&&s.some(n=>n==="success")}selectNextConnections(e,t,o,r){let s=t.outgoing.get(e.id)||[];if(!s.length)return[];let i=r.data?.port;if(typeof i=="string"&&i){let l=s.filter(d=>d.sourcePort===i);if(l.length)return l}let n=r.data?.route;if(typeof n=="number"){let l=n>0?`route-${n}`:"default",d=s.filter(c=>c.sourcePort===l);return d.length?d:s.filter(c=>c.sourcePort==="default")}if(e.type==="condition"){let l=r.data?.condition?"true":"false",d=s.filter(c=>c.sourcePort===l);return d.length?d:s.filter(c=>c.sourcePort!=="true"&&c.sourcePort!=="false")}if(e.type==="switch"){let l=r.data?.condition,d=l==null?"":String(l),c=s.filter(m=>m.sourcePort===d);if(c.length)return c;let u=s.filter(m=>m.sourcePort==="default");return u.length?u:s.filter(m=>m.sourcePort==="out")}return s.filter(l=>l.sourcePort==="error"?!1:l.condition===void 0||l.condition===null?!0:typeof l.condition=="function"?!!l.condition(o):typeof l.condition=="boolean"?l.condition:!!M(l.condition,o))}markEdgeTraversed(e,t,o){let r=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};r.status!=="traversed"&&(r.status="traversed",r.traversedAt=Date.now(),r.count=(r.count||0)+1,e.edgeStates?.set(t.id,r),this.emit(o,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"}))}markEdgeSkipped(e,t,o){let r=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};r.status!=="traversed"&&(r.status="skipped",e.edgeStates?.set(t,r),this.emit(o,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((o,r)=>{(o.status==="pending"||o.status==="idle")&&(o.status=t,e.nodeStates?.set(r,o))})}finishIdleEdges(e,t){e.edgeStates?.forEach((o,r)=>{(o.status==="idle"||o.status==="active")&&(o.status=t,e.edgeStates?.set(r,o))})}emit(e,t,o){let r=Date.now(),s={...o,executionId:t.executionId,workflowId:t.workflowId,timestamp:r,snapshot:rt(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:r,level:this.logLevelFor(o.type,o.status),event:o.type,message:this.logMessageFor(t,o),nodeId:o.nodeId,connectionId:o.connectionId}),t.logs.length>jo&&t.logs.splice(0,t.logs.length-jo)),e.onEvent)try{e.onEvent(s)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let o=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return o?.success===!1?`Node ${t.nodeId} failed: ${o.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=Vo){let t=Math.max(1,Number(e)||Vo),o=Array.from(this.executions.values()).filter(r=>r.status!=="running").sort((r,s)=>(r.endTime||0)-(s.endTime||0));for(;o.length>t;){let r=o.shift();r&&this.executions.delete(r.executionId)}}validate(e){return we(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?rt(t):void 0}getExecutions(){return Array.from(this.executions.values())}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[it,N,re])(ae);w(ae,[[v(),3,void 0,2],[v(),3,void 0,1],[A(),0]]);var Ve=class a{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,o){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,o){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,o){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:o||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,o){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:o||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,o){let r={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:o?.sourcePort||"out",targetNodeId:t,targetPort:o?.targetPort||"in",label:o?.label,condition:o?.condition};return this.connections.push(r),this}connectNodes(e,t,o="out",r="in"){return this.connect(e,t,{sourcePort:o,targetPort:r})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new a}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};w(Ve,[[A(),0]]);var Xr={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},T=class{constructor(e){this.translator=e,this.model=Xr,this.locale="zh-CN",this.theme="light",this.hiddenActions=[]}visible(e){return!(Array.isArray(this.hiddenActions)?this.hiddenActions:[]).includes(e)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,o){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,o)}get runLabel(){return this.t("run","Run")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get zoomInLabel(){return this.t("zoomIn","Zoom in")}get zoomOutLabel(){return this.t("zoomOut","Zoom out")}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}run(){(this.runAction||(()=>this.action?.("run")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(T.prototype,"model");Reflect.metadata("design:type",Object)(T.prototype,"locale");Reflect.metadata("design:type",Object)(T.prototype,"theme");Reflect.metadata("design:type",Function)(T.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(T.prototype,"runAction");Reflect.metadata("design:type",Function)(T.prototype,"resumeAction");Reflect.metadata("design:type",Function)(T.prototype,"cancelAction");Reflect.metadata("design:type",Function)(T.prototype,"undoAction");Reflect.metadata("design:type",Function)(T.prototype,"redoAction");Reflect.metadata("design:type",Function)(T.prototype,"deleteAction");Reflect.metadata("design:type",Function)(T.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(T.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(T.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(T.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(T.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(T.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(T.prototype,"saveAction");Reflect.metadata("design:type",Function)(T.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(T.prototype,"clearAction");Reflect.metadata("design:type",Function)(T.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(T.prototype,"action");Reflect.metadata("design:type",Array)(T.prototype,"hiddenActions");Reflect.metadata("design:paramtypes",[I])(T);w(T,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"runAction"],[p(),1,"resumeAction"],[p(),1,"cancelAction"],[p(),1,"undoAction"],[p(),1,"redoAction"],[p(),1,"deleteAction"],[p(),1,"zoomInAction"],[p(),1,"zoomOutAction"],[p(),1,"resetViewAction"],[p(),1,"autoLayoutAction"],[p(),1,"duplicateAction"],[p(),1,"toggleLogsAction"],[p(),1,"saveAction"],[p(),1,"openLibraryAction"],[p(),1,"clearAction"],[p(),1,"toggleJsonAction"],[p(),1,"action"],[p(),1,"hiddenActions"],[v(),3,void 0,0],[S({selector:"workflow-toolbar",template:`
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
    </div>`}),0]]);var je=class{constructor(){this.listeners=new Set}emit(e){for(let t of[...this.listeners])t(e)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}};w(je,[[A(),0]]);var gt=new je;var zo=["light","dark","solarized","high-contrast"],Po={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},W=class{constructor(e){this.translator=e,this.model=Po,this.locale="zh-CN",this.theme="light",this.actionBus=gt,this.menuSelect=t=>{if(globalThis.__workflowMenuHandled=t,t.startsWith("language:")){let o=t.slice(9);(o==="en"||o==="zh-CN")&&(!this.actionBus&&this.localeChangeAction?this.localeChangeAction(o):this.dispatch(t));return}if(t.startsWith("theme:")){let o=t.slice(6);zo.includes(o)&&(!this.actionBus&&this.themeChangeAction?this.themeChangeAction(o):this.dispatch(t));return}this.dispatch(t)}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get themeName(){return ne(this.theme)?this.theme:"light"}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get menuLabel(){return this.t("menu","Menu")}get menuGroups(){let e=this.model||Po,t=this.cache;if(t&&t.model===e&&t.theme===this.theme&&t.locale===this.locale)return t.groups;let o=(s,i)=>this.t(s,i),r=[{items:[{id:"save",label:o("save","Save"),shortcut:"Ctrl+S"},{id:"rename",label:o("rename","Rename workflow"),icon:"rename"},{id:"open-library",label:o("library","Workflows")},{id:"toggle-json",label:o("jsonMenu","Import / Export JSON")}]},{items:[{id:"run",label:o("run","Run"),icon:"run",disabled:e.running||!e.nodeCount},{id:"resume",label:o("resume","Resume"),icon:"resume",disabled:!e.canResume},{id:"cancel",label:o("stop","Stop"),icon:"stop",disabled:!e.running}]},{items:[{id:"undo",label:o("undo","Undo"),shortcut:"Ctrl+Z",disabled:!e.canUndo},{id:"redo",label:o("redo","Redo"),shortcut:"Ctrl+Y",disabled:!e.canRedo},{id:"duplicate",label:o("duplicate","Duplicate"),shortcut:"Ctrl+D",disabled:!e.hasSelection},{id:"delete",label:o("delete","Delete"),shortcut:"Del",disabled:!e.hasSelection,danger:!0},{id:"clear",label:o("clear","Clear"),disabled:!e.nodeCount}]},{items:[{id:"reset-view",label:o("fit","Fit")},{id:"auto-layout",label:o("layout","Auto layout")},{id:"toggle-logs",label:o("logs","Logs")},{id:"theme",label:o("themeMenu","Theme"),icon:"theme",children:zo.map(s=>({id:`theme:${s}`,label:this.themeOptionLabel(s),checked:this.themeName===s}))}]},{items:[{id:"language",label:o("language","Language"),icon:"language",children:[{id:"language:en",label:"English",checked:!this.isZh},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.isZh}]},{id:"shortcuts",label:o("shortcuts","Keyboard shortcuts"),shortcut:"?"}]}];return this.cache={model:e,theme:this.theme,locale:this.locale,groups:r},r}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}dispatch(e){this.actionBus?this.actionBus.emit(e):this.action?.(e)}};Reflect.metadata("design:type",Object)(W.prototype,"model");Reflect.metadata("design:type",Object)(W.prototype,"locale");Reflect.metadata("design:type",Object)(W.prototype,"theme");Reflect.metadata("design:type",Function)(W.prototype,"action");Reflect.metadata("design:type",Function)(W.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(W.prototype,"localeChangeAction");Reflect.metadata("design:type",Object)(W.prototype,"cache");Reflect.metadata("design:paramtypes",[I])(W);w(W,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"action"],[p(),1,"themeChangeAction"],[p(),1,"localeChangeAction"],[V(),1,"cache"],[v(),3,void 0,0],[S({selector:"workflow-management-menu",template:`
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="menu" label="" caret="caret-down" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var X=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes","Search nodes\u2026")}get noMatchesLabel(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches","No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(o=>this.matches(o,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(o=>String(o).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(X.prototype,"groups");Reflect.metadata("design:type",Object)(X.prototype,"locale");Reflect.metadata("design:type",Function)(X.prototype,"addAction");Reflect.metadata("design:type",Function)(X.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[I])(X);w(X,[[p(),1,"groups"],[p(),1,"locale"],[p(),1,"addAction"],[p(),1,"dragStartAction"],[v(),3,void 0,0],[S({selector:"workflow-palette",template:`
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
    </div>`}),0]]);var Yr={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},U=class{constructor(e,t){this.elementRef=e,this.translator=t,this.model=Yr,this.locale="zh-CN"}onAfterViewInit(){fe(this.canvasRoot)}get emptyHint(){let e=String(this.locale||"").toLowerCase().startsWith("zh")?"zh-CN":"en";return x(this.translator,e,"workflow.ui.canvasEmpty","Drag a component from the palette, or click one to add it")}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,o){return{class:`workflow-node-port workflow-node-port-${o}`,"data-port-id":t.id,"data-port-side":o,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,o=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,o-this.panStart.clientY),this.panStart={clientX:t,clientY:o}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,o,r){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}portUp(e,t,o,r){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:o.id,portType:r,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,o=this.model.pan||{x:0,y:0},r=globalThis.document,s=this.canvasRoot?.nativeElement||this.elementRef?.nativeElement?.querySelector?.(".workflow-canvas")||r?.querySelector?.(".workflow-canvas")||this.elementRef?.nativeElement,i=s?.getBoundingClientRect?.()||{left:0,top:0},n=Number(e?.clientX),l=Number(e?.clientY),d=(Number.isFinite(n)?n:0)-(i.left||0)+(s?.scrollLeft||0),c=(Number.isFinite(l)?l:0)-(i.top||0)+(s?.scrollTop||0);return{x:(d-o.x)/t,y:(c-o.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)(U.prototype,"model");Reflect.metadata("design:type",Object)(U.prototype,"locale");Reflect.metadata("design:type",Function)(U.prototype,"pointerAction");Reflect.metadata("design:type",Function)(U.prototype,"panAction");Reflect.metadata("design:type",P)(U.prototype,"canvasRoot");Reflect.metadata("design:paramtypes",[P,I])(U);w(U,[[p(),1,"model"],[p(),1,"locale"],[p(),1,"pointerAction"],[p(),1,"panAction"],[ie("canvasRoot",P),1,"canvasRoot"],[v(),3,void 0,1],[v(),3,void 0,0],[S({selector:"workflow-canvas",template:`
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
    </div>`}),0]]);var Fo={hasSelection:!1,nodeId:"",name:"",description:"",icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function Zr(a){return a.hasSelection?JSON.stringify([a.nodeId,a.name,a.description,a.icon,a.color,a.typeLabel,a.status,a.statusLabel,a.durationLabel,a.resultText,a.errorText,a.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var F=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=Fo,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let o=this.changeType(t.field);if(o==="code"){this.queueChange(t.key,t.value,o);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,o,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||Fo,o=Zr(t);o!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=o,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get appearanceLabel(){return this.t("appearance","Appearance")}get iconLabel(){return this.t("icon","Icon")}get colorLabel(){return this.t("color","Color")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage","Required")}get numberMessage(){return this.t("numberMessage","Number out of range")}get patternMessage(){return this.t("patternMessage","Invalid format")}get jsonMessage(){return this.t("jsonMessage","Invalid JSON")}get emailMessage(){return this.t("invalidEmail","Invalid email address")}get urlMessage(){return this.t("invalidUrl","Invalid URL")}get integerMessage(){return this.t("integerMessage","Must be an integer")}get formSchema(){let e=[];if(!this._model.hasSelection)return{fields:e};let t=this.t("properties","Properties");return e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),e.push({key:"icon",type:"text",label:this.iconLabel,group:this.appearanceLabel,maxLength:4,defaultValue:"\u25C6",placeholder:"\u25C6",inputClass:"workflow-inspector-icon"}),e.push({key:"color",type:"color",label:this.colorLabel,group:this.appearanceLabel,defaultValue:"#64748b",inputClass:"workflow-inspector-color"}),this._model.fields.forEach(o=>{e.push(this.toDynamicField(o))}),{fields:e,defaultGroupLabel:t,jsonFieldsLabel:this.t("fields","Fields"),jsonTextLabel:this.t("json","JSON")}}toDynamicField(e){return{key:e.key,type:this.dynamicType(e),label:e.label,placeholder:e.placeholder,description:e.description,group:e.group,options:e.options.map(t=>({label:t.label,value:t.value})),defaultValue:e.hasDefault?e.resetValue:void 0,rows:e.rows,min:e.min,max:e.max,step:e.step,unit:e.unit,span:e.span,minLength:e.minLength,maxLength:e.maxLength,required:e.required,readonly:e.readonly,disabled:e.disabled,pattern:e.pattern,rules:e.rules,errorMessages:e.errorMessages,itemFields:e.itemFields?.map(t=>this.toDynamicField(t)),addLabel:e.addLabel,removeLabel:e.removeLabel,minItems:e.minItems,maxItems:e.maxItems,visibleWhen:e.visibleWhen,inputClass:e.inputClass,fieldClass:e.fieldClass,language:e.language,suggestions:this.codeSuggestions,hidden:e.visible===!1}}get formValue(){let e={name:this._model.name,description:this._model.description,icon:this._model.icon,color:this._model.color};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"||t.type==="json"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){return e.type==="boolean"?"checkbox":e.type==="select"?"radio":e.type}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"list":return"list";case"code":return"code";default:return"text"}}queueChange(e,t,o){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:o,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let r=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),r)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(F.prototype,"locale");Reflect.metadata("design:type",Object)(F.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(F.prototype,"changeAction");Reflect.metadata("design:type",Function)(F.prototype,"restoreAction");Reflect.metadata("design:type",Array)(F.prototype,"codeSuggestions");Reflect.metadata("design:type",E)(F.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[I])(F);Reflect.metadata("design:paramtypes",[])(F.prototype,"model");Reflect.metadata("design:returntype",Object)(F.prototype,"model");w(F,[[p(),1,"locale"],[p(),1,"codeChangeDelay"],[p(),1,"changeAction"],[p(),1,"restoreAction"],[p(),1,"codeSuggestions"],[ie("nodeForm",E),1,"nodeForm"],[v(),3,void 0,0],[p(),1,"model"],[S({selector:"workflow-inspector",template:`
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
    </div>`}),0]]);var Q=class{constructor(e){this.translator=e,this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.runHistory","Runs")}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(Q.prototype,"items");Reflect.metadata("design:type",Object)(Q.prototype,"locale");Reflect.metadata("design:type",Function)(Q.prototype,"selectAction");Reflect.metadata("design:paramtypes",[I])(Q);w(Q,[[p(),1,"items"],[p(),1,"locale"],[p(),1,"selectAction"],[v(),3,void 0,0],[S({selector:"workflow-run-history",template:`
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
    </div>`}),0]]);var Y=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle","Execution log")}get closeLabel(){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close","Close")}levelLabel(e){let t={info:"INFO",success:"OK",warning:"WARN",error:"ERROR"};return x(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),o=r=>String(r).padStart(2,"0");return`${o(t.getHours())}:${o(t.getMinutes())}:${o(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(Y.prototype,"items");Reflect.metadata("design:type",Object)(Y.prototype,"visible");Reflect.metadata("design:type",Object)(Y.prototype,"locale");Reflect.metadata("design:type",Function)(Y.prototype,"closeAction");Reflect.metadata("design:paramtypes",[I])(Y);w(Y,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"locale"],[p(),1,"closeAction"],[v(),3,void 0,0],[S({selector:"workflow-run-log",template:`
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
    </div>`}),0]]);var j=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return x(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return x(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(j.prototype,"items");Reflect.metadata("design:type",Object)(j.prototype,"visible");Reflect.metadata("design:type",Object)(j.prototype,"currentId");Reflect.metadata("design:type",Object)(j.prototype,"locale");Reflect.metadata("design:type",Object)(j.prototype,"error");Reflect.metadata("design:type",Function)(j.prototype,"saveAction");Reflect.metadata("design:type",Function)(j.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(j.prototype,"openAction");Reflect.metadata("design:type",Function)(j.prototype,"removeAction");Reflect.metadata("design:type",Function)(j.prototype,"closeAction");Reflect.metadata("design:paramtypes",[I])(j);w(j,[[p(),1,"items"],[p(),1,"visible"],[p(),1,"currentId"],[p(),1,"locale"],[p(),1,"error"],[p(),1,"saveAction"],[p(),1,"saveAsAction"],[p(),1,"openAction"],[p(),1,"removeAction"],[p(),1,"closeAction"],[v(),3,void 0,0],[S({selector:"workflow-library",template:`
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
    </div>`}),0]]);var $o="tsdi-workflow-designer-styles",Qr=`
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


.workflow-keyvalue {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.workflow-keyvalue-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
}


.workflow-field-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

.workflow-field-mode {
    border: 0;
    background: transparent;
    color: #94a3b8;
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
}

.workflow-field-mode:hover {
    color: #2563eb;
}

`;function wt(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById($o))return;let e=a.createElement("style");e.setAttribute("id",$o),e.textContent=Qr,a.head.appendChild(e)}var qo=.08,Wo=.6,ea=.7,D=class{constructor(e){this.elementRef=e,this.leftRatio=.2,this.rightRatio=.24,this.bottomRatio=.26,this.minLeft=160,this.minRight=180,this.minBottom=80,this.resizable=!0,this.leftCollapsed=!1,this.rightCollapsed=!1,this.bottomCollapsed=!1,this.projected=!1,fe(e)}get layoutStyle(){return{"--workspace-left":`${this.leftRatio*100}%`,"--workspace-right":`${this.rightRatio*100}%`,"--workspace-bottom":`${this.bottomRatio*100}%`}}onAfterViewInit(){fe(this.layoutRoot),this.mountProjectedContent(),this.bindResizeListeners()}onDestroy(){this.unbindResizeListeners()}mountProjectedContent(){if(this.projected)return;let e=this.layoutRoot?.nativeElement;if(!e)return;let o=(e.closest?.("workspace-layout")||e.parentElement||this.hostElement)?.[Qt]||[];if(!o.length)return;let r={};e.querySelectorAll?.("[data-workspace-slot]")?.forEach?.(s=>{r[s.getAttribute("data-workspace-slot")]=s}),Object.keys(r).length&&(o.forEach((s,i)=>{let n=String(s.tagName||"").toLowerCase(),l=n.startsWith("workspace-")?n.slice(10):"",d=["left","center","right","bottom"][i],c=r[l]||r[d];c&&typeof c.appendChild=="function"&&c.appendChild(s)}),this.projected=!0)}beginResize(e,t){if(!this.resizable||this.isCollapsed(t))return;e?.preventDefault?.(),e?.stopPropagation?.();let r=(this.layoutRoot?.nativeElement||this.hostElement)?.getBoundingClientRect?.()||{width:0,height:0};this.resizing={pane:t,startX:Number(e?.clientX)||0,startY:Number(e?.clientY)||0,startLeft:this.leftRatio,startRight:this.rightRatio,startBottom:this.bottomRatio,width:r.width||0,height:r.height||0}}resizeMove(e){let t=this.resizing;if(t)if(t.pane==="left"){let o=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setLeftRatio(t.startLeft+o)}else if(t.pane==="right"){let o=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setRightRatio(t.startRight-o)}else{let o=t.height?(Number(e?.clientY)-t.startY)/t.height:0;this.setBottomRatio(t.startBottom-o)}}endResize(){this.resizing&&(this.resizing=void 0)}resizePane(e,t){e==="left"?this.setLeftRatio(t):e==="right"?this.setRightRatio(t):this.setBottomRatio(t)}isCollapsed(e){return e==="left"?this.leftCollapsed:e==="right"?this.rightCollapsed:this.bottomCollapsed}togglePane(e){this.isCollapsed(e)?this.expandPane(e):this.collapsePane(e)}collapsePane(e){this.setCollapsed(e,!0)}expandPane(e){this.setCollapsed(e,!1)}setCollapsed(e,t){e==="left"?this.leftCollapsed=t:e==="right"?this.rightCollapsed=t:this.bottomCollapsed=t,this.collapseAction?.(e,t)}stopEvent(e){e?.preventDefault?.(),e?.stopPropagation?.()}setLeftRatio(e){let t=this.layoutSize().width,o=this.minRatio(this.minLeft,t),r=Math.min(Wo,1-this.rightRatio-o);this.leftRatio=this.clamp(e,o,r),this.resizeAction?.("left",this.leftRatio)}setRightRatio(e){let t=this.layoutSize().width,o=this.minRatio(this.minRight,t),r=Math.min(Wo,1-this.leftRatio-o);this.rightRatio=this.clamp(e,o,r),this.resizeAction?.("right",this.rightRatio)}setBottomRatio(e){let t=this.layoutSize().height,o=this.minRatio(this.minBottom,t);this.bottomRatio=this.clamp(e,o,ea),this.resizeAction?.("bottom",this.bottomRatio)}layoutSize(){let e=this.layoutRoot?.nativeElement?.getBoundingClientRect?.();return{width:Number(e?.width)||0,height:Number(e?.height)||0}}minRatio(e,t){let o=Math.max(0,Number(e)||0);return t>0?Math.max(qo,o/t):qo}get hostElement(){return this.elementRef?.nativeElement}clamp(e,t,o){let r=Number(e);return Number.isFinite(r)?Math.max(t,Math.min(Math.max(t,o),r)):t}bindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.addEventListener!="function"||this.moveHandler||(this.moveHandler=t=>this.resizeMove(t),this.upHandler=()=>this.endResize(),e.addEventListener("mousemove",this.moveHandler),e.addEventListener("mouseup",this.upHandler))}unbindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.removeEventListener!="function"||(this.moveHandler&&e.removeEventListener("mousemove",this.moveHandler),this.upHandler&&e.removeEventListener("mouseup",this.upHandler),this.moveHandler=void 0,this.upHandler=void 0)}};Reflect.metadata("design:type",Object)(D.prototype,"leftRatio");Reflect.metadata("design:type",Object)(D.prototype,"rightRatio");Reflect.metadata("design:type",Object)(D.prototype,"bottomRatio");Reflect.metadata("design:type",Object)(D.prototype,"minLeft");Reflect.metadata("design:type",Object)(D.prototype,"minRight");Reflect.metadata("design:type",Object)(D.prototype,"minBottom");Reflect.metadata("design:type",Object)(D.prototype,"resizable");Reflect.metadata("design:type",Object)(D.prototype,"leftCollapsed");Reflect.metadata("design:type",Object)(D.prototype,"rightCollapsed");Reflect.metadata("design:type",Object)(D.prototype,"bottomCollapsed");Reflect.metadata("design:type",Function)(D.prototype,"resizeAction");Reflect.metadata("design:type",Function)(D.prototype,"collapseAction");Reflect.metadata("design:type",P)(D.prototype,"layoutRoot");Reflect.metadata("design:paramtypes",[P])(D);w(D,[[p(),1,"leftRatio"],[p(),1,"rightRatio"],[p(),1,"bottomRatio"],[p(),1,"minLeft"],[p(),1,"minRight"],[p(),1,"minBottom"],[p(),1,"resizable"],[p(),1,"leftCollapsed"],[p(),1,"rightCollapsed"],[p(),1,"bottomCollapsed"],[p(),1,"resizeAction"],[p(),1,"collapseAction"],[ie("layoutRoot",P),1,"layoutRoot"],[v(),3,void 0,0],[S({selector:"workspace-layout",template:`
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
    </div>`}),0]]);var Jo="tsdi-workspace-layout-styles",ta=`
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
`;function Ho(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById(Jo))return;let e=a.createElement("style");e.setAttribute("id",Jo),e.textContent=ta,a.head.appendChild(e)}var ze=class{};w(ze,[[$({declarations:[D],exports:[D]}),0]]);var C=class{constructor(e,t,o){this.translator=t,this.elementRef=o,this.locale="zh-CN",this.theme="light",this.applyDocumentTheme=!0,this.runContext={},this.autoRun=!1,this.saveState="saved",this.hiddenActions=[],this.showRunHistory=!0,this.showStatusbar=!0,this.showRunLogs=!0,this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.jsonText="",this.jsonError="",this.notifyChange=()=>{this.autosaveAction?.()},this.handleToolbarAction=r=>{let s=this.selfRef||this;switch(r){case"run":this.designer.run({context:this.runContext});break;case"resume":s.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":s.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":s.showLogs=!s.showLogs;break;case"save":s.hostAction?.("save");break;case"open-library":s.hostAction?.("open-library");break;case"clear":this.designer.clear();break;case"toggle-json":s.toggleJson();break;case"shortcuts":s.toggleShortcuts();break;default:break}s.notifyChange()},this.fitView=()=>{let r=this.canvasViewport(),s=this.designer.nodes;if(!r||!s.length){this.designer.resetView();return}let i=48,n=1/0,l=1/0,d=-1/0,c=-1/0;s.forEach(O=>{let z=ft(O);n=Math.min(n,O.position.x),l=Math.min(l,O.position.y),d=Math.max(d,O.position.x+z.width),c=Math.max(c,O.position.y+z.height)});let u=Math.max(1,d-n),m=Math.max(1,c-l),f=Math.max(.25,Math.min(1.25,Math.min((r.width-i*2)/u,(r.height-i*2)/m)));this.designer.setZoom(f);let b=this.designer.zoom||1;this.designer.pan={x:Math.round((r.width-u*b)/2-n*b),y:Math.round((r.height-m*b)/2-l*b)};let y=this.elementRef?.nativeElement,k=globalThis.document,R=y?.querySelector?.(".workflow-canvas")||k?.querySelector?.(".workflow-canvas");R&&(R.scrollLeft=0,R.scrollTop=0)},this.addFromPalette=r=>{let s=this.selfRef||this;this.designer.addNode(r.type,this.nextAddPosition()),s.notifyChange()},this.paletteDragStart=(r,s)=>{this.pendingNodeType=s.type,r?.dataTransfer&&(r.dataTransfer.setData("application/x-tsdi-workflow-node",s.type),r.dataTransfer.effectAllowed="copy"),this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:s.label}},this.handlePan=(r,s)=>{this.designer.panBy(r,s)},this.selectRun=r=>{this.designer.selectExecution(r)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let r=this.selfRef||this;r.showLogs=!1},this.handleCanvas=r=>{let s=this.designer;switch(r.type){case"background-down":s.connectionDraft?s.cancelConnection():s.clearSelection();break;case"pointer-move":r.world&&(s.drag?s.dragNodeTo(r.world):s.connectionDraft&&s.updateConnectionDraft(r.world));break;case"pointer-up":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"pointer-leave":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"node-down":s.connectionDraft&&r.nodeId?this.connectToNode(r.nodeId):r.nodeId&&r.world&&s.beginNodeDrag(r.nodeId,r.world);break;case"node-up":s.drag?s.endNodeDrag():s.connectionDraft&&r.nodeId&&this.connectToNode(r.nodeId);break;case"edge-click":r.connectionId&&s.selectConnection(r.connectionId);break;case"port-down":{let i=r.portType==="input"?"input":"output";if(!r.nodeId||!r.portId||!r.world)break;let n=s.connectionDraft;if(n){if((n.sourceSide||"output")!==i){s.completeConnection(r.nodeId,r.portId);break}s.cancelConnection()}s.beginConnection(r.nodeId,r.portId,r.world,i);break}case"port-up":{let i=s.connectionDraft;if(!i||!r.nodeId||!r.portId)break;let n=r.portType==="input"?"input":"output",l=i.sourceSide||"output";n!==l?s.completeConnection(r.nodeId,r.portId):(r.nodeId!==i.sourceNodeId||r.portId!==i.sourcePort)&&s.cancelConnection();break}case"drop":{let i=r.nodeType||this.pendingNodeType;if(this.pendingNodeType=void 0,i&&r.world){let n=this.registry.get(i),l=n?ft({type:n.type,position:{x:0,y:0},inputs:n.inputs||[],outputs:n.outputs||[]}):{width:184,height:64};s.addNode(i,{x:Math.round(r.world.x-l.width/2),y:Math.round(r.world.y-l.height/2)})}break}case"key-down":this.handleKey(r);break;case"wheel":{let i=this.canvasRect();if(r.ctrlKey||r.metaKey)this.zoomAtPoint(r,i);else{let n=!!r.shiftKey,l=Number(r.deltaX)||0,d=Number(r.deltaY)||0,c=n&&!l?d:l,u=n&&!l?0:d;s.panBy(-c,-u)}break}default:break}(r.type==="pointer-up"||r.type==="node-up"||r.type==="drop"||r.type==="port-down"||r.type==="port-up"||r.type==="key-down")&&this.notifyChange()},this.inspectorRestore=()=>{let r=this.designer.selectedNode;r&&(this.designer.resetNodeConfig(r.id),this.notifyChange())},this.inspectorChange=(r,s,i,n)=>{let l=n?this.designer.nodes.find(c=>c.id===n):this.designer.selectedNode;if(!l)return;if(r==="name"){this.designer.renameNode(l.id,String(s)),this.notifyChange();return}if(r==="description"){this.designer.updateNode(l.id,{description:String(s)}),this.notifyChange();return}if(r==="icon"||r==="color"){let c={...l.style||{}},u=String(s??"").trim();r==="icon"?u?c.icon=u:delete c.icon:u?c.backgroundColor=u:delete c.backgroundColor,this.designer.updateNode(l.id,{style:c}),this.notifyChange();return}if(i==="list"){this.designer.updateNodeConfig(l.id,{[r]:Array.isArray(s)?s:[]}),this.notifyChange();return}let d=s;if(i==="json")if(s&&typeof s=="object")d=s;else if(String(s??"").trim()==="")d=void 0;else try{d=JSON.parse(String(s))}catch(c){this.designer.error=`Invalid JSON: ${c.message}`;return}else if(i==="number"){if(d=s===""||s===void 0||s===null?void 0:Number(s),typeof d=="number"&&!Number.isFinite(d)){this.designer.error="Invalid number";return}}else i==="boolean"?d=!!s:i==="list"?d=Array.isArray(s)?s:[]:d=String(s??"");this.designer.updateNodeConfig(l.id,{[r]:d}),this.notifyChange()},fe(o),this.documentRef=e;try{e&&(e[K]=!0)}catch{}wt(e),Ho(e),po(e),oo(e)}onAfterViewInit(){if(this.applyDocumentTheme!==!1){let e=this.documentRef||globalThis.document;Ie(e,this.themeName)}}onInit(){this.selfRef=this,this.registry||(this.registry=new N),this.autoRun&&this.designer&&this.designer.run({context:this.runContext})}onDestroy(){}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ne(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}setTheme(e){if(this.theme=ne(e)?e:"light",this.applyDocumentTheme!==!1){let t=this.documentRef||globalThis.document;Ie(t,this.theme)}this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return x(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get visibleActions(){return Array.isArray(this.hiddenActions)?this.hiddenActions:[]}visibleAction(e){return!this.visibleActions.includes(e)}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let o=Eo(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:o},o}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let o=No(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:o},o}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,o=this.localeValue,r=this.registry.revision,s=e?.id||"",i=e?.name||"",n=e?.description||"",l=e?.type||"",d=e?.config,c=this.inspectorModelCache;if(c&&c.nodeId===s&&c.name===i&&c.description===n&&c.type===l&&c.config===d&&c.execution===t&&c.locale===o&&c.revision===r)return c.model;let u=Oo(this.designer,this.registry,o,this.translator);return this.inspectorModelCache={nodeId:s,name:i,description:n,type:l,config:d,execution:t,locale:o,revision:r,model:u},u}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let o=Lo(this.designer,this.localeValue,this.translator);return this.toolbarModelCache={key:e,model:o},o}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let o=_o(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:o},o}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,o=this.localeValue,r=this.runHistoryCache;if(r&&r.history===e&&r.selected===t&&r.locale===o)return r.model;let s=Mo(this.designer,o,this.translator);return this.runHistoryCache={history:e,selected:t,locale:o,model:s},s}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let o=e?.logs||[];return this.runLogsCache={execution:e,logs:o},o}get codeSuggestions(){let e=this.designer.nodes.map(i=>[i.id,i.type,i.config?.action||"",i.config?.field||"",i.config?.target||"",JSON.stringify(i.config?.values||""),JSON.stringify(i.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let o=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),r=i=>{typeof i=="string"&&i.trim()&&o.add(i.trim())};this.designer.nodes.forEach(i=>{let n=i.config||{};if(typeof n.action=="string"){let l=n.action.replace(/^actions\./,"");r(`context.actions.${l}`),r(`input.actions.${l}`)}typeof n.field=="string"&&(r(n.field),n.field.includes(".")||r(`variables.${n.field}`)),typeof n.target=="string"&&r(n.target.includes(".")?n.target:`variables.${n.target}`),n.values&&typeof n.values=="object"&&Object.keys(n.values).forEach(l=>r(`variables.${l}`)),n.result&&typeof n.result=="object"&&Object.keys(n.result).forEach(l=>r(`input.${l}`)),typeof n.event=="string"&&r(`context.events.${n.event}`)});let s=Array.from(o).slice(0,240);return this.codeSuggestionCache={key:e,values:s},s}canvasModelKey(){let e=this.designer,t=e.execution,o=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],r=e.connectionDraft;return o.push(r?`draft:${r.sourceNodeId}:${r.sourcePort}:${r.sourceSide||"output"}:${r.x}:${r.y}`:""),(e.nodes||[]).forEach(s=>{o.push([s.id,s.name,s.type,s.description||"",s.position?.x,s.position?.y,s.dimension?.width||"",s.dimension?.height||"",s.style?.icon||"",s.style?.backgroundColor||"",s.style?.textColor||"",(s.inputs||[]).map(i=>`${i.id}:${i.label||""}:${i.name||""}:${i.type||""}`).join(","),(s.outputs||[]).map(i=>`${i.id}:${i.label||""}:${i.name||""}:${i.type||""}`).join(","),t?.nodeStates?.[s.id]?.status||""].join(":"))}),(e.connections||[]).forEach(s=>{o.push([s.id,s.sourceNodeId,s.sourcePort,s.targetNodeId,s.targetPort,s.label||"",t?.edgeStates?.[s.id]?.status||""].join(":"))}),o.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},o=this.viewportBounds(),r=t;return o&&(t.x>=o.left&&t.x+184<=o.right&&t.y>=o.top&&t.y+64<=o.bottom||(r={x:Math.round((o.left+o.right)/2-92),y:Math.round((o.top+o.bottom)/2-32)})),this.findFreePosition(r)}canvasViewport(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{width:r.width,height:r.height}}canvasRect(){let e=this.elementRef?.nativeElement,t=globalThis.document,r=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!r||!(r.width>0)||!(r.height>0)))return{left:r.left,top:r.top,width:r.width,height:r.height}}zoomAtPoint(e,t){let o=Number(e.deltaY)||0;if(!o)return;let r=this.designer,s=r.zoom||1,i=o<0?1.1:.9,n=Math.max(.2,Math.min(2.5,s*i)),l=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),c=r.pan||{x:0,y:0},u=(l-c.x)/s,m=(d-c.y)/s;r.setZoom(n);let f=r.zoom||n;r.pan={x:Math.round(l-u*f),y:Math.round(d-m*f)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,o=this.designer.pan||{x:0,y:0};return{left:-o.x/t,top:-o.y/t,right:(e.width-o.x)/t,bottom:(e.height-o.y)/t}}findFreePosition(e){let r=[0,1,-1,2,-2,3,-3];for(let s=0;s<30;s++)for(let i of r){let n={x:e.x+i*220,y:e.y+s*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-n.x)<184&&Math.abs(d.position.y-n.y)<64))return n}return e}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let o=this.designer.nodes.find(s=>s.id===e);if(!o){this.designer.cancelConnection();return}let r=t.sourceSide==="input"?o.outputs:o.inputs;if(!r?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,r[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.notifyChange()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",G)(C.prototype,"designer");Reflect.metadata("design:type",N)(C.prototype,"registry");Reflect.metadata("design:type",Object)(C.prototype,"locale");Reflect.metadata("design:type",Object)(C.prototype,"theme");Reflect.metadata("design:type",Object)(C.prototype,"applyDocumentTheme");Reflect.metadata("design:type",Function)(C.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(C.prototype,"runContext");Reflect.metadata("design:type",Object)(C.prototype,"autoRun");Reflect.metadata("design:type",Object)(C.prototype,"saveState");Reflect.metadata("design:type",Array)(C.prototype,"hiddenActions");Reflect.metadata("design:type",Object)(C.prototype,"showRunHistory");Reflect.metadata("design:type",Object)(C.prototype,"showStatusbar");Reflect.metadata("design:type",Object)(C.prototype,"showRunLogs");Reflect.metadata("design:type",Function)(C.prototype,"hostAction");Reflect.metadata("design:type",Function)(C.prototype,"autosaveAction");Reflect.metadata("design:type",Object)(C.prototype,"documentRef");Reflect.metadata("design:type",Object)(C.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(C.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(C.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(C.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(C.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(C.prototype,"paletteCache");Reflect.metadata("design:type",Object)(C.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(C.prototype,"codeSuggestionCache");Reflect.metadata("design:paramtypes",[Object,I,P])(C);w(C,[[p(),1,"designer"],[p(),1,"registry"],[p(),1,"locale"],[p(),1,"theme"],[p(),1,"applyDocumentTheme"],[p(),1,"themeChangeAction"],[p(),1,"runContext"],[p(),1,"autoRun"],[p(),1,"saveState"],[p(),1,"hiddenActions"],[p(),1,"showRunHistory"],[p(),1,"showStatusbar"],[p(),1,"showRunLogs"],[p(),1,"hostAction"],[p(),1,"autosaveAction"],[V(),1,"documentRef"],[V(),1,"canvasModelCache"],[V(),1,"toolbarModelCache"],[V(),1,"inspectorModelCache"],[V(),1,"runHistoryCache"],[V(),1,"statusModelCache"],[V(),1,"paletteCache"],[V(),1,"runLogsCache"],[V(),1,"codeSuggestionCache"],[v(),3,void 0,2],[v(),3,void 0,1],[q(nt),3,void 0,0],[v(),3,void 0,0],[S({selector:"workflow-designer-preview",template:`
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
    </div>`}),0]]);var L=class{constructor(e,t,o,r,s,i){this.translator=r,this.elementRef=i,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=bo(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.previewHiddenActions=["save","open-library"],this.showLibrary=!1,this.showRename=!1,this.renameValue="",this.renameError="",this.libraryError="",this.libraryItems=[],this.autosaveInFlight=!1,this.changeLocale=l=>{let d=this.selfRef||this;d.locale=l,d.localeChangeAction?.(l)},this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let l=this.selfRef||this;l.designer?.dirty&&(l.saveState!=="saving"&&(l.saveState="dirty"),l.autosave&&(l.clearAutosaveTimer(),l.autosaveTimer=setTimeout(()=>{l.autosaveTimer=void 0,l.performAutosave()},Math.max(0,Number(l.autosaveDelay)||0))))},this.toolbarAction=l=>{let d=this.selfRef||this;if(l.startsWith("language:")){let c=l.slice(9);(c==="en"||c==="zh-CN")&&d.changeLocale(c);return}if(l.startsWith("theme:")){let c=l.slice(6);(c==="light"||c==="dark"||c==="solarized"||c==="high-contrast")&&d.setTheme(c);return}if(l==="rename"){d.openRename();return}if(l==="save"){d.saveWorkflow();return}if(l==="open-library"){d.openLibrary();return}d.preview?.handleToolbarAction(l)},this.previewHostAction=l=>{this.toolbarAction(l)},this.fitView=()=>{this.preview?.fitView()},this.openLibrary=async()=>{let l=this.selfRef||this;try{l.libraryItems=await l.designer.listSaved(l.store),l.libraryError=""}catch(d){l.libraryError=d.message}l.showLibrary=!0},this.openRename=()=>{let l=this.selfRef||this;l.renameValue=l.designer?.definition?.name||"",l.renameError="",l.showRename=!0},this.renameInput=l=>{let d=this.selfRef||this;d.renameValue=String(l?.target?.value??""),d.renameError=""},this.renameKey=l=>{let d=String(l?.key||"");if(d==="Enter"){l?.preventDefault?.(),this.commitRename();return}d==="Escape"&&(l?.preventDefault?.(),this.cancelRename())},this.cancelRename=()=>{let l=this.selfRef||this;l.showRename=!1,l.renameError=""},this.commitRename=()=>{let l=this.selfRef||this,d=String(l.renameValue||"").trim();if(!d){l.renameError=l.t("renameEmpty","Enter a workflow name");return}let c=l.activeTab();if(!c){l.showRename=!1;return}c.designer.renameWorkflow(d),l.showRename=!1,l.renameError="",l.emitTabs(),l.scheduleAutosave()},this.saveWorkflow=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store);let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.saveWorkflowAs=async()=>{let l=this.selfRef||this;l.clearAutosaveTimer(),l.saveState="saving";try{await l.designer.saveTo(l.store,{as:!0,name:`${l.designer.definition.name} copy`});let d=l.activeTab();d&&(d.persisted=!0),l.syncActiveTabId(),l.libraryError="",l.saveState="saved",await l.refreshLibrary()}catch(d){l.saveState="error",l.libraryError=d.message}},this.loadWorkflow=async l=>{let d=this.selfRef||this,c=d.workflowTabs.find(m=>m.id===l);if(c){try{let m=await d.store.get(l);if(!m){d.libraryError=`${d.t("notFound","Workflow not found")}: ${l}`;return}c.designer.load(m),d.setActiveTab(c),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(m){d.libraryError=m.message}return}await d.openWorkflowTab(l)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async l=>{let d=this.selfRef||this;try{d.workflowTabs.some(c=>c.id===l)&&await d.closeWorkflowTab(l),await d.designer.removeSaved(d.store,l),await d.refreshLibrary()}catch(c){d.libraryError=c.message}},this.closeLibrary=()=>{let l=this.selfRef||this;l.showLibrary=!1},this.documentRef=o;try{o&&(o[K]=!0)}catch{}this.registry=e||new N,this.service=t,this.reactiveEffect=s,wt(o),Ie(o,this.themeName);let n=new G({registry:this.registry,service:t,definition:Bt(this.registry,this.localeValue,r)});this.designer=s?We(n,s):n,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,gt.subscribe(t=>this.toolbarAction(t));let e=globalThis.document;e?.addEventListener&&(this.menuClickHandler=t=>{let r=t?.target?.closest?.("[data-menu-id]")?.getAttribute?.("data-menu-id");r&&setTimeout(()=>{globalThis.__workflowMenuHandled!==r&&this.toolbarAction(r)},0)},e.addEventListener("click",this.menuClickHandler,!0)),this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=globalThis.document;this.menuClickHandler&&e?.removeEventListener&&e.removeEventListener("click",this.menuClickHandler,!0);let t=this.documentRef;t?.removeEventListener&&this.keyHandler&&t.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ne(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get toolbarModel(){return this.preview?.toolbarModel}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=xo(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let o=e.createTab(t);e.workflowTabs.push(o),e.setActiveTab(o),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(r=>r.id===e))return await t.activateWorkflowTab(e),!0;try{let r=await t.store.get(e);if(!r)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let s=t.createTab(r,!0);return t.workflowTabs.push(s),t.setActiveTab(s),t.emitTabs(),!0}catch(r){return t.libraryError=r.message,!1}}async restoreWorkflowTabs(e,t){let o=this.selfRef||this,r=[],s;try{s=new Set((await o.store.list()).map(n=>n.id))}catch{s=new Set(e||[])}for(let n of Array.from(new Set(e||[])))if(!(!n||!s.has(n)))try{let l=await o.store.get(n);l&&r.push(o.createTab(l,!0))}catch{}if(!r.length)return!1;o.workflowTabs=r;let i=r.find(n=>n.id===t)||r[0];return o.setActiveTab(i),o.emitTabs(),!0}createTab(e,t=!1){let o=new G({registry:this.registry,service:this.service,definition:e}),r=this.reactiveEffect?We(o,this.reactiveEffect):o;return{id:r.definition.id,designer:r,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.find(r=>r.id===e);!o||o.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(o),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,o=t.workflowTabs.findIndex(s=>s.id===e);if(o<0)return;let[r]=t.workflowTabs.splice(o,1);if(t.autosave&&r.designer.dirty)try{await t.saveTab(r)}catch{}if(t.activeTabId===e){let s=t.workflowTabs[Math.min(o,t.workflowTabs.length-1)];s?t.setActiveTab(s):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,o=e.id,r=e.designer.definition.id;o!==r&&(e.id=r,t.activeTabId===o&&(t.activeTabId=r),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(r=>r.persisted),o=e.activeTab();e.tabChangeAction?.({openIds:t.map(r=>r.id),activeId:o?.persisted?o.id:t[0]?.id})}setTheme(e){this.theme=ne(e)?e:"light";let t=this.documentRef||globalThis.document;Ie(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}get renameTitle(){return this.t("renameTitle","Rename workflow")}get renamePlaceholder(){return this.t("renamePlaceholder","Workflow name")}get renameConfirmLabel(){return this.t("renameConfirm","Rename")}get cancelLabel(){return this.t("cancel","Cancel")}t(e,t){return x(this.translator,this.localeValue,`workflow.ui.${e}`,t)}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,o=String(e?.key||""),r=!!(e?.ctrlKey||e?.metaKey),s=e?.target,i=String(s?.tagName||"").toLowerCase(),n=i==="input"||i==="textarea"||i==="select"||!!s?.isContentEditable;if(r&&(o==="s"||o==="S")){e.preventDefault(),t.saveWorkflow();return}if(r&&(o==="o"||o==="O")){e.preventDefault(),t.openLibrary();return}if(r&&o==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!n&&(o==="?"||o==="F1")){e.preventDefault(),t.preview?.toggleShortcuts();return}o==="Escape"&&t.preview?.showShortcuts&&(e.preventDefault(),t.preview?.closeShortcuts())}get canvasModel(){return this.preview?.canvasModel}get inspectorModel(){return this.preview?.inspectorModel}get statusModel(){return this.preview?.statusModel}get codeSuggestions(){return this.preview?.codeSuggestions??[]}get saveStateLabel(){return this.preview?.saveStateLabel??""}get showLogs(){return!!this.preview?.showLogs}set showLogs(e){this.preview&&(this.preview.showLogs=e)}get jsonText(){return this.preview?.jsonText??""}set jsonText(e){this.preview&&(this.preview.jsonText=e)}toggleJson(){this.preview?.toggleJson()}handleCanvas(e){this.preview?.handleCanvas(e)}toggleShortcuts(){this.preview?.toggleShortcuts()}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await e.designer.listSaved(e.store)}};Reflect.metadata("design:type",Object)(L.prototype,"locale");Reflect.metadata("design:type",Object)(L.prototype,"theme");Reflect.metadata("design:type",Function)(L.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(L.prototype,"localeChangeAction");Reflect.metadata("design:type",G)(L.prototype,"designer");Reflect.metadata("design:type",Object)(L.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(L.prototype,"runContext");Reflect.metadata("design:type",Object)(L.prototype,"autoRun");Reflect.metadata("design:type",Object)(L.prototype,"store");Reflect.metadata("design:type",Object)(L.prototype,"autosave");Reflect.metadata("design:type",Object)(L.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(L.prototype,"tabChangeAction");Reflect.metadata("design:type",C)(L.prototype,"preview");Reflect.metadata("design:type",Object)(L.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(L.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(L.prototype,"keyHandler");Reflect.metadata("design:type",Object)(L.prototype,"documentRef");Reflect.metadata("design:paramtypes",[N,ae,Object,I,lt,P])(L);w(L,[[p(),1,"locale"],[p(),1,"theme"],[p(),1,"themeChangeAction"],[p(),1,"localeChangeAction"],[p(),1,"designer"],[p(),1,"initialDefinition"],[p(),1,"runContext"],[p(),1,"autoRun"],[p(),1,"store"],[p(),1,"autosave"],[p(),1,"autosaveDelay"],[p(),1,"tabChangeAction"],[ie("preview",C),1,"preview"],[V(),1,"autosaveTimer"],[V(),1,"autosaveInFlight"],[V(),1,"keyHandler"],[V(),1,"documentRef"],[v(),3,void 0,5],[v(),3,void 0,4],[v(),3,void 0,3],[q(nt),3,void 0,2],[v(),3,void 0,2],[v(),3,void 0,1],[v(),3,void 0,0],[S({selector:"workflow-designer",template:`
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
    </div>`}),0]]);var oa=ee("TAB_BAR_SOURCE"),ue=class{constructor(e){this.injectedSource=e}get activeSource(){return this.source||this.injectedSource}get visible(){return this.activeSource?this.activeSource.visible:!0}get items(){return this.activeSource?.items||[]}get showCreate(){return this.activeSource?this.activeSource.showCreate!==!1:!0}get createLabel(){return this.activeSource?.createLabel||"+"}get closeLabel(){return this.activeSource?.closeLabel||"\u2715"}select(e,t){!e||(this.activeSource?.items||[]).some(r=>r.id===e&&r.disabled)||t?.target?.closest?.(".tab-close")||this.activeSource?.select?.(e)}closeTab(e,t){t?.stopPropagation?.(),this.close(e)}create(){this.activeSource?.create?.()}close(e){this.activeSource?.close?.(e)}};Reflect.metadata("design:type",Object)(ue.prototype,"source");Reflect.metadata("design:paramtypes",[Object])(ue);w(ue,[[p(),1,"source"],[q(oa),3,void 0,0],[v(),3,void 0,0],[S({selector:"tab-bar",template:`
    <p class="tab-bar" role="tablist" v-show="visible">
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" v-for="tab in items" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-cell-width="3" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `}),0]]);var Pe=class{};w(Pe,[[$({declarations:[ue],exports:[ue]}),0]]);var at=class{};w(at,[[$({imports:[xt,Rt,It,Pe,Tt,At,Me,ze,Le,Ne],providers:[ae,Ve,N,ce,je,re],declarations:[T,X,U,F,Q,Y,j,C,W,L],exports:[xt,Rt,It,Pe,Tt,At,Me,ze,Le,Ne,ae,Ve,N,ce,re,T,X,U,F,Q,Y,j,C,W,L]}),0]]);var $e={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function Fe(a,e,t,o){return{id:a,name:e,type:t,label:o}}var ra=[{type:$e.route,label:"Gateway route",description:"Forward matching requests to a microservice or static upstream",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[Fe("in","in","input","Input")],outputs:[Fe("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value."},{key:"service",label:"Service",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",type:"number",min:0,step:100},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"headers",label:"Request headers",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:$e.condition,label:"Gateway condition",description:"Match path, method, host, header or query values",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[Fe("in","in","input","Input")],outputs:[Fe("true","true","output","True"),Fe("false","false","output","False")],fields:[{key:"field",label:"Field",type:"select",defaultValue:"path",options:[{label:"Path",value:"path"},{label:"Method",value:"method"},{label:"Host",value:"host"},{label:"Header",value:"header"},{label:"Query",value:"query"}]},{key:"name",label:"Header / query name",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"prefix",value:"prefix"},{label:"not prefix",value:"not-prefix"},{label:"exists",value:"exists"},{label:"not exists",value:"not-exists"}]},{key:"value",label:"Value",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:$e.deny,label:"Gateway deny",description:"Reject matching requests at the gateway",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[Fe("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"body",label:"Body",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function Kt(a){return ra.forEach(e=>a.register(e)),a}function aa(){return Kt(new N)}function yt(a="zh-CN"){let e=a==="zh-CN",t=aa(),o=(c,u,m,f,b,y)=>t.createNode(c,{x:f,y:b},{id:u,name:m,config:y}),r=o("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),s=o($e.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),i=o($e.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),n=o($e.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),l=(c,u,m,f)=>({id:c,sourceNodeId:u,sourcePort:m,targetNodeId:f,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[r,s,i,n],connections:[l("conn_1","start_1","out","condition_1"),l("conn_2","condition_1","true","route_1"),l("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}var bt=class{constructor(e){this.http=e}async list(){let e=await this.http.listRules();if(!e.ok)return[];let t=e.body;return Array.isArray(t)?t:Array.isArray(t?.items)?t.items:[]}async get(e){let t=await this.http.getRule(e);if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return t.body}}async save(e){let t=await this.http.saveRule(e);if(!t.ok)throw new Error(t.body?.message||t.body?.error||`Failed to apply gateway rules: HTTP ${t.status}`);return t.body?.summary??ko(e)}async remove(e){let t=await this.http.removeRule(e);return t.ok||t.status===404}async clear(){let e=await this.list();await Promise.all(e.map(t=>this.remove(t.id)))}};var sa=["run","resume","cancel","toggle-logs","save","open-library","clear","menu"],kt=class{constructor(e,t,o){this.state=e,this.http=o,this.designerOpen=!1,this.designerHiddenActions=sa,this.store=new bt(o),this.registry=Kt(new N);let r=new G({registry:this.registry,definition:yt("zh-CN")});this.designer=t?We(r,t):r}onInit(){this.state.openDesigner=()=>this.editRules(),this.state.init()}async onAfterViewInit(){await this.state.start()}onDestroy(){this.state.destroy()}async editRules(){this.state.error="",await this.loadRuleDocument(),this.designerOpen=!0}async loadRuleDocument(){if(this.state.creatingRuleWorkflow){this.state.creatingRuleWorkflow=!1;let r=yt("zh-CN");r.id=`gateway_rules_${Date.now().toString(36)}`,this.state.ruleWorkflowId=r.id,this.designer.load(r);return}let e=await this.store.list().catch(()=>[]),t=this.state.ruleWorkflowId||e[0]?.id||"",o;t&&(o=await this.store.get(t)),this.state.ruleWorkflowId=t,this.designer.load(o??yt("zh-CN"))}closeDesigner(){this.designerOpen=!1}async applyRules(){this.state.error="";try{let e=await this.store.save(this.designer.definition);this.designerOpen=!1,this.state.ruleWorkflowId=this.designer.definition.id,await this.state.loadRuleWorkflows(),this.state.status=this.state.t("status.rulesApplied",{count:e.nodeCount});let t=await this.state.fetchState();this.state.rules=t.rules??[],this.state.services=t.services??[]}catch(e){this.state.error=e.message}}};Reflect.metadata("design:paramtypes",[ro,lt,to])(kt);w(kt,[[v(),3,void 0,2],[v(),3,void 0,1],[S({selector:"gateway-admin",imports:[at,eo],template:`
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

        <div class="ga-modal" v-if="state.routeDetail">
            <div class="ga-modal-card ga-detail-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.routeDetail.path}}</h2>
                        <p>{{state.t('detail.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeRouteDetail">\u2715</button>
                </header>
                <div v-if="state.routeJsonOpen">
                    <textarea class="ga-import-textarea" [value]="state.routeJsonText"
                        @input="state.setRouteJson($event)"></textarea>
                    <div class="ga-field-error" v-if="state.routeJsonError">{{state.routeJsonError}}</div>
                    <footer class="ga-modal-foot">
                        <button class="ga-btn" type="button" @click="state.cancelRouteDetailJson">{{state.t('editor.cancel')}}</button>
                        <button class="ga-btn ga-btn-primary ga-route-json-save" type="button" @click="state.saveRouteDetailJson">{{state.t('editor.save')}}</button>
                    </footer>
                </div>
                <div v-else>
                    <pre class="ga-json">{{state.routeDetailJson}}</pre>
                    <footer class="ga-modal-foot">
                        <button class="ga-btn" type="button" @click="state.closeRouteDetail">{{state.t('common.close')}}</button>
                        <button class="ga-btn ga-btn-primary ga-route-json-edit" type="button" @click="state.editRouteDetailJson">{{state.t('detail.editJson')}}</button>
                    </footer>
                </div>
            </div>
        </div>

        <div class="ga-modal" v-if="state.ruleDetail">
            <div class="ga-modal-card ga-detail-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.ruleDetail.name || state.ruleDetail.id}}</h2>
                        <p>{{state.t('detail.ruleDesc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeRuleDetail">\u2715</button>
                </header>
                <pre class="ga-json">{{state.ruleDetailJson}}</pre>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeRuleDetail">{{state.t('common.close')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-modal" v-if="state.importOpen">
            <div class="ga-modal-card">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.t('import.title')}}</h2>
                        <p>{{state.t('import.desc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeImport">\u2715</button>
                </header>
                <textarea class="ga-import-textarea" [value]="state.importText"
                    placeholder='[{ "path": "/api/users", "service": "users-service" }]'
                    @input="state.setImportText($event)"></textarea>
                <div class="ga-field-error" v-if="state.importError">{{state.importError}}</div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeImport">{{state.t('editor.cancel')}}</button>
                    <button class="ga-btn ga-btn-primary ga-import-apply" type="button" @click="state.importRoutes">{{state.t('import.apply')}}</button>
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
