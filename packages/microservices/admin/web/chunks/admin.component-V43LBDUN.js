import{a as ue,b as Te,c as Ot}from"./chunk-VT5NTZ6V.js";import{b as no,j as lo,k as co,l as Lt,m as Mt,n as uo}from"./chunk-DZFFQQZL.js";import{$ as Z,A as Be,B as ro,C as ao,D as At,O as ct,Z as so,_ as Tt,a as b,aa as ut,ba as V,ca as Ue,fa as F,ga as io,ka as f,la as Nt,ma as ce,na as R,q as ae,qa as Et,r as de,ra as ge,s as dt,u as H,v as B,w as S,x as E,y as It,z as oo}from"./chunk-5SKR3XXL.js";import"./chunk-U6UJE3IR.js";var N=class{};b(N,[[de(),0]]);var Ne=ae("I18N_OPTIONS"),ar=ae("I18N_LOCALE"),Ra=ae("I18N_TRANSLATIONS"),Ke=ae("TRANSLATION_LOADERS");var pe=class{constructor(e){this.options=e,this._currentLocale=e?.defaultLocale||"en",this._locales=new Map,this._bundles=new Map}get availableLocales(){return Array.from(this._locales.keys())}get currentLocale(){return this._currentLocale}setLocale(e){this._locales.has(e)&&(this._currentLocale=e)}registerLocale(e){this._locales.set(e.locale,e),e.bundle&&this._bundles.set(e.locale,e.bundle)}registerBundle(e,t){this._bundles.set(e,t),this._locales.has(e)||this._locales.set(e,{locale:e})}getBundle(e){return this._bundles.get(e||this._currentLocale)}getLocaleConfig(e){return this._locales.get(e||this._currentLocale)}hasLocale(e){return this._locales.has(e)}getDirection(e){return this.getLocaleConfig(e)?.direction||"ltr"}isRTL(){return this.getDirection()==="rtl"}};Reflect.metadata("design:paramtypes",[Object])(pe);b(pe,[[S(),3,void 0,0],[B(Ne),3,void 0,0],[E(),0]]);var pt=class{format(e,t,r){return e.includes("{")&&(e.includes(", plural,")||e.includes(", select,"))?this.formatICU(e,t,r):this.interpolate(e,t)}interpolate(e,t){let r=e;return"#"in t&&(r=r.replace(/#/g,String(t["#"]))),r=r.replace(/\{(\w+)\}/g,(o,s)=>{if(s in t){let i=t[s];return String(i)}return o}),r}formatICU(e,t,r){let o=e,s=/\{(\w+),\s*(plural|select),\s*/g,i;for(;(i=s.exec(e))!==null;){let l=i.index,n=i[1],d=i[2],c=l+i[0].length,p=this.findMatchingBrace(e,l);if(p===-1)continue;let u=e.substring(c,p),m=e.substring(l,p+1),w=this.parseChoices(u);if(d==="plural"){let g=t[n];if(typeof g=="number"){let v=this.getPluralForm(g,r),x=w[v]||w.other||"",k=this.interpolate(x,{"#":g,...t});o=o.replace(m,k)}}else if(d==="select"){let g=t[n];if(g!==void 0){let v=w[String(g)]||w.other||"",x=this.interpolate(v,t);o=o.replace(m,x)}}}return this.interpolate(o,t)}findMatchingBrace(e,t){let r=1;for(let o=t+1;o<e.length;o++)if(e[o]==="{")r++;else if(e[o]==="}"&&(r--,r===0))return o;return-1}parseChoices(e){let t={},r=/(one|other|zero|few|many|male|female|\w+)\s*\{/g,o;for(;(o=r.exec(e))!==null;){let s=o[1],i=o.index+o[0].length,l=this.findMatchingBrace(e,o.index+o[0].length-1);if(l!==-1){let n=e.substring(i,l);t[s]=n.trim()}}return t}getPluralForm(e,t){let r=t.split("-")[0];return r==="zh"||r==="ja"||r==="ko"?"other":r==="en"||r==="de"||r==="nl"?e===1?"one":"other":r==="ru"||r==="pl"?e%10===1&&e%100!==11?"one":e%10>=2&&e%10<=4&&(e%100<10||e%100>=20)?"few":"other":r==="ar"?e===0?"zero":e===1?"one":e===2?"two":e>=3&&e<=10?"few":e>=11&&e<=99?"many":"other":e===1?"one":"other"}};var we=class extends N{constructor(e,t,r){super(),this.injector=e,this.options=t,this.localeService=r,this._currentLocale=t?.defaultLocale||"en",this._translations=new Map,this._formatter=new pt,this.init()}async init(){if(this.options?.bundles)for(let[e,t]of Object.entries(this.options.bundles))this._translations.set(e,t),this.localeService.registerBundle(e,t);if(this.options?.basePath){let e=this.injector.get(Ke,[]);for(let t of e){let r=await t.load(this.options.basePath,this.options.locales||[]);for(let o of r)this._translations.set(o.locale,o),this.localeService.registerBundle(o.locale,o)}}}get currentLocale(){return this._currentLocale}setLocale(e){(this._translations.has(e)||this.localeService.availableLocales.includes(e))&&(this._currentLocale=e)}translate(e,t,r){let o=typeof t=="string"?t:this._currentLocale,s=typeof t=="string"?r:t,i=this._translations.get(o);if(!i)return e;let l=this.getMessage(i,e);return l?this._formatter.format(l,s||{},o):e}getMessage(e,t){let r=t.split("."),o=e.messages;for(let s of r)if(o&&typeof o=="object"&&s in o)o=o[s];else return;return typeof o=="string"?o:void 0}has(e,t){let r=t||this._currentLocale,o=this._translations.get(r);return o?this.getMessage(o,e)!==void 0:!1}get availableLocales(){return Array.from(this._translations.keys())}};Reflect.metadata("design:paramtypes",[dt,Object,pe])(we);b(we,[[B(),3,void 0,2],[S(),3,void 0,1],[B(Ne),3,void 0,1],[B(),3,void 0,0],[E(),0]]);var Ye=class{};b(Ye,[[de(),0]]);var ye=class extends Ye{constructor(e){super(),this.fileAdapter=e}async load(e,t){let r=[];for(let o of t)try{let s=await this.loadLocale(e,o);r.push(s)}catch{}return r}async loadLocale(e,t){let r=this.fileAdapter.join(e,`${t}.json`);if(!await this.fileAdapter.find(r))throw new Error(`Translation file not found: ${r}`);let s=await this.fileAdapter.readJSON(r);return{locale:t,messages:s}}};Reflect.metadata("design:paramtypes",[so])(ye);b(ye,[[B(),3,void 0,0],[E(),0]]);var be=class{constructor(e){this.translator=e}transform(e,...t){if(!e)return"";let r,o;return t.length>0&&(typeof t[0]=="object"?r=t[0]:typeof t[0]=="string"&&(o=t[0])),t.length>1&&typeof t[1]=="object"&&(r=t[1]),o?this.translator.translate(e,o,r||{}):this.translator.translate(e,r||{})}};Reflect.metadata("design:paramtypes",[N])(be);b(be,[[E(),0],[ao("translate"),0]]);var sr=[pe,we,{provide:N,useClass:we},ye,{provide:Ke,useClass:ye,multi:!0},be],Ee=class a{static withOptions(e){let t=[{provide:Ne,useValue:e}];return e.loader&&t.push({provide:Ke,useClass:e.loader,multi:!0}),{module:a,providers:t}}static withLocales(e,t){return this.withOptions({bundles:e,defaultLocale:t||Object.keys(e)[0]})}};b(Ee,[[H({providers:sr,exports:[be]}),0]]);var _t=class{format(e,t,r){return new Intl.NumberFormat(t,r).format(e)}formatInteger(e,t){return this.format(e,t,{maximumFractionDigits:0})}formatDecimal(e,t,r){return this.format(e,t,{minimumFractionDigits:r,maximumFractionDigits:r})}formatPercent(e,t){return this.format(e,t,{style:"percent"})}};b(_t,[[E(),0]]);var Dt=class{format(e,t,r){let o=typeof e=="string"||typeof e=="number"?new Date(e):e;return new Intl.DateTimeFormat(t,r).format(o)}formatShort(e,t){return this.format(e,t,{dateStyle:"short"})}formatMedium(e,t){return this.format(e,t,{dateStyle:"medium"})}formatLong(e,t){return this.format(e,t,{dateStyle:"long"})}formatFull(e,t){return this.format(e,t,{dateStyle:"full"})}formatTime(e,t){return this.format(e,t,{timeStyle:"short"})}formatDateTime(e,t){return this.format(e,t,{dateStyle:"medium",timeStyle:"short"})}};b(Dt,[[E(),0]]);var jt=class{format(e,t,r,o){let s={style:"currency",...o};return r&&(s.currency=r),new Intl.NumberFormat(t,s).format(e)}formatUSD(e,t){return this.format(e,t,"USD")}formatCNY(e,t){return this.format(e,t,"CNY")}formatEUR(e,t){return this.format(e,t,"EUR")}formatJPY(e,t){return this.format(e,t,"JPY")}};b(jt,[[E(),0]]);var ft=class{constructor(e){this.translator=e}intercept(e,t,r){let o=t.handle(e,r);return typeof o=="string"&&o.startsWith("i18n:")?this.translator.translate(o.substring(5)):o&&typeof o=="object"?this.translateObject(o):o}translateObject(e){if(Array.isArray(e))return e.map(r=>this.translateObject(r));let t={};for(let[r,o]of Object.entries(e))typeof o=="string"&&o.startsWith("i18n:")?t[r]=this.translator.translate(o.substring(5)):typeof o=="object"?t[r]=this.translateObject(o):t[r]=o;return t}};Reflect.metadata("design:paramtypes",[N])(ft);b(ft,[[E(),0]]);var po={en:{node:{start:{label:"Start",description:"Optional explicit entry point"},end:{label:"End",description:"Optional explicit end point"},inject:{label:"Inject",description:"Start a flow manually, on an interval, cron schedule, or event"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Transform the message with JavaScript"},condition:{label:"Condition",description:"Branch on a value from the flow context"},switch:{label:"Switch",description:"Route to one of four outputs using ordered rules"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches and merge their results"},loop:{label:"Loop",description:"Run a sub-workflow repeatedly"},trigger:{label:"Trigger",description:"Emit a payload after a delay"},delay:{label:"Delay",description:"Pause for a fixed or random time"},log:{label:"Log",description:"Write a message or value to the execution log"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint and read the response"},assign:{label:"Assign",description:"Merge values into flow variables"},transform:{label:"Transform",description:"Map the previous result into a new shape"},template:{label:"Template",description:"Render text from context values"},json:{label:"JSON",description:"Parse or stringify JSON values"},csv:{label:"CSV",description:"Parse or stringify CSV text"},change:{label:"Change",description:"Set, delete or append context fields"},statistics:{label:"Statistics",description:"Aggregate an array into a number"},merge:{label:"Merge",description:"Combine fields or arrays"},"event-emit":{label:"Emit event",description:"Publish an event to the host"},"event-wait":{label:"Wait event",description:"Wait for an event from the host"},command:{label:"Command",description:"Run a host command or function"},split:{label:"Split",description:"Split text or an array into items"},map:{label:"Map",description:"Map each item to a new value"},filter:{label:"Filter",description:"Keep items matching a condition"},sort:{label:"Sort",description:"Sort items by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Group items into batches"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Run another workflow"},comment:{label:"Comment",description:"Canvas note; not executed"},custom:{label:"Custom",description:"Run a custom activity or handler"},"mqtt-publish":{label:"MQTT publish",description:"Publish a message to an MQTT topic"},"mqtt-wait":{label:"MQTT wait",description:"Wait for the next message on an MQTT topic"},"redis-command":{label:"Redis command",description:"Run a Redis command and return its result"},"redis-publish":{label:"Redis publish",description:"Publish a message to a Redis channel"},"nats-publish":{label:"NATS publish",description:"Publish a message to a NATS subject"},"nats-request":{label:"NATS request",description:"Send a NATS request and wait for a reply"},"coap-request":{label:"CoAP request",description:"Send a CoAP request and return the response payload"},"gateway-route":{label:"Gateway route",description:"Forward matching requests to a microservice or static upstream"},"gateway-condition":{label:"Gateway condition",description:"Match path, method, host, header or query values"},"gateway-deny":{label:"Gateway deny",description:"Reject matching requests at the gateway"},debug:{label:"Debug",description:"Inspect a value or the complete message"},junction:{label:"Junction",description:"Merge wires without changing the message"},sequence:{label:"Sequence",description:"Keep downstream steps in order"},link:{label:"Link",description:"Jump to matching link nodes by name"},html:{label:"HTML",description:"Extract text or links from HTML"},xml:{label:"XML",description:"Parse or stringify XML documents"},scale:{label:"Scale",description:"Map a number from one range to another"},router:{label:"Router",description:"Route to one of four outputs using ordered rules"},complete:{label:"Complete",description:"Run after matching nodes complete successfully"},catch:{label:"Catch",description:"Run when a matching node fails"},status:{label:"Status",description:"Run after the workflow finishes"},"websocket-request":{label:"WebSocket request",description:"Send a WebSocket message and optionally wait for the reply"},"tcp-request":{label:"TCP request",description:"Connect to a TCP server, send data and optionally wait for a reply"},"udp-request":{label:"UDP request",description:"Send a UDP datagram and optionally wait for a reply"},"file-read":{label:"File read",description:"Read a file from the workflow host"},"file-write":{label:"File write",description:"Write or append a file on the workflow host"},yaml:{label:"YAML",description:"Parse or stringify YAML"},rbe:{label:"RBE",description:"Keep array items only when the value changes"},combine:{label:"Combine",description:"Combine several context values into one result"},exec:{label:"Exec",description:"Run a host command and capture stdout/stderr"},"http-in":{label:"HTTP in",description:"Start the flow from an HTTP webhook request"},"http-response":{label:"HTTP response",description:"Send the HTTP response for a webhook request"}},field:{start:{},end:{},inject:{payload:"Payload fields",topic:"Topic",payloadType:"Payload type",trigger:"Trigger",onceDelay:"Delay before first injection",interval:"Interval",intervalUnit:"Interval unit",repeatCount:"Repeat count",event:"Event name",timeout:"Wait timeout",payloadValue:"Payload value",cron:"Cron expression"},task:{action:"Action name",result:"Result when no action",fail:"Mark as failed",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},function:{code:"JavaScript code",timeout:"Timeout",initialize:"Initialize code",finalize:"Finalize code"},condition:{field:"Value path",operator:"Operator",value:"Compare to"},switch:{field:"Value path",value:"Compare to",rules:"Rules",operator:"Operator"},parallel:{},join:{mode:"Mode",resultField:"Result field",ignoreEmpty:"Skip empty branches"},loop:{iterations:"Iterations",delay:"Delay",workflow:"Sub-workflow source"},trigger:{delay:"Delay",payload:"Payload (JSON)",emitSecond:"Send a second message",secondDelay:"Second delay",secondPayload:"Second payload"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum",unit:"Unit"},log:{message:"Static message",field:"Value path",complete:"Log full context",level:"Level"},"http-request":{url:"Request URL",method:"Method",headers:"Headers (JSON)",body:"Body",responseType:"Response handling",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",authType:"Authentication",username:"Username",password:"Password"},assign:{values:"Values (JSON)"},transform:{mapping:"Mapping (JSON)",result:"Fixed result (JSON)"},template:{template:"Template",syntax:"Syntax",target:"Write result to",output:"Output type"},json:{mode:"Mode",field:"Value path",pretty:"Pretty print"},csv:{mode:"Mode",field:"Value path",delimiter:"Delimiter",header:"First row is header",columns:"Columns"},change:{action:"Action",field:"Field path",value:"Value",rules:"Rules"},statistics:{field:"Array path",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event name",payload:"Payload (JSON)"},"event-wait":{event:"Event name",timeout:"Timeout"},command:{command:"Command",args:"Arguments",timeout:"Timeout",value:"Argument"},split:{field:"Value path",delimiter:"Delimiter",mode:"Mode"},map:{field:"Array path",path:"Item path"},filter:{field:"Array path",path:"Item path",operator:"Operator",value:"Compare to"},sort:{field:"Array path",path:"Item path",order:"Order",numeric:"Numeric compare"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array path",size:"Batch size",overlap:"Overlap"},trycatch:{timeout:"Timeout"},subprocess:{workflow:"Sub-workflow source"},comment:{text:"Text"},custom:{result:"Result"},"mqtt-publish":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)",payload:"Payload",retain:"Retain"},"mqtt-wait":{url:"Broker URL",topic:"Topic",qos:"QoS",timeout:"Timeout (ms)"},"redis-command":{url:"Redis URL",command:"Command",args:"Arguments"},"redis-publish":{url:"Redis URL",channel:"Channel",message:"Message"},"nats-publish":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"nats-request":{servers:"NATS servers",subject:"Subject",payload:"Payload",timeout:"Timeout (ms)"},"coap-request":{host:"Host",port:"Port",method:"Method",path:"Path",payload:"Payload",timeout:"Timeout (ms)"},"gateway-route":{path:"Inbound path",service:"Service",targetUrl:"Target URL",targetPath:"Target path",stripPrefix:"Strip prefix",timeout:"Timeout (ms)",priority:"Priority",headers:"Request headers",responseHeaders:"Response headers",rateLimit:"Rate limit",cache:"Cache",circuitBreaker:"Circuit breaker",bulkhead:"Bulkhead"},"gateway-condition":{field:"Field",name:"Header / query name",operator:"Operator",value:"Value"},"gateway-deny":{status:"Status",message:"Message",priority:"Priority",body:"Body"},debug:{field:"Value path",complete:"Complete message",level:"Level",console:"Also print to console",active:"Enabled"},link:{mode:"Mode",links:"Links"},html:{field:"HTML path",mode:"Output",target:"Write result to",tag:"Tag",attribute:"Attribute name"},xml:{mode:"Mode",field:"XML path",target:"Write result to",pretty:"Pretty print",attributes:"Include attributes",text:"Include text"},scale:{field:"Value path",inMin:"Input minimum",inMax:"Input maximum",outMin:"Output minimum",outMax:"Output maximum",clamp:"Clamp to range",round:"Round result",target:"Write result to"},router:{field:"Value path",rules:"Rules",operator:"Operator",value:"Compare to"},complete:{scope:"Scope"},catch:{scope:"Scope"},status:{scope:"Scope"},"websocket-request":{url:"URL",headers:"Headers",message:"Message fields",payload:"Payload",waitForReply:"Wait for reply",timeout:"Timeout"},"tcp-request":{host:"Host",port:"Port",payload:"Payload",waitForReply:"Wait for reply",timeout:"Timeout"},"udp-request":{host:"Host",port:"Port",payload:"Payload",waitForReply:"Wait for reply",timeout:"Timeout"},"file-read":{path:"File path",encoding:"Encoding",output:"Write result to"},"file-write":{path:"File path",encoding:"Encoding",content:"Content",append:"Append",createDirs:"Create parent folders"},yaml:{mode:"Mode",field:"Value path",target:"Write result to"},rbe:{field:"Array path",path:"Item path",mode:"Report"},combine:{fields:"Fields",mode:"Mode",separator:"Separator",resultField:"Result field"},exec:{command:"Command",args:"Arguments",cwd:"Working directory",env:"Environment",timeout:"Timeout",output:"Write stdout to"},"http-in":{method:"Method",path:"Path"},"http-response":{statusCode:"Status code",headers:"Headers",body:"Body path"}},fieldPlaceholder:{start:{},end:{},inject:{topic:"orders.created",payload:'{ "value": 1 }',onceDelay:"0",interval:"1",repeatCount:"1",event:"order.created",timeout:"30",cron:"0 9 * * 1-5"},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{resultField:"joined"},loop:{workflow:"workflows.child"},trigger:{payload:'{ "ok": true }',secondPayload:'{ "done": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:",",columns:"name, age"},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{payload:'{ "id": 1 }',event:"order.created"},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{text:"Canvas note"},custom:{result:'{ "ok": true }'},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"/api/users",service:"users-service",targetUrl:"http://127.0.0.1:3001",targetPath:"/users",headers:'{ "x-gateway": "1" }',responseHeaders:'{ "x-served-by": "gateway" }',rateLimit:'{ "limit": 100, "windowMs": 60000 }',cache:'{ "enabled": true, "ttl": 30000 }',circuitBreaker:'{ "failureThreshold": 5 }',bulkhead:'{ "maxConcurrent": 20 }'},"gateway-condition":{name:"x-role",value:"/api/users"},"gateway-deny":{body:'{ "error": "forbidden" }'},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1",attribute:"href"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"},scale:{field:"value",target:"value"},router:{field:"result.status"},complete:{scope:"node id or type"},catch:{scope:"node id or type"},status:{scope:"node id or type"},"websocket-request":{},"tcp-request":{host:"127.0.0.1",port:"9000"},"udp-request":{host:"127.0.0.1",port:"9000"},"file-read":{output:"content"},"file-write":{},exec:{command:"/usr/bin/node",cwd:"./",env:"KEY"},combine:{fields:"first, second"},yaml:{field:"value",target:"value"},rbe:{field:"items",path:"value"},"http-in":{path:"/orders"},"http-response":{headers:'{ "x-flow": "done" }',body:"payload"}},fieldDescription:{start:{},end:{},inject:{topic:"optional topic carried with the payload",payload:"edit injected object fields as key/value rows",payloadType:"choose the value type; JSON merges into the context",trigger:"choose manual, interval or event triggering",onceDelay:"wait before the first injection",interval:"time between injections",intervalUnit:"unit used by the interval",repeatCount:"number of runs; 0 runs until stopped",event:"event that triggers the injection",timeout:"maximum time to wait for the event",payloadValue:"string, number or boolean value to inject",cron:"Five fields: minute hour day month weekday."},task:{action:"name of a function in context.actions; leave empty to return the result below",result:"JSON returned when no action is set",retry:"automatic retries before the step fails",fail:"force this step to fail so error branches can run",retryDelay:"wait time between retries",timeout:"maximum time for this step; 0 means no limit"},function:{code:"return the next message; context and input expose the flow context",timeout:"maximum time for this step; 0 means no limit",initialize:"Optional code that runs before the main function. Returned objects are merged into the context.",finalize:"Optional code that runs after the main function for cleanup or metrics."},condition:{field:"context path to test, for example approved or user.role",operator:"comparison used to choose the true or false output",value:"value used by the selected operator"},switch:{field:"Context value compared against each rule.",value:"Value used by the selected operator.",rules:"Rules are checked from top to bottom; the first match selects the numbered output.",operator:"Comparison used by this rule."},parallel:{},join:{mode:"Collect branch results as an array or merge their data objects.",resultField:"Context field that receives the joined value.",ignoreEmpty:"Leave branches without result data out of the joined value."},loop:{iterations:"Number of times to run the sub-workflow.",delay:"Wait between sub-workflow runs.",workflow:"Context path that holds the workflow definition to repeat."},trigger:{delay:"time to wait before emitting the payload",payload:"JSON emitted when the trigger fires",emitSecond:"Emit another payload after the first one reached the branch.",secondDelay:"Time to wait after the first message before emitting the second.",secondPayload:"Payload merged into the second message."},delay:{delay:"pause duration before the next node",mode:"fixed waits a set time; random picks a value in the range",randomMin:"minimum random delay",randomMax:"maximum random delay",unit:"unit used by the delay values"},log:{message:"text written when no value path is set",field:"context path to log, for example result.value",complete:"write the complete flow context",level:"log level: info, warn or error"},"http-request":{url:"absolute endpoint or a host path starting with /",method:"HTTP request method",headers:"JSON object of request headers",body:"request body for POST, PUT or PATCH",responseType:"auto parses JSON when possible; text keeps raw text; JSON fails on invalid JSON",retry:"automatic retries after a failed request",retryDelay:"wait time between retries",timeout:"maximum wait time for the request",authType:"choose whether to send a Basic authorization header",username:"Basic authentication user name",password:"Basic authentication password"},assign:{values:"JSON object merged into flow variables"},transform:{mapping:"target field to context path mapping",result:"fixed JSON result"},template:{template:"text with placeholders such as {{name}} or {{user.email}}",target:"context field that receives the rendered value",syntax:"Mustache replaces placeholders; plain text is used as-is",output:"text keeps a string; JSON parses the rendered text"},json:{field:"context path to parse or stringify",mode:"parse JSON text or stringify a value",pretty:"indent the serialized JSON"},csv:{field:"context path to CSV text or an array",delimiter:"single character between columns",mode:"parse CSV text or stringify an array",header:"treat the first row as column names",columns:"Optional comma-separated columns to keep when parsing or stringifying."},change:{field:"context path to modify, for example variables.name",value:"new value; JSON is supported",rules:"rules run in order, one change per row",action:"Set replaces, Delete removes, Append adds to a list or string"},statistics:{field:"context path to the array to aggregate",path:"property of each item used for the calculation",operation:"count, sum, average, min or max",resultField:"field that receives the result"},merge:{fields:"comma-separated context fields to merge",mode:"object merge or array concat",resultField:"field that receives the result"},"event-emit":{event:"event name shared by emitters and waiters",payload:"JSON data sent with the event"},"event-wait":{event:"event name to wait for",timeout:"maximum time to wait for the event"},command:{args:"Ordered arguments passed to the command.",command:"host command or function name",timeout:"maximum execution time for the command"},split:{field:"text or array path to split",delimiter:"separator used when splitting text",mode:"Auto detects arrays and text, or force one mode."},map:{path:"property of each item to map",field:"array path to iterate"},filter:{field:"array path to filter",path:"item property used for comparison",operator:"comparison operator",value:"value used for comparison"},sort:{path:"item property used for sorting",field:"array path to sort",order:"ascending or descending",numeric:"Compare values as numbers instead of text."},range:{from:"inclusive start value",to:"exclusive end value",step:"amount added on each step"},batch:{size:"number of items per batch",field:"array path to split into batches",overlap:"items repeated at the start of the next batch; 0 disables overlap"},trycatch:{timeout:"route to the timeout port after this delay"},subprocess:{workflow:"Context path that holds the workflow definition to run."},comment:{},custom:{result:"Value returned by the custom node."},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"JSON array of command arguments."},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"Defaults to the path condition value.",priority:"Lower runs first."},"gateway-condition":{},"gateway-deny":{priority:"Lower runs first."},debug:{field:"context path to inspect",complete:"print the complete workflow context",console:"also write to the host console for development",level:"output level: info, warn or error",active:"turn off to keep the node but skip its output"},link:{mode:"Send from this node (link out) or receive from matching names (link in).",links:"Comma separated names shared by link-out and link-in nodes."},html:{field:"context path containing HTML text",mode:"text strips markup; links collects href and src values",target:"context field that receives the extracted value",tag:"only extract content from this tag; leave empty for the whole document",attribute:"Attribute to collect when output is Attribute, for example href or src."},xml:{mode:"parse XML text or serialize an object back to XML",field:"context path containing XML text or an object",target:"context field that receives the result",pretty:"indent serialized XML",attributes:"Include XML attributes as @attrs in the parsed result.",text:"Include element text as #text in the parsed result."},scale:{field:"context path of the number to map",inMin:"minimum of the input range",inMax:"maximum of the input range",outMin:"minimum of the output range",outMax:"maximum of the output range",clamp:"keep the result inside the output range",round:"round the result to an integer",target:"field that receives the mapped value"},router:{field:"Context value compared against each rule.",rules:"Rules are checked from top to bottom; the first match selects the numbered output.",operator:"Comparison used by this rule.",value:"Value used by the selected operator."},complete:{scope:"Only run for this node id or type. Leave empty to match anything."},catch:{scope:"Only run for this node id or type. Leave empty to match anything."},status:{scope:"Only run for this node id or type. Leave empty to match anything."},"websocket-request":{url:"WebSocket endpoint, e.g. wss://example.com/socket",headers:"Connection headers, edited as key/value rows",message:"JSON message to send",payload:"text payload to send",waitForReply:"wait for a server reply",timeout:"maximum wait time for the reply"},"tcp-request":{host:"server host",port:"server port",payload:"text payload to send",waitForReply:"wait for a server reply",timeout:"maximum wait time for the reply"},"udp-request":{host:"server host",port:"server port",payload:"text payload to send",waitForReply:"wait for a server reply",timeout:"maximum wait time for the reply"},"file-read":{path:"path relative to the host working directory",encoding:"file encoding",output:"context field that receives the file content"},"file-write":{path:"path relative to the host working directory",encoding:"file encoding",content:"text written to the file",append:"append instead of overwrite",createDirs:"create parent folders before writing"},yaml:{mode:"Parse YAML text or stringify a value.",field:"Context path containing YAML text or an object.",target:"Context field that receives the result."},rbe:{field:"Context path to the array to filter.",path:"Property compared between consecutive items.",mode:"Keep the first item and each change of the compared value."},combine:{fields:"Comma-separated context paths to combine.",mode:"Object merge, array concat or text join.",separator:"Text placed between joined values.",resultField:"Context field that receives the combined value."},exec:{command:"Executable to run on the workflow host.",args:"Arguments passed to the executable, one row per argument.",cwd:"Directory the command runs in. Defaults to the host working directory.",env:"Extra environment variables merged into the host environment.",timeout:"Kill the command after this many milliseconds. 0 waits indefinitely.",output:"Context field that receives the standard output."},"http-in":{method:"HTTP method that triggers this branch.",path:"Request path this node serves. Leave empty to accept any path."},"http-response":{statusCode:"HTTP status code returned to the caller.",headers:"Response headers as a JSON object.",body:"Context path used as the response body."}},group:{reliability:"Reliability",options:"Options",delay:"Delay",request:"Request",template:"Template",output:"Output",payload:"Payload",authentication:"Authentication","input-range":"Input range","output-range":"Output range",trigger:"Trigger"},option:{truthy:"is truthy",equals:"equals","not-equals":"not equals",gt:"greater than",lt:"less than",fixed:"Fixed delay",random:"Random delay",info:"info",warn:"warn",error:"error",GET:"GET",POST:"POST",PUT:"PUT",PATCH:"PATCH",DELETE:"DELETE",auto:"Auto",json:"JSON",text:"Text",mustache:"Mustache",plain:"Plain text",parse:"Parse",stringify:"Stringify",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Branch results array",asc:"Ascending",desc:"Descending",path:"Path",method:"Method",host:"Host",header:"Header",query:"Query",prefix:"prefix","not-prefix":"not prefix",exists:"exists","not-exists":"not exists",links:"Links",string:"String",number:"Number",boolean:"Boolean",none:"None",basic:"Basic",milliseconds:"Milliseconds",seconds:"Seconds",minutes:"Minutes",attribute:"Attribute",contains:"contains",regex:"matches regex",gte:"greater or equal",lte:"less or equal",manual:"Manual / once",interval:"Interval",event:"Event",cron:"Cron schedule",utf8:"UTF-8",base64:"Base64",hex:"Hex",change:"On any change",merge:"Merged object",concat:"Array concat",ms:"ms",s:"s",value:"On value change",ANY:"Any method",out:"Link out",in:"Link in"}},"zh-CN":{node:{start:{label:"\u5F00\u59CB",description:"\u53EF\u9009\u7684\u663E\u5F0F\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u53EF\u9009\u7684\u663E\u5F0F\u7ED3\u675F\u70B9"},inject:{label:"\u6CE8\u5165",description:"\u624B\u52A8\u3001\u5468\u671F\u3001Cron \u6216\u4E8B\u4EF6\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u4F7F\u7528 JavaScript \u5904\u7406\u6D88\u606F"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u6D41\u7A0B\u4E0A\u4E0B\u6587\u7684\u503C\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u987A\u5E8F\u5339\u914D\u89C4\u5219\u5E76\u9009\u62E9\u56DB\u4E2A\u8F93\u51FA\u4E4B\u4E00"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u5165\u5206\u652F\u5E76\u5408\u5E76\u5176\u7ED3\u679C"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u5B50\u5DE5\u4F5C\u6D41"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u6570\u636E"},delay:{label:"\u5EF6\u8FDF",description:"\u6309\u56FA\u5B9A\u6216\u968F\u673A\u65F6\u95F4\u6682\u505C"},log:{label:"\u65E5\u5FD7",description:"\u5C06\u6D88\u606F\u6216\u503C\u5199\u5165\u6267\u884C\u65E5\u5FD7"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3\u5E76\u8BFB\u53D6\u54CD\u5E94"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u5C06\u4E0A\u4E00\u6B65\u7ED3\u679C\u6620\u5C04\u4E3A\u65B0\u7ED3\u6784"},template:{label:"\u6A21\u677F",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u503C\u6E32\u67D3\u6587\u672C"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV \u6587\u672C"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u5C06\u6570\u7EC4\u805A\u5408\u4E3A\u6570\u503C"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5B57\u6BB5\u6216\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u5411\u5BBF\u4E3B\u53D1\u5E03\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5BBF\u4E3B\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u6267\u884C\u5BBF\u4E3B\u547D\u4EE4\u6216\u51FD\u6570"},split:{label:"\u62C6\u5206",description:"\u62C6\u5206\u6587\u672C\u6216\u6570\u7EC4"},map:{label:"\u6620\u5C04",description:"\u5C06\u6BCF\u4E2A\u5143\u7D20\u6620\u5C04\u4E3A\u65B0\u503C"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u7B26\u5408\u6761\u4EF6\u7684\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u5143\u7D20\u5206\u6279"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u6267\u884C"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"},"mqtt-publish":{label:"MQTT \u53D1\u5E03",description:"\u5411 MQTT \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"mqtt-wait":{label:"MQTT \u7B49\u5F85",description:"\u7B49\u5F85 MQTT \u4E3B\u9898\u7684\u4E0B\u4E00\u6761\u6D88\u606F"},"redis-command":{label:"Redis \u547D\u4EE4",description:"\u6267\u884C Redis \u547D\u4EE4\u5E76\u8FD4\u56DE\u7ED3\u679C"},"redis-publish":{label:"Redis \u53D1\u5E03",description:"\u5411 Redis \u9891\u9053\u53D1\u5E03\u6D88\u606F"},"nats-publish":{label:"NATS \u53D1\u5E03",description:"\u5411 NATS \u4E3B\u9898\u53D1\u5E03\u6D88\u606F"},"nats-request":{label:"NATS \u8BF7\u6C42",description:"\u53D1\u9001 NATS \u8BF7\u6C42\u5E76\u7B49\u5F85\u56DE\u590D"},"coap-request":{label:"CoAP \u8BF7\u6C42",description:"\u53D1\u9001 CoAP \u8BF7\u6C42\u5E76\u8FD4\u56DE\u54CD\u5E94\u5185\u5BB9"},"gateway-route":{label:"\u7F51\u5173\u8DEF\u7531",description:"\u628A\u5339\u914D\u7684\u8BF7\u6C42\u8F6C\u53D1\u5230\u5FAE\u670D\u52A1\u6216\u56FA\u5B9A\u4E0A\u6E38"},"gateway-condition":{label:"\u7F51\u5173\u6761\u4EF6",description:"\u5339\u914D\u8DEF\u5F84\u3001\u65B9\u6CD5\u3001\u4E3B\u673A\u3001\u8BF7\u6C42\u5934\u6216\u67E5\u8BE2\u53C2\u6570"},"gateway-deny":{label:"\u7F51\u5173\u62D2\u7EDD",description:"\u5728\u7F51\u5173\u76F4\u63A5\u62D2\u7EDD\u5339\u914D\u7684\u8BF7\u6C42"},debug:{label:"\u8C03\u8BD5",description:"\u67E5\u770B\u6D88\u606F\u5C5E\u6027\u6216\u5B8C\u6574\u6D88\u606F"},junction:{label:"\u6C47\u5408",description:"\u6C47\u5408\u8FDE\u7EBF\uFF0C\u4E0D\u6539\u53D8\u6D88\u606F"},sequence:{label:"\u987A\u5E8F",description:"\u4FDD\u6301\u4E0B\u6E38\u6B65\u9AA4\u987A\u5E8F\u6267\u884C"},link:{label:"\u94FE\u63A5",description:"\u6309\u540D\u79F0\u8DF3\u8F6C\u5230\u5339\u914D\u7684\u94FE\u63A5\u8282\u70B9"},html:{label:"HTML",description:"\u4ECE HTML \u63D0\u53D6\u6587\u672C\u6216\u94FE\u63A5"},xml:{label:"XML",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 XML \u6587\u6863"},scale:{label:"\u533A\u95F4\u6620\u5C04",description:"\u5C06\u6570\u503C\u4ECE\u4E00\u4E2A\u533A\u95F4\u6620\u5C04\u5230\u53E6\u4E00\u4E2A\u533A\u95F4"},router:{label:"\u89C4\u5219\u8DEF\u7531",description:"\u6309\u987A\u5E8F\u5339\u914D\u89C4\u5219\u5E76\u9009\u62E9\u56DB\u4E2A\u8F93\u51FA\u4E4B\u4E00"},complete:{label:"\u5B8C\u6210\u4E8B\u4EF6",description:"\u5339\u914D\u8282\u70B9\u6210\u529F\u5B8C\u6210\u540E\u8FD0\u884C"},catch:{label:"\u5F02\u5E38\u4E8B\u4EF6",description:"\u5339\u914D\u8282\u70B9\u5931\u8D25\u65F6\u8FD0\u884C"},status:{label:"\u72B6\u6001\u4E8B\u4EF6",description:"\u5DE5\u4F5C\u6D41\u7ED3\u675F\u540E\u8FD0\u884C"},"websocket-request":{label:"WebSocket \u8BF7\u6C42",description:"\u53D1\u9001 WebSocket \u6D88\u606F\u5E76\u53EF\u7B49\u5F85\u56DE\u590D"},"tcp-request":{label:"TCP \u8BF7\u6C42",description:"\u8FDE\u63A5 TCP \u670D\u52A1\u5668\uFF0C\u53D1\u9001\u6570\u636E\u5E76\u53EF\u7B49\u5F85\u56DE\u590D"},"udp-request":{label:"UDP \u8BF7\u6C42",description:"\u53D1\u9001 UDP \u6570\u636E\u62A5\u5E76\u53EF\u7B49\u5F85\u56DE\u590D"},"file-read":{label:"\u8BFB\u53D6\u6587\u4EF6",description:"\u8BFB\u53D6\u5DE5\u4F5C\u6D41\u5BBF\u4E3B\u4E0A\u7684\u6587\u4EF6"},"file-write":{label:"\u5199\u5165\u6587\u4EF6",description:"\u5199\u5165\u6216\u8FFD\u52A0\u5DE5\u4F5C\u6D41\u5BBF\u4E3B\u4E0A\u7684\u6587\u4EF6"},yaml:{label:"YAML",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 YAML"},rbe:{label:"RBE",description:"\u4EC5\u5728\u503C\u53D8\u5316\u65F6\u4FDD\u7559\u6570\u7EC4\u5143\u7D20"},combine:{label:"\u5408\u5E76\u7EC4\u5408",description:"\u5C06\u591A\u4E2A\u4E0A\u4E0B\u6587\u503C\u7EC4\u5408\u4E3A\u4E00\u4E2A\u7ED3\u679C"},exec:{label:"\u6267\u884C\u547D\u4EE4",description:"\u8FD0\u884C\u5BBF\u4E3B\u547D\u4EE4\u5E76\u6355\u83B7\u6807\u51C6\u8F93\u51FA/\u9519\u8BEF"},"http-in":{label:"HTTP \u5165\u53E3",description:"\u4ECE HTTP webhook \u8BF7\u6C42\u542F\u52A8\u6D41\u7A0B"},"http-response":{label:"HTTP \u54CD\u5E94",description:"\u4E3A webhook \u8BF7\u6C42\u53D1\u9001 HTTP \u54CD\u5E94"}},field:{start:{},end:{},inject:{payload:"\u6570\u636E\u5B57\u6BB5",topic:"\u4E3B\u9898",payloadType:"\u6570\u636E\u7C7B\u578B",trigger:"\u89E6\u53D1\u65B9\u5F0F",onceDelay:"\u9996\u6B21\u5EF6\u8FDF",interval:"\u95F4\u9694",intervalUnit:"\u95F4\u9694\u5355\u4F4D",repeatCount:"\u91CD\u590D\u6B21\u6570",event:"\u4E8B\u4EF6\u540D\u79F0",timeout:"\u7B49\u5F85\u8D85\u65F6",payloadValue:"\u6570\u636E\u503C",cron:"Cron \u8868\u8FBE\u5F0F"},task:{action:"\u52A8\u4F5C\u540D\u79F0",result:"\u65E0\u52A8\u4F5C\u65F6\u7684\u7ED3\u679C",fail:"\u6807\u8BB0\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},function:{code:"JavaScript \u4EE3\u7801",timeout:"\u8D85\u65F6",initialize:"\u521D\u59CB\u5316\u4EE3\u7801",finalize:"\u6536\u5C3E\u4EE3\u7801"},condition:{field:"\u53D6\u503C\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u8DEF\u5F84",value:"\u6BD4\u8F83\u503C",rules:"\u89C4\u5219",operator:"\u8FD0\u7B97\u7B26"},parallel:{},join:{mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5",ignoreEmpty:"\u8DF3\u8FC7\u7A7A\u5206\u652F"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF",workflow:"\u5B50\u6D41\u7A0B\u6765\u6E90"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E\uFF08JSON\uFF09",emitSecond:"\u53D1\u9001\u7B2C\u4E8C\u6761\u6D88\u606F",secondDelay:"\u7B2C\u4E8C\u6B21\u5EF6\u8FDF",secondPayload:"\u7B2C\u4E8C\u6761\u6D88\u606F\u5185\u5BB9"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C",unit:"\u5355\u4F4D"},log:{message:"\u56FA\u5B9A\u6D88\u606F",field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u8BB0\u5F55\u5B8C\u6574\u4E0A\u4E0B\u6587",level:"\u7EA7\u522B"},"http-request":{url:"\u8BF7\u6C42\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934\uFF08JSON\uFF09",body:"\u8BF7\u6C42\u4F53",responseType:"\u54CD\u5E94\u5904\u7406",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",authType:"\u8BA4\u8BC1",username:"\u7528\u6237\u540D",password:"\u5BC6\u7801"},assign:{values:"\u503C\uFF08JSON\uFF09"},transform:{mapping:"\u6620\u5C04\uFF08JSON\uFF09",result:"\u56FA\u5B9A\u7ED3\u679C\uFF08JSON\uFF09"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934",columns:"\u5217"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5\u8DEF\u5F84",value:"\u503C",rules:"\u89C4\u5219"},statistics:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0",payload:"\u6570\u636E\uFF08JSON\uFF09"},"event-wait":{event:"\u4E8B\u4EF6\u540D\u79F0",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6",value:"\u53C2\u6570"},split:{field:"\u53D6\u503C\u8DEF\u5F84",delimiter:"\u5206\u9694\u7B26",mode:"\u6A21\u5F0F"},map:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",order:"\u987A\u5E8F",numeric:"\u6570\u503C\u6BD4\u8F83"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u8DEF\u5F84",size:"\u6279\u5927\u5C0F",overlap:"\u91CD\u53E0\u6570\u91CF"},trycatch:{timeout:"\u8D85\u65F6"},subprocess:{workflow:"\u5B50\u6D41\u7A0B\u6765\u6E90"},comment:{text:"\u6587\u672C"},custom:{result:"\u7ED3\u679C"},"mqtt-publish":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",payload:"\u6D88\u606F\u5185\u5BB9",retain:"\u4FDD\u7559\u6D88\u606F"},"mqtt-wait":{url:"Broker \u5730\u5740",topic:"\u4E3B\u9898",qos:"QoS",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"redis-command":{url:"Redis \u5730\u5740",command:"\u547D\u4EE4",args:"\u53C2\u6570"},"redis-publish":{url:"Redis \u5730\u5740",channel:"\u9891\u9053",message:"\u6D88\u606F"},"nats-publish":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"nats-request":{servers:"NATS \u670D\u52A1\u5730\u5740",subject:"\u4E3B\u9898",payload:"\u6D88\u606F\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"coap-request":{host:"\u4E3B\u673A",port:"\u7AEF\u53E3",method:"\u65B9\u6CD5",path:"\u8DEF\u5F84",payload:"\u8BF7\u6C42\u5185\u5BB9",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09"},"gateway-route":{path:"\u5165\u53E3\u8DEF\u5F84",service:"\u670D\u52A1\u540D",targetUrl:"\u4E0A\u6E38\u5730\u5740",targetPath:"\u4E0A\u6E38\u8DEF\u5F84",stripPrefix:"\u53BB\u6389\u5165\u53E3\u524D\u7F00",timeout:"\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",priority:"\u4F18\u5148\u7EA7",headers:"\u8BF7\u6C42\u5934",responseHeaders:"\u54CD\u5E94\u5934",rateLimit:"\u9650\u6D41",cache:"\u7F13\u5B58",circuitBreaker:"\u7194\u65AD",bulkhead:"\u9694\u79BB\u8231"},"gateway-condition":{field:"\u5B57\u6BB5",name:"\u8BF7\u6C42\u5934/\u53C2\u6570\u540D",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},"gateway-deny":{status:"\u72B6\u6001\u7801",message:"\u6D88\u606F",priority:"\u4F18\u5148\u7EA7",body:"\u54CD\u5E94\u4F53"},debug:{field:"\u53D6\u503C\u8DEF\u5F84",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B",console:"\u540C\u65F6\u8F93\u51FA\u5230\u63A7\u5236\u53F0",active:"\u542F\u7528"},link:{mode:"\u6A21\u5F0F",links:"\u94FE\u63A5\u540D"},html:{field:"HTML \u8DEF\u5F84",mode:"\u8F93\u51FA",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",tag:"\u6807\u7B7E",attribute:"\u5C5E\u6027\u540D"},xml:{mode:"\u6A21\u5F0F",field:"XML \u8DEF\u5F84",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA",attributes:"\u5305\u542B\u5C5E\u6027",text:"\u5305\u542B\u6587\u672C"},scale:{field:"\u53D6\u503C\u8DEF\u5F84",inMin:"\u8F93\u5165\u6700\u5C0F\u503C",inMax:"\u8F93\u5165\u6700\u5927\u503C",outMin:"\u8F93\u51FA\u6700\u5C0F\u503C",outMax:"\u8F93\u51FA\u6700\u5927\u503C",clamp:"\u9650\u5236\u5728\u533A\u95F4\u5185",round:"\u53D6\u6574",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5"},router:{field:"\u53D6\u503C\u8DEF\u5F84",rules:"\u89C4\u5219",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},complete:{scope:"\u8303\u56F4"},catch:{scope:"\u8303\u56F4"},status:{scope:"\u8303\u56F4"},"websocket-request":{url:"\u5730\u5740",headers:"\u8BF7\u6C42\u5934",message:"\u6D88\u606F\u5B57\u6BB5",payload:"\u6570\u636E",waitForReply:"\u7B49\u5F85\u56DE\u590D",timeout:"\u8D85\u65F6"},"tcp-request":{host:"\u4E3B\u673A",port:"\u7AEF\u53E3",payload:"\u6570\u636E",waitForReply:"\u7B49\u5F85\u56DE\u590D",timeout:"\u8D85\u65F6"},"udp-request":{host:"\u4E3B\u673A",port:"\u7AEF\u53E3",payload:"\u6570\u636E",waitForReply:"\u7B49\u5F85\u56DE\u590D",timeout:"\u8D85\u65F6"},"file-read":{path:"\u6587\u4EF6\u8DEF\u5F84",encoding:"\u7F16\u7801",output:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5"},"file-write":{path:"\u6587\u4EF6\u8DEF\u5F84",encoding:"\u7F16\u7801",content:"\u5185\u5BB9",append:"\u8FFD\u52A0",createDirs:"\u521B\u5EFA\u7236\u76EE\u5F55"},yaml:{mode:"\u6A21\u5F0F",field:"\u53D6\u503C\u8DEF\u5F84",target:"\u7ED3\u679C\u5199\u5165\u5B57\u6BB5"},rbe:{field:"\u6570\u7EC4\u8DEF\u5F84",path:"\u5143\u7D20\u8DEF\u5F84",mode:"\u4E0A\u62A5\u65B9\u5F0F"},combine:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",separator:"\u5206\u9694\u7B26",resultField:"\u7ED3\u679C\u5B57\u6BB5"},exec:{command:"\u547D\u4EE4",args:"\u53C2\u6570",cwd:"\u5DE5\u4F5C\u76EE\u5F55",env:"\u73AF\u5883\u53D8\u91CF",timeout:"\u8D85\u65F6",output:"\u6807\u51C6\u8F93\u51FA\u5199\u5165\u5B57\u6BB5"},"http-in":{method:"\u65B9\u6CD5",path:"\u8DEF\u5F84"},"http-response":{statusCode:"\u72B6\u6001\u7801",headers:"\u54CD\u5E94\u5934",body:"\u54CD\u5E94\u4F53\u8DEF\u5F84"}},fieldPlaceholder:{start:{},end:{},inject:{payload:'{ "value": 1 }',topic:"orders.created",onceDelay:"0",interval:"1",repeatCount:"1",event:"order.created",timeout:"30",cron:"0 9 * * 1-5"},task:{action:"actions.fetch",result:'{ "ok": true }'},function:{code:"return { ok: true };"},condition:{field:"approved",value:"true"},switch:{field:"result.status",value:"done"},parallel:{},join:{resultField:"joined"},loop:{workflow:"workflows.child"},trigger:{payload:'{ "ok": true }',secondPayload:'{ "done": true }'},delay:{},log:{message:"Flow step completed",field:"result.value"},"http-request":{url:"https://api.example.com/items",headers:'{ "Accept": "application/json" }',body:'{ "name": "demo" }'},assign:{values:'{ "count": 1 }'},transform:{mapping:'{ "name": "input.name" }'},template:{template:"Hello {{name}}",target:"message"},json:{field:"value"},csv:{field:"value",delimiter:",",columns:"name, age"},change:{field:"variables.name",value:'"workflow"'},statistics:{field:"items",path:"value",resultField:"value"},merge:{fields:"a, b",resultField:"value"},"event-emit":{event:"order.created",payload:'{ "id": 1 }'},"event-wait":{event:"order.created"},command:{command:"context.exec",args:'["--flag"]'},split:{field:"items",delimiter:","},map:{field:"items",path:"value"},filter:{field:"items",path:"value"},sort:{field:"items",path:"value"},range:{},batch:{field:"items",overlap:"0"},trycatch:{},subprocess:{},comment:{text:"Canvas note"},custom:{result:'{ "ok": true }'},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{},"gateway-condition":{},"gateway-deny":{},debug:{field:"payload"},html:{field:"body",target:"value",tag:"h1",attribute:"href"},xml:{field:"value",target:"value"},link:{links:"flow-a, flow-b"},scale:{field:"value",target:"value"},router:{field:"result.status"},complete:{scope:"\u8282\u70B9 ID \u6216\u7C7B\u578B"},catch:{scope:"\u8282\u70B9 ID \u6216\u7C7B\u578B"},status:{scope:"\u8282\u70B9 ID \u6216\u7C7B\u578B"},"websocket-request":{},"tcp-request":{host:"127.0.0.1",port:"9000"},"udp-request":{host:"127.0.0.1",port:"9000"},"file-read":{output:"content"},"file-write":{},exec:{command:"/usr/bin/node",cwd:"./",env:"KEY"},combine:{fields:"first, second"},yaml:{field:"value",target:"value"},rbe:{field:"items",path:"value"},"http-in":{path:"/orders"},"http-response":{headers:'{ "x-flow": "done" }',body:"payload"}},fieldDescription:{start:{},end:{},inject:{topic:"\u968F\u6570\u636E\u4E00\u8D77\u4F20\u9012\u7684\u53EF\u9009\u4E3B\u9898\u3002",payload:"\u4EE5\u952E\u503C\u884C\u7F16\u8F91\u8981\u6CE8\u5165\u7684\u5BF9\u8C61\u3002",payloadType:"\u9009\u62E9\u6570\u636E\u7684\u7C7B\u578B\uFF1BJSON \u5408\u5E76\u5230\u4E0A\u4E0B\u6587\uFF0C\u5176\u4ED6\u7C7B\u578B\u6309\u539F\u503C\u53D1\u9001\u3002",trigger:"\u9009\u62E9\u624B\u52A8\u3001\u5468\u671F\u6216\u4E8B\u4EF6\u89E6\u53D1\u3002",onceDelay:"\u7B2C\u4E00\u6B21\u6CE8\u5165\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",interval:"\u4E24\u6B21\u6CE8\u5165\u4E4B\u95F4\u7684\u65F6\u95F4\u3002",intervalUnit:"\u95F4\u9694\u65F6\u95F4\u5355\u4F4D\u3002",repeatCount:"\u8FD0\u884C\u6B21\u6570\uFF1B0 \u8868\u793A\u6301\u7EED\u8FD0\u884C\u76F4\u5230\u505C\u6B62\u3002",event:"\u89E6\u53D1\u6CE8\u5165\u7684\u4E8B\u4EF6\u540D\u79F0\u3002",timeout:"\u7B49\u5F85\u4E8B\u4EF6\u7684\u6700\u957F\u65F6\u95F4\u3002",payloadValue:"\u8981\u6CE8\u5165\u7684\u5B57\u7B26\u4E32\u3001\u6570\u5B57\u6216\u5E03\u5C14\u503C\u3002",cron:"\u4E94\u4E2A\u5B57\u6BB5\uFF1A\u5206 \u65F6 \u65E5 \u6708 \u5468\u3002"},task:{action:"context.actions \u4E2D\u7684\u51FD\u6570\u540D\uFF0C\u7559\u7A7A\u5219\u8FD4\u56DE\u201C\u7ED3\u679C\u201D\u4E2D\u7684\u503C\u3002",result:"\u672A\u8BBE\u7F6E\u52A8\u4F5C\u65F6\u76F4\u63A5\u8FD4\u56DE\u7684 JSON\u3002",retry:"\u5931\u8D25\u524D\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",fail:"\u5F3A\u5236\u6B64\u6B65\u9AA4\u5931\u8D25\uFF0C\u4FBF\u4E8E\u6D4B\u8BD5\u5F02\u5E38\u5206\u652F\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002"},function:{code:"\u8FD4\u56DE\u4E0B\u4E00\u6B65\u6D88\u606F\u3002context \u4E0E input \u90FD\u662F\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",timeout:"\u6B64\u6B65\u9AA4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\uFF0C0 \u8868\u793A\u4E0D\u9650\u5236\u3002",initialize:"\u53EF\u9009\uFF1A\u5728\u4E3B\u51FD\u6570\u524D\u6267\u884C\uFF0C\u8FD4\u56DE\u7684\u5BF9\u8C61\u4F1A\u5408\u5E76\u5230\u4E0A\u4E0B\u6587\u3002",finalize:"\u53EF\u9009\uFF1A\u5728\u4E3B\u51FD\u6570\u540E\u6267\u884C\uFF0C\u7528\u4E8E\u6E05\u7406\u6216\u6307\u6807\u3002"},condition:{field:"\u8981\u5224\u65AD\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\uFF0C\u4F8B\u5982 approved \u6216 user.role\u3002",operator:"\u9009\u62E9\u5224\u65AD\u65B9\u5F0F\uFF0C\u51B3\u5B9A\u8FDB\u5165 true \u8FD8\u662F false \u5206\u652F\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002"},switch:{field:"\u4E0E\u6BCF\u6761\u89C4\u5219\u6BD4\u8F83\u7684\u4E0A\u4E0B\u6587\u503C\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002",rules:"\u4ECE\u4E0A\u5230\u4E0B\u4F9D\u6B21\u5339\u914D\uFF0C\u7B2C\u4E00\u6761\u547D\u4E2D\u7684\u89C4\u5219\u9009\u62E9\u5BF9\u5E94\u7F16\u53F7\u8F93\u51FA\u3002",operator:"\u8BE5\u89C4\u5219\u4F7F\u7528\u7684\u6BD4\u8F83\u65B9\u5F0F\u3002"},parallel:{},join:{mode:"\u628A\u5206\u652F\u7ED3\u679C\u6536\u96C6\u4E3A\u6570\u7EC4\uFF0C\u6216\u5408\u5E76\u5404\u5206\u652F\u7684\u6570\u636E\u5BF9\u8C61\u3002",resultField:"\u63A5\u6536\u5408\u5E76\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",ignoreEmpty:"\u4E0D\u628A\u6CA1\u6709\u7ED3\u679C\u6570\u636E\u7684\u5206\u652F\u8BA1\u5165\u5408\u5E76\u7ED3\u679C\u3002"},loop:{iterations:"\u5B50\u5DE5\u4F5C\u6D41\u6267\u884C\u6B21\u6570\u3002",delay:"\u4E24\u6B21\u5B50\u6D41\u7A0B\u6267\u884C\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",workflow:"\u4FDD\u5B58\u8981\u91CD\u590D\u6267\u884C\u7684\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"},trigger:{delay:"\u53D1\u9001\u6570\u636E\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",payload:"\u89E6\u53D1\u65F6\u8F93\u51FA\u7684 JSON \u6570\u636E\u3002",emitSecond:"\u7B2C\u4E00\u6761\u6D88\u606F\u5230\u8FBE\u5206\u652F\u540E\u518D\u53D1\u9001\u4E00\u6761\u6D88\u606F\u3002",secondDelay:"\u7B2C\u4E00\u6761\u6D88\u606F\u53D1\u9001\u540E\u7B49\u5F85\u591A\u4E45\u518D\u53D1\u9001\u7B2C\u4E8C\u6761\u3002",secondPayload:"\u5408\u5E76\u5230\u7B2C\u4E8C\u6761\u6D88\u606F\u4E2D\u7684\u6570\u636E\u3002"},delay:{delay:"\u8FDB\u5165\u4E0B\u4E00\u4E2A\u8282\u70B9\u524D\u7684\u7B49\u5F85\u65F6\u95F4\u3002",mode:"\u56FA\u5B9A\u5EF6\u8FDF\u6216\u533A\u95F4\u5185\u968F\u673A\u5EF6\u8FDF\u3002",randomMin:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5C0F\u65F6\u95F4\u3002",randomMax:"\u968F\u673A\u5EF6\u8FDF\u7684\u6700\u5927\u65F6\u95F4\u3002",unit:"\u5EF6\u8FDF\u65F6\u95F4\u7684\u5355\u4F4D\u3002"},log:{message:"\u672A\u8BBE\u7F6E\u53D6\u503C\u8DEF\u5F84\u65F6\u5199\u5165\u7684\u6587\u672C\u3002",field:"\u8981\u8BB0\u5F55\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8BB0\u5F55\u6574\u4E2A\u6D41\u7A0B\u4E0A\u4E0B\u6587\u800C\u4E0D\u662F\u5355\u4E2A\u503C\u3002",level:"\u65E5\u5FD7\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002"},"http-request":{url:"\u7EDD\u5BF9\u5730\u5740\uFF0C\u6216\u4EE5 / \u5F00\u5934\u7684\u5BBF\u4E3B\u8DEF\u5F84\u3002",method:"HTTP \u8BF7\u6C42\u65B9\u6CD5\u3002",headers:"JSON \u5BF9\u8C61\u5F62\u5F0F\u7684\u8BF7\u6C42\u5934\u3002",body:"POST/PUT/PATCH \u7684\u8BF7\u6C42\u4F53\u3002",responseType:"\u81EA\u52A8\uFF1A\u80FD\u89E3\u6790\u5219\u8FD4\u56DE JSON\uFF1B\u6587\u672C\uFF1A\u4FDD\u7559\u539F\u6587\uFF1BJSON\uFF1A\u89E3\u6790\u5931\u8D25\u65F6\u62A5\u9519\u3002",retry:"\u8BF7\u6C42\u5931\u8D25\u540E\u7684\u81EA\u52A8\u91CD\u8BD5\u6B21\u6570\u3002",retryDelay:"\u4E24\u6B21\u91CD\u8BD5\u4E4B\u95F4\u7684\u7B49\u5F85\u65F6\u95F4\u3002",timeout:"\u8BF7\u6C42\u7684\u6700\u957F\u7B49\u5F85\u65F6\u95F4\u3002",authType:"\u9009\u62E9\u662F\u5426\u53D1\u9001 Basic \u8BA4\u8BC1\u5934\u3002",username:"Basic \u8BA4\u8BC1\u7528\u6237\u540D\u3002",password:"Basic \u8BA4\u8BC1\u5BC6\u7801\u3002"},assign:{values:"\u5408\u5E76\u5230\u6D41\u7A0B\u53D8\u91CF\u7684 JSON \u5BF9\u8C61\u3002"},transform:{mapping:"\u76EE\u6807\u5B57\u6BB5\u5230\u4E0A\u4E0B\u6587\u8DEF\u5F84\u7684\u6620\u5C04\u3002",result:"\u76F4\u63A5\u8FD4\u56DE\u7684 JSON \u7ED3\u679C\u3002"},template:{template:"\u4F7F\u7528 {{name}} \u6216 {{user.email}} \u8BFB\u53D6\u4E0A\u4E0B\u6587\u503C\u3002",target:"\u63A5\u6536\u6E32\u67D3\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",syntax:"Mustache \u66FF\u6362 {{...}} \u5360\u4F4D\u7B26\uFF1B\u7EAF\u6587\u672C\u539F\u6837\u8F93\u51FA\u3002",output:"\u6587\u672C\u4FDD\u7559\u5B57\u7B26\u4E32\uFF1BJSON \u4F1A\u89E3\u6790\u6E32\u67D3\u7ED3\u679C\u3002"},json:{field:"\u8981\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u89E3\u6790 JSON \u6587\u672C\uFF0C\u6216\u628A\u503C\u5E8F\u5217\u5316\u4E3A JSON\u3002",pretty:"\u4F7F\u7528\u7F29\u8FDB\u8F93\u51FA JSON\u3002"},csv:{field:"CSV \u6587\u672C\u6216\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",delimiter:"\u5217\u4E4B\u95F4\u7684\u5355\u5B57\u7B26\u5206\u9694\u7B26\u3002",mode:"\u89E3\u6790 CSV \u6587\u672C\uFF0C\u6216\u628A\u6570\u7EC4\u5E8F\u5217\u5316\u4E3A CSV\u3002",header:"\u89E3\u6790\u65F6\u628A\u9996\u884C\u4F5C\u4E3A\u5B57\u6BB5\u540D\u3002",columns:"\u53EF\u9009\uFF1A\u89E3\u6790\u6216\u5E8F\u5217\u5316\u65F6\u4FDD\u7559\u7684\u5217\uFF0C\u9017\u53F7\u5206\u9694\u3002"},change:{field:"\u8981\u4FEE\u6539\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",value:"\u65B0\u503C\uFF0C\u652F\u6301 JSON\u3002",rules:"\u6309\u987A\u5E8F\u6267\u884C\uFF0C\u6BCF\u884C\u4FEE\u6539\u4E00\u4E2A\u5B57\u6BB5\u3002",action:"Set \u66FF\u6362\uFF0CDelete \u5220\u9664\uFF0CAppend \u8FFD\u52A0\u5230\u5217\u8868\u6216\u5B57\u7B26\u4E32\u3002"},statistics:{field:"\u8981\u805A\u5408\u7684\u6570\u7EC4\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",path:"\u6570\u7EC4\u5143\u7D20\u4E2D\u7528\u4E8E\u8BA1\u7B97\u7684\u5C5E\u6027\u3002",operation:"\u8BA1\u6570\u3001\u6C42\u548C\u3001\u5E73\u5747\u3001\u6700\u5C0F\u6216\u6700\u5927\u3002",resultField:"\u63A5\u6536\u7EDF\u8BA1\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},merge:{fields:"\u8981\u5408\u5E76\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\uFF0C\u9017\u53F7\u5206\u9694\u3002",mode:"\u5BF9\u8C61\u5408\u5E76\u6216\u6570\u7EC4\u62FC\u63A5\u3002",resultField:"\u63A5\u6536\u5408\u5E76\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},"event-emit":{event:"\u4E8B\u4EF6\u540D\u79F0\uFF0C\u53D1\u9001\u4E0E\u7B49\u5F85\u7AEF\u9700\u4E00\u81F4\u3002",payload:"\u968F\u4E8B\u4EF6\u53D1\u9001\u7684 JSON \u6570\u636E\u3002"},"event-wait":{event:"\u7B49\u5F85\u7684\u4E8B\u4EF6\u540D\u79F0\u3002",timeout:"\u7B49\u5F85\u4E8B\u4EF6\u7684\u6700\u957F\u65F6\u95F4\u3002"},command:{args:"\u6309\u987A\u5E8F\u4F20\u7ED9\u547D\u4EE4\u7684\u53C2\u6570\u3002",command:"\u5BBF\u4E3B\u6CE8\u518C\u7684\u547D\u4EE4\u6216\u51FD\u6570\u540D\u3002",timeout:"\u547D\u4EE4\u7684\u6700\u957F\u6267\u884C\u65F6\u95F4\u3002"},split:{field:"\u8981\u62C6\u5206\u7684\u6587\u672C\u6216\u6570\u7EC4\u8DEF\u5F84\u3002",delimiter:"\u62C6\u5206\u6587\u672C\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002",mode:"\u81EA\u52A8\u8BC6\u522B\u6570\u7EC4\u6216\u6587\u672C\uFF0C\u4E5F\u53EF\u5F3A\u5236\u6307\u5B9A\u3002"},map:{path:"\u6BCF\u4E2A\u5143\u7D20\u4E2D\u8981\u6620\u5C04\u7684\u5C5E\u6027\u3002",field:"\u8981\u904D\u5386\u7684\u6570\u7EC4\u8DEF\u5F84\u3002"},filter:{field:"\u8981\u8FC7\u6EE4\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",path:"\u7528\u4E8E\u6BD4\u8F83\u7684\u5143\u7D20\u5C5E\u6027\u3002",operator:"\u6BD4\u8F83\u65B9\u5F0F\u3002",value:"\u6BD4\u8F83\u4F7F\u7528\u7684\u503C\u3002"},sort:{path:"\u7528\u4E8E\u6392\u5E8F\u7684\u5143\u7D20\u5C5E\u6027\u3002",field:"\u8981\u6392\u5E8F\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",order:"\u5347\u5E8F\u6216\u964D\u5E8F\u3002",numeric:"\u6309\u6570\u503C\u800C\u4E0D\u662F\u6587\u672C\u6BD4\u8F83\u3002"},range:{from:"\u533A\u95F4\u8D77\u59CB\u503C\uFF08\u5305\u542B\uFF09\u3002",to:"\u533A\u95F4\u7ED3\u675F\u503C\uFF08\u4E0D\u5305\u542B\uFF09\u3002",step:"\u6BCF\u6B21\u589E\u52A0\u7684\u6570\u91CF\u3002"},batch:{size:"\u6BCF\u6279\u5305\u542B\u7684\u5143\u7D20\u6570\u91CF\u3002",field:"\u8981\u5206\u6279\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",overlap:"\u4E0B\u4E00\u6279\u5F00\u5934\u91CD\u590D\u4E0A\u4E00\u6279\u672B\u5C3E\u7684\u5143\u7D20\u6570\u91CF\uFF0C0 \u8868\u793A\u4E0D\u91CD\u53E0\u3002"},trycatch:{timeout:"\u8D85\u8FC7\u8BE5\u65F6\u95F4\u540E\u8FDB\u5165\u8D85\u65F6\u7AEF\u53E3\u3002"},subprocess:{workflow:"\u4FDD\u5B58\u5DE5\u4F5C\u6D41\u5B9A\u4E49\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"},comment:{},custom:{result:"\u81EA\u5B9A\u4E49\u8282\u70B9\u8FD4\u56DE\u7684\u503C\u3002"},"mqtt-publish":{},"mqtt-wait":{},"redis-command":{args:"\u547D\u4EE4\u53C2\u6570\u7684 JSON \u6570\u7EC4\u3002"},"redis-publish":{},"nats-publish":{},"nats-request":{},"coap-request":{},"gateway-route":{path:"\u9ED8\u8BA4\u53D6\u8DEF\u5F84\u6761\u4EF6\u503C\u3002",priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},"gateway-condition":{},"gateway-deny":{priority:"\u6570\u503C\u8D8A\u5C0F\u8D8A\u5148\u6267\u884C\u3002"},debug:{field:"\u8981\u67E5\u770B\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",complete:"\u8F93\u51FA\u5B8C\u6574\u6D41\u7A0B\u4E0A\u4E0B\u6587\u3002",console:"\u540C\u65F6\u5199\u5165\u5BBF\u4E3B\u63A7\u5236\u53F0\uFF0C\u4FBF\u4E8E\u5F00\u53D1\u8C03\u8BD5\u3002",level:"\u8F93\u51FA\u7EA7\u522B\uFF1Ainfo\u3001warn \u6216 error\u3002",active:"\u5173\u95ED\u540E\u4FDD\u7559\u8282\u70B9\u4F46\u4E0D\u518D\u8F93\u51FA\u3002"},link:{mode:"\u4ECE\u8BE5\u8282\u70B9\u53D1\u9001\uFF08link out\uFF09\uFF0C\u6216\u63A5\u6536\u5339\u914D\u540D\u79F0\u7684\u6D88\u606F\uFF08link in\uFF09\u3002",links:"link out \u4E0E link in \u5171\u4EAB\u7684\u94FE\u63A5\u540D\uFF0C\u9017\u53F7\u5206\u9694\u3002"},html:{field:"\u5305\u542B HTML \u6587\u672C\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",mode:"\u6587\u672C\uFF1A\u53BB\u9664\u6807\u7B7E\uFF1B\u94FE\u63A5\uFF1A\u6536\u96C6 href/src\u3002",target:"\u63A5\u6536\u63D0\u53D6\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",tag:"\u53EA\u63D0\u53D6\u8BE5 HTML \u6807\u7B7E\u5185\u7684\u5185\u5BB9\uFF0C\u7559\u7A7A\u5219\u5904\u7406\u6574\u4E2A\u6587\u6863\u3002",attribute:"\u8F93\u51FA\u4E3A\u5C5E\u6027\u65F6\u6536\u96C6\u7684\u5C5E\u6027\u540D\uFF0C\u4F8B\u5982 href \u6216 src\u3002"},xml:{mode:"\u89E3\u6790 XML \u6587\u672C\uFF0C\u6216\u628A\u5BF9\u8C61\u5E8F\u5217\u5316\u4E3A XML\u3002",field:"\u5305\u542B XML \u6216\u5BF9\u8C61\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",target:"\u63A5\u6536\u89E3\u6790\u6216\u5E8F\u5217\u5316\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002",pretty:"\u5E8F\u5217\u5316\u65F6\u4F7F\u7528\u7F29\u8FDB\u3002",attributes:"\u89E3\u6790\u7ED3\u679C\u4E2D\u5305\u542B XML \u5C5E\u6027\uFF08@attrs\uFF09\u3002",text:"\u89E3\u6790\u7ED3\u679C\u4E2D\u5305\u542B\u5143\u7D20\u6587\u672C\uFF08#text\uFF09\u3002"},scale:{field:"\u8981\u6620\u5C04\u7684\u6570\u503C\u8DEF\u5F84\u3002",inMin:"\u8F93\u5165\u533A\u95F4\u7684\u6700\u5C0F\u503C\u3002",inMax:"\u8F93\u5165\u533A\u95F4\u7684\u6700\u5927\u503C\u3002",outMin:"\u8F93\u51FA\u533A\u95F4\u7684\u6700\u5C0F\u503C\u3002",outMax:"\u8F93\u51FA\u533A\u95F4\u7684\u6700\u5927\u503C\u3002",clamp:"\u628A\u7ED3\u679C\u9650\u5236\u5728\u8F93\u51FA\u533A\u95F4\u5185\u3002",round:"\u628A\u7ED3\u679C\u56DB\u820D\u4E94\u5165\u4E3A\u6574\u6570\u3002",target:"\u63A5\u6536\u6620\u5C04\u7ED3\u679C\u7684\u5B57\u6BB5\u3002"},router:{field:"\u4E0E\u6BCF\u6761\u89C4\u5219\u6BD4\u8F83\u7684\u4E0A\u4E0B\u6587\u503C\u3002",rules:"\u4ECE\u4E0A\u5230\u4E0B\u4F9D\u6B21\u5339\u914D\uFF0C\u7B2C\u4E00\u6761\u547D\u4E2D\u7684\u89C4\u5219\u9009\u62E9\u5BF9\u5E94\u7F16\u53F7\u8F93\u51FA\u3002",operator:"\u8BE5\u89C4\u5219\u4F7F\u7528\u7684\u6BD4\u8F83\u65B9\u5F0F\u3002",value:"\u5F53\u524D\u8FD0\u7B97\u7B26\u4F7F\u7528\u7684\u6BD4\u8F83\u503C\u3002"},complete:{scope:"\u4EC5\u5728\u8BE5\u8282\u70B9 ID \u6216\u7C7B\u578B\u5339\u914D\u65F6\u8FD0\u884C\uFF1B\u7559\u7A7A\u8868\u793A\u4EFB\u610F\u8282\u70B9\u3002"},catch:{scope:"\u4EC5\u5728\u8BE5\u8282\u70B9 ID \u6216\u7C7B\u578B\u5339\u914D\u65F6\u8FD0\u884C\uFF1B\u7559\u7A7A\u8868\u793A\u4EFB\u610F\u8282\u70B9\u3002"},status:{scope:"\u4EC5\u5728\u8BE5\u8282\u70B9 ID \u6216\u7C7B\u578B\u5339\u914D\u65F6\u8FD0\u884C\uFF1B\u7559\u7A7A\u8868\u793A\u4EFB\u610F\u8282\u70B9\u3002"},"websocket-request":{url:"WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://example.com/socket\u3002",headers:"\u8FDE\u63A5\u8BF7\u6C42\u5934\uFF0C\u952E\u503C\u884C\u7F16\u8F91\u3002",message:"\u53D1\u9001\u7684 JSON \u6D88\u606F\u3002",payload:"\u53D1\u9001\u7684\u6587\u672C\u6570\u636E\u3002",waitForReply:"\u662F\u5426\u7B49\u5F85\u670D\u52A1\u5668\u8FD4\u56DE\u6570\u636E\u3002",timeout:"\u7B49\u5F85\u56DE\u590D\u7684\u6700\u957F\u65F6\u95F4\u3002"},"tcp-request":{host:"\u670D\u52A1\u5668\u5730\u5740\u3002",port:"\u670D\u52A1\u5668\u7AEF\u53E3\u3002",payload:"\u53D1\u9001\u7684\u6587\u672C\u6570\u636E\u3002",waitForReply:"\u662F\u5426\u7B49\u5F85\u670D\u52A1\u5668\u8FD4\u56DE\u6570\u636E\u3002",timeout:"\u7B49\u5F85\u56DE\u590D\u7684\u6700\u957F\u65F6\u95F4\u3002"},"udp-request":{host:"\u670D\u52A1\u5668\u5730\u5740\u3002",port:"\u670D\u52A1\u5668\u7AEF\u53E3\u3002",payload:"\u53D1\u9001\u7684\u6587\u672C\u6570\u636E\u3002",waitForReply:"\u662F\u5426\u7B49\u5F85\u670D\u52A1\u5668\u8FD4\u56DE\u6570\u636E\u3002",timeout:"\u7B49\u5F85\u56DE\u590D\u7684\u6700\u957F\u65F6\u95F4\u3002"},"file-read":{path:"\u76F8\u5BF9\u4E8E\u5BBF\u4E3B\u5DE5\u4F5C\u76EE\u5F55\u7684\u6587\u4EF6\u8DEF\u5F84\u3002",encoding:"\u6587\u4EF6\u8BFB\u5199\u7F16\u7801\u3002",output:"\u63A5\u6536\u6587\u4EF6\u5185\u5BB9\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002"},"file-write":{path:"\u76F8\u5BF9\u4E8E\u5BBF\u4E3B\u5DE5\u4F5C\u76EE\u5F55\u7684\u6587\u4EF6\u8DEF\u5F84\u3002",encoding:"\u6587\u4EF6\u8BFB\u5199\u7F16\u7801\u3002",content:"\u5199\u5165\u6587\u4EF6\u7684\u6587\u672C\u3002",append:"\u8FFD\u52A0\u5230\u73B0\u6709\u6587\u4EF6\u800C\u4E0D\u662F\u8986\u76D6\u3002",createDirs:"\u5199\u5165\u524D\u81EA\u52A8\u521B\u5EFA\u7236\u76EE\u5F55\u3002"},yaml:{mode:"\u89E3\u6790 YAML \u6587\u672C\uFF0C\u6216\u628A\u503C\u5E8F\u5217\u5316\u4E3A YAML\u3002",field:"\u5305\u542B YAML \u6587\u672C\u6216\u5BF9\u8C61\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002",target:"\u63A5\u6536\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002"},rbe:{field:"\u8981\u8FC7\u6EE4\u7684\u6570\u7EC4\u8DEF\u5F84\u3002",path:"\u76F8\u90BB\u5143\u7D20\u4E4B\u95F4\u6BD4\u8F83\u7684\u5C5E\u6027\u3002",mode:"\u4FDD\u7559\u7B2C\u4E00\u4E2A\u5143\u7D20\u4EE5\u53CA\u6BD4\u8F83\u503C\u53D1\u751F\u53D8\u5316\u7684\u5143\u7D20\u3002"},combine:{fields:"\u8981\u7EC4\u5408\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\uFF0C\u9017\u53F7\u5206\u9694\u3002",mode:"\u5BF9\u8C61\u5408\u5E76\u3001\u6570\u7EC4\u62FC\u63A5\u6216\u6587\u672C\u8FDE\u63A5\u3002",separator:"\u6587\u672C\u8FDE\u63A5\u65F6\u4F7F\u7528\u7684\u5206\u9694\u7B26\u3002",resultField:"\u63A5\u6536\u7EC4\u5408\u7ED3\u679C\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002"},exec:{command:"\u5728\u5DE5\u4F5C\u6D41\u5BBF\u4E3B\u4E0A\u8FD0\u884C\u7684\u53EF\u6267\u884C\u6587\u4EF6\u3002",args:"\u4F20\u7ED9\u53EF\u6267\u884C\u6587\u4EF6\u7684\u53C2\u6570\uFF0C\u6BCF\u884C\u4E00\u4E2A\u3002",cwd:"\u547D\u4EE4\u8FD0\u884C\u65F6\u7684\u5DE5\u4F5C\u76EE\u5F55\uFF0C\u9ED8\u8BA4\u4F7F\u7528\u5BBF\u4E3B\u5DE5\u4F5C\u76EE\u5F55\u3002",env:"\u5408\u5E76\u5230\u5BBF\u4E3B\u73AF\u5883\u4E2D\u7684\u989D\u5916\u73AF\u5883\u53D8\u91CF\u3002",timeout:"\u8D85\u8FC7\u8BE5\u6BEB\u79D2\u6570\u540E\u7EC8\u6B62\u547D\u4EE4\uFF1B0 \u8868\u793A\u4E00\u76F4\u7B49\u5F85\u3002",output:"\u63A5\u6536\u6807\u51C6\u8F93\u51FA\u7684\u4E0A\u4E0B\u6587\u5B57\u6BB5\u3002"},"http-in":{method:"\u89E6\u53D1\u8BE5\u5206\u652F\u7684 HTTP \u65B9\u6CD5\u3002",path:"\u8BE5\u8282\u70B9\u5904\u7406\u7684\u8BF7\u6C42\u8DEF\u5F84\uFF0C\u7559\u7A7A\u8868\u793A\u63A5\u53D7\u4EFB\u610F\u8DEF\u5F84\u3002"},"http-response":{statusCode:"\u8FD4\u56DE\u7ED9\u8C03\u7528\u65B9\u7684 HTTP \u72B6\u6001\u7801\u3002",headers:"JSON \u5BF9\u8C61\u5F62\u5F0F\u7684\u54CD\u5E94\u5934\u3002",body:"\u4F5C\u4E3A\u54CD\u5E94\u4F53\u8FD4\u56DE\u7684\u4E0A\u4E0B\u6587\u8DEF\u5F84\u3002"}},group:{reliability:"\u53EF\u9760\u6027",options:"\u9009\u9879",delay:"\u5EF6\u8FDF",request:"\u8BF7\u6C42",template:"\u6A21\u677F",output:"\u8F93\u51FA",payload:"\u6570\u636E",authentication:"\u8BA4\u8BC1","input-range":"\u8F93\u5165\u8303\u56F4","output-range":"\u8F93\u51FA\u8303\u56F4",trigger:"\u89E6\u53D1"},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E","not-equals":"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",auto:"\u81EA\u52A8",json:"JSON",text:"\u6587\u672C",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u5206\u652F\u7ED3\u679C\u6570\u7EC4",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",path:"\u8DEF\u5F84",method:"\u65B9\u6CD5",host:"\u4E3B\u673A",header:"\u8BF7\u6C42\u5934",query:"\u67E5\u8BE2\u53C2\u6570",prefix:"\u524D\u7F00","not-prefix":"\u975E\u524D\u7F00",exists:"\u5B58\u5728","not-exists":"\u4E0D\u5B58\u5728",links:"\u94FE\u63A5",string:"\u5B57\u7B26\u4E32",number:"\u6570\u5B57",boolean:"\u5E03\u5C14",none:"\u65E0",basic:"Basic",milliseconds:"\u6BEB\u79D2",seconds:"\u79D2",minutes:"\u5206\u949F",attribute:"\u5C5E\u6027",contains:"\u5305\u542B",regex:"\u5339\u914D\u6B63\u5219",gte:"\u5927\u4E8E\u7B49\u4E8E",lte:"\u5C0F\u4E8E\u7B49\u4E8E",manual:"\u624B\u52A8 / \u4E00\u6B21",interval:"\u5468\u671F",event:"\u4E8B\u4EF6",cron:"Cron \u5B9A\u65F6",utf8:"UTF-8",base64:"Base64",hex:"Hex",change:"\u4EFB\u610F\u53D8\u5316",merge:"\u5408\u5E76\u5BF9\u8C61",concat:"\u6570\u7EC4\u62FC\u63A5",ms:"\u6BEB\u79D2",s:"\u79D2",value:"\u6309\u503C\u53D8\u5316",info:"\u4FE1\u606F",warn:"\u544A\u8B66",error:"\u9519\u8BEF",GET:"GET",POST:"POST",PUT:"PUT",PATCH:"PATCH",DELETE:"DELETE",ANY:"\u4EFB\u610F\u65B9\u6CD5",out:"Link out",in:"Link in"}}};var ir={en:{locale:"en",messages:{workflow:{category:{trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",storage:"Storage",error:"Error handling",advanced:"Advanced"},status:{idle:"Idle",pending:"Pending",running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",success:"Done",skipped:"Skipped"},ui:{run:"Run",schedule:"Schedule",stopSchedule:"Stop schedule",resume:"Resume",stop:"Stop",undo:"Undo",redo:"Redo",delete:"Delete",fit:"Fit",layout:"Auto layout",duplicate:"Duplicate",clear:"Clear",nodes:"{count} nodes",nodeWord:"nodes",links:"{count} links",inspectorTitle:"Node inspector",inspectorEmpty:"Select a node on the canvas to edit its properties.",name:"Name",namePlaceholder:"Node name",description:"Description",descriptionPlaceholder:"Optional note for this node",enabled:"Enabled",restoreDefaults:"Reset",resetField:"Reset to default",noProperties:"This node has no editable properties.",requiredMessage:"Required",numberMessage:"Number out of range",patternMessage:"Invalid format",jsonMessage:"Invalid JSON",invalidEmail:"Invalid email address",invalidUrl:"Invalid URL",integerMessage:"Must be an integer",latestOutput:"Latest output",jsonTitle:"Workflow JSON (generated visually)",apply:"Apply",close:"Close",logs:"Logs",properties:"Properties",appearance:"Appearance",icon:"Icon",color:"Color",addItem:"Add",fields:"Fields",json:"JSON",removeItem:"Remove",logTitle:"Execution log",runHistory:"Runs",canvasEmpty:"Drag a component from the palette, or click one to add it",menu:"Menu",jsonMenu:"Import / Export JSON",themeMenu:"Theme",themeLight:"Light",themeDark:"Dark",themeSolarized:"Solarized",themeHighContrast:"High contrast",language:"Language",shortcuts:"Keyboard shortcuts",shortcutsTitle:"Keyboard shortcuts",zoomPan:"Zoom / pan",zoomIn:"Zoom in",zoomOut:"Zoom out",saveStateSaved:"Saved",saveStateDirty:"Unsaved changes",saveStateSaving:"Saving\u2026",saveStateError:"Save failed",searchNodes:"Search nodes\u2026",noMatches:"No matching nodes",save:"Save",saveAs:"Save as copy",rename:"Rename workflow",renameTitle:"Rename workflow",renamePlaceholder:"Workflow name",renameEmpty:"Enter a workflow name",renameConfirm:"Rename",cancel:"Cancel",library:"Workflows",libraryTitle:"Workflow library",libraryEmpty:"No saved workflows yet.",open:"Open",remove:"Delete",nodeCount:"{count} nodes",noSelection:"No node selected",canvas:"Workflow canvas"},message:{renamed:'Renamed to "{name}"',added:"Added {name}",nodeRemoved:"Node removed",nodeUpdated:"Node updated",connected:"Nodes connected",connectionRemoved:"Connection removed",connectionCancelled:"Connection cancelled",connectHint:"Drop on a node or port to connect",dropHint:'Drop "{name}" on the canvas',cleared:"Canvas cleared",loaded:"Workflow loaded",running:"Workflow running",layout:"Auto layout applied",duplicated:"Duplicated {name}",saved:'Saved "{name}"',savedAs:'Saved "{name}" as a new workflow',completed:"Workflow completed",failed:"Workflow failed",cancelled:"Workflow cancelled",undo:"Undo",redo:"Redo"},error:{unknownType:"Unknown node type: {type}",singleton:"Only one {label} node is allowed",endpoints:"Both connection endpoints must exist",selfLink:"A node cannot connect to itself",unknownOutput:"Unknown output port: {port}",unknownInput:"Unknown input port: {port}",cycle:"This connection would create a cycle",noService:"No VisualWorkflowService configured for this designer",running:"Workflow is already running",invalidDocument:"Invalid workflow document",notFound:"Workflow not found: {id}",noCheckpoint:"No checkpoint is available to resume"},node:{start:{label:"Start",description:"Entry point of the workflow"},end:{label:"End",description:"Finish the workflow"},inject:{label:"Inject",description:"Start with a fixed payload"},task:{label:"Task",description:"Run a named action or return a fixed result"},function:{label:"Function",description:"Run trusted JavaScript against the workflow context"},template:{label:"Template",description:"Render a message template"},json:{label:"JSON",description:"Parse or stringify JSON"},csv:{label:"CSV",description:"Parse or stringify CSV"},change:{label:"Change",description:"Set, delete or append a context field"},statistics:{label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)"},merge:{label:"Merge",description:"Merge objects or concatenate arrays"},"event-emit":{label:"Emit event",description:"Emit an event through the workflow event bus"},"event-wait":{label:"Wait event",description:"Wait for a workflow event"},command:{label:"Command",description:"Run a host-provided command executor"},split:{label:"Split",description:"Split a string or array into items"},map:{label:"Map",description:"Map each array item"},filter:{label:"Filter",description:"Keep array items that match a condition"},sort:{label:"Sort",description:"Sort an array by a field"},range:{label:"Range",description:"Generate a numeric range"},batch:{label:"Batch",description:"Split an array into chunks"},trigger:{label:"Trigger",description:"Emit a payload after an optional delay"},comment:{label:"Comment",description:"Canvas note; not executed"},condition:{label:"Condition",description:"Branch on a context field"},switch:{label:"Switch",description:"Route by a context value"},parallel:{label:"Parallel",description:"Run all outgoing branches concurrently"},join:{label:"Join",description:"Wait for all incoming branches before continuing"},loop:{label:"Loop",description:"Repeat the node body"},delay:{label:"Delay",description:"Wait before continuing"},log:{label:"Log",description:"Record a message"},"http-request":{label:"HTTP request",description:"Call an HTTP endpoint"},assign:{label:"Assign",description:"Merge values into workflow variables"},transform:{label:"Transform",description:"Map the previous result"},trycatch:{label:"Try / catch",description:"Route failures to an error branch"},subprocess:{label:"Sub workflow",description:"Execute another workflow"},custom:{label:"Custom",description:"Run a custom activity or handler"}},field:{task:{action:"Action",result:"Mock result",fail:"Fail this step",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout"},inject:{payload:"Payload",topic:"Topic"},trigger:{delay:"Delay",payload:"Payload"},function:{code:"Code",timeout:"Timeout"},template:{template:"Template",syntax:"Syntax",target:"Target field",output:"Output"},json:{mode:"Mode",field:"Field",pretty:"Pretty print"},csv:{mode:"Mode",field:"Field",delimiter:"Delimiter",header:"First row is header"},change:{action:"Action",field:"Field",value:"Value"},statistics:{field:"Array field",path:"Item path",operation:"Operation",resultField:"Result field"},merge:{fields:"Fields",mode:"Mode",resultField:"Result field"},"event-emit":{event:"Event",payload:"Payload"},"event-wait":{event:"Event",timeout:"Timeout"},command:{command:"Command",args:"Args",timeout:"Timeout"},split:{field:"Field",delimiter:"Delimiter"},map:{field:"Array field",path:"Item path"},filter:{field:"Array field",path:"Item path",operator:"Operator",value:"Compare with"},sort:{field:"Array field",path:"Sort path",order:"Order"},range:{from:"From",to:"To",step:"Step"},batch:{field:"Array field",size:"Batch size"},comment:{text:"Text"},condition:{field:"Field",operator:"Operator",value:"Compare with"},switch:{field:"Value field",value:"Value"},loop:{iterations:"Iterations",delay:"Delay"},delay:{mode:"Mode",delay:"Delay",randomMin:"Minimum",randomMax:"Maximum"},log:{message:"Message",field:"Message property",complete:"Complete message",level:"Level"},"http-request":{url:"URL",method:"Method",headers:"Headers",body:"Body",retry:"Retries",retryDelay:"Retry delay",timeout:"Timeout",responseType:"Response"},assign:{values:"Values"},transform:{mapping:"Mapping",result:"Fixed result"},subprocess:{workflow:"Workflow JSON"},custom:{result:"Result"}},option:{truthy:"is truthy",equals:"equals",notEquals:"not equals",gt:"greater than",lt:"less than",parse:"Parse",stringify:"Stringify",asc:"Ascending",desc:"Descending",set:"Set",delete:"Delete",append:"Append",count:"Count",sum:"Sum",avg:"Average",min:"Min",max:"Max",object:"Object merge",array:"Array concat",fixed:"Fixed delay",random:"Random delay",mustache:"Mustache",plain:"Plain text",text:"Text",auto:"Auto",info:"Info",warn:"Warning",error:"Error"},log:{info:"INFO",success:"OK",warning:"WARN",error:"ERROR"},demo:{name:"Approval workflow",description:"Drag nodes, connect ports, run it, and inspect the live path.",start:"Start",loadInput:"Load input",approved:"Approved?",approve:"Approve",reject:"Reject",end:"End"}}}},"zh-CN":{locale:"zh-CN",messages:{workflow:{category:{trigger:"\u89E6\u53D1\u5668",flow:"\u6D41\u7A0B\u63A7\u5236",action:"\u6267\u884C\u52A8\u4F5C",data:"\u6570\u636E\u5904\u7406",storage:"\u5B58\u50A8",error:"\u5F02\u5E38\u5904\u7406",advanced:"\u9AD8\u7EA7"},status:{idle:"\u7A7A\u95F2",pending:"\u7B49\u5F85",running:"\u8FD0\u884C\u4E2D",completed:"\u5DF2\u5B8C\u6210",failed:"\u5931\u8D25",cancelled:"\u5DF2\u53D6\u6D88",success:"\u6210\u529F",skipped:"\u8DF3\u8FC7"},ui:{run:"\u8FD0\u884C",schedule:"\u5B9A\u65F6\u8FD0\u884C",stopSchedule:"\u505C\u6B62\u5B9A\u65F6",resume:"\u7EE7\u7EED\u8FD0\u884C",stop:"\u505C\u6B62",undo:"\u64A4\u9500",redo:"\u91CD\u505A",delete:"\u5220\u9664",fit:"\u9002\u5E94\u89C6\u56FE",layout:"\u81EA\u52A8\u5E03\u5C40",duplicate:"\u590D\u5236\u8282\u70B9",clear:"\u6E05\u7A7A",nodes:"{count} \u4E2A\u8282\u70B9",nodeWord:"\u4E2A\u8282\u70B9",links:"{count} \u6761\u8FDE\u63A5",inspectorTitle:"\u8282\u70B9\u5C5E\u6027",inspectorEmpty:"\u5728\u753B\u5E03\u4E2D\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u5E76\u7F16\u8F91\u5C5E\u6027\u3002",name:"\u540D\u79F0",namePlaceholder:"\u8282\u70B9\u540D\u79F0",description:"\u63CF\u8FF0",descriptionPlaceholder:"\u8BE5\u8282\u70B9\u7684\u53EF\u9009\u8BF4\u660E",enabled:"\u542F\u7528",restoreDefaults:"\u6062\u590D\u9ED8\u8BA4",resetField:"\u6062\u590D\u9ED8\u8BA4\u503C",noProperties:"\u8BE5\u8282\u70B9\u6CA1\u6709\u53EF\u7F16\u8F91\u5C5E\u6027\u3002",requiredMessage:"\u5FC5\u586B\u9879",numberMessage:"\u6570\u503C\u8D85\u51FA\u8303\u56F4",patternMessage:"\u683C\u5F0F\u4E0D\u6B63\u786E",jsonMessage:"JSON \u683C\u5F0F\u4E0D\u6B63\u786E",invalidEmail:"\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E",invalidUrl:"URL \u683C\u5F0F\u4E0D\u6B63\u786E",integerMessage:"\u8BF7\u8F93\u5165\u6574\u6570",latestOutput:"\u6700\u8FD1\u4E00\u6B21\u8F93\u51FA",jsonTitle:"\u5DE5\u4F5C\u6D41 JSON\uFF08\u53EF\u89C6\u5316\u751F\u6210\uFF09",apply:"\u5E94\u7528",close:"\u5173\u95ED",logs:"\u65E5\u5FD7",properties:"\u5C5E\u6027",appearance:"\u5916\u89C2",icon:"\u56FE\u6807",color:"\u989C\u8272",addItem:"\u6DFB\u52A0",fields:"\u5B57\u6BB5",json:"JSON",removeItem:"\u5220\u9664",logTitle:"\u6267\u884C\u65E5\u5FD7",runHistory:"\u8FD0\u884C\u5386\u53F2",canvasEmpty:"\u4ECE\u5DE6\u4FA7\u7EC4\u4EF6\u9762\u677F\u62D6\u5165\u8282\u70B9\uFF0C\u6216\u70B9\u51FB\u7EC4\u4EF6\u6DFB\u52A0",menu:"\u83DC\u5355",jsonMenu:"\u5BFC\u5165 / \u5BFC\u51FA JSON",themeMenu:"\u4E3B\u9898",themeLight:"\u4EAE\u8272",themeDark:"\u6697\u8272",themeSolarized:"Solarized",themeHighContrast:"\u9AD8\u5BF9\u6BD4\u5EA6",language:"\u8BED\u8A00",shortcuts:"\u952E\u76D8\u5FEB\u6377\u952E",shortcutsTitle:"\u952E\u76D8\u5FEB\u6377\u952E",zoomPan:"\u7F29\u653E / \u5E73\u79FB",zoomIn:"\u653E\u5927",zoomOut:"\u7F29\u5C0F",saveStateSaved:"\u5DF2\u4FDD\u5B58",saveStateDirty:"\u6709\u672A\u4FDD\u5B58\u4FEE\u6539",saveStateSaving:"\u4FDD\u5B58\u4E2D\u2026",saveStateError:"\u4FDD\u5B58\u5931\u8D25",searchNodes:"\u641C\u7D22\u8282\u70B9\u2026",noMatches:"\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9",save:"\u4FDD\u5B58",saveAs:"\u53E6\u5B58\u4E3A",rename:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renameTitle:"\u91CD\u547D\u540D\u5DE5\u4F5C\u6D41",renamePlaceholder:"\u5DE5\u4F5C\u6D41\u540D\u79F0",renameEmpty:"\u8BF7\u8F93\u5165\u5DE5\u4F5C\u6D41\u540D\u79F0",renameConfirm:"\u91CD\u547D\u540D",cancel:"\u53D6\u6D88",library:"\u5DE5\u4F5C\u6D41\u5E93",libraryTitle:"\u5DE5\u4F5C\u6D41\u5E93",libraryEmpty:"\u8FD8\u6CA1\u6709\u4FDD\u5B58\u7684\u5DE5\u4F5C\u6D41\u3002",open:"\u6253\u5F00",remove:"\u5220\u9664",nodeCount:"{count} \u4E2A\u8282\u70B9",noSelection:"\u672A\u9009\u62E9\u8282\u70B9",canvas:"\u5DE5\u4F5C\u6D41\u753B\u5E03"},message:{renamed:"\u5DF2\u91CD\u547D\u540D\u4E3A\u300C{name}\u300D",added:"\u5DF2\u6DFB\u52A0\u300C{name}\u300D",nodeRemoved:"\u8282\u70B9\u5DF2\u5220\u9664",nodeUpdated:"\u8282\u70B9\u5DF2\u66F4\u65B0",connected:"\u8282\u70B9\u5DF2\u8FDE\u63A5",connectionRemoved:"\u8FDE\u63A5\u5DF2\u5220\u9664",connectionCancelled:"\u5DF2\u53D6\u6D88\u8FDE\u63A5",connectHint:"\u62D6\u5230\u76EE\u6807\u8282\u70B9\u6216\u7AEF\u53E3\u5B8C\u6210\u8FDE\u63A5",dropHint:"\u62D6\u5230\u753B\u5E03\u653E\u7F6E\u300C{name}\u300D",cleared:"\u753B\u5E03\u5DF2\u6E05\u7A7A",loaded:"\u5DE5\u4F5C\u6D41\u5DF2\u52A0\u8F7D",running:"\u5DE5\u4F5C\u6D41\u8FD0\u884C\u4E2D",layout:"\u5DF2\u81EA\u52A8\u5E03\u5C40",duplicated:"\u5DF2\u590D\u5236\u300C{name}\u300D",saved:"\u5DF2\u4FDD\u5B58\u300C{name}\u300D",savedAs:"\u5DF2\u53E6\u5B58\u4E3A\u300C{name}\u300D",completed:"\u5DE5\u4F5C\u6D41\u5DF2\u5B8C\u6210",failed:"\u5DE5\u4F5C\u6D41\u5931\u8D25",cancelled:"\u5DE5\u4F5C\u6D41\u5DF2\u53D6\u6D88",undo:"\u64A4\u9500",redo:"\u91CD\u505A"},error:{unknownType:"\u672A\u77E5\u8282\u70B9\u7C7B\u578B\uFF1A{type}",singleton:"\u53EA\u5141\u8BB8\u4E00\u4E2A\u300C{label}\u300D\u8282\u70B9",endpoints:"\u8FDE\u63A5\u7684\u4E24\u7AEF\u8282\u70B9\u5FC5\u987B\u5B58\u5728",selfLink:"\u8282\u70B9\u4E0D\u80FD\u8FDE\u63A5\u5230\u81EA\u8EAB",unknownOutput:"\u672A\u77E5\u8F93\u51FA\u7AEF\u53E3\uFF1A{port}",unknownInput:"\u672A\u77E5\u8F93\u5165\u7AEF\u53E3\uFF1A{port}",cycle:"\u8BE5\u8FDE\u63A5\u4F1A\u9020\u6210\u5FAA\u73AF",noService:"\u8BBE\u8BA1\u5668\u672A\u914D\u7F6E VisualWorkflowService",running:"\u5DE5\u4F5C\u6D41\u5DF2\u5728\u8FD0\u884C",invalidDocument:"\u65E0\u6548\u7684\u5DE5\u4F5C\u6D41\u6587\u6863",notFound:"\u672A\u627E\u5230\u5DE5\u4F5C\u6D41\uFF1A{id}",noCheckpoint:"\u6CA1\u6709\u53EF\u6062\u590D\u7684\u68C0\u67E5\u70B9"},node:{start:{label:"\u5F00\u59CB",description:"\u5DE5\u4F5C\u6D41\u5165\u53E3"},end:{label:"\u7ED3\u675F",description:"\u7ED3\u675F\u5DE5\u4F5C\u6D41"},inject:{label:"\u6CE8\u5165",description:"\u4EE5\u56FA\u5B9A\u6570\u636E\u89E6\u53D1\u6D41\u7A0B"},task:{label:"\u4EFB\u52A1",description:"\u6267\u884C\u547D\u540D\u52A8\u4F5C\u6216\u8FD4\u56DE\u56FA\u5B9A\u7ED3\u679C"},function:{label:"\u51FD\u6570",description:"\u5BF9\u5DE5\u4F5C\u6D41\u4E0A\u4E0B\u6587\u6267\u884C\u53D7\u4FE1\u4EFB\u7684 JavaScript"},template:{label:"\u6A21\u677F",description:"\u6E32\u67D3\u6D88\u606F\u6A21\u677F"},json:{label:"JSON",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 JSON"},csv:{label:"CSV",description:"\u89E3\u6790\u6216\u5E8F\u5217\u5316 CSV"},change:{label:"\u4FEE\u6539\u5C5E\u6027",description:"\u8BBE\u7F6E\u3001\u5220\u9664\u6216\u8FFD\u52A0\u4E0A\u4E0B\u6587\u5B57\u6BB5"},statistics:{label:"\u7EDF\u8BA1",description:"\u805A\u5408\u6570\u7EC4\uFF08\u8BA1\u6570/\u6C42\u548C/\u5E73\u5747/\u6700\u5C0F/\u6700\u5927\uFF09"},merge:{label:"\u5408\u5E76",description:"\u5408\u5E76\u5BF9\u8C61\u6216\u62FC\u63A5\u6570\u7EC4"},"event-emit":{label:"\u53D1\u9001\u4E8B\u4EF6",description:"\u901A\u8FC7\u5DE5\u4F5C\u6D41\u4E8B\u4EF6\u603B\u7EBF\u53D1\u9001\u4E8B\u4EF6"},"event-wait":{label:"\u7B49\u5F85\u4E8B\u4EF6",description:"\u7B49\u5F85\u5DE5\u4F5C\u6D41\u4E8B\u4EF6"},command:{label:"\u547D\u4EE4",description:"\u8C03\u7528\u5BBF\u4E3B\u63D0\u4F9B\u7684\u547D\u4EE4\u6267\u884C\u5668"},split:{label:"\u62C6\u5206",description:"\u5C06\u5B57\u7B26\u4E32\u6216\u6570\u7EC4\u62C6\u5206\u4E3A\u5143\u7D20"},map:{label:"\u6620\u5C04",description:"\u6620\u5C04\u6570\u7EC4\u4E2D\u7684\u6BCF\u4E2A\u5143\u7D20"},filter:{label:"\u8FC7\u6EE4",description:"\u4FDD\u7559\u6EE1\u8DB3\u6761\u4EF6\u7684\u6570\u7EC4\u5143\u7D20"},sort:{label:"\u6392\u5E8F",description:"\u6309\u5B57\u6BB5\u6392\u5E8F\u6570\u7EC4"},range:{label:"\u533A\u95F4",description:"\u751F\u6210\u6570\u503C\u533A\u95F4"},batch:{label:"\u6279\u5904\u7406",description:"\u5C06\u6570\u7EC4\u62C6\u5206\u4E3A\u6279\u6B21"},trigger:{label:"\u89E6\u53D1",description:"\u5EF6\u8FDF\u540E\u8F93\u51FA\u4E00\u6B21\u6570\u636E"},comment:{label:"\u6CE8\u91CA",description:"\u753B\u5E03\u6CE8\u91CA\uFF0C\u4E0D\u53C2\u4E0E\u6267\u884C"},condition:{label:"\u6761\u4EF6",description:"\u6839\u636E\u4E0A\u4E0B\u6587\u5206\u652F"},switch:{label:"\u591A\u8DEF\u5206\u652F",description:"\u6309\u4E0A\u4E0B\u6587\u503C\u9009\u62E9\u5206\u652F"},parallel:{label:"\u5E76\u884C",description:"\u5E76\u53D1\u6267\u884C\u6240\u6709\u8F93\u51FA\u5206\u652F"},join:{label:"\u6C47\u805A",description:"\u7B49\u5F85\u6240\u6709\u8F93\u5165\u5206\u652F\u5B8C\u6210\u540E\u518D\u7EE7\u7EED"},loop:{label:"\u5FAA\u73AF",description:"\u91CD\u590D\u6267\u884C\u8282\u70B9\u4F53"},delay:{label:"\u5EF6\u8FDF",description:"\u7B49\u5F85\u540E\u7EE7\u7EED"},log:{label:"\u65E5\u5FD7",description:"\u8BB0\u5F55\u4E00\u6761\u6D88\u606F"},"http-request":{label:"HTTP \u8BF7\u6C42",description:"\u8C03\u7528 HTTP \u63A5\u53E3"},assign:{label:"\u8D4B\u503C",description:"\u5C06\u503C\u5408\u5E76\u5230\u5DE5\u4F5C\u6D41\u53D8\u91CF"},transform:{label:"\u8F6C\u6362",description:"\u6620\u5C04\u4E0A\u4E00\u6B65\u7ED3\u679C"},trycatch:{label:"\u5F02\u5E38\u6355\u83B7",description:"\u5C06\u5931\u8D25\u8DEF\u7531\u5230\u5F02\u5E38\u5206\u652F"},subprocess:{label:"\u5B50\u6D41\u7A0B",description:"\u6267\u884C\u53E6\u4E00\u4E2A\u5DE5\u4F5C\u6D41"},custom:{label:"\u81EA\u5B9A\u4E49",description:"\u6267\u884C\u81EA\u5B9A\u4E49\u6D3B\u52A8\u6216\u5904\u7406\u5668"}},field:{task:{action:"\u52A8\u4F5C",result:"\u6A21\u62DF\u7ED3\u679C",fail:"\u4F7F\u6B64\u6B65\u9AA4\u5931\u8D25",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6"},inject:{payload:"\u6570\u636E",topic:"\u4E3B\u9898"},trigger:{delay:"\u5EF6\u8FDF",payload:"\u6570\u636E"},function:{code:"\u4EE3\u7801",timeout:"\u8D85\u65F6"},template:{template:"\u6A21\u677F",syntax:"\u8BED\u6CD5",target:"\u76EE\u6807\u5B57\u6BB5",output:"\u8F93\u51FA\u7C7B\u578B"},json:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",pretty:"\u683C\u5F0F\u5316\u8F93\u51FA"},csv:{mode:"\u6A21\u5F0F",field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26",header:"\u9996\u884C\u4E3A\u8868\u5934"},change:{action:"\u64CD\u4F5C",field:"\u5B57\u6BB5",value:"\u503C"},statistics:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operation:"\u64CD\u4F5C",resultField:"\u7ED3\u679C\u5B57\u6BB5"},merge:{fields:"\u5B57\u6BB5",mode:"\u6A21\u5F0F",resultField:"\u7ED3\u679C\u5B57\u6BB5"},"event-emit":{event:"\u4E8B\u4EF6",payload:"\u6570\u636E"},"event-wait":{event:"\u4E8B\u4EF6",timeout:"\u8D85\u65F6"},command:{command:"\u547D\u4EE4",args:"\u53C2\u6570",timeout:"\u8D85\u65F6"},split:{field:"\u5B57\u6BB5",delimiter:"\u5206\u9694\u7B26"},map:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84"},filter:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u5143\u7D20\u8DEF\u5F84",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},sort:{field:"\u6570\u7EC4\u5B57\u6BB5",path:"\u6392\u5E8F\u8DEF\u5F84",order:"\u987A\u5E8F"},range:{from:"\u8D77\u59CB",to:"\u7ED3\u675F",step:"\u6B65\u957F"},batch:{field:"\u6570\u7EC4\u5B57\u6BB5",size:"\u6279\u5927\u5C0F"},comment:{text:"\u6587\u672C"},condition:{field:"\u5B57\u6BB5",operator:"\u8FD0\u7B97\u7B26",value:"\u6BD4\u8F83\u503C"},switch:{field:"\u53D6\u503C\u5B57\u6BB5",value:"\u503C"},loop:{iterations:"\u8FED\u4EE3\u6B21\u6570",delay:"\u5EF6\u8FDF"},delay:{mode:"\u6A21\u5F0F",delay:"\u5EF6\u8FDF",randomMin:"\u6700\u5C0F\u503C",randomMax:"\u6700\u5927\u503C"},log:{message:"\u6D88\u606F",field:"\u6D88\u606F\u5C5E\u6027",complete:"\u5B8C\u6574\u6D88\u606F",level:"\u7EA7\u522B"},"http-request":{url:"\u5730\u5740",method:"\u65B9\u6CD5",headers:"\u8BF7\u6C42\u5934",body:"\u8BF7\u6C42\u4F53",retry:"\u91CD\u8BD5\u6B21\u6570",retryDelay:"\u91CD\u8BD5\u95F4\u9694",timeout:"\u8D85\u65F6",responseType:"\u54CD\u5E94\u89E3\u6790"},assign:{values:"\u503C"},transform:{mapping:"\u6620\u5C04",result:"\u56FA\u5B9A\u7ED3\u679C"},subprocess:{workflow:"\u5DE5\u4F5C\u6D41 JSON"},custom:{result:"\u7ED3\u679C"}},option:{truthy:"\u4E3A\u771F",equals:"\u7B49\u4E8E",notEquals:"\u4E0D\u7B49\u4E8E",gt:"\u5927\u4E8E",lt:"\u5C0F\u4E8E",parse:"\u89E3\u6790",stringify:"\u5E8F\u5217\u5316",asc:"\u5347\u5E8F",desc:"\u964D\u5E8F",set:"\u8BBE\u7F6E",delete:"\u5220\u9664",append:"\u8FFD\u52A0",count:"\u8BA1\u6570",sum:"\u6C42\u548C",avg:"\u5E73\u5747",min:"\u6700\u5C0F",max:"\u6700\u5927",object:"\u5BF9\u8C61\u5408\u5E76",array:"\u6570\u7EC4\u62FC\u63A5",fixed:"\u56FA\u5B9A\u5EF6\u8FDF",random:"\u968F\u673A\u5EF6\u8FDF",mustache:"Mustache",plain:"\u7EAF\u6587\u672C",text:"\u6587\u672C",auto:"\u81EA\u52A8",info:"\u4FE1\u606F",warn:"\u544A\u8B66",error:"\u9519\u8BEF"},log:{info:"\u4FE1\u606F",success:"\u6210\u529F",warning:"\u544A\u8B66",error:"\u9519\u8BEF"},demo:{name:"\u5BA1\u6279\u6D41\u7A0B\u793A\u4F8B",description:"\u62D6\u62FD\u8282\u70B9\u3001\u8FDE\u63A5\u7AEF\u53E3\u5E76\u8FD0\u884C\uFF0C\u5B9E\u65F6\u67E5\u770B\u6267\u884C\u8DEF\u5F84\u3002",start:"\u5F00\u59CB",loadInput:"\u8BFB\u53D6\u8F93\u5165",approved:"\u662F\u5426\u901A\u8FC7",approve:"\u901A\u8FC7\u5904\u7406",reject:"\u62D2\u7EDD\u5904\u7406",end:"\u7ED3\u675F"}}}}},nr=Object.fromEntries(Object.entries(ir).map(([a,e])=>{let t=e.messages?.workflow||{};return[a,{...e,messages:{...e.messages,workflow:{...t,...po[a]||{}}}}]})),Oe=class{};b(Oe,[[H({imports:[Ee.withLocales(nr,"zh-CN")],exports:[Ee]}),0]]);function C(a,e,t,r,o){if(!a)return r;try{if(a.has(t,e))return a.translate(t,e,o);let s=a.translate(t,e,o);if(s&&s!==t)return s}catch{}return r}function Pt(a,e,t,r="",o){return t?t.startsWith("workflow.")?C(a,e,t,r||t,o):t:r}var lr={trigger:"Triggers",flow:"Flow control",action:"Actions",data:"Data",storage:"Storage",error:"Error handling",advanced:"Advanced"};function y(a,e,t,r){return{id:a,name:e,type:t,label:r}}function h(a){return{...a}}var $="^\\$?\\.?[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",dr=184,cr=64;var ur=[{type:"start",label:"Start",description:"Entry point of the workflow",category:"trigger",icon:"\u25B6",color:"#22c55e",textColor:"#ffffff",singleton:!0,inputs:[],outputs:[y("out","out","output","Next")],defaultConfig:{}},{type:"end",label:"End",description:"Finish the workflow",category:"trigger",icon:"\u25A0",color:"#ef4444",textColor:"#ffffff",singleton:!0,inputs:[y("in","in","input","Previous")],outputs:[],defaultConfig:{}},{type:"inject",label:"Inject",description:"Start with a fixed payload",category:"trigger",icon:"\u26A1",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[y("out","out","output","Payload")],fields:[h({key:"trigger",label:"Trigger",type:"select",defaultValue:"manual",options:[{label:"Manual / once",value:"manual"},{label:"Interval",value:"interval"},{label:"Cron schedule",value:"cron"},{label:"Event",value:"event"}],group:"Trigger"}),h({key:"onceDelay",label:"Delay before first injection",type:"number",defaultValue:0,min:0,step:.1,unit:"s",group:"Trigger",visibleWhen:{key:"trigger",notEquals:"event"}}),h({key:"interval",label:"Interval",type:"number",defaultValue:1,min:0,step:1,group:"Trigger",visibleWhen:{key:"trigger",equals:"interval"}}),h({key:"intervalUnit",label:"Interval unit",type:"select",defaultValue:"s",options:[{label:"Milliseconds",value:"ms"},{label:"Seconds",value:"s"},{label:"Minutes",value:"min"}],group:"Trigger",visibleWhen:{key:"trigger",equals:"interval"}}),h({key:"repeatCount",label:"Repeat count",type:"number",defaultValue:1,min:0,step:1,group:"Trigger",visibleWhen:{key:"trigger",equals:"interval"},description:"How many times the interval trigger runs. 0 means until stopped."}),h({key:"cron",label:"Cron expression",type:"text",placeholder:"0 9 * * 1-5",group:"Trigger",visibleWhen:{key:"trigger",equals:"cron"},pattern:"^\\s*\\S+(\\s+\\S+){4}\\s*$",description:"Five fields: minute hour day month weekday."}),h({key:"event",label:"Event name",type:"text",placeholder:"order.created",pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",group:"Trigger",visibleWhen:{key:"trigger",equals:"event"}}),h({key:"timeout",label:"Wait timeout",type:"number",defaultValue:30,min:0,step:1,unit:"s",group:"Trigger",visibleWhen:{key:"trigger",equals:"event"}}),h({key:"payloadType",label:"Payload type",type:"select",defaultValue:"json",options:[{label:"JSON",value:"json"},{label:"String",value:"string"},{label:"Number",value:"number"},{label:"Boolean",value:"boolean"}],group:"Payload"}),h({key:"payload",label:"Payload fields",type:"json",defaultValue:{},group:"Payload",visibleWhen:{key:"payloadType",equals:"json"}}),h({key:"payloadValue",label:"Payload value",type:"text",group:"Payload",visibleWhen:{key:"payloadType",notEquals:"json"}}),h({key:"topic",label:"Topic",type:"text",maxLength:200,placeholder:"orders.created",group:"Payload"})],defaultConfig:{trigger:"manual",payloadType:"json",payload:{},onceDelay:0,interval:1,intervalUnit:"s",repeatCount:1}},{type:"task",label:"Task",description:"Run a named action or return a fixed result",category:"action",icon:"\u2699",color:"#3b82f6",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"action",label:"Action",type:"text",placeholder:"actions.fetch",pattern:"^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$",description:"Function name in context.actions."}),h({key:"result",label:"Mock result",type:"json",placeholder:'{ "ok": true }',description:"Returned directly when no action is set."}),h({key:"fail",label:"Fail this step",type:"boolean",defaultValue:!1,group:"Reliability"}),h({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability",description:"Automatic retries before the step fails."}),h({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"function",label:"Function",description:"Run trusted JavaScript against the workflow context",category:"action",icon:"\u0192",color:"#10b981",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"code",label:"Code",type:"code",defaultValue:"return input;",required:!0,language:"javascript",rows:10,description:"Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions."}),h({key:"initialize",label:"Initialize code",type:"code",language:"javascript",rows:5,group:"Options",description:"Optional code that runs before the main function. Returned objects are merged into the context."}),h({key:"finalize",label:"Finalize code",type:"code",language:"javascript",rows:5,group:"Options",description:"Optional code that runs after the main function for cleanup or metrics."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{code:"return input;"}},{type:"condition",label:"Condition",description:"Branch on a context field",category:"flow",icon:"?",color:"#f59e0b",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("true","true","output","True"),y("false","false","output","False")],fields:[h({key:"field",label:"Field",type:"text",required:!0,pattern:$,placeholder:"input.approved",description:"Path to the value to test."}),h({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"contains",value:"contains"},{label:"greater than",value:"gt"},{label:"greater or equal",value:"gte"},{label:"less than",value:"lt"},{label:"less or equal",value:"lte"}]}),h({key:"value",label:"Compare with",type:"text",placeholder:"true",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"switch",label:"Switch",description:"Route to one of four outputs using ordered rules",category:"flow",icon:"\u21C9",color:"#f97316",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("route-1","route-1","output","1"),y("route-2","route-2","output","2"),y("route-3","route-3","output","3"),y("route-4","route-4","output","4"),y("default","default","output","Default"),y("error","error","output","Error")],fields:[h({key:"field",label:"Value path",type:"text",required:!0,pattern:$,placeholder:"result.status",description:"Context value compared against each rule."}),h({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[h({key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"contains",value:"contains"},{label:"matches regex",value:"regex"},{label:"greater than",value:"gt"},{label:"greater or equal",value:"gte"},{label:"less than",value:"lt"},{label:"less or equal",value:"lte"},{label:"is truthy",value:"truthy"}]}),h({key:"value",label:"Compare to",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})]})],defaultConfig:{rules:[]}},{type:"junction",label:"Junction",description:"Route wires without changing the message",category:"flow",icon:"\u2022",color:"#64748b",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],defaultConfig:{}},{type:"sequence",label:"Sequence",description:"Keep steps in a strict order",category:"flow",icon:"\u2261",color:"#475569",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],defaultConfig:{}},{type:"link",label:"Link",description:"Jump to matching link nodes by name",category:"flow",icon:"\u21E2",color:"#0d9488",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"out",options:[{label:"Link out",value:"out"},{label:"Link in",value:"in"}]}),h({key:"links",label:"Links",type:"text",placeholder:"flow-a, flow-b",description:"Comma separated names shared by link-out and link-in nodes."})],defaultConfig:{mode:"out"}},{type:"html",label:"HTML",description:"Extract text or links from HTML",category:"data",icon:"H",color:"#ea580c",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"field",label:"HTML field",type:"text",defaultValue:"value",pattern:$,placeholder:"value"}),h({key:"tag",label:"Tag",type:"text",pattern:"^[A-Za-z][A-Za-z0-9-]*$",placeholder:"h1",group:"Options",description:"Only extract content from this HTML tag. Leave empty for the whole document."}),h({key:"mode",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Links",value:"links"},{label:"Attribute",value:"attribute"}]}),h({key:"attribute",label:"Attribute name",type:"text",placeholder:"href",pattern:"^[A-Za-z_:][A-Za-z0-9_:.-]*$",visibleWhen:{key:"mode",equals:"attribute"}}),h({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:$,placeholder:"value"})],defaultConfig:{field:"value",mode:"text",target:"value"}},{type:"xml",label:"XML",description:"Parse or stringify XML",category:"data",icon:"X",color:"#dc2626",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"XML field",type:"text",defaultValue:"value",pattern:$,placeholder:"value"}),h({key:"target",label:"Target field",type:"text",defaultValue:"value",pattern:$,placeholder:"value"}),h({key:"attributes",label:"Include attributes",type:"boolean",defaultValue:!0,group:"Options",description:"Include XML attributes as @attrs in the parsed result.",visibleWhen:{key:"mode",equals:"parse"}}),h({key:"text",label:"Include text",type:"boolean",defaultValue:!0,group:"Options",description:"Include element text as #text in the parsed result.",visibleWhen:{key:"mode",equals:"parse"}}),h({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,group:"Options",visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse",field:"value",target:"value",attributes:!0,text:!0}},{type:"combine",label:"Combine",description:"Combine several context values into one result",category:"data",icon:"\u22C8",color:"#0891b2",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"fields",label:"Fields",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated context paths to combine."}),h({key:"mode",label:"Mode",type:"select",defaultValue:"merge",options:[{label:"Object merge",value:"merge"},{label:"Array concat",value:"concat"},{label:"Text join",value:"text"}]}),h({key:"separator",label:"Separator",type:"text",defaultValue:", ",visibleWhen:{key:"mode",equals:"text"}}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{mode:"merge",resultField:"value"}},{type:"yaml",label:"YAML",description:"Parse or stringify YAML",category:"data",icon:"Y",color:"#ca8a04",textColor:"#111827",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"Value path",type:"text",defaultValue:"value",pattern:$,placeholder:"value"}),h({key:"target",label:"Write result to",type:"text",defaultValue:"value",pattern:$,placeholder:"value"})],defaultConfig:{mode:"parse",field:"value",target:"value"}},{type:"rbe",label:"RBE",description:"Keep array items only when the value changes",category:"data",icon:"\u2260",color:"#f59e0b",textColor:"#111827",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"field",label:"Array path",type:"text",placeholder:"items",description:"Context path to the array to filter."}),h({key:"path",label:"Item path",type:"text",placeholder:"value",description:"Property compared between consecutive items.",visibleWhen:{key:"mode",equals:"value"}}),h({key:"mode",label:"Report",type:"select",defaultValue:"value",options:[{label:"On value change",value:"value"},{label:"On any change",value:"change"}]})],defaultConfig:{mode:"value"}},{type:"scale",label:"Scale",description:"Map a number from one range to another",category:"data",icon:"\u21D4",color:"#7c3aed",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"field",label:"Value path",type:"text",defaultValue:"value",pattern:$,placeholder:"value",description:"Context path of the number to map."}),h({key:"inMin",label:"Input minimum",type:"number",defaultValue:0,group:"Input range"}),h({key:"inMax",label:"Input maximum",type:"number",defaultValue:100,group:"Input range"}),h({key:"outMin",label:"Output minimum",type:"number",defaultValue:0,group:"Output range"}),h({key:"outMax",label:"Output maximum",type:"number",defaultValue:1,group:"Output range"}),h({key:"clamp",label:"Clamp to range",type:"boolean",defaultValue:!0,group:"Options"}),h({key:"round",label:"Round result",type:"boolean",defaultValue:!1,group:"Options"}),h({key:"target",label:"Write result to",type:"text",defaultValue:"value",pattern:$,placeholder:"value",description:"Context field that receives the mapped value."})],defaultConfig:{field:"value",inMin:0,inMax:100,outMin:0,outMax:1,clamp:!0,round:!1,target:"value"}},{type:"router",label:"Router",description:"Route to one of four outputs using ordered rules",category:"flow",icon:"\u21F6",color:"#d97706",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("route-1","route-1","output","1"),y("route-2","route-2","output","2"),y("route-3","route-3","output","3"),y("route-4","route-4","output","4"),y("default","default","output","Default"),y("error","error","output","Error")],fields:[h({key:"field",label:"Value path",type:"text",required:!0,pattern:$,placeholder:"result.status",description:"Context value compared against each rule."}),h({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[h({key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"contains",value:"contains"},{label:"matches regex",value:"regex"},{label:"greater than",value:"gt"},{label:"less than",value:"lt"},{label:"is truthy",value:"truthy"}]}),h({key:"value",label:"Compare to",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})]})],defaultConfig:{rules:[]}},{type:"complete",label:"Complete",description:"Run after matching nodes complete successfully",category:"error",icon:"\u2713",color:"#16a34a",textColor:"#ffffff",inputs:[],outputs:[y("out","out","output","Output")],fields:[h({key:"scope",label:"Scope",type:"text",placeholder:"node id or type",description:"Only run when this node id or type succeeded. Leave empty for any completion."})],defaultConfig:{}},{type:"catch",label:"Catch",description:"Run when a matching node fails",category:"error",icon:"!",color:"#dc2626",textColor:"#ffffff",inputs:[],outputs:[y("out","out","output","Output")],fields:[h({key:"scope",label:"Scope",type:"text",placeholder:"node id or type",description:"Only run when this node id or type failed. Leave empty for any failure."})],defaultConfig:{}},{type:"status",label:"Status",description:"Run after the workflow finishes",category:"error",icon:"i",color:"#0ea5e9",textColor:"#ffffff",inputs:[],outputs:[y("out","out","output","Output")],fields:[h({key:"scope",label:"Scope",type:"text",placeholder:"node id or type",description:"Optional node id or type used to filter the status event."})],defaultConfig:{}},{type:"parallel",label:"Parallel",description:"Run all outgoing branches concurrently",category:"flow",icon:"\u2442",color:"#a855f7",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Complete")],defaultConfig:{}},{type:"join",label:"Join",description:"Wait for all incoming branches and merge their results",category:"flow",icon:"\u2299",color:"#0ea5e9",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"array",options:[{label:"Branch results array",value:"array"},{label:"Merged object",value:"merge"}]}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"joined",placeholder:"joined"}),h({key:"ignoreEmpty",label:"Skip empty branches",type:"boolean",defaultValue:!0})],defaultConfig:{mode:"array",resultField:"joined",ignoreEmpty:!0}},{type:"loop",label:"Loop",description:"Run a sub-workflow repeatedly",category:"flow",icon:"\u21BB",color:"#b45309",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Done"),y("error","error","output","Error")],fields:[h({key:"workflow",label:"Sub-workflow source",type:"text",placeholder:"workflows.child",description:"Context path that holds the workflow definition to repeat."}),h({key:"iterations",label:"Iterations",type:"number",defaultValue:1,min:1,max:1e4,step:1}),h({key:"delay",label:"Delay between runs",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Options"})],defaultConfig:{iterations:1}},{type:"http-in",label:"HTTP in",description:"Start the flow from an HTTP webhook request",category:"trigger",icon:"\u21E5",color:"#059669",textColor:"#ffffff",inputs:[],outputs:[y("out","out","output","Request")],fields:[h({key:"method",label:"Method",type:"select",defaultValue:"ANY",options:[{label:"Any method",value:"ANY"},{label:"GET",value:"GET"},{label:"POST",value:"POST"},{label:"PUT",value:"PUT"},{label:"PATCH",value:"PATCH"},{label:"DELETE",value:"DELETE"}]}),h({key:"path",label:"Path",type:"text",placeholder:"/orders",description:"Request path this node serves. Leave empty to accept any path.",pattern:"^$|^/[^s]*$"})],defaultConfig:{method:"ANY",path:""}},{type:"http-response",label:"HTTP response",description:"Send the HTTP response for a webhook request",category:"action",icon:"\u21E4",color:"#0284c7",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[],fields:[h({key:"statusCode",label:"Status code",type:"number",defaultValue:200,min:100,max:599,step:1}),h({key:"headers",label:"Headers",type:"json",defaultValue:{},placeholder:'{ "x-flow": "done" }'}),h({key:"body",label:"Body path",type:"text",defaultValue:"payload",placeholder:"payload",description:"Context path used as the response body."})],defaultConfig:{statusCode:200,headers:{},body:"payload"}},{type:"trigger",label:"Trigger",description:"Emit a payload after an optional delay",category:"flow",icon:"\u25F7",color:"#ea580c",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"delay",label:"Delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",description:"Time to wait before emitting the payload."}),h({key:"payload",label:"Payload",type:"json",defaultValue:{},placeholder:'{ "key": "value" }'}),h({key:"emitSecond",label:"Send a second message",type:"boolean",defaultValue:!1,description:"Emit another payload after the first one reached the branch."}),h({key:"secondDelay",label:"Second delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",visibleWhen:{key:"emitSecond",equals:!0},description:"Time to wait after the first message before emitting the second."}),h({key:"secondPayload",label:"Second payload",type:"json",defaultValue:{},placeholder:'{ "done": true }',visibleWhen:{key:"emitSecond",equals:!0}})],defaultConfig:{delay:0,payload:{},emitSecond:!1,secondDelay:0,secondPayload:{}}},{type:"delay",label:"Delay",description:"Wait before continuing",category:"action",icon:"\u23F1",color:"#64748b",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"fixed",options:[{label:"Fixed delay",value:"fixed"},{label:"Random delay",value:"random"}],group:"Delay"}),h({key:"delay",label:"Delay",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"fixed"},description:"Pause before continuing."}),h({key:"randomMin",label:"Minimum",type:"number",defaultValue:100,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}}),h({key:"randomMax",label:"Maximum",type:"number",defaultValue:500,min:0,max:6e5,step:100,unit:"ms",group:"Delay",visibleWhen:{key:"mode",equals:"random"}})],defaultConfig:{mode:"fixed",delay:500}},{type:"log",label:"Log",description:"Record a message",category:"action",icon:"\u270E",color:"#06b6d4",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"message",label:"Message",type:"text",defaultValue:"Workflow step completed",placeholder:"Workflow step completed",description:"Message written to the execution log when no field is set."}),h({key:"field",label:"Message property",type:"text",pattern:$,placeholder:"value",description:"Optional context path; logs that value instead of the fixed message."}),h({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Log the complete workflow context instead of one property."}),h({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]})],defaultConfig:{message:"Workflow step completed",level:"info"}},{type:"debug",label:"Debug",description:"Inspect a message property or the complete message",category:"action",icon:"\u25C9",color:"#0284c7",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[],fields:[h({key:"active",label:"Enabled",type:"boolean",defaultValue:!0,group:"Options",description:"Turn off to keep the node but skip its output."}),h({key:"field",label:"Output property",type:"text",pattern:$,placeholder:"payload",description:"Context path to print instead of the complete message."}),h({key:"complete",label:"Complete message",type:"boolean",defaultValue:!1,description:"Print the complete workflow context."}),h({key:"level",label:"Level",type:"select",defaultValue:"info",options:[{label:"info",value:"info"},{label:"warn",value:"warn"},{label:"error",value:"error"}]}),h({key:"console",label:"Also print to console",type:"boolean",defaultValue:!1,description:"Mirror the message to the host console."})],defaultConfig:{level:"info",complete:!1,console:!1}},{type:"http-request",label:"HTTP request",description:"Call an HTTP endpoint",category:"action",icon:"\u21C4",color:"#6366f1",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Response"),y("error","error","output","Error")],fields:[h({key:"url",label:"URL",type:"url",required:!0,placeholder:"https://api.example.com",group:"Request",description:"Absolute endpoint or a path resolved by the host."}),h({key:"method",label:"Method",type:"select",defaultValue:"GET",options:["GET","POST","PUT","PATCH","DELETE"].map(a=>({label:a,value:a})),group:"Request"}),h({key:"headers",label:"Headers",type:"json",rows:3,placeholder:'{ "Content-Type": "application/json" }',group:"Request"}),h({key:"body",label:"Body",type:"textarea",rows:4,placeholder:'{ "name": "demo" }',group:"Request",visibleWhen:{key:"method",notEquals:"GET"}}),h({key:"responseType",label:"Response",type:"select",defaultValue:"auto",options:[{label:"Auto (JSON when possible)",value:"auto"},{label:"Parsed JSON",value:"json"},{label:"UTF-8 text",value:"text"}],group:"Request"}),h({key:"retry",label:"Retries",type:"number",defaultValue:0,min:0,max:20,step:1,group:"Reliability"}),h({key:"retryDelay",label:"Retry delay",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{method:"GET"}},{type:"assign",label:"Assign",description:"Merge values into workflow variables",category:"data",icon:"\uFF1D",color:"#8b5cf6",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"values",label:"Values",type:"json",defaultValue:{}})],defaultConfig:{values:{}}},{type:"transform",label:"Transform",description:"Map the previous result",category:"data",icon:"\u21E2",color:"#14b8a6",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"mapping",label:"Mapping",type:"json",placeholder:'{ "target": "input.source" }',description:"Map context paths into the new result."}),h({key:"result",label:"Fixed result",type:"json"})],defaultConfig:{}},{type:"template",label:"Template",description:"Render a message template",category:"data",icon:"T",color:"#0891b2",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"template",label:"Template",type:"textarea",defaultValue:"{{value}}",required:!0,rows:5,placeholder:"Hello {{input.name}}",group:"Template",description:"Use {{path.to.value}} placeholders."}),h({key:"syntax",label:"Syntax",type:"select",defaultValue:"mustache",options:[{label:"Mustache",value:"mustache"},{label:"Plain text",value:"plain"}],group:"Template"}),h({key:"target",label:"Target field",type:"text",defaultValue:"message",pattern:$,placeholder:"message",group:"Output",description:"Context field that receives the rendered text."}),h({key:"output",label:"Output",type:"select",defaultValue:"text",options:[{label:"Text",value:"text"},{label:"Parsed JSON",value:"json"}],group:"Output"})],defaultConfig:{template:"{{value}}",syntax:"mustache",target:"message",output:"text"}},{type:"json",label:"JSON",description:"Parse or stringify JSON",category:"data",icon:"{}",color:"#eab308",textColor:"#111827",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the value to parse or stringify."}),h({key:"pretty",label:"Pretty print",type:"boolean",defaultValue:!1,visibleWhen:{key:"mode",equals:"stringify"}})],defaultConfig:{mode:"parse"}},{type:"csv",label:"CSV",description:"Parse or stringify CSV",category:"data",icon:"\u22EE",color:"#0e7490",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"mode",label:"Mode",type:"select",defaultValue:"parse",options:[{label:"Parse",value:"parse"},{label:"Stringify",value:"stringify"}]}),h({key:"field",label:"Field",type:"text",placeholder:"value",description:"Path to the CSV text or array."}),h({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Single character used between columns."}),h({key:"header",label:"First row is header",type:"boolean",defaultValue:!0,visibleWhen:{key:"mode",equals:"parse"}}),h({key:"columns",label:"Columns",type:"text",placeholder:"name, age",group:"Options",description:"Optional comma-separated columns to keep when parsing or stringifying."})],defaultConfig:{mode:"parse",delimiter:",",header:!0}},{type:"change",label:"Change",description:"Set, delete or append a context field",category:"data",icon:"\u270E",color:"#f43f5e",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"rules",label:"Rules",type:"list",addLabel:"+ Add rule",itemFields:[h({key:"action",label:"Action",type:"select",defaultValue:"set",options:[{label:"Set",value:"set"},{label:"Delete",value:"delete"},{label:"Append",value:"append"}]}),h({key:"field",label:"Field",type:"text",required:!0,pattern:$,placeholder:"variables.name",description:"Context path to modify."}),h({key:"value",label:"Value",type:"json",visibleWhen:{key:"action",notEquals:"delete"},description:"New value or item to append."})]})],defaultConfig:{rules:[]}},{type:"statistics",label:"Statistics",description:"Aggregate an array (count/sum/avg/min/max)",category:"data",icon:"\u03A3",color:"#6d28d9",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Result")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items",description:"Path to the array to aggregate."}),h({key:"path",label:"Item path",type:"text",placeholder:"value",description:"Numeric property of each item."}),h({key:"operation",label:"Operation",type:"select",defaultValue:"count",options:[{label:"Count",value:"count"},{label:"Sum",value:"sum"},{label:"Average",value:"avg"},{label:"Min",value:"min"},{label:"Max",value:"max"}]}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{operation:"count",resultField:"value"}},{type:"merge",label:"Merge",description:"Merge objects or concatenate arrays",category:"data",icon:"\u2295",color:"#059669",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"fields",label:"Fields",type:"text",required:!0,placeholder:"first, second",description:"Comma-separated paths, e.g. first, second"}),h({key:"mode",label:"Mode",type:"select",defaultValue:"object",options:[{label:"Object merge",value:"object"},{label:"Array concat",value:"array"}]}),h({key:"resultField",label:"Result field",type:"text",defaultValue:"value"})],defaultConfig:{mode:"object",resultField:"value"}},{type:"event-emit",label:"Emit event",description:"Emit an event through the workflow event bus",category:"action",icon:"\u21E1",color:"#db2777",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output")],fields:[h({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to publish."}),h({key:"payload",label:"Payload",type:"json",placeholder:'{ "key": "value" }',description:"Optional event payload."})],defaultConfig:{event:"workflow.event"}},{type:"event-wait",label:"Wait event",description:"Wait for a workflow event",category:"action",icon:"\u21E3",color:"#9333ea",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Event"),y("error","error","output","Timeout")],fields:[h({key:"event",label:"Event",type:"text",defaultValue:"workflow.event",required:!0,pattern:"^[A-Za-z_$][A-Za-z0-9_$.:-]*$",description:"Event name to wait for."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:3e4,min:0,step:1e3,unit:"ms",group:"Reliability",description:"Route to the timeout port after this delay."})],defaultConfig:{event:"workflow.event",timeout:3e4}},{type:"command",label:"Command",description:"Run a host-provided command executor",category:"action",icon:">_",color:"#334155",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"command",label:"Command",type:"text",required:!0,placeholder:"context.exec"}),h({key:"args",label:"Args",type:"json",placeholder:'["--flag"]',description:"Argument array passed to the command."}),h({key:"timeout",label:"Timeout",type:"number",defaultValue:0,min:0,step:100,unit:"ms",group:"Reliability"})],defaultConfig:{}},{type:"split",label:"Split",description:"Split a string or array into items",category:"data",icon:"\u2702",color:"#65a30d",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"field",label:"Field",type:"text",placeholder:"items",description:"Text or array to split."}),h({key:"delimiter",label:"Delimiter",type:"text",defaultValue:",",placeholder:",",description:"Separator used when splitting text."})],defaultConfig:{delimiter:","}},{type:"map",label:"Map",description:"Map each array item",category:"data",icon:"\u21C9",color:"#22c55e",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Item path",type:"text",defaultValue:"",placeholder:"value",description:"e.g. value or user.name"})],defaultConfig:{}},{type:"filter",label:"Filter",description:"Keep array items that match a condition",category:"data",icon:"\u25BD",color:"#84cc16",textColor:"#111827",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Item path",type:"text",defaultValue:""}),h({key:"operator",label:"Operator",type:"select",defaultValue:"truthy",options:[{label:"is truthy",value:"truthy"},{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"contains",value:"contains"},{label:"greater than",value:"gt"},{label:"greater or equal",value:"gte"},{label:"less than",value:"lt"},{label:"less or equal",value:"lte"}]}),h({key:"value",label:"Compare with",type:"text",visibleWhen:{key:"operator",notEquals:"truthy"}})],defaultConfig:{operator:"truthy"}},{type:"sort",label:"Sort",description:"Sort an array by a field",category:"data",icon:"\u21C5",color:"#0d9488",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"path",label:"Sort path",type:"text",placeholder:"value",description:"Property of each item used for ordering."}),h({key:"order",label:"Order",type:"select",defaultValue:"asc",options:[{label:"Ascending",value:"asc"},{label:"Descending",value:"desc"}]}),h({key:"numeric",label:"Numeric compare",type:"boolean",defaultValue:!1,group:"Options",description:"Compare values as numbers instead of text."})],defaultConfig:{order:"asc",numeric:!1}},{type:"range",label:"Range",description:"Generate a numeric range",category:"data",icon:"\u2194",color:"#7c3aed",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Items")],fields:[h({key:"from",label:"From",type:"number",defaultValue:0}),h({key:"to",label:"To",type:"number",defaultValue:10}),h({key:"step",label:"Step",type:"number",defaultValue:1,min:1})],defaultConfig:{from:0,to:10,step:1}},{type:"batch",label:"Batch",description:"Split an array into chunks",category:"data",icon:"\u25A6",color:"#4f46e5",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Batches")],fields:[h({key:"field",label:"Array field",type:"text",placeholder:"items"}),h({key:"size",label:"Batch size",type:"number",defaultValue:10,min:1,step:1,description:"Items per batch."})],defaultConfig:{size:10}},{type:"trycatch",label:"Try / catch",description:"Route failures to an error branch",category:"error",icon:"\u26A0",color:"#ec4899",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Caught")],defaultConfig:{}},{type:"subprocess",label:"Sub workflow",description:"Execute another workflow",category:"advanced",icon:"\u29C9",color:"#0f766e",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"workflow",label:"Workflow JSON",type:"json",required:!0,rows:8,description:"Inline workflow definition to execute."})],defaultConfig:{}},{type:"comment",label:"Comment",description:"Canvas note; not executed",category:"advanced",icon:"\u{1F5D2}",color:"#94a3b8",textColor:"#0f172a",inputs:[],outputs:[],fields:[h({key:"text",label:"Text",type:"textarea",defaultValue:"",rows:5,placeholder:"Canvas note"})],defaultConfig:{text:""}},{type:"custom",label:"Custom",description:"Run a custom activity or handler",category:"advanced",icon:"\u25C6",color:"#6b7280",textColor:"#ffffff",inputs:[y("in","in","input","Input")],outputs:[y("out","out","output","Output"),y("error","error","output","Error")],fields:[h({key:"result",label:"Result",type:"json",placeholder:'{ "ok": true }',description:"Value returned by the custom node."})],defaultConfig:{}}],fo=0;function pr(a){if(a===null||typeof a!="object")return a;try{return JSON.parse(JSON.stringify(a))}catch{return a}}var L=class{constructor(){this.definitions=new Map,this._revision=0,ur.forEach(e=>this.register(e))}get revision(){return this._revision}register(e){if(!e?.type)throw new Error("Workflow node definition requires a type");let t={...e,inputs:(e.inputs||[]).map(r=>({...r})),outputs:(e.outputs||[]).map(r=>({...r})),fields:(e.fields||[]).map(r=>({...r})),defaultConfig:{...e.defaultConfig||{}}};return this.definitions.set(e.type,t),this._revision+=1,this}unregister(e){let t=this.definitions.delete(e);return t&&(this._revision+=1),t}has(e){return this.definitions.has(e)}get(e){return this.definitions.get(e)}defaultConfig(e){let t=this.get(e);if(!t)return{};let r={...t.defaultConfig||{}};return(t.fields||[]).forEach(o=>{o.defaultValue!==void 0&&r[o.key]===void 0&&(r[o.key]=pr(o.defaultValue))}),r}list(){return Array.from(this.definitions.values())}categories(){let e=new Set,t=[];for(let r of this.definitions.values())e.has(r.category)||(e.add(r.category),t.push(r.category));return t}palette(e="zh-CN",t){return this.categories().map(r=>({id:r,label:C(t,e,`workflow.category.${r}`,lr[r]),items:this.list().filter(o=>o.category===r).map(o=>this.paletteItem(o,e,t))}))}paletteItem(e,t="zh-CN",r){return{type:e.type,label:this.nodeLabel(e.type,t,r),description:this.nodeDescription(e.type,t,r),icon:e.icon,color:e.color,category:e.category}}nodeLabel(e,t="zh-CN",r){let o=this.get(e);return o?C(r,t,`workflow.node.${e}.label`,o.label):e}nodeDescription(e,t="zh-CN",r){let o=this.get(e);return o?C(r,t,`workflow.node.${e}.description`,o.description||o.label):""}createNode(e,t,r={}){let o=this.get(e);if(!o)throw new Error(`Unknown workflow node type: ${e}`);return{id:r.id||this.nextId(e),name:r.name||o.label,type:e,position:{x:Number.isFinite(t?.x)?t.x:100,y:Number.isFinite(t?.y)?t.y:100},dimension:{width:dr,height:cr},description:o.description,inputs:o.inputs.map(i=>({...i})),outputs:o.outputs.map(i=>({...i})),config:{...o.defaultConfig||{},...r.config||{}},style:{backgroundColor:o.color,textColor:o.textColor||"#ffffff",borderColor:o.color,borderRadius:e==="start"||e==="end"?50:10,icon:o.icon},activityType:o.activityType,pluginId:o.pluginId,requiresServer:o.requiresServer===!0}}activityType(e){return this.get(e)?.activityType}executor(e){return this.get(e)?.execute}nextId(e){return fo+=1,`${e}_${fo}`}};Reflect.metadata("design:paramtypes",[])(L);b(L,[[E(),0]]);function ht(a){let e=a.trim();if(!e)return null;if(e.startsWith('"')&&e.endsWith('"')||e.startsWith("'")&&e.endsWith("'"))return e.slice(1,-1);if(e==="null"||e==="~")return null;if(e==="true")return!0;if(e==="false")return!1;if(/^-?\d+(\.\d+)?$/.test(e))return Number(e);if(e.startsWith("{")&&e.endsWith("}")||e.startsWith("[")&&e.endsWith("]"))try{return JSON.parse(e)}catch{return e}return e}function ho(a){let e=String(a??"").replace(/\r\n/g,`
`),t=e.trim();if(!t)return null;try{return JSON.parse(t)}catch{}let r=e.split(`
`).map(i=>({raw:i,indent:i.match(/^\s*/)?.[0].length||0,text:i.trim()})).filter(i=>i.text&&!i.text.startsWith("#")),o=0,s=i=>{if(o>=r.length||r[o].indent<i)return null;if(r[o].text.startsWith("- ")){let d=[];for(;o<r.length&&r[o].indent===i&&r[o].text.startsWith("- ");){let c=r[o].text.slice(2).trim();if(o+=1,!c){d.push(s(r[o]?.indent??i+2));continue}let p=c.indexOf(":");if(p>0&&!/^["']/.test(c)){let u={},m=c.slice(0,p).trim(),w=c.slice(p+1).trim();for(u[m]=w?ht(w):s(r[o]?.indent??i+2);o<r.length&&r[o].indent>i&&!r[o].text.startsWith("- ");){let g=r[o].text,v=g.indexOf(":");if(v<0){o+=1;continue}let x=g.slice(0,v).trim(),k=g.slice(v+1).trim(),T=r[o].indent;o+=1,u[x]=k?ht(k):s(r[o]?.indent??T+2)}d.push(u)}else d.push(ht(c))}return d}let n={};for(;o<r.length&&r[o].indent===i&&!r[o].text.startsWith("- ");){let d=r[o].text,c=d.indexOf(":");if(c<0){o+=1;continue}let p=d.slice(0,c).trim(),u=d.slice(c+1).trim();o+=1,n[p]=u?ht(u):s(r[o]?.indent??i+2)}return n};return s(r[0]?.indent??0)}function Ge(a){return a==null?"null":typeof a=="string"?/^[A-Za-z0-9_./-]+$/.test(a)&&a!=="true"&&a!=="false"&&a!=="null"?a:JSON.stringify(a):String(a)}function mo(a,e){let t=" ".repeat(e);return Array.isArray(a)?a.flatMap(r=>{if(r&&typeof r=="object"&&!Array.isArray(r)){let o=Object.entries(r);return o.length?[`${t}- ${o[0][0]}: ${Ge(o[0][1])}`,...o.slice(1).map(([s,i])=>`${t}  ${s}: ${Ge(i)}`)]:[`${t}- {}`]}return[`${t}- ${Ge(r)}`]}):a&&typeof a=="object"?Object.entries(a).flatMap(([r,o])=>o&&typeof o=="object"?[`${t}${r}:`,...mo(o,e+2)]:[`${t}${r}: ${Ge(o)}`]):[`${t}${Ge(a)}`]}function go(a){return mo(a,0).join(`
`)}async function Vt(a,e){let t=Math.max(0,a);if(!e)return t>0&&await new Promise(s=>setTimeout(s,t)),!0;let r=50,o=t;for(;o>0;){if(e())return!1;let s=Math.min(r,o);await new Promise(i=>setTimeout(i,s)),o-=s}return!e()}function D(a,e){if(typeof a=="function")return a(e);if(a==null||typeof a!="string")return a;let t=a.trim();if(!t)return"";if(t.startsWith('"')&&t.endsWith('"')||t.startsWith("'")&&t.endsWith("'"))return t.slice(1,-1);if(t==="true")return!0;if(t==="false")return!1;if(t==="null")return null;if(t==="undefined")return;if(/^-?\d+(\.\d+)?$/.test(t))return Number(t);let r=t.replace(/^\$\.?/,"").replace(/^context\./,"").split(".").filter(Boolean),o=e;for(let s of r){if(o==null)return;o=o[s]}return o}function fr(a,e,t){switch(e){case"equals":return a==t;case"not-equals":return a!=t;case"contains":return Array.isArray(a)?a.some(r=>String(r)===String(t)):String(a??"").includes(String(t??""));case"regex":try{return new RegExp(String(t??"")).test(String(a??""))}catch{return!1}case"gt":return Number(a)>Number(t);case"gte":return Number(a)>=Number(t);case"lt":return Number(a)<Number(t);case"lte":return Number(a)<=Number(t);case"truthy":return!!a;default:return!1}}function wo(a,e,t){switch(e){case"equals":return a==t;case"not-equals":return a!=t;case"gt":return Number(a)>Number(t);case"lt":return Number(a)<Number(t);case"gte":return Number(a)>=Number(t);case"lte":return Number(a)<=Number(t);case"truthy":default:return!!a}}function hr(a,e){let t=a?.config||{};if(t.condition!==void 0)return typeof t.condition=="function"?!!t.condition(e):typeof t.condition=="boolean"?t.condition:!!D(t.condition,e);if(t.field!==void 0){let r=D(t.field,e);return wo(r,String(t.operator||"truthy"),t.value)}return!0}function U(a){if(typeof a!="string")return a;try{return JSON.parse(a)}catch{return a}}function Le(a,e){if(!e)return a;let t=String(e).replace(/^\$\.?/,"").split(".").filter(Boolean),r=a;for(let o of t){if(r==null)return;r=r[o]}return r}function Me(a,e){let t=e?D(e,a):a.items??a.value;return Array.isArray(t)?t:[]}function mr(a,e){return String(a??"").replace(/\{\{\s*([^}]+?)\s*\}\}/g,(t,r)=>String(D(r,e)??""))}function gr(a){return String(a||"").replace(/^\$\.?/,"").split(".").filter(Boolean)}function wr(a,e,t,r){let o=gr(e);if(!o.length)return t==="set"&&r&&typeof r=="object"?(Object.assign(a,r),r):void 0;let s=a;for(let l=0;l<o.length-1;l++){let n=o[l];(s[n]===void 0||s[n]===null)&&(s[n]={}),s=s[n]}let i=o[o.length-1];if(t==="delete"){let l=s[i];return delete s[i],l}if(t==="append"){let l=s[i];return Array.isArray(l)?(l.push(r),l):(s[i]=l==null?[r]:`${l}${r}`,s[i])}return s[i]=r,r}function yr(a,e,t){let r=[],o=[],s="",i=!1,l=String(a??"");for(let d=0;d<l.length;d++){let c=l[d];i?c==='"'?l[d+1]==='"'?(s+='"',d++):i=!1:s+=c:c==='"'?i=!0:c===e?(o.push(s),s=""):c===`
`?(o.push(s),r.push(o),o=[],s=""):c!=="\r"&&(s+=c)}if((s||o.length)&&(o.push(s),r.push(o)),!t||!r.length)return r;let n=r[0];return r.slice(1).map(d=>{let c={};return n.forEach((p,u)=>{c[p]=d[u]??""}),c})}function br(a,e){let t=Array.isArray(a)?a:[];if(!t.length)return"";let r=o=>{let s=o==null?"":String(o);return/["\n\r]/.test(s)||s.includes(e)?`"${s.replace(/"/g,'""')}"`:s};if(!Array.isArray(t[0])){let o=Object.keys(t[0]||{});return[o.map(r).join(e),...t.map(s=>o.map(i=>r(s?.[i])).join(e))].join(`
`)}return t.map(o=>o.map(r).join(e)).join(`
`)}function kr(a){let e=a.activityType;if(e)try{let t=new e;return Object.assign(t,a.config||{}),t}catch{return}}async function vr(a,e){let t=a.config||{};if(t.fail===!0)return{success:!1,error:new Error(String(t.error||`Task "${a.name}" failed`)),data:{nodeId:a.id,failed:!0}};let r=t.action,o=e.actions||{};if(typeof r=="function")return{success:!0,data:{nodeId:a.id,result:await r(e)}};if(typeof r=="string"&&r&&typeof o[r]=="function")return{success:!0,data:{nodeId:a.id,result:await o[r](e)}};if(t.execute&&typeof t.execute=="function")return{success:!0,data:{nodeId:a.id,result:await t.execute(e)}};if(t.result!==void 0){let s=U(t.result);return s&&typeof s=="object"&&!Array.isArray(s)?{success:!0,data:{...s,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,result:s}}}return{success:!0,data:{nodeId:a.id,config:t}}}function _e(a){return a.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&")}function xr(a){let e={},t=[e],r=/<([^>]+)>/g,o=0,s;for(;s=r.exec(a);){let i=a.slice(o,s.index).trim();if(i){let g=t[t.length-1];g["#text"]=g["#text"]?`${g["#text"]} ${_e(i)}`:_e(i)}let l=s[1].trim();if(o=r.lastIndex,l.startsWith("?")||l.startsWith("!"))continue;if(l.startsWith("/")){t.length>1&&t.pop();continue}let n=l.endsWith("/");n&&(l=l.slice(0,-1).trim());let d=(l.match(/^([^\s/]+)/)||[])[1]||l,c={},p=/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,u;for(;u=p.exec(l);)c[u[1]]=_e(u[2]??u[3]??"");let m=Object.keys(c).length?{"@attrs":c}:{},w=t[t.length-1];w[d]===void 0?w[d]=m:Array.isArray(w[d])?w[d].push(m):w[d]=[w[d],m],n||t.push(m)}return e}function zt(a,e,t,r=0){let o=t?"  ".repeat(r):"",s=t?`
`:"";if(Array.isArray(e))return e.map(c=>zt(a,c,t,r)).join(s);if(e==null||typeof e!="object")return`${o}<${a}>${String(e??"")}</${a}>${s}`;let i=e["@attrs"],l=i?Object.entries(i).map(([c,p])=>` ${c}="${String(p).replace(/"/g,"&quot;")}"`).join(""):"",n=e["#text"]===void 0?"":String(e["#text"]),d=Object.entries(e).filter(([c])=>c!=="@attrs"&&c!=="#text").map(([c,p])=>zt(c,p,t,r+1)).join("");return!n&&!d?`${o}<${a}${l}/>${s}`:`${o}<${a}${l}>${s}${d}${n?o+(t?"  ":"")+n+s:""}${o}</${a}>${s}`}function Ft(a,e,t){if(Array.isArray(a))return a.map(o=>Ft(o,e,t));if(!a||typeof a!="object")return a;let r={};return Object.entries(a).forEach(([o,s])=>{o==="@attrs"&&!e||o==="#text"&&!t||(r[o]=Ft(s,e,t))}),r}function Sr(a,e){let t=[],r=new RegExp(`\\b${e}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,"gi"),o;for(;o=r.exec(a);){let s=_e(o[1]??o[2]??"");s&&!t.includes(s)&&t.push(s)}return t}function Cr(a){return _e(a.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())}function Rr(a){let e=[],t=/(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,r;for(;r=t.exec(a);){let o=_e(r[1]??r[2]??"");o&&!e.includes(o)&&e.push(o)}return e}async function Ir(a,e,t){let r=a.eventBus||a.events;if(r&&typeof r.wait=="function")return r.wait(e,t);if(typeof a.waitEvent=="function"){let o=Promise.resolve(a.waitEvent(e));return t?Promise.race([o,new Promise(s=>setTimeout(()=>s(void 0),t))]):o}throw new Error(`Event injection requires an event bus for "${e}"`)}async function Ar(a,e){let t=a.config||{},r=D(t.url,e),o=typeof t.url=="string"?t.url.trim():"",s=r||(/^[a-z][a-z0-9+.-]*:/i.test(o)?o:r);if(!s)return{success:!1,error:new Error("HTTP request URL is required. Set the URL field or point it at a context value."),data:{nodeId:a.id}};let i=globalThis.fetch;if(typeof i!="function")return{success:!1,error:new Error("fetch is not available in this runtime"),data:{nodeId:a.id}};try{let l=U(t.headers)||{};if(String(t.authType||"none")==="basic"&&t.username){let u=`${t.username}:${t.password||""}`,m=typeof btoa=="function"?btoa(u):globalThis.Buffer?.from(u).toString("base64")||"";l.Authorization=`Basic ${m}`}let n=await i(String(s),{method:String(t.method||"GET").toUpperCase(),headers:Object.keys(l).length?l:void 0,body:t.body===void 0||t.body===""?void 0:String(t.body)}),d=await n.text(),c=String(t.responseType||"auto"),p=d;if(c!=="text")try{p=d?JSON.parse(d):null}catch(u){if(c==="json")return{success:!1,error:new Error(`Invalid JSON response: ${u.message}`),data:{nodeId:a.id,status:n.status}};p=d}return{success:n.ok,error:n.ok?void 0:new Error(`HTTP ${n.status}`),data:{nodeId:a.id,status:n.status,body:p}}}catch(l){return{success:!1,error:l,data:{nodeId:a.id}}}}async function Xe(a,e,t,r){let o=a.config||{};if(t?.executeNode){let i=await t.executeNode(a,e);if(i)return i}let s=kr(a);if(s)return s.execute(e);switch(a.type){case"start":return{success:!0,data:{nodeId:a.id,started:!0}};case"end":return{success:!0,data:{nodeId:a.id,completed:!0}};case"task":return vr(a,e);case"condition":return{success:!0,data:{nodeId:a.id,condition:hr(a,e)}};case"delay":{let i=String(o.mode||"fixed"),l=String(o.unit||"ms"),n=l==="s"?1e3:l==="min"?6e4:1,d=Math.max(0,Number(o.delay??o.duration??0)||0)*n;if(i==="random"){let c=Math.max(0,Number(o.randomMin)||0)*n,p=Math.max(c,(Number(o.randomMax)||0)*n||c);d=c+Math.random()*(p-c)}return await Vt(d,r?.cancelled)?{success:!0,data:{nodeId:a.id,delayed:d,mode:i}}:{success:!1,error:new Error("Workflow cancelled"),data:{nodeId:a.id}}}case"loop":{let i=Math.max(0,Math.min(1e4,Number(o.iterations??1)||0)),l=D(o.workflow,e);if(l||(l=U(o.workflow)),typeof l=="string"&&(l=e.workflows?.[l]||e[l]),!l||!t?.executeDefinition)return{success:!1,error:new Error("Loop requires a sub-workflow source"),data:{nodeId:a.id,iterations:i}};let n=[];for(let d=0;d<i;d++){if(d>0&&Number(o.delay)>0&&!await Vt(Number(o.delay),r?.cancelled))return{success:!1,error:new Error("Workflow cancelled"),data:{nodeId:a.id,iterations:d}};n.push(await t.executeDefinition(l,e))}return{success:!0,data:{nodeId:a.id,iterations:i,results:n,count:n.length}}}case"log":case"debug":{if(a.type==="debug"&&o.active===!1)return{success:!0,data:{nodeId:a.id,skipped:!0}};let i=String(o.level||"info"),l=o.field===void 0||o.field===null?"":String(o.field).trim(),n=o.complete===!0?{...e}:D(l||o.message,e),d;if(n!==null&&typeof n=="object")try{d=JSON.stringify(n)}catch{d=String(n)}else d=String(n??"");let c=e.logger;return c&&typeof c[i]=="function"&&c[i](d),a.type==="debug"&&o.console===!0&&typeof console<"u"&&(console[i]||console.log).call(console,d),{success:!0,data:{nodeId:a.id,level:i,message:d}}}case"http-request":return Ar(a,e);case"inject":{let i=String(o.trigger||"manual"),l=Math.max(0,Number(o.onceDelay)||0)*1e3;l&&await new Promise(u=>setTimeout(u,l));let n=String(o.payloadType||"json"),d;if(n==="string"){let u=o.payloadValue===void 0?o.payload:o.payloadValue;d=u==null?"":String(u)}else if(n==="number")d=Number(o.payloadValue===void 0?o.payload:o.payloadValue);else if(n==="boolean"){let u=o.payloadValue===void 0?o.payload:o.payloadValue;d=u===!0||u==="true"||u===1||u==="1"}else d=U(o.payload??{});if(i==="event"){let u=String(o.event||"").trim();if(!u)return{success:!1,error:new Error("Event injection requires an event name"),data:{nodeId:a.id}};let m=Math.max(0,Number(o.timeout)||0)*1e3,w=await Ir(e,u,m);w!==void 0&&(d=w)}let c=o.topic===void 0||o.topic===null?"":String(o.topic),p=c?{topic:c}:{};return d&&typeof d=="object"&&!Array.isArray(d)?{success:!0,data:{...p,...d,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,...p,payload:d}}}case"http-in":{let i=e.request;if(!i)return{success:!0,data:{nodeId:a.id,matched:!1,waiting:!0,reason:"No HTTP request"}};let l=String(o.method||"ANY").toUpperCase(),n=String(i.method||"GET").toUpperCase(),d=String(o.path||"").trim(),c=String(i.path||"");return(l==="ANY"||l===n)&&(!d||c===d||c.startsWith(`${d.replace(/\/$/,"")}/`))?{success:!0,data:{nodeId:a.id,matched:!0,request:i,method:n,path:c,query:i.query||{},headers:i.headers||{},body:i.body,payload:i.body}}:{success:!0,data:{nodeId:a.id,matched:!1,reason:`Request ${n} ${c} did not match ${l} ${d||"*"}`}}}case"http-response":{let i=e.response;if(!i||typeof i!="object")return{success:!0,data:{nodeId:a.id,skipped:!0,reason:"No HTTP response sink"}};let l=String(o.body??"payload"),n=l?D(l,e):void 0,d=Math.max(100,Math.min(599,Number(o.statusCode)||200));return i.statusCode=d,i.headers=U(o.headers)||{},i.body=n,{success:!0,data:{nodeId:a.id,responded:!0,statusCode:d}}}case"trigger":{let i=Math.max(0,Number(o.delay)||0);if(!await Vt(i,r?.cancelled))return{success:!1,error:new Error("Workflow cancelled"),data:{nodeId:a.id}};let l=U(o.payload??{});return l&&typeof l=="object"&&!Array.isArray(l)?{success:!0,data:{...l,nodeId:a.id,triggered:!0}}:{success:!0,data:{nodeId:a.id,triggered:!0,payload:l}}}case"function":try{let i=String(o.code||"return input;"),l=async d=>new Function("context","input","msg",`"use strict"; return (async () => { ${d}
 })();`)(e,e,{...e});if(String(o.initialize||"").trim()){let d=await l(String(o.initialize));d&&typeof d=="object"&&!Array.isArray(d)&&Object.assign(e,d)}let n=await l(i);if(String(o.finalize||"").trim()){let d=await l(String(o.finalize));d&&typeof d=="object"&&!Array.isArray(d)&&Object.assign(e,d)}return n&&typeof n=="object"&&!Array.isArray(n)?{success:!0,data:{...n,nodeId:a.id}}:{success:!0,data:{nodeId:a.id,result:n}}}catch(i){return{success:!1,error:i,data:{nodeId:a.id}}}case"template":{let i=String(o.template??""),n=String(o.syntax||"mustache")==="plain"?i:mr(i,e),d=String(o.output||"text"),c=n;if(d==="json")try{c=n.trim()?JSON.parse(n):null}catch(u){return{success:!1,error:new Error(`Invalid JSON template output: ${u.message}`),data:{nodeId:a.id}}}let p=String(o.target||"message");return{success:!0,data:{nodeId:a.id,[p]:c,value:c}}}case"json":{let i=D(o.field||"value",e);if(String(o.mode||"parse")==="stringify"){let n=JSON.stringify(i,null,o.pretty?2:void 0);return{success:!0,data:{nodeId:a.id,value:n,json:n}}}try{let n=typeof i=="string"?JSON.parse(i):i;return{success:!0,data:n&&typeof n=="object"&&!Array.isArray(n)?{...n,nodeId:a.id,value:n}:{nodeId:a.id,value:n}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}case"csv":{let i=D(o.field||"value",e),l=String(o.delimiter??",");try{let n=String(o.columns||"").split(",").map(c=>c.trim()).filter(Boolean);if(String(o.mode||"parse")==="stringify"){let c=n.length&&Array.isArray(i)?i.map(u=>Object.fromEntries(n.map(m=>[m,u?.[m]]))):i,p=br(c,l);return{success:!0,data:{nodeId:a.id,value:p}}}let d=yr(String(i??""),l,o.header!==!1);return n.length&&(d=d.map(c=>Object.fromEntries(n.map(p=>[p,c?.[p]])))),{success:!0,data:{nodeId:a.id,value:d,items:d,count:d.length}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}case"change":try{let i=Array.isArray(o.rules)&&o.rules.length?o.rules:[{action:o.action,field:o.field,value:o.value}],l=[];for(let n of i)n?.field&&(wr(e,n.field,String(n.action||"set"),U(n.value)),l.push(n.field));return{success:!0,data:{nodeId:a.id,field:i[0]?.field,value:e,changed:l.length>0,rules:l}}}catch(i){return{success:!1,error:i,data:{nodeId:a.id}}}case"statistics":{let i=Me(e,o.field),l=i.map(u=>Le(u,o.path)).filter(u=>u!=null),n=l.map(Number).filter(u=>Number.isFinite(u)),d=String(o.operation||"count"),c=l.length;d==="sum"?c=n.reduce((u,m)=>u+m,0):d==="avg"?c=n.length?n.reduce((u,m)=>u+m,0)/n.length:0:d==="min"?c=n.length?Math.min(...n):0:d==="max"&&(c=n.length?Math.max(...n):0);let p=String(o.resultField||"value");return{success:!0,data:{nodeId:a.id,[p]:c,value:c,count:i.length}}}case"merge":{let l=String(o.fields||"").split(",").map(c=>c.trim()).filter(Boolean).map(c=>D(c,e)),n=String(o.mode||"object")==="array"?l.reduce((c,p)=>c.concat(Array.isArray(p)?p:[p]),[]):Object.assign({},...l.filter(c=>c&&typeof c=="object"&&!Array.isArray(c))),d=String(o.resultField||"value");return{success:!0,data:{nodeId:a.id,[d]:n,value:n}}}case"event-emit":{let i=String(o.event||"workflow.event"),l=U(o.payload),n=e.eventBus||e.events;return n&&typeof n.emit=="function"?(n.emit(i,l),{success:!0,data:{nodeId:a.id,event:i,emitted:!0,payload:l}}):typeof e.emit=="function"?(e.emit(i,l),{success:!0,data:{nodeId:a.id,event:i,emitted:!0,payload:l}}):{success:!0,data:{nodeId:a.id,event:i,emitted:!1,payload:l}}}case"event-wait":{let i=String(o.event||"workflow.event"),l=Math.max(0,Number(o.timeout)||0),n=e.eventBus||e.events;try{if(n&&typeof n.wait=="function"){let d=await n.wait(i,l);return{success:!0,data:{nodeId:a.id,event:i,value:d,waited:!0}}}if(typeof e.waitEvent=="function"){let d=l?await Promise.race([Promise.resolve(e.waitEvent(i)),new Promise(c=>setTimeout(()=>c(void 0),l))]):await e.waitEvent(i);return{success:!0,data:{nodeId:a.id,event:i,value:d,waited:!0}}}return{success:!0,data:{nodeId:a.id,event:i,waited:!1}}}catch(d){return{success:!1,error:d,data:{nodeId:a.id,event:i}}}}case"command":{let i=String(o.command||""),l=o.args,n=Array.isArray(l)?l.map(c=>c&&typeof c=="object"&&"value"in c?c.value:c):U(l),d=e.exec||e.runCommand||e.commands?.[i];if(typeof d=="function")try{let c=await d(i,n,e);return{success:!0,data:c&&typeof c=="object"?{...c,nodeId:a.id,command:i}:{nodeId:a.id,command:i,result:c}}}catch(c){return{success:!1,error:c,data:{nodeId:a.id,command:i}}}return{success:!0,data:{nodeId:a.id,command:i,skipped:!0,args:n}}}case"split":{let i=D(o.field||"items",e),l=Array.isArray(i)?i:typeof i=="string"?i.split(String(o.delimiter??",")):[];return{success:!0,data:{nodeId:a.id,items:l,count:l.length}}}case"map":{let l=Me(e,o.field).map(n=>Le(n,o.path));return{success:!0,data:{nodeId:a.id,items:l,count:l.length}}}case"filter":{let l=Me(e,o.field).filter(n=>{let d=Le(n,o.path);return wo(d,String(o.operator||"truthy"),o.value)});return{success:!0,data:{nodeId:a.id,items:l,count:l.length}}}case"sort":{let i=Me(e,o.field).slice(),l=String(o.order||"asc")==="desc"?-1:1,n=o.numeric===!0;return i.sort((d,c)=>{let p=Le(d,o.path),u=Le(c,o.path);return n?(Number(p)-Number(u))*l:typeof p=="number"&&typeof u=="number"?(p-u)*l:String(p??"").localeCompare(String(u??""))*l}),{success:!0,data:{nodeId:a.id,items:i,count:i.length}}}case"range":{let i=Number(o.from??0),l=Number(o.to??10),n=Math.max(1,Math.abs(Number(o.step??1))||1),d=[];for(let c=i;c<l;c+=n)d.push(c);return{success:!0,data:{nodeId:a.id,items:d,count:d.length}}}case"combine":{let i=String(o.fields||"").split(",").map(p=>p.trim()).filter(Boolean);if(!i.length)return{success:!1,error:new Error("Combine requires at least one field"),data:{nodeId:a.id}};let l=i.map(p=>D(p,e)),n=String(o.mode||"merge"),d;if(n==="concat")d=l.reduce((p,u)=>p.concat(Array.isArray(u)?u:[u]),[]);else if(n==="text"){let p=String(o.separator??", ");d=l.map(u=>u!==null&&typeof u=="object"?JSON.stringify(u):String(u??"")).join(p)}else d=l.reduce((p,u)=>u&&typeof u=="object"&&!Array.isArray(u)?{...p,...u}:p,{});let c=String(o.resultField||"value");return{success:!0,data:{nodeId:a.id,[c]:d,value:d}}}case"rbe":{let i=Me(e,o.field),l=String(o.path||"").trim(),n=String(o.mode||"value")==="change"||!l,d=[],c,p=!1;for(let u of i){let m=JSON.stringify(n?u:Le(u,l));(!p||m!==c)&&(d.push(u),c=m,p=!0)}return{success:!0,data:{nodeId:a.id,items:d,count:d.length}}}case"batch":{let i=Me(e,o.field),l=Math.max(1,Number(o.size)||10),n=Math.max(0,Math.min(l-1,Number(o.overlap)||0)),d=Math.max(1,l-n),c=[];for(let p=0;p<i.length&&!(n>0&&i.length-p<=n);p+=d)c.push(i.slice(p,p+l));return{success:!0,data:{nodeId:a.id,items:c,count:c.length}}}case"comment":return{success:!0,data:{nodeId:a.id,comment:!0}};case"assign":{let i=U(o.values??o.data??{}),l={...e.variables||{},...i&&typeof i=="object"?i:{}};return e.variables=l,{success:!0,data:{nodeId:a.id,variables:l}}}case"transform":{if(o.result!==void 0)return{success:!0,data:{nodeId:a.id,result:U(o.result)}};let i=U(o.mapping);if(i&&typeof i=="object"){let l={};return Object.keys(i).forEach(n=>{l[n]=D(i[n],e)}),{success:!0,data:{nodeId:a.id,result:l}}}return{success:!0,data:{nodeId:a.id,result:e}}}case"junction":case"sequence":return{success:!0,data:{nodeId:a.id}};case"switch":case"router":{let i=D(o.field,e),l=Array.isArray(o.rules)?o.rules:[];for(let n=0;n<l.length&&n<4;n++)if(fr(i,String(l[n]?.operator||"equals"),l[n]?.value))return{success:!0,data:{nodeId:a.id,route:n+1,value:i}};return{success:!0,data:{nodeId:a.id,route:0,value:i}}}case"link":return{success:!0,data:{nodeId:a.id,mode:String(o.mode||"out"),links:String(o.links||"").split(",").map(i=>i.trim()).filter(Boolean)}};case"scale":{let i=Number(D(o.field||"value",e));if(!Number.isFinite(i))return{success:!1,error:new Error("Scale input is not a number"),data:{nodeId:a.id}};let l=Number(o.inMin??0),n=Number(o.inMax??100),d=Number(o.outMin??0),c=Number(o.outMax??1),p=n-l,u=p===0?d:d+(i-l)/p*(c-d);if(o.clamp!==!1){let w=Math.min(d,c),g=Math.max(d,c);u=Math.min(g,Math.max(w,u))}o.round===!0&&(u=Math.round(u));let m=String(o.target||"value");return{success:!0,data:{nodeId:a.id,[m]:u,value:u}}}case"html":{let i=String(D(o.field||"value",e)??""),l=String(o.mode||"text"),n=String(o.tag||"").trim(),d=[];if(n){let w=new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`,"gi"),g;for(;g=w.exec(i);)d.push(g[1])}let p=(n?d:[i]).map(w=>l==="links"?Rr(w):l==="attribute"?Sr(w,String(o.attribute||"href")):Cr(w)),u=n?p.length<=1?p[0]||(l==="links"?[]:""):p:p[0],m=String(o.target||"value");return{success:!0,data:{nodeId:a.id,[m]:u,value:u}}}case"yaml":{let i=D(o.field||"value",e),l=String(o.target||"value");try{let n=String(o.mode||"parse")==="stringify"?go(i):ho(String(i??""));return{success:!0,data:{nodeId:a.id,[l]:n,value:n}}}catch(n){return{success:!1,error:n,data:{nodeId:a.id}}}}case"xml":{let i=D(o.field||"value",e),l=String(o.mode||"parse"),n=String(o.target||"value");try{if(l==="stringify"){let c=typeof i=="string"?JSON.parse(i):i,p=Object.keys(c||{})[0]||"root",u=zt(p,c?.[p],o.pretty===!0).trim();return{success:!0,data:{nodeId:a.id,[n]:u,value:u}}}let d=Ft(xr(String(i??"")),o.attributes!==!1,o.text!==!1);return{success:!0,data:{nodeId:a.id,[n]:d,value:d}}}catch(d){return{success:!1,error:d,data:{nodeId:a.id}}}}case"parallel":return{success:!0,data:{nodeId:a.id,parallel:!0}};case"join":{let i=r?.incoming||[],l=o.ignoreEmpty!==!1,n=i.filter(p=>!l||p.result?.data!==void 0&&p.result?.data!==null).map(p=>p.result?.data),d=String(o.resultField||"joined"),c=String(o.mode||"array")==="merge"?n.reduce((p,u)=>u&&typeof u=="object"&&!Array.isArray(u)?{...p,...u}:p,{}):n;return{success:!0,data:{nodeId:a.id,joined:!0,branches:n.length,results:n,[d]:c}}}case"trycatch":return{success:!0,data:{nodeId:a.id,guarded:!0}};case"subprocess":{let i=D(o.workflow,e);if(i||(i=U(o.workflow)),typeof i=="string"&&(i=e.workflows?.[i]||e[i]),i&&t?.executeDefinition){let l=await t.executeDefinition(i,e);return{success:l.success,data:{nodeId:a.id,subprocess:l.data},error:l.error}}return{success:!0,data:{nodeId:a.id,skipped:!0,reason:"No sub workflow configured"}}}case"custom":default:return o.execute&&typeof o.execute=="function"?{success:!0,data:{nodeId:a.id,result:await o.execute(e)}}:a.requiresServer?{success:!1,error:new Error(`Node type "${a.type}" requires an installed workflow plugin on the execution host.`),data:{nodeId:a.id,type:a.type,pluginId:a.pluginId}}:{success:!0,data:{nodeId:a.id,type:a.type,result:U(o.result)}}}}function ke(a){let e=[];if(a?.id||e.push("Workflow ID is required"),a?.name||e.push("Workflow name is required"),!a?.nodes||a.nodes.length===0)return e.push("Workflow must have at least one node"),{valid:e.length===0,errors:e};let t=new Set,r=[];for(let o of a.nodes)o.id?t.has(o.id)&&r.push(o.id):e.push("Every node requires an id"),t.add(o.id);r.length&&e.push(`Duplicate node IDs found: ${[...new Set(r)].join(", ")}`);for(let o of a.connections||[])t.has(o.sourceNodeId)||e.push(`Connection references non-existent source node: ${o.sourceNodeId}`),t.has(o.targetNodeId)||e.push(`Connection references non-existent target node: ${o.targetNodeId}`),o.sourceNodeId===o.targetNodeId&&e.push(`Connection cannot link a node to itself: ${o.sourceNodeId}`);return qt(a)&&e.push("Cycles detected in workflow"),{valid:e.length===0,errors:e}}function qt(a){let e=new Set,t=new Set,r=new Map;for(let s of a.nodes||[])r.set(s.id,[]);for(let s of a.connections||[]){let i=r.get(s.sourceNodeId);i&&i.push(s.targetNodeId)}let o=s=>{if(e.has(s))return!0;if(t.has(s))return!1;e.add(s);for(let i of r.get(s)||[])if(o(i))return!0;return e.delete(s),t.add(s),!1};for(let s of r.keys())if(o(s))return!0;return!1}function yo(a){let e=a?.nodes||[],t=new Set((a?.connections||[]).map(l=>l.targetNodeId)),r=[],o=l=>{r.includes(l)||r.push(l)},s=new Set(["complete","catch","status"]),i=l=>l.type==="link"&&String(l.config?.mode||"out")==="in";return e.filter(l=>l.type==="start").forEach(o),e.filter(l=>l.type==="inject").forEach(o),e.filter(l=>!s.has(l.type)&&!t.has(l.id)&&!i(l)).forEach(o),r}function ve(a){return a==null||a===""||Array.isArray(a)&&a.length===0}function bo(...a){let e=a.filter(Boolean).reduce((t,r)=>({...t,...r}),{});return Object.keys(e).length?e:null}var se={required(a){return ve(a.value)?{required:!0}:null},requiredTrue(a){return a.value===!0?null:{required:!0}},email(a){return ve(a.value)||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a.value))?null:{email:!0}},minLength(a){return e=>ve(e.value)||String(e.value).length>=a?null:{minlength:{requiredLength:a,actualLength:String(e.value).length}}},maxLength(a){return e=>ve(e.value)||String(e.value).length<=a?null:{maxlength:{requiredLength:a,actualLength:String(e.value).length}}},pattern(a){let e=a instanceof RegExp?a:new RegExp(a);return t=>ve(t.value)?null:(e.lastIndex=0,e.test(String(t.value))?null:{pattern:{requiredPattern:e.toString(),actualValue:t.value}})},min(a){return e=>ve(e.value)||Number(e.value)>=a?null:{min:{min:a,actual:e.value}}},max(a){return e=>ve(e.value)||Number(e.value)<=a?null:{max:{max:a,actual:e.value}}},nullValidator(){return null},compose(a){return e=>bo(...a.filter(t=>typeof t=="function").map(t=>t(e)))},composeAsync(a){return async e=>{let t=await Promise.all(a.filter(r=>typeof r=="function").map(r=>r(e)));return bo(...t)}}};function Ze(a){return a==null?[]:Array.isArray(a)?a:[a]}var Qe=class{constructor(e,t){this._status="VALID",this._errors=null,this._validators=[],this._asyncValidators=[],this._asyncSequence=0,this.valueChanges=new Tt,this.statusChanges=new Tt,this.touched=!1,this.dirty=!1,this._validators=Ze(e),this._asyncValidators=Ze(t)}get value(){return this._value}get status(){return this._status}get errors(){return this._errors}get valid(){return this._status==="VALID"}get invalid(){return this._status==="INVALID"}get pending(){return this._status==="PENDING"}get disabled(){return this._status==="DISABLED"}get parent(){return this._parent}setParent(e){this._parent=e}patchValue(e,t){this.setValue(e,t)}setValidators(e){this._validators=Ze(e),this.updateValueAndValidity()}addValidators(e){this._validators=[...this._validators,...Ze(e)],this.updateValueAndValidity()}clearValidators(){this._validators=[],this.updateValueAndValidity()}setAsyncValidators(e){this._asyncValidators=Ze(e),this.updateValueAndValidity()}markAsTouched(){this.touched=!0}markAsUntouched(){this.touched=!1}markAsDirty(){this.dirty=!0}markAsPristine(){this.dirty=!1}markAllAsTouched(){this.markAsTouched()}reset(e,t={emitEvent:!0}){this.markAsPristine(),this.markAsUntouched(),this.setValue(e,t)}disable(e={emitEvent:!0}){this.setDisabled(!0,e)}enable(e={emitEvent:!0}){this.setDisabled(!1,e)}setDisabled(e,t){if(this._status=e?"DISABLED":"VALID",e)this._errors=null;else{this.updateValueAndValidity(t);return}t.emitEvent!==!1&&this.statusChanges.emit(this._status)}updateValueAndValidity(e={emitEvent:!0}){if(this._status==="DISABLED"){this._errors=null,e.emitEvent!==!1&&this.statusChanges.emit(this._status);return}let t=this.runSyncValidators();if(this._asyncValidators.length){this._status="PENDING",this._errors=t,e.emitEvent!==!1&&this.statusChanges.emit(this._status);let r=++this._asyncSequence;Promise.all(this._asyncValidators.map(o=>o(this))).then(o=>{r===this._asyncSequence&&(this._errors=this.mergeErrors(t,...o),this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))}).catch(()=>{r===this._asyncSequence&&(this._errors={...t||{},async:!0},this._status="INVALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e))});return}this._errors=t,this._status=this._errors?"INVALID":"VALID",e.emitEvent!==!1&&this.statusChanges.emit(this._status),this.notifyParent(e)}notifyParent(e){!e.onlySelf&&this._parent&&this._parent.updateValueAndValidity({...e,onlySelf:!1})}runSyncValidators(){return this.mergeErrors(...this._validators.map(e=>e(this)))}mergeErrors(...e){let t=e.filter(Boolean).reduce((r,o)=>({...r,...o}),{});return Object.keys(t).length?t:null}},xe=class extends Qe{constructor(e=null,t,r){let o=$t(t)?t:void 0;super(o?.validators??t,o?.asyncValidators??r),this._value=e,this.updateValueAndValidity({emitEvent:!1})}setValue(e,t={emitEvent:!0}){this._value=e,t.emitEvent!==!1&&this.valueChanges.emit(e),this.updateValueAndValidity(t)}reset(e=null,t={emitEvent:!0}){super.reset(e,t)}},Se=class extends Qe{constructor(e={},t,r){let o=$t(t)?t:void 0;super(o?.validators??t,o?.asyncValidators??r),this.controls=e,Object.values(e).forEach(s=>s.setParent(this)),this._value=this.reduceValue(),this.updateValueAndValidity({emitEvent:!1})}get(e){let t=String(e||"").split(".").filter(Boolean),r=this;for(let o of t){if(!r)return null;r=r.controls?.[o]}return r||null}addControl(e,t){t.setParent(this),this.controls[e]=t,this.updateValueAndValidity()}removeControl(e){this.controls[e]&&(delete this.controls[e],this.updateValueAndValidity())}setControl(e,t){this.controls[e]&&(this.controls[e]=t,t.setParent(this),this.updateValueAndValidity())}contains(e){return!!this.controls[e]}updateValueAndValidity(e={emitEvent:!0}){this._value=this.reduceValue(),super.updateValueAndValidity(e)}setValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(r=>this.controls[r].setValue(e?.[r],{emitEvent:!1,onlySelf:!0})),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}patchValue(e,t={emitEvent:!0}){Object.keys(this.controls).forEach(r=>{e&&r in e&&this.controls[r].setValue(e[r],{emitEvent:!1,onlySelf:!0})}),this._value=this.reduceValue(),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}reset(e={},t={emitEvent:!0}){super.reset(e,t)}markAllAsTouched(){this.markAsTouched(),Object.values(this.controls).forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=Object.keys(this.controls).reduce((t,r)=>{let o=this.controls[r].errors;return o&&(t[r]=o),t},{});return this.mergeErrors(super.runSyncValidators(),Object.keys(e).length?e:null)}reduceValue(){return Object.keys(this.controls).reduce((e,t)=>(e[t]=this.controls[t].value,e),{})}},et=class extends Qe{constructor(e=[],t,r){let o=$t(t)?t:void 0;super(o?.validators??t,o?.asyncValidators??r),this.controls=[...e],this.controls.forEach(s=>s.setParent(this)),this._value=this.controls.map(s=>s.value),this.updateValueAndValidity({emitEvent:!1})}updateValueAndValidity(e={emitEvent:!0}){this._value=this.controls.map(t=>t.value),super.updateValueAndValidity(e)}at(e){return this.controls[e]||null}push(e){e.setParent(this),this.controls.push(e),this.updateValueAndValidity()}removeAt(e){this.controls.splice(e,1),this.updateValueAndValidity()}clear(){this.controls.length=0,this.updateValueAndValidity()}setValue(e,t={emitEvent:!0}){this.controls.forEach((r,o)=>r.setValue(e?.[o],{emitEvent:!1,onlySelf:!0})),this._value=this.controls.map(r=>r.value),t.emitEvent!==!1&&this.valueChanges.emit(this._value),this.updateValueAndValidity(t)}markAllAsTouched(){this.markAsTouched(),this.controls.forEach(e=>e.markAllAsTouched())}runSyncValidators(){let e=this.controls.some(t=>t.errors)?{children:this.controls.map(t=>t.errors)}:null;return this.mergeErrors(super.runSyncValidators(),e)}};function $t(a){return!!a&&typeof a=="object"&&!Array.isArray(a)&&("validators"in a||"asyncValidators"in a)}var De=class{control(e=null,t,r){return new xe(e,t,r)}group(e,t,r){let o={};return Object.keys(e).forEach(s=>{let i=e[s];o[s]=Array.isArray(i)?this.control(i[0],i[1],i[2]):i instanceof xe||i instanceof Se||i instanceof et?i:this.control(i)}),new Se(o,t,r)}array(e,t,r){let o=e.map(s=>Array.isArray(s)?this.control(s[0],s[1],s[2]):s);return new et(o,t,r)}};b(De,[[E(),0]]);var ie=class{constructor(e){this.elementRef=e,this.handleInput=()=>{if(!this.control)return;let r=this.elementRef.nativeElement?.value;this.control.setValue(r),this.control.markAsDirty(),this.control.markAsTouched()};let t=this.elementRef?.nativeElement;t?.addEventListener?.("input",this.handleInput),t?.addEventListener?.("change",this.handleInput)}set formControl(e){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe(),this.control=e,e&&(this.writeValue(e.value),this.subscription=e.valueChanges.subscribe(t=>this.writeValue(t)),this.statusSubscription=e.statusChanges.subscribe(()=>this.syncValidity()),this.syncValidity())}get formControl(){return this.control}onDestroy(){this.subscription?.unsubscribe(),this.statusSubscription?.unsubscribe();let e=this.elementRef?.nativeElement;e?.removeEventListener?.("input",this.handleInput),e?.removeEventListener?.("change",this.handleInput)}writeValue(e){let t=this.elementRef?.nativeElement;t&&t.value!==e&&(t.value=e??"")}syncValidity(){let e=this.elementRef?.nativeElement,t=!!this.control?.invalid;e?.setAttribute?.("aria-invalid",t?"true":"false"),t?e?.classList?.add?.("is-invalid"):e?.classList?.remove?.("is-invalid")}};Reflect.metadata("design:paramtypes",[F])(ie);Reflect.metadata("design:paramtypes",[Object])(ie.prototype,"formControl");b(ie,[[f(),1,"formControl"],[Nt({selector:"[formControl]"}),0]]);var fe=class{set formGroup(e){this.group=e}get formGroup(){return this.group}get value(){return this.group?.value}get valid(){return this.group?.valid!==!1}};Reflect.metadata("design:paramtypes",[Object])(fe.prototype,"formGroup");b(fe,[[f(),1,"formGroup"],[Nt({selector:"[formGroup]"}),0]]);var je=class{};b(je,[[H({providers:[De,ie,fe],declarations:[ie,fe],exports:[De,ie,fe]}),0]]);var Tr={required:"Required",requiredTrue:"Required",email:"Invalid email address",url:"Invalid URL",min:"Value is too small",max:"Value is too large",minlength:"Too short",maxlength:"Too long",pattern:"Invalid format",json:"Invalid JSON",number:"Must be a number",integer:"Must be an integer",color:"Use a hex color such as #2563eb",regex:"Invalid regular expression",minItems:"Too few items",maxItems:"Too many items"};function Pe(a){return a==null||a===""||Array.isArray(a)&&a.length===0}function Nr(a){return Pe(a.value)||Number.isFinite(Number(a.value))?null:{number:!0}}function Er(a){if(Pe(a.value))return null;let e=Number(a.value);return Number.isFinite(e)&&Math.floor(e)===e?null:{integer:!0}}function Or(a){return Pe(a.value)||/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(a.value))?null:{color:!0}}function Lr(a){if(Pe(a.value))return null;try{return new RegExp(String(a.value)),null}catch{return{regex:!0}}}function ko(a,e){return t=>{if(!Array.isArray(t.value))return null;let r=t.value.length;return a==="minItems"&&r<e?{minItems:{required:e,actual:r}}:a==="maxItems"&&r>e?{maxItems:{required:e,actual:r}}:null}}function Mr(a){return Pe(a.value)||/^(https?:\/\/|\/)[^\s]+$/i.test(String(a.value))?null:{url:!0}}function _r(a){if(Pe(a.value)||typeof a.value!="string")return null;try{return JSON.parse(a.value),null}catch{return{json:!0}}}function Dr(a){let e=[],t=new Set,r=o=>{t.has(o.type)||(t.add(o.type),e.push(o))};return(a.rules||[]).forEach(o=>{r(typeof o=="string"?{type:o}:o)}),a.required&&r({type:"required"}),(a.type==="number"||a.type==="range")&&r({type:"number"}),a.type==="email"&&r({type:"email"}),a.type==="url"&&r({type:"url"}),a.type==="json"&&r({type:"json"}),a.type==="color"&&r({type:"color"}),a.min!==void 0&&r({type:"min",value:a.min}),a.max!==void 0&&r({type:"max",value:a.max}),a.minLength!==void 0&&r({type:"minLength",value:a.minLength}),a.maxLength!==void 0&&r({type:"maxLength",value:a.maxLength}),a.pattern&&r({type:"pattern",value:a.pattern}),a.minItems!==void 0&&r({type:"minItems",value:a.minItems}),a.maxItems!==void 0&&r({type:"maxItems",value:a.maxItems}),e}function jr(a){switch(a.type){case"required":return se.required;case"requiredTrue":return se.requiredTrue;case"email":return se.email;case"url":return Mr;case"min":return se.min(Number(a.value));case"max":return se.max(Number(a.value));case"minLength":return se.minLength(Number(a.value));case"maxLength":return se.maxLength(Number(a.value));case"pattern":try{return se.pattern(new RegExp(String(a.value)))}catch{return}case"json":return _r;case"color":return Or;case"regex":return Lr;case"minItems":return ko("minItems",Number(a.value));case"maxItems":return ko("maxItems",Number(a.value));case"number":return Nr;case"integer":return Er;default:return}}function Wt(a){let e=[],t={};return Dr(a).forEach(r=>{let o=jr(r);if(o&&(e.push(o),r.message)){let s=r.type==="minLength"?"minlength":r.type==="maxLength"?"maxlength":r.type;t[s]=r.message}}),{validators:e,messages:t}}function Jt(a,e,t,r){if(!e)return"";let o=Object.keys(e);for(let s of o){let i=a.errorMessages?.[s]||t?.[s]||r?.[s]||Tr[s];if(i)return i}return""}function Ht(a,e={},t){let r=Array.isArray(a)?a:a?.fields||[],o=[];for(let s of r){let i={value:e?.[s.key]},l=Wt(s),n={};for(let d of l.validators){let c=d(i);c&&Object.assign(n,c)}Object.keys(n).length&&o.push({key:s.key,errors:n,message:Jt(s,n,l.messages,t)})}return{valid:o.length===0,issues:o}}function Pr(a){return{...a,key:String(a?.key??""),type:a?.type||"text",options:Array.isArray(a?.options)?a.options:void 0,rules:Array.isArray(a?.rules)?a.rules:void 0}}function Vr(a){let e=a;return typeof e=="string"&&(e=JSON.parse(e)),Array.isArray(e)&&(e={fields:e}),!e||typeof e!="object"?{fields:[]}:{...e,fields:(Array.isArray(e.fields)?e.fields:[]).filter(t=>t&&t.key).map(Pr)}}function zr(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(r=>String(r)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function Fr(a,e){return!!a&&Object.prototype.hasOwnProperty.call(a,e)}var qr=0,M=class{constructor(){this.classPrefix="df",this.showActions=!1,this.submitLabel="",this.resetLabel="",this.resetFieldLabel="Reset to default",this.emptyLabel="No fields",this.messages={},this._schema={fields:[]},this._value={},this._contextKey="",this.formSignature="",this.schemaSignature="",this.valueSignature="",this.schemaError="",this.validationErrors={},this.ruleMessages={},this.submitAttempted=!1,this.valueVersion=0,this.destroyed=!1,this.syncQueued=!1,this.syncMode="none",this.formId=`dynamic-form-${++qr}`,this.jsonRawFields={}}set schema(e){let t,r="";try{t=Vr(e)}catch(s){t={fields:[]},r=`Invalid form schema: ${s.message}`}let o=JSON.stringify(t);o===this.schemaSignature&&r===this.schemaError||(this.schemaSignature=o,this.schemaError=r,this._schema=t,Promise.resolve().then(()=>{this.destroyed||this.applySchema()}))}get schema(){return this._schema}set value(e){let t=e&&typeof e=="object"?e:{},r=JSON.stringify(t);r!==this.valueSignature&&(this.valueSignature=r,this._value=t,this.scheduleSync(!1))}get value(){return this._value}set contextKey(e){let t=String(e??"");t!==this._contextKey&&(this._contextKey=t,this.scheduleSync(!0))}get contextKey(){return this._contextKey}scheduleSync(e){e?this.syncMode="force":this.syncMode==="none"&&(this.syncMode="soft"),!this.syncQueued&&(this.syncQueued=!0,Promise.resolve().then(()=>{this.syncQueued=!1;let t=this.syncMode;this.syncMode="none",this.destroyed||this.syncValues(t==="force")}))}get submitText(){return this.submitLabel||this._schema?.submitLabel||"Submit"}get resetText(){return this.resetLabel||this._schema?.resetLabel||"Reset"}get formValid(){return!!this.form?.valid}get isDirty(){return!!this.form?.dirty}get visibleGroups(){this.valueVersion;let e=[],t={};return this.schemaFields().forEach(r=>{if(r.hidden||r.type==="hidden"||!this.isVisible(r))return;let o=r.group||this._schema?.defaultGroupLabel||"",s=t[o];s===void 0&&(s=e.length,t[o]=s,e.push({label:o,fields:[]})),e[s].fields.push(r)}),e}schemaFields(){return this._schema?.fields||[]}applySchema(){let e=this.schemaFields(),t=e.map(s=>[s.key,s.type,s.required?1:0,s.defaultValue===void 0?"":JSON.stringify(s.defaultValue),JSON.stringify(s.rules||""),s.min??"",s.max??"",s.minLength??"",s.maxLength??"",s.pattern||""].join(":")).join("|");if(this.form&&t===this.formSignature){this.syncValues(!1);return}let r={};this.ruleMessages={},e.forEach(s=>{let i=Wt(s);this.ruleMessages[s.key]=i.messages,r[s.key]=new xe(this.initialValue(s),i.validators)});let o=new Se(r);o[Z]=!0,Object.values(r).forEach(s=>{s[Z]=!0}),this.form=o,this.formSignature=t,this.valueVersion+=1,this.refreshErrors()}syncValues(e){if(!this.form){this.applySchema();return}this.schemaFields().forEach(t=>{let r=this.form?.get(t.key);if(!r)return;let o=this.initialValue(t);e?r.reset(o,{emitEvent:!1}):!r.dirty&&r.value!==o&&r.setValue(o,{emitEvent:!1})}),this.valueVersion+=1,this.refreshErrors()}refreshErrors(){let e={};this.schemaFields().forEach(t=>{e[t.key]=this.form?.get(t.key)?.errors||null}),this.validationErrors=e}fieldDisplayValue(e,t){return e.type==="json"?typeof t=="string"?t:t==null?"":JSON.stringify(t,null,2):e.type==="checkbox"||e.type==="switch"?!!t:t??""}initialValue(e){let t=this._value||{},r=Fr(t,e.key)?t[e.key]:e.defaultValue;return e.type==="json"?r:this.fieldDisplayValue(e,r)}resetValue(e){return e.type==="json"?e.defaultValue:this.fieldDisplayValue(e,e.defaultValue)}coerceValue(e,t){return e.type==="checkbox"||e.type==="switch"?!!t:e.type==="number"||e.type==="range"?t===""||t===void 0||t===null?"":Number(t):t}updateValue(e,t){let r=this.form?.get(e.key);if(!r)return;r.setValue(this.coerceValue(e,t)),r.markAsDirty(),r.markAsTouched(),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:r.errors};let o={key:e.key,value:r.value,field:e,valid:r.valid,errors:r.errors};this.changeAction?.(o),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}isJsonRaw(e){return this.jsonRawFields[e.key]===!0}isJsonObjectValue(e){let t=this.fieldValue(e);return t==null||t===""||typeof t=="object"&&!Array.isArray(t)}isJsonObjectEditor(e){return e.type==="json"&&!this.isJsonRaw(e)&&this.isJsonObjectValue(e)}isJsonTextArea(e){return e.type==="json"&&!this.isJsonObjectEditor(e)}jsonTextValue(e){let t=this.fieldValue(e);if(typeof t=="string")return t;try{return JSON.stringify(t??{},null,2)}catch{return""}}toggleJsonMode(e){if(this.isJsonRaw(e)){let t={...this.jsonRawFields};delete t[e.key],this.jsonRawFields=t;let r=this.fieldValue(e);if(typeof r=="string"&&r.trim())try{this.updateValue(e,JSON.parse(r))}catch{}return}this.jsonRawFields={...this.jsonRawFields,[e.key]:!0}}jsonEntries(e){let t=this.fieldValue(e);return!t||typeof t!="object"||Array.isArray(t)?[]:Object.entries(t).map(([r,o])=>({key:r,value:o,display:typeof o=="object"&&o!==null?JSON.stringify(o):String(o??"")}))}updateJsonObject(e,t){let r={};for(let o of t)r[o.key]=o.value;this._value={...this._value||{},[e.key]:r},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,r)}addJsonEntry(e){let t=this.jsonEntries(e).map(s=>({key:s.key,value:s.value})),r=new Set(t.map(s=>s.key)),o=t.length+1;for(;r.has(`field${o}`);)o+=1;t.push({key:`field${o}`,value:""}),this.updateJsonObject(e,t)}removeJsonEntry(e,t){let r=this.jsonEntries(e).map(o=>({key:o.key,value:o.value}));r.splice(t,1),this.updateJsonObject(e,r)}changeJsonEntryKey(e,t,r){let o=this.jsonEntries(e).map(s=>({key:s.key,value:s.value}));o[t]={...o[t],key:String(r?.target?.value??"")},this.updateJsonObject(e,o)}changeJsonEntryValue(e,t,r){let o=this.jsonEntries(e).map(l=>({key:l.key,value:l.value})),s=String(r?.target?.value??""),i=s;if(s!=="")try{i=JSON.parse(s)}catch{i=s}else i="";o[t]={...o[t],value:i},this.updateJsonObject(e,o)}jsonModeClass(){return`${this.classPrefix}-field-mode`}isKeyValueInput(e){return e.type==="keyvalue"}keyValueValueType(e){return e.valueType==="number"||e.valueType==="boolean"?e.valueType:"text"}keyValueEntries(e){let t=this.fieldValue(e);return!t||typeof t!="object"||Array.isArray(t)?[]:Object.entries(t).map(([r,o])=>({key:r,value:o}))}updateKeyValue(e,t){let r={};for(let o of t)r[o.key]=o.value;this._value={...this._value||{},[e.key]:r},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,r)}addKeyValue(e){let t=this.keyValueEntries(e),r=new Set(t.map(i=>i.key)),o=t.length+1;for(;r.has(`field${o}`);)o+=1;let s=this.keyValueValueType(e);t.push({key:`field${o}`,value:s==="number"?0:s==="boolean"?!1:""}),this.updateKeyValue(e,t)}removeKeyValue(e,t){let r=this.keyValueEntries(e);r.splice(t,1),this.updateKeyValue(e,r)}changeKeyValueKey(e,t,r){let o=this.keyValueEntries(e);o[t]={...o[t],key:String(r?.target?.value??"")},this.updateKeyValue(e,o)}changeKeyValueValue(e,t,r){let o=this.keyValueEntries(e),s=this.keyValueValueType(e),i=s==="boolean"?!!r?.target?.checked:r?.target?.value,l=s==="number"?i===""?0:Number(i):s==="boolean"?!!i:i;o[t]={...o[t],value:l},this.updateKeyValue(e,o)}keyValueClass(){return`${this.classPrefix}-keyvalue`}keyValueRowClass(){return`${this.classPrefix}-keyvalue-row`}keyValueKeyClass(){return`${this.classPrefix}-input ${this.classPrefix}-keyvalue-key`}keyValueValueClass(){return`${this.classPrefix}-input ${this.classPrefix}-keyvalue-value`}isJsonInput(e){return e.type==="json"}isListInput(e){return e.type==="list"}listIndex(e,t){let r=this.listItems(e).indexOf(t);return r<0?0:r}listItems(e){let t=this.fieldValue(e);return Array.isArray(t)?t:[]}listItemValue(e,t){let r=e?.[t.key];return this.fieldDisplayValue(t,r===void 0?t.defaultValue:r)}listItemChecked(e,t){return e?.[t.key]===!0}isListItemVisible(e,t){let r=e.visibleWhen;if(!r)return!0;let o=t?.[r.key];return r.equals!==void 0?String(o)===String(r.equals):r.notEquals!==void 0?String(o)!==String(r.notEquals):r.in?r.in.map(s=>String(s)).includes(String(o)):r.truthy!==void 0?r.truthy?!!o:!o:r.falsy!==void 0?r.falsy?!o:!!o:!0}listItemError(e,t){let r=this.listItemValue(t,e),o=r==null||r==="";return e.required&&o?this.messages?.required||e.errorMessages?.required||"Required":""}updateList(e,t){let r=[...t],o=e.key;this._value={...this._value||{},[o]:r},this.valueSignature=JSON.stringify(this._value),this.updateValue(e,r)}addListItem(e){let t=this.listItems(e).map(o=>({...o})),r={};(e.itemFields||[]).forEach(o=>{r[o.key]=o.defaultValue!==void 0?o.defaultValue:o.type==="checkbox"||o.type==="switch"?!1:""}),t.push(r),this.updateList(e,t)}removeListItem(e,t){let r=this.listItems(e).map(o=>({...o}));r.splice(t,1),this.updateList(e,r)}changeListItem(e,t,r,o){let s=this.listItems(e).map(l=>({...l})),i=r.type==="checkbox"||r.type==="switch"?!!o?.target?.checked:o?.target?.value;s[t]={...s[t]||{},[r.key]:this.coerceValue(r,i)},this.updateList(e,s)}changeListItemOption(e,t,r,o){let s=this.listItems(e).map(i=>({...i}));s[t]={...s[t]||{},[r.key]:o},this.updateList(e,s)}listClass(){return`${this.classPrefix}-list`}listRowClass(){return`${this.classPrefix}-list-row`}listFieldsClass(){return`${this.classPrefix}-list-fields`}listItemFieldClass(e){return`${this.classPrefix}-list-field`}listAddClass(){return`${this.classPrefix}-list-add`}listRemoveClass(){return`${this.classPrefix}-list-remove`}changeText(e,t){this.updateValue(e,t?.target?.value)}changeBoolean(e,t){this.updateValue(e,!!t?.target?.checked)}chooseOption(e,t){this.updateValue(e,t)}blurField(e){this.blurAction?.(e)}resetField(e){let t=this.form?.get(e.key);t&&(t.reset(this.resetValue(e),{emitEvent:!1}),this.valueVersion+=1,this.validationErrors={...this.validationErrors,[e.key]:t.errors},this.changeAction?.({key:e.key,value:t.value,field:e,valid:t.valid,errors:t.errors}),this.validityAction?.(!!this.form?.valid,this.form?.errors||null))}reset(e=!0){if(this.schemaFields().forEach(t=>{let r=t.defaultValue!==void 0?this.resetValue(t):this.initialValue(t);this.form?.get(t.key)?.reset(r,{emitEvent:!1})}),this.submitAttempted=!1,this.valueVersion+=1,this.refreshErrors(),e){let t=this.getValue();this.resetAction?.(t),this.validityAction?.(!!this.form?.valid,this.form?.errors||null)}return this.getValue()}resetForm(){this.reset(!0)}submit(){this.submitAttempted=!0,this.form?.markAllAsTouched(),this.refreshErrors();let e={value:this.getValue(),valid:!!this.form?.valid,errors:this.form?.errors||null};return this.submitAction?.(e),e}validate(){return{valid:!!this.form?.valid,value:this.getValue(),errors:this.form?.errors||null}}getValue(){let e={};return this.schemaFields().forEach(t=>{let r=this.form?.get(t.key),o=r?r.value:this.initialValue(t);switch(t.type){case"number":case"range":e[t.key]=o===""||o===void 0||o===null?"":Number(o);break;case"checkbox":case"switch":e[t.key]=o===!0;break;case"json":if(typeof o=="string"&&o.trim()!=="")try{e[t.key]=JSON.parse(o)}catch{e[t.key]=o}else e[t.key]=o;break;default:e[t.key]=o;break}}),e}setValue(e){this._value=e&&typeof e=="object"?e:{},this.valueSignature=JSON.stringify(this._value),this.valueVersion+=1,this.syncValues(!0)}patchValue(e){this.setValue({...this._value,...e||{}})}sameOptionValue(e,t){return String(e)===String(t)}isVisible(e){if(!e.visibleWhen)return!0;let t=this.form?.get(e.visibleWhen.key),r=t?t.value:this._value?.[e.visibleWhen.key];return zr(r,e.visibleWhen)}fieldLabel(e){return e.label||e.key}fieldValue(e){return this.valueVersion,this.form?.get(e.key)?.value??this.initialValue(e)}fieldChecked(e){return this.fieldValue(e)===!0}isRequired(e){return e.required===!0||(e.rules||[]).some(t=>{let r=typeof t=="string"?t:t?.type;return r==="required"||r==="requiredTrue"})}canReset(e){return e.defaultValue!==void 0&&!e.readonly&&!e.disabled}errorFor(e){let t=this.validationErrors[e.key],r=this.form?.get(e.key);if(!r||r.valid||!(r.dirty||r.touched||this.submitAttempted))return"";let o={...this._schema?.messages||{},...this.messages||{}};return Jt(e,t,this.ruleMessages[e.key],o)}encodeValue(e){return encodeURIComponent(String(this.fieldValue(e)??""))}suggestionData(e){return encodeURIComponent(JSON.stringify(e.suggestions||[]))}htmlType(e){switch(e.type){case"number":return"number";case"range":return"range";case"password":case"email":case"url":case"tel":case"search":case"date":case"time":case"datetime-local":case"month":case"week":case"color":return e.type;default:return"text"}}isTextInput(e){return["text","password","email","url","tel","search","date","time","datetime-local","month","week","color"].includes(e.type)}isNumberInput(e){return e.type==="number"||e.type==="range"}isBooleanInput(e){return e.type==="checkbox"||e.type==="switch"}isOptionInput(e){return e.type==="select"||e.type==="radio"}isTextareaInput(e){return e.type==="textarea"}isCodeInput(e){return e.type==="code"}formClass(){return`${this.classPrefix}-form dynamic-form`}schemaErrorClass(){return`${this.classPrefix}-schema-error`}groupClass(){return`${this.classPrefix}-field-group`}groupFieldsClass(){return`${this.classPrefix}-fields`}groupTitleClass(){return`${this.classPrefix}-field-group-title`}noFieldsClass(){return`${this.classPrefix}-no-fields`}fieldClass(e){let t=e.span||"full";return[`${this.classPrefix}-field`,t==="half"?"is-half":"is-full",e.fieldClass||""].filter(Boolean).join(" ")}labelRowClass(){return`${this.classPrefix}-field-label-row`}labelClass(){return`${this.classPrefix}-field-label`}requiredClass(){return`${this.classPrefix}-field-required`}resetClass(){return`${this.classPrefix}-field-reset`}inputClass(e){return[`${this.classPrefix}-input`,e.inputClass||""].filter(Boolean).join(" ")}inputWrapClass(e){return`${this.classPrefix}-input-wrap${e.unit?" has-unit":""}`}inputUnitClass(){return`${this.classPrefix}-input-unit`}textareaClass(e){return[`${this.classPrefix}-textarea`,e.inputClass||""].filter(Boolean).join(" ")}codeClass(e){return[`${this.classPrefix}-textarea`,`${this.classPrefix}-code-editor`,e.inputClass||""].filter(Boolean).join(" ")}checkboxRowClass(){return`${this.classPrefix}-checkbox-row`}optionsClass(){return`${this.classPrefix}-options`}optionClass(e,t){return[`${this.classPrefix}-option`,this.sameOptionValue(t.value,this.fieldValue(e))?"is-selected":"",t.disabled||e.disabled||e.readonly?"is-disabled":""].filter(Boolean).join(" ")}errorClass(){return`${this.classPrefix}-field-error`}hintClass(){return`${this.classPrefix}-field-hint`}actionsClass(){return`${this.classPrefix}-actions`}buttonClass(e){return[`${this.classPrefix}-btn`,e?`${this.classPrefix}-btn-primary`:""].filter(Boolean).join(" ")}onDestroy(){this.destroyed=!0}};Reflect.metadata("design:type",Object)(M.prototype,"classPrefix");Reflect.metadata("design:type",Object)(M.prototype,"showActions");Reflect.metadata("design:type",Object)(M.prototype,"submitLabel");Reflect.metadata("design:type",Object)(M.prototype,"resetLabel");Reflect.metadata("design:type",Object)(M.prototype,"resetFieldLabel");Reflect.metadata("design:type",Object)(M.prototype,"emptyLabel");Reflect.metadata("design:type",Object)(M.prototype,"messages");Reflect.metadata("design:type",Function)(M.prototype,"changeAction");Reflect.metadata("design:type",Function)(M.prototype,"blurAction");Reflect.metadata("design:type",Function)(M.prototype,"submitAction");Reflect.metadata("design:type",Function)(M.prototype,"resetAction");Reflect.metadata("design:type",Function)(M.prototype,"validityAction");Reflect.metadata("design:paramtypes",[Object])(M.prototype,"schema");Reflect.metadata("design:paramtypes",[Object])(M.prototype,"value");Reflect.metadata("design:paramtypes",[String])(M.prototype,"contextKey");b(M,[[f(),1,"classPrefix"],[f(),1,"showActions"],[f(),1,"submitLabel"],[f(),1,"resetLabel"],[f(),1,"resetFieldLabel"],[f(),1,"emptyLabel"],[f(),1,"messages"],[f(),1,"changeAction"],[f(),1,"blurAction"],[f(),1,"submitAction"],[f(),1,"resetAction"],[f(),1,"validityAction"],[f(),1,"schema"],[f(),1,"value"],[f(),1,"contextKey"],[R({selector:"dynamic-form",template:`
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
    </div>`}),0]]);var vo="tsdi-dynamic-form-styles",$r=`
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

`;function xo(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById(vo))return;let e=a.createElement("style");e.setAttribute("id",vo),e.textContent=$r,a.head.appendChild(e)}var Ve=class{};b(Ve,[[H({declarations:[M],exports:[M]}),0]]);function So(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(t=>String(t)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function Wr(a){return{...a,type:a.type==="boolean"?"checkbox":a.type}}function Co(a,e){let t=[];for(let r of a?.nodes||[]){let o=e.get(r.type);if(!o?.fields?.length)continue;let s=r.config||{},i={};for(let d of o.fields)i[d.key]=s[d.key]!==void 0?s[d.key]:d.defaultValue;let l=o.fields.filter(d=>!d.visibleWhen||So(i[d.visibleWhen.key],d.visibleWhen)).map(Wr),n=Ht(l,i);for(let d of n.issues)t.push({nodeId:r.id,nodeName:r.name||r.id,fieldKey:d.key,label:l.find(c=>c.key===d.key)?.label||d.key,message:d.message});for(let d of l){if(!d.itemFields?.length)continue;let c=Array.isArray(i[d.key])?i[d.key]:[];if(d.required&&!c.length){t.push({nodeId:r.id,nodeName:r.name||r.id,fieldKey:d.key,label:d.label||d.key,message:"Required"});continue}c.forEach((p,u)=>{let m=d.itemFields.filter(g=>!g.visibleWhen||So(p?.[g.visibleWhen.key],g.visibleWhen)),w=Ht(m,p||{});for(let g of w.issues){let v=m.find(x=>x.key===g.key)?.label||g.key;t.push({nodeId:r.id,nodeName:r.name||r.id,fieldKey:`${d.key}[${u}].${g.key}`,label:`${d.label||d.key} ${u+1} \xB7 ${v}`,message:g.message})}})}}return t}function tt(a,e,t){let r=new Set,o=!1,s=a.trim();if(!s)throw new Error("Empty cron field");for(let i of s.split(",")){let[l,n]=i.split("/"),d=n===void 0?1:Number(n);if(!Number.isInteger(d)||d<=0)throw new Error(`Invalid cron step: ${i}`);let c,p;if(l==="*")c=e,p=t;else if(l.includes("-")){let[u,m]=l.split("-").map(Number);if(!Number.isInteger(u)||!Number.isInteger(m))throw new Error(`Invalid cron range: ${i}`);c=u,p=m}else{let u=Number(l);if(!Number.isInteger(u))throw new Error(`Invalid cron value: ${i}`);c=u,p=u}if(c<e||p>t||c>p)throw new Error(`Cron value out of range: ${i}`);l!=="*"&&(o=!0);for(let u=c;u<=p;u+=d)r.add(u)}return{values:r,restricted:o}}function Jr(a){let e=String(a||"").trim().split(/\s+/).filter(Boolean);if(e.length!==5)throw new Error("Cron expression must have five fields");let t=tt(e[0],0,59),r=tt(e[1],0,23),o=tt(e[2],1,31),s=tt(e[3],1,12),i=tt(e[4],0,6);return{minutes:t.values,hours:r.values,days:o.values,months:s.values,weekdays:i.values,dayRestricted:o.restricted,weekdayRestricted:i.restricted}}function Hr(a,e){if(!a.minutes.has(e.getMinutes())||!a.hours.has(e.getHours())||!a.months.has(e.getMonth()+1))return!1;let t=a.days.has(e.getDate()),r=a.weekdays.has(e.getDay());return a.dayRestricted&&a.weekdayRestricted?t||r:t&&r}function Ro(a,e=new Date){let t=Jr(a),r=new Date(e.getTime());r.setSeconds(0,0),r.setMinutes(r.getMinutes()+1);let o=e.getTime()+366*24*60*60*1e3;for(;r.getTime()<=o;){if(Hr(t,r))return r;r.setMinutes(r.getMinutes()+1)}}function Br(a){return a==="min"?6e4:a==="ms"?1:1e3}var mt=class{constructor(e){this.service=e}start(e,t={}){let r=!1,o=!1,s=0,i=new Set,l=async()=>{if(!(r||o)){o=!0;try{let k=await this.service.execute(e,t.context||{},t.execution);t.onResult?.(k)}catch(k){t.onError?.(k)}finally{o=!1}}},n=e.nodes.find(k=>{let T=String(k.config?.trigger||"manual");return k.type==="inject"&&(T==="interval"||T==="once"||T==="cron")});if(!n)return l(),{get running(){return!r},stop(){r=!0}};let d=n.config||{},c=String(d.trigger||"manual"),p=Math.max(0,Number(d.onceDelay)||0)*1e3,u=Math.max(1,(Number(d.interval)||1)*Br(String(d.intervalUnit||"s"))),m=Math.max(0,Number(d.repeatCount)||0),w={mode:c==="interval"?"interval":c==="cron"?"cron":"once",delayMs:p,intervalMs:u,repeatCount:m,cron:String(d.cron||"").trim()},g=()=>{if(w.repeatCount>0&&s>=w.repeatCount){r=!0;for(let k of i)clearTimeout(k);i.clear()}},v=()=>{let k=()=>{if(!r&&(s+=1,l(),g(),!r)){let A=setTimeout(k,w.intervalMs);i.add(A)}},T=setTimeout(k,w.delayMs||w.intervalMs);i.add(T)},x=()=>{if(r)return;let k;try{k=Ro(w.cron||"")}catch(q){r=!0,t.onError?.(q);return}if(!k){r=!0,t.onError?.(new Error("Cron expression never fires"));return}let T=Math.max(0,k.getTime()-Date.now()),A=Math.min(T,2147483647),Y=setTimeout(()=>{if(!r){if(A<T){x();return}s+=1,l(),g(),r||x()}},A);i.add(Y)};if(w.mode==="interval")v();else if(w.mode==="cron")x();else{let k=setTimeout(()=>{s+=1,l(),g()},w.delayMs);i.add(k)}return{get running(){return!r},stop(){r=!0;for(let k of i)clearTimeout(k);i.clear()}}}};function ot(a){let e=ke(a),t=new Map,r=new Map,o=new Map,s=(a?.connections||[]).slice();for(let w of a?.nodes||[])t.set(w.id,w),r.set(w.id,[]),o.set(w.id,[]);for(let w of s)r.get(w.sourceNodeId)?.push(w),o.get(w.targetNodeId)?.push(w);let i=w=>String(w.config?.links||"").split(",").map(g=>g.trim()).filter(Boolean),l=[...t.values()].filter(w=>w.type==="link"&&String(w.config?.mode||"out")!=="in"),n=[...t.values()].filter(w=>w.type==="link"&&String(w.config?.mode)==="in");for(let w of l){let g=new Set(i(w));if(g.size)for(let v of n){if(!i(v).some(k=>g.has(k)))continue;let x={id:`link:${w.id}->${v.id}`,sourceNodeId:w.id,sourcePort:"out",targetNodeId:v.id,targetPort:"in"};s.push(x),r.get(w.id)?.push(x),o.get(v.id)?.push(x)}}let d=yo(a),c=d[0],p=[],u=new Set,m=d.map(w=>w.id);for(m.forEach(w=>u.add(w));m.length;){let w=m.shift();p.push(w);for(let g of r.get(w)||[])!u.has(g.targetNodeId)&&t.has(g.targetNodeId)&&(u.add(g.targetNodeId),m.push(g.targetNodeId))}for(let w of t.keys())u.has(w)||p.push(w);return{definition:a,entry:c,entries:d,nodes:t,outgoing:r,incoming:o,edges:s,order:p,reachable:u,valid:e.valid,errors:e.errors}}function Io(a,e={}){let t=ot(a),r=e.originX??80,o=e.originY??80,s=e.columnGap??240,i=e.rowGap??140,l=new Map,n=[],d=(t.entries.length?t.entries:t.entry?[t.entry]:[]).map(u=>u.id),c=[...d];for(d.forEach(u=>l.set(u,0));c.length;){let u=c.shift(),m=l.get(u)||0;for(let w of t.outgoing.get(u)||[]){let g=w.targetNodeId;if(!t.nodes.has(g))continue;let v=m+1,x=l.get(g);(x===void 0||x<v)&&(x===void 0&&c.push(g),l.set(g,v))}}for(let u of t.order){l.has(u)||l.set(u,Ur(l,0));let m=l.get(u)||0;n[m]||(n[m]=[]),n[m].push(u)}let p={};return n.forEach((u,m)=>{u.forEach((w,g)=>{p[w]={x:r+m*s,y:o+g*i}})}),p}function Ur(a,e){let t=e;return a.forEach(r=>{t=Math.max(t,r)}),t+1}var Ao,To,Kr;function rt(a){return{id:a.id,name:a.name,description:a.description,nodeCount:a.nodes?.length||0,connectionCount:a.connections?.length||0,updatedAt:a.metadata?.updatedAt||new Date().toISOString()}}function Bt(a){return JSON.parse(JSON.stringify(a))}var Ut=class{constructor(){this[Ao]=!0,this.definitions=new Map}async list(){return Array.from(this.definitions.values()).map(rt).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){let t=this.definitions.get(e);return t?Bt(t):void 0}async save(e){let t={...Bt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return this.definitions.set(t.id,t),rt(t)}async remove(e){return this.definitions.delete(e)}async clear(){this.definitions.clear()}};Ao=Z;var Kt=class{constructor(e="tsdi.workflow.definitions.v1",t=No()){this.key=e,this.storage=t,this[To]=!0}async list(){return this.readAll().map(rt).sort((e,t)=>String(t.updatedAt||"").localeCompare(String(e.updatedAt||"")))}async get(e){return this.readAll().find(t=>t.id===e)}async save(e){let t=this.readAll().filter(o=>o.id!==e.id),r={...Bt(e),metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}};return t.push(r),this.writeAll(t),rt(r)}async remove(e){let t=this.readAll(),r=t.filter(o=>o.id!==e);return r.length===t.length?!1:(this.writeAll(r),!0)}async clear(){this.storage?.removeItem(this.key)}readAll(){if(!this.storage)return[];try{let e=this.storage.getItem(this.key),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}}writeAll(e){if(this.storage)try{this.storage.setItem(this.key,JSON.stringify(e))}catch{}}};To=Z;function No(){try{return globalThis.localStorage}catch{return}}function Eo(){return No()?new Kt:new Ut}Kr=Z;function Oo(a){return rt(a)}var G=class{};b(G,[[de(),0]]);var oe=class extends G{constructor(e,t){super(),this.node=e,this.runtimeHost=t}get id(){return this.node.id}get name(){return this.node.name}get nodeType(){return this.node.type}execute(e){return Xe(this.node,e,this.runtimeHost)}};var Yt=class extends ro{constructor(e){super(e,{enableTypeChain:!1})}getHandlerType(){return oe}getBackend(){return e=>Xe(e.node,e.context,e.host,e.extras)}handleNode(e){return Promise.resolve(this.handle(e,It(this.injector)))}};function Lo(a,e){let t=a.get(Be,null);if(t)return e.forEach(o=>t.addInterceptor(oe,o)),new Yt(a);let r=new oo(o=>Xe(o.node,o.context,o.host,o.extras),()=>e);return{handleNode:o=>Promise.resolve(r.handle(o,It(a)))}}function Yr(a){return{nodeId:a,status:"pending"}}var gt=class{intercept(e,t,r){let{node:o,state:s,emit:i}=e,l=s.nodeStates?.get(o.id)||Yr(o.id);return l.status="running",l.startedAt=Date.now(),s.nodeStates?.set(o.id,l),s.currentNodeId=o.id,s.activeNodeIds=[...s.activeNodeIds||[],o.id],i({type:"node-start",nodeId:o.id,status:"running"}),Promise.resolve(t.handle(e,r)).then(n=>(this.finish(e,l,n),n),n=>{let d={success:!1,error:n,data:{nodeId:o.id}};return this.finish(e,l,d),d})}finish(e,t,r){let{node:o,state:s,emit:i}=e;t.finishedAt=Date.now(),t.durationMs=t.startedAt!==void 0?t.finishedAt-t.startedAt:void 0,t.status=r.success?"success":"failed",t.result=r,t.error=r.error?.message,s.nodeStates?.set(o.id,t),s.nodeResults.set(o.id,r),s.activeNodeIds=(s.activeNodeIds||[]).filter(l=>l!==o.id),i({type:"node-end",nodeId:o.id,status:t.status,result:r})}};function Gr(a){return a>0?new Promise(e=>setTimeout(e,a)):Promise.resolve()}var Gt=class{constructor(e={}){this.options=e}intercept(e,t,r){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,r));let o=Math.max(0,Number(this.options.retries??1)||0),s=Math.max(0,Number(this.options.delayMs??0)||0),i=Number(this.options.backoff??1)>0?Number(this.options.backoff??1):1,l=this.options.shouldRetry||((d,c)=>c?!0:d?.success===!1),n=async d=>{try{let c=await t.handle(e,r);if(d>=o||!l(c,void 0,e,d))return c}catch(c){if(d>=o||!l(void 0,c,e,d))throw c}return await Gr(s*Math.pow(i,d)),n(d+1)};return n(0)}},wt=class{intercept(e,t,r){let o=e.node.config||{},s=Math.max(0,Math.min(20,Number(o.retry??o.retries)||0)),i=Math.max(0,Number(o.retryDelay)||0),l=Math.max(0,Number(o.timeout)||0);if(!s&&!l)return Promise.resolve(t.handle(e,r));let n={handle:(d,c)=>t.handle(d,c)};if(l>0){let d=new Xt({timeoutMs:l}),c=n;n={handle:(p,u)=>d.intercept(p,c,u)}}if(s>0){let d=new Gt({retries:s,delayMs:i}),c=n;n={handle:(p,u)=>d.intercept(p,c,u)}}return Promise.resolve(n.handle(e,r))}},Xt=class{constructor(e){this.options=e}intercept(e,t,r){if(this.options.filter&&!this.options.filter(e))return Promise.resolve(t.handle(e,r));let o=Math.max(1,Number(this.options.timeoutMs)||1);return new Promise(s=>{let i=!1,l=setTimeout(()=>{i||(i=!0,s({success:!1,error:new Error(this.options.message||`Node ${e.node.id} timed out after ${o}ms`),data:{nodeId:e.node.id,timeoutMs:o}}))},o);Promise.resolve(t.handle(e,r)).then(n=>{i||(i=!0,clearTimeout(l),s(n))},n=>{i||(i=!0,clearTimeout(l),s({success:!1,error:n,data:{nodeId:e.node.id}}))})})}};var Xr=100,Zr=.35,Qr=2.5;function ea(a){return JSON.parse(JSON.stringify(a))}function ta(a){return`${a}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`}function Zt(a,e="zh-CN",t){let r=(u,m)=>C(t,e,`workflow.demo.${u}`,m),o=(u,m,w,g,v,x)=>a.createNode(u,{x:g,y:v},{id:m,name:w,config:x}),s=o("start","start_1",r("start","Start"),80,220),i=o("task","task_1",r("loadInput","Load input"),330,220,{action:"loadInput",result:{approved:!0}}),l=o("condition","condition_1",r("approved","Approved?"),590,220,{field:"approved",operator:"truthy"}),n=o("task","task_2",r("approve","Approve"),850,120,{result:{approved:!0}}),d=o("task","task_3",r("reject","Reject"),850,320,{result:{approved:!1}}),c=o("end","end_1",r("end","End"),1110,220),p=(u,m,w,g)=>({id:u,sourceNodeId:m,sourcePort:w,targetNodeId:g,targetPort:"in"});return{id:"workflow_demo",name:r("name","Approval workflow"),description:r("description","Drag nodes, connect ports, run it, and inspect the live path."),version:"1.0.0",nodes:[s,i,l,n,d,c],connections:[p("conn_1","start_1","out","task_1"),p("conn_2","task_1","out","condition_1"),p("conn_3","condition_1","true","task_2"),p("conn_4","condition_1","false","task_3"),p("conn_5","task_2","out","end_1"),p("conn_6","task_3","out","end_1")],metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}function Mo(a="zh-CN",e){let t=new Date().toISOString();return{id:"workflow_new",name:e||"New workflow",description:"",version:"1.0.0",nodes:[],connections:[],metadata:{createdAt:t,updatedAt:t}}}var Q=class{constructor(e={}){this.selection={},this.zoom=1,this.pan={x:0,y:0},this.executionHistory=[],this.running=!1,this.dirty=!1,this.gridSize=10,this.snapToGrid=!0,this.message="",this.error="",this.messageParams={},this.errorParams={},this.undoStack=[],this.redoStack=[],this.registry=e.registry||new L,this.service=e.service,this.definition=e.definition||Zt(this.registry),this.normalize()}get nodes(){return this.definition.nodes}get connections(){return this.definition.connections}get selectedNode(){if(this.selection.nodeId)return this.definition.nodes.find(e=>e.id===this.selection.nodeId)}get selectedConnection(){if(this.selection.connectionId)return this.definition.connections.find(e=>e.id===this.selection.connectionId)}get canUndo(){return this.undoStack.length>0}get canRedo(){return this.redoStack.length>0}get canResume(){return!!this.checkpoint&&!this.running&&this.checkpoint.status!=="completed"}get resumeExecutionId(){return this.checkpoint?.executionId}get executionId(){return this.activeExecutionId}get isConnecting(){return!!this.connectionDraft}get isDragging(){return!!this.drag}addNode(e,t,r={}){let o=this.registry.get(e);if(!o){this.setError("workflow.error.unknownType",{type:e});return}if(o.singleton&&this.definition.nodes.some(i=>i.type===e)){this.setError("workflow.error.singleton",{label:o.label});return}let s=this.registry.createNode(e,t,{id:this.nextNodeId(e),...r});return this.commit(i=>({...i,nodes:[...i.nodes,s],metadata:{...i.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:s.id},this.clearError(),this.setMessage("workflow.message.added",{name:s.name}),s}removeNode(e){return this.definition.nodes.some(t=>t.id===e)?(this.commit(t=>({...t,nodes:t.nodes.filter(r=>r.id!==e),connections:t.connections.filter(r=>r.sourceNodeId!==e&&r.targetNodeId!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.nodeId===e&&(this.selection={}),this.setMessage("workflow.message.nodeRemoved"),!0):!1}moveNode(e,t){let r=Number.isFinite(t?.x)?t.x:0,o=Number.isFinite(t?.y)?t.y:0,s=this.definition.nodes.find(l=>l.id===e);if(!s)return!1;let i=this.snapPosition({x:r,y:o});return s.position.x===i.x&&s.position.y===i.y?!1:(this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(l=>l.id===e?{...l,position:i}:l)}),!0)}updateNode(e,t){return this.definition.nodes.find(o=>o.id===e)?(this.commit(o=>({...o,nodes:o.nodes.map(s=>s.id===e?{...s,...t,id:s.id}:s),metadata:{...o.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.nodeUpdated"),!0):!1}updateNodeConfig(e,t){let r=this.definition.nodes.find(o=>o.id===e);return r?this.updateNode(e,{config:{...r.config||{},...t}}):!1}resetNodeConfig(e){let t=this.definition.nodes.find(r=>r.id===e);return t?this.updateNode(e,{config:this.registry.defaultConfig(t.type)}):!1}renameNode(e,t){return this.updateNode(e,{name:String(t||"").trim()||e})}renameWorkflow(e){let t=String(e??"").trim();return!t||t===this.definition.name?!1:(this.commit(r=>({...r,name:t})),this.setMessage("workflow.message.renamed",{name:t}),!0)}setSelection(e){this.selection={...e},this.clearError()}selectNode(e){this.setSelection({nodeId:e})}selectConnection(e){this.setSelection({connectionId:e})}clearSelection(){this.selection={}}deleteSelection(){return this.selection.nodeId?this.removeNode(this.selection.nodeId):this.selection.connectionId?this.removeConnection(this.selection.connectionId):!1}addConnection(e,t,r,o){let s=this.definition.nodes.find(u=>u.id===e),i=this.definition.nodes.find(u=>u.id===r);if(!s||!i){this.setError("workflow.error.endpoints");return}if(e===r){this.setError("workflow.error.selfLink");return}let l=t||s.outputs?.[0]?.id||"out",n=o||i.inputs?.[0]?.id||"in";if(s.outputs?.length&&!s.outputs.some(u=>u.id===l)){this.setError("workflow.error.unknownOutput",{port:l});return}if(i.inputs?.length&&!i.inputs.some(u=>u.id===n)){this.setError("workflow.error.unknownInput",{port:n});return}let d=this.definition.connections.find(u=>u.sourceNodeId===e&&u.sourcePort===l&&u.targetNodeId===r&&u.targetPort===n);if(d)return this.selection={connectionId:d.id},d;let c={id:this.nextConnectionId(),sourceNodeId:e,sourcePort:l,targetNodeId:r,targetPort:n},p={...this.definition,connections:[...this.definition.connections,c]};if(qt(p)){this.setError("workflow.error.cycle");return}return this.commit(()=>({...p,metadata:{...p.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={connectionId:c.id},this.clearError(),this.setMessage("workflow.message.connected"),c}removeConnection(e){return this.definition.connections.some(t=>t.id===e)?(this.commit(t=>({...t,connections:t.connections.filter(r=>r.id!==e),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.selection.connectionId===e&&(this.selection={}),this.setMessage("workflow.message.connectionRemoved"),!0):!1}beginNodeDrag(e,t){let r=this.definition.nodes.find(o=>o.id===e);return r?(this.selection={nodeId:e},this.drag={nodeId:e,startX:r.position.x,startY:r.position.y,offsetX:t.x-r.position.x,offsetY:t.y-r.position.y,moved:!1},this.dragStartSnapshot=this.snapshot(),!0):!1}dragNodeTo(e){if(!this.drag)return;let t=Math.round(e.x-this.drag.offsetX),r=Math.round(e.y-this.drag.offsetY),o=this.snapPosition({x:t,y:r});o.x===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.x&&o.y===this.definition.nodes.find(s=>s.id===this.drag.nodeId)?.position.y||(this.drag.moved=!0,this.applyDefinition({...this.definition,nodes:this.definition.nodes.map(s=>s.id===this.drag.nodeId?{...s,position:o}:s)}))}endNodeDrag(){let e=!!this.drag?.moved;return e&&this.dragStartSnapshot&&(this.pushHistory(this.dragStartSnapshot),this.redoStack=[],this.dirty=!0),this.drag=void 0,this.dragStartSnapshot=void 0,e}cancelNodeDrag(){this.drag&&this.dragStartSnapshot&&this.drag.moved&&this.applyDefinition(JSON.parse(this.dragStartSnapshot)),this.drag=void 0,this.dragStartSnapshot=void 0}beginConnection(e,t,r,o="output"){let s=this.definition.nodes.find(l=>l.id===e),i=o==="input"?s?.inputs:s?.outputs;return!s||!(i||[]).some(l=>l.id===t)?!1:(this.connectionDraft={sourceNodeId:e,sourcePort:t,sourceSide:o,x:r.x,y:r.y},this.setMessage("workflow.message.connectHint"),!0)}updateConnectionDraft(e){this.connectionDraft&&(this.connectionDraft={...this.connectionDraft,x:e.x,y:e.y})}completeConnection(e,t){let r=this.connectionDraft;if(r)return this.connectionDraft=void 0,r.sourceSide==="input"?this.addConnection(e,t,r.sourceNodeId,r.sourcePort):this.addConnection(r.sourceNodeId,r.sourcePort,e,t)}cancelConnection(){let e=!!this.connectionDraft;this.connectionDraft=void 0,e&&this.setMessage("workflow.message.connectionCancelled")}setZoom(e){let t=Number(e);Number.isFinite(t)&&(this.zoom=Math.max(Zr,Math.min(Qr,Math.round(t*100)/100)))}zoomIn(){this.setZoom(this.zoom+.1)}zoomOut(){this.setZoom(this.zoom-.1)}panBy(e,t){this.pan={x:Math.round(this.pan.x+(Number(e)||0)),y:Math.round(this.pan.y+(Number(t)||0))}}resetView(){this.zoom=1,this.pan={x:0,y:0}}undo(){let e=this.undoStack.pop();return e?(this.redoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.undo"),!0):!1}redo(){let e=this.redoStack.pop();return e?(this.undoStack.push(this.snapshot()),this.applyDefinition(JSON.parse(e)),this.pruneSelection(),this.dirty=!0,this.setMessage("workflow.message.redo"),!0):!1}clear(){let e={id:this.definition.id,name:this.definition.name,description:this.definition.description,version:this.definition.version||"1.0.0",nodes:[],connections:[],metadata:{...this.definition.metadata||{},updatedAt:new Date().toISOString()}};this.commit(()=>e),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.setMessage("workflow.message.cleared")}compile(){return ot(this.definition)}autoLayout(){if(!this.definition.nodes.length)return!1;let e=Io(this.definition);return this.commit(t=>({...t,nodes:t.nodes.map(r=>({...r,position:e[r.id]||r.position})),metadata:{...t.metadata||{},updatedAt:new Date().toISOString()}})),this.setMessage("workflow.message.layout"),!0}duplicateSelection(){let e=this.selectedNode;if(!e)return;let t=this.registry.createNode(e.type,{x:e.position.x+this.gridSize*2,y:e.position.y+this.gridSize*2},{id:this.nextNodeId(e.type),name:`${e.name} copy`,config:{...e.config||{}}});return t.description=e.description,t.style={...e.style||{}},this.commit(r=>({...r,nodes:[...r.nodes,t],metadata:{...r.metadata||{},updatedAt:new Date().toISOString()}})),this.selection={nodeId:t.id},this.setMessage("workflow.message.duplicated",{name:t.name}),t}selectExecution(e){let t=this.executionHistory.find(r=>r.executionId===e);return t?(this.execution=t,this.selectedExecutionId=e,!0):!1}clearExecutionHistory(){this.executionHistory=[],this.selectedExecutionId=void 0,this.execution=void 0}load(e,t=!0){let r;try{r=typeof e=="string"?JSON.parse(e):ea(e)}catch(s){return this.setError(s.message),!1}let o=ke(r);return!r||!Array.isArray(r.nodes)||!Array.isArray(r.connections)?(this.setError("workflow.error.invalidDocument"),!1):(t?(this.undoStack=[],this.redoStack=[]):(this.pushHistory(this.snapshot()),this.redoStack=[]),this.definition=r,this.normalize(),this.selection={},this.execution=void 0,this.checkpoint=void 0,this.dirty=!1,this.setError(o.valid?"":o.errors.join("; ")),this.setMessage("workflow.message.loaded"),!0)}toJSON(){return JSON.stringify(this.definition,null,2)}async saveTo(e,t={}){let r=t.name?{...this.definition,name:t.name}:this.definition;t.as&&(r={...r,id:`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`});let o=JSON.stringify(r),s=await e.save(r),i=this.definition,l=i===r||JSON.stringify(i)===o;return l?this.definition=r:t.as&&(this.definition={...i,id:r.id,name:r.name}),this.normalize(),this.dirty=!l,this.setMessage(t.as?"workflow.message.savedAs":"workflow.message.saved",{name:r.name}),s}async openFrom(e,t){let r=await e.get(t);return r?this.load(r,!0):(this.setError("workflow.error.notFound",{id:t}),!1)}listSaved(e){return e.list()}async removeSaved(e,t){return e.remove(t)}serialize(){return this.toJSON()}validate(){let e=ke(this.definition),t=Co(this.definition,this.registry).map(o=>`${o.nodeName} \xB7 ${o.label}: ${o.message}`),r=[...e.errors,...t];return{valid:r.length===0,errors:r}}markSaved(){this.dirty=!1}async run(e={}){if(this.running)return{success:!1,error:new Error("workflow.error.running")};let t=this.validate();if(!t.valid)return this.setError(t.errors.join("; ")),{success:!1,error:new Error(this.error)};if(!this.service){let r=new Error("workflow.error.noService");return this.setError(r.message),{success:!1,error:r}}this.running=!0,this.clearError(),this.setMessage("workflow.message.running"),this.execution=void 0,e.resumeFrom||(this.checkpoint=void 0);try{let r=await this.service.execute(this.definition,e.context||{},{...e,onEvent:s=>{this.activeExecutionId=s.executionId,this.execution=s.snapshot,e.onEvent?.(s)},onCheckpoint:s=>{s.status==="running"&&(this.checkpoint=s),e.onCheckpoint?.(s)}}),o=r.data?.executionState;return o&&(this.execution=o,this.recordExecution(o)),r.success&&(this.checkpoint=void 0),this.activeExecutionId=r.data?.executionId,this.running=!1,this.setMessage(r.success?"workflow.message.completed":"workflow.message.failed"),r.success||this.setError(r.error?.message||"workflow.message.failed"),r}catch(r){return this.running=!1,this.setError(r.message),this.setMessage("workflow.message.failed"),{success:!1,error:r}}}async cancel(){this.activeExecutionId&&this.service&&await this.service.cancelExecution(this.activeExecutionId),this.running=!1,this.setMessage("workflow.message.cancelled")}async resume(e={}){return this.checkpoint?this.run({...e,resumeFrom:this.checkpoint}):{success:!1,error:new Error("workflow.error.noCheckpoint")}}clearCheckpoint(){this.checkpoint=void 0}normalize(){this.definition.id||(this.definition.id=ta("workflow")),this.definition.name||(this.definition.name="Unnamed Workflow"),this.definition.nodes=(this.definition.nodes||[]).map(e=>{let t=this.registry.get(e.type),r=t?.defaultConfig;return{...e,position:e.position||{x:0,y:0},dimension:e.dimension||{width:184,height:64},inputs:e.inputs?.length?e.inputs:(t?.inputs||[]).map(o=>({...o})),outputs:e.outputs?.length?e.outputs:(t?.outputs||[]).map(o=>({...o})),config:{...r||{},...e.config||{}},style:{backgroundColor:t?.color,textColor:t?.textColor||"#ffffff",...e.style||{}}}}),this.definition.connections=(this.definition.connections||[]).map(e=>({...e,sourcePort:e.sourcePort||"out",targetPort:e.targetPort||"in"}))}commit(e){this.pushHistory(this.snapshot()),this.redoStack=[],this.applyDefinition(e(this.definition)),this.dirty=!0}applyDefinition(e){this.definition={...e,metadata:{...e.metadata||{},updatedAt:new Date().toISOString()}}}pushHistory(e){this.undoStack.push(e),this.undoStack.length>Xr&&this.undoStack.shift()}snapshot(){return JSON.stringify(this.definition)}recordExecution(e){let t=(this.executionHistory||[]).filter(r=>r&&r.executionId!==e.executionId);this.executionHistory=[e,...t].slice(0,20),this.selectedExecutionId=e.executionId}snapPosition(e){let t=Number.isFinite(e?.x)?e.x:0,r=Number.isFinite(e?.y)?e.y:0;if(!this.snapToGrid||!(this.gridSize>0))return{x:Math.round(t),y:Math.round(r)};let o=this.gridSize;return{x:Math.round(t/o)*o,y:Math.round(r/o)*o}}setMessage(e,t={}){this.message=e,this.messageParams=t}setError(e,t={}){this.error=e,this.errorParams=t}clearError(){this.error="",this.errorParams={}}pruneSelection(){this.selection.nodeId&&!this.definition.nodes.some(e=>e.id===this.selection.nodeId)&&(this.selection={}),this.selection.connectionId&&!this.definition.connections.some(e=>e.id===this.selection.connectionId)&&(this.selection={})}nextNodeId(e){let t=new Set(this.definition.nodes.map(o=>o.id)),r=1;for(;t.has(`${e}_${r}`);)r++;return`${e}_${r}`}nextConnectionId(){let e=new Set(this.definition.connections.map(r=>r.id)),t=1;for(;e.has(`conn_${t}`);)t++;return`conn_${t}`}setExecutionId(e){this.activeExecutionId=e}};var oa=184;var Po=20,Vo=48,_o={idle:"Idle",pending:"Pending",running:"Running",success:"Done",failed:"Failed",skipped:"Skipped",cancelled:"Cancelled"};function ra(a){return String(a).toLowerCase().replace(/[^a-z0-9]+/g,"-")}function zo(a,e,t){return C(t,e,`workflow.status.${a}`,_o[a]||_o.idle)}function Qt(a,e,t){let r=a||"idle",o={running:"Running",completed:"Completed",failed:"Failed",cancelled:"Cancelled",pending:"Pending",idle:"Idle"};return C(t,e,`workflow.status.${r}`,o[r]||o.idle)}function yt(a){let e=a.dimension?.width||oa,t=Math.max(a.inputs?.length||0,a.outputs?.length||0,1),r=Math.max(a.dimension?.height||64,Vo+t*Po+10);return{width:e,height:r}}function aa(a){let{width:e,height:t}=yt(a),r=(o,s)=>(o||[]).map((i,l)=>({id:i.id,label:i.label||i.name||i.id,type:i.type,x:s,y:a.position.y+Vo+l*Po-5}));return{width:e,height:t,inputs:r(a.inputs,a.position.x),outputs:r(a.outputs,a.position.x+e)}}function Do(a,e){let t=Math.max(48,Math.abs(e.x-a.x)/2);return`M ${a.x} ${a.y} C ${a.x+t} ${a.y}, ${e.x-t} ${e.y}, ${e.x} ${e.y}`}function sa(a){return{class:["workflow-node",a.selected?"is-selected":"",a.disabled?"is-disabled":""].filter(Boolean).join(" "),"data-node-id":a.id,"data-node-type":a.type,"data-status":a.status,role:"button",tabindex:"0","aria-label":a.name,style:[`left:${a.x}px`,`top:${a.y}px`,`width:${a.width}px`,`min-height:${a.height}px`].join(";")}}function Fo(a,e,t="zh-CN",r){let o=[],s=new Map,i=a.execution;for(let p of a.nodes){let u=aa(p);s.set(p.id,u);let m=i?.nodeStates?.[p.id]?.status||"idle",w={id:p.id,name:p.name,type:p.type,typeLabel:e.nodeLabel(p.type,t,r),description:p.description||e.nodeDescription(p.type,t,r),x:p.position.x,y:p.position.y,width:u.width,height:u.height,icon:p.style?.icon||e.get(p.type)?.icon||"\u25C6",color:p.style?.backgroundColor||e.get(p.type)?.color||"#64748b",textColor:p.style?.textColor||e.get(p.type)?.textColor||"#ffffff",selected:a.selection.nodeId===p.id,disabled:p.disabled===!0,status:m,statusLabel:zo(m,t,r),inputs:u.inputs,outputs:u.outputs};o.push({...w,attrs:sa(w)})}let l=a.connections.map(p=>{let u=a.nodes.find(J=>J.id===p.sourceNodeId),m=a.nodes.find(J=>J.id===p.targetNodeId),w=u?s.get(u.id):void 0,g=m?s.get(m.id):void 0,v=w?.outputs.find(J=>J.id===p.sourcePort)||w?.outputs[0],x=g?.inputs.find(J=>J.id===p.targetPort)||g?.inputs[0],k=i?.edgeStates?.[p.id]?.status||"idle",T=a.selection.connectionId===p.id,A=v&&x?Do(v,x):"M 0 0",Y=v&&x?(v.x+x.x)/2:0,q=v&&x?(v.y+x.y)/2:0,to={class:`workflow-edge workflow-edge-${k}${T?" is-selected":""}`,"data-edge-id":p.id,"data-status":k,d:A,"marker-end":`url(#wf-arrow-${k})`};return{id:p.id,sourceNodeId:p.sourceNodeId,targetNodeId:p.targetNodeId,sourcePort:p.sourcePort,targetPort:p.targetPort,label:p.label||"",d:A,status:k,selected:T,attrs:to,hitAttrs:{class:"workflow-edge-hit","data-edge-id":p.id,d:A},labelAttrs:{x:String(Y),y:String(q-6),class:"workflow-edge-label"}}}),n;if(a.connectionDraft){let p=a.nodes.find(g=>g.id===a.connectionDraft.sourceNodeId),u=p?s.get(p.id):void 0,w=(a.connectionDraft.sourceSide==="input"?u?.inputs:u?.outputs)?.find(g=>g.id===a.connectionDraft.sourcePort);w&&(n={d:Do(w,{x:a.connectionDraft.x,y:a.connectionDraft.y}),attrs:{class:"workflow-edge workflow-edge-draft","pointer-events":"none"}})}let d=o.reduce((p,u)=>Math.max(p,u.x+u.width),0),c=o.reduce((p,u)=>Math.max(p,u.y+u.height),0);return{nodes:o,edges:l,draft:n,connecting:!!a.connectionDraft,connectingSide:a.connectionDraft?.sourceSide||"output",width:Math.max(1200,d+320),height:Math.max(720,c+240),zoom:a.zoom,pan:{...a.pan},gridStyle:{"--wf-grid-size":`${24*a.zoom}px`,"--wf-grid-x":`${a.pan.x}px`,"--wf-grid-y":`${a.pan.y}px`}}}function qo(a,e="zh-CN",t){return a.palette(e,t)}function ia(a,e){return e.equals!==void 0?String(a)===String(e.equals):e.notEquals!==void 0?String(a)!==String(e.notEquals):e.in?e.in.map(r=>String(r)).includes(String(a)):e.truthy!==void 0?e.truthy?!!a:!a:e.falsy!==void 0?e.falsy?!a:!!a:!0}function na(a){let e=a.defaultValue;return a.type==="json"?e??{}:a.type==="boolean"?e===!0:e==null?"":String(e)}function $o(a,e,t="zh-CN",r){let o=a.selectedNode;if(!o)return{hasSelection:!1,nodeId:"",name:"",description:"",disabled:!1,icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};let s=e.get(o.type),i=a.execution?.nodeStates?.[o.id],l=i?.status||"idle",n={};(s?.fields||[]).forEach(m=>{n[m.key]=o.config?.[m.key]!==void 0?o.config[m.key]:m.defaultValue});let d=(m,w=!1)=>{let g=w?void 0:n[m.key];return{key:m.key,label:C(r,t,`workflow.field.${o.type}.${m.key}`,m.label),type:m.type,value:g,displayValue:m.type==="json"?typeof g=="string"?g:JSON.stringify(g??{},null,2):g==null?"":String(g),checked:g===!0,options:(m.options||[]).map(v=>({label:C(r,t,`workflow.option.${v.value}`,v.label),value:v.value})),placeholder:C(r,t,`workflow.fieldPlaceholder.${o.type}.${m.key}`,m.placeholder||""),description:C(r,t,`workflow.fieldDescription.${o.type}.${m.key}`,m.description||""),group:m.group?C(r,t,`workflow.group.${ra(m.group)}`,m.group):"",visible:w||!m.visibleWhen?!0:ia(n[m.visibleWhen.key],m.visibleWhen),min:m.min,max:m.max,step:m.step,unit:m.unit,span:m.span,minLength:m.minLength,maxLength:m.maxLength,rows:m.rows||(m.type==="json"?4:m.type==="code"?8:3),required:m.required===!0,readonly:m.readonly===!0,disabled:m.disabled===!0,pattern:m.pattern,rules:m.rules,errorMessages:m.errorMessages,inputClass:m.inputClass,fieldClass:m.fieldClass,language:m.language,itemFields:m.itemFields?.map(v=>d(v,!0)),addLabel:C(r,t,"workflow.ui.addItem",m.addLabel||"Add"),removeLabel:C(r,t,"workflow.ui.removeItem",m.removeLabel||"Remove"),minItems:m.minItems,maxItems:m.maxItems,visibleWhen:m.visibleWhen,hasDefault:m.defaultValue!==void 0,resetValue:na(m)}},c=(s?.fields||[]).map(m=>d(m)),p="";if(i?.result?.data!==void 0)try{p=JSON.stringify(i.result.data,null,2)}catch{p=String(i.result.data)}let u=i?.durationMs||0;return{hasSelection:!0,nodeId:o.id,name:o.name,description:o.description||"",disabled:o.disabled===!0,icon:o.style?.icon||s?.icon||"\u25C6",color:o.style?.backgroundColor||s?.color||"#64748b",typeLabel:e.nodeLabel(o.type,t,r),typeDescription:e.nodeDescription(o.type,t,r),status:l,statusLabel:zo(l,t,r),durationLabel:u?`${u} ms`:"",fields:c,resultText:p,errorText:i?.error||""}}function Wo(a,e="zh-CN",t){let r=a.execution;return{name:a.definition.name,nodeCount:a.nodes.length,connectionCount:a.connections.length,hasSelection:!!a.selection?.nodeId||!!a.selection?.connectionId,canUndo:a.canUndo,canRedo:a.canRedo,canResume:a.canResume,running:a.running,zoomLabel:`${Math.round(a.zoom*100)}%`,statusLabel:Qt(r?.status,e,t)}}function Jo(a,e="zh-CN",t){let r=a.selectedNode,o=a.execution,s=r?a.registry.nodeLabel(r.type,e,t):"";return{message:Pt(t,e,a.message,"",a.messageParams),error:Pt(t,e,a.error,"",a.errorParams),running:a.running,nodeCount:a.nodes.length,selectedLabel:r?`${r.name} \xB7 ${s}`:C(t,e,"workflow.ui.noSelection","No node selected"),zoomLabel:`${Math.round(a.zoom*100)}%`,executionLabel:Qt(o?.status,e,t)}}function jo(a){if(!a)return"";let e=new Date(a),t=r=>String(r).padStart(2,"0");return`${t(e.getHours())}:${t(e.getMinutes())}:${t(e.getSeconds())}`}function la(a,e){if(!a||!e||e<a)return"";let t=e-a;return t<1e3?`${t} ms`:`${(t/1e3).toFixed(1)} s`}function Ho(a,e="zh-CN",t){return(a.executionHistory||[]).filter(Boolean).map(r=>{let o=r.status==="completed"?"success":r.status==="failed"?"failed":r.status==="cancelled"?"cancelled":r.status==="running"?"running":"idle";return{executionId:r.executionId,label:jo(r.startTime),status:r.status,statusLabel:Qt(r.status,e,t),timeLabel:jo(r.startTime),durationLabel:la(r.startTime,r.endTime),nodeCount:Object.keys(r.nodeStates||{}).length,tone:o,active:a.selectedExecutionId===r.executionId}})}var el=ae("VISUAL_NODE"),j=class extends G{getNodeId(){return this.id}getNodeName(){return this.name}getNodeType(){return this.type}getPosition(){return this.position}setPosition(e){this.position=e}getInputs(){return this.inputs||[]}getOutputs(){return this.outputs||[]}getConfig(){return this.config}setConfig(e){this.config={...this.config,...e}}toVisualNode(){return{id:this.id,name:this.name,type:this.type,position:this.position,description:this.description,inputs:this.inputs,outputs:this.outputs,config:this.config,style:this.style}}static fromVisualNode(e){let t=new this;return t.id=e.id,t.name=e.name,t.type=e.type,t.position=e.position,t.description=e.description,t.inputs=e.inputs,t.outputs=e.outputs,t.config=e.config,t.style=e.style,t}};Reflect.metadata("design:type",String)(j.prototype,"id");Reflect.metadata("design:type",String)(j.prototype,"name");Reflect.metadata("design:type",Object)(j.prototype,"type");Reflect.metadata("design:type",Object)(j.prototype,"position");Reflect.metadata("design:type",String)(j.prototype,"description");Reflect.metadata("design:type",Array)(j.prototype,"inputs");Reflect.metadata("design:type",Array)(j.prototype,"outputs");Reflect.metadata("design:type",Object)(j.prototype,"config");Reflect.metadata("design:type",Object)(j.prototype,"style");b(j,[[f(),1,"id"],[f(),1,"name"],[f(),1,"type"],[f(),1,"position"],[f(),1,"description"],[f(),1,"inputs"],[f(),1,"outputs"],[f(),1,"config"],[f(),1,"style"],[de(),0]]);var bt=class extends j{constructor(){super(),this.type="start",this.name="Start",this.outputs=[{id:"out",name:"out",type:"output",label:"Next"}],this.style={backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{started:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(bt);b(bt,[[R({selector:"start-node"}),0]]);var kt=class extends j{constructor(){super(),this.type="end",this.name="End",this.inputs=[{id:"in",name:"in",type:"input",label:"Previous"}],this.style={backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}}async execute(e){return{success:!0,data:{completed:!0,nodeId:this.id}}}};Reflect.metadata("design:paramtypes",[])(kt);b(kt,[[R({selector:"end-node"}),0]]);var ze=class extends j{constructor(){super(),this.type="task",this.name="Task",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}}async execute(e){try{return{success:!0,data:{result:await this.action(e),nodeId:this.id}}}catch(t){return{success:!1,error:t,data:{nodeId:this.id}}}}};Reflect.metadata("design:type",Function)(ze.prototype,"action");Reflect.metadata("design:type",String)(ze.prototype,"taskName");Reflect.metadata("design:paramtypes",[])(ze);b(ze,[[f(),1,"action"],[f(),1,"taskName"],[R({selector:"task-node"}),0]]);var at=class extends j{constructor(){super(),this.type="condition",this.name="Condition",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],this.style={backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}}async execute(e){return{success:!0,data:{condition:await this.condition(e),nodeId:this.id}}}};Reflect.metadata("design:type",Function)(at.prototype,"condition");Reflect.metadata("design:paramtypes",[])(at);b(at,[[f(),1,"condition"],[R({selector:"condition-node"}),0]]);var Ce=class extends j{constructor(){super(),this.branches=[],this.maxConcurrent=5,this.waitAll=!0,this.type="parallel",this.name="Parallel",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Complete"}],this.style={backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],r=[],o=[...this.branches],s=[];for(;o.length>0||s.length>0;){for(;o.length>0&&s.length<this.maxConcurrent;){let l=o.shift().execute(e).then(n=>{t.push(n),!n.success&&n.error&&r.push(n.error)});s.push(l)}s.length>0&&(await Promise.race(s),s.splice(0,s.findIndex(i=>!o.includes(i))))}return{success:r.length===0,data:{results:t,errors:r.length>0?r:void 0,nodeId:this.id},error:r.length>0?r[0]:void 0}}};Reflect.metadata("design:type",Array)(Ce.prototype,"branches");Reflect.metadata("design:type",Object)(Ce.prototype,"maxConcurrent");Reflect.metadata("design:type",Object)(Ce.prototype,"waitAll");Reflect.metadata("design:paramtypes",[])(Ce);b(Ce,[[f(),1,"branches"],[f(),1,"maxConcurrent"],[f(),1,"waitAll"],[R({selector:"parallel-node"}),0]]);var st=class extends j{constructor(){super(),this.delay=1e3,this.type="delay",this.name="Delay",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}}async execute(e){return await new Promise(t=>setTimeout(t,this.delay)),{success:!0,data:{delayed:this.delay,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(st.prototype,"delay");Reflect.metadata("design:paramtypes",[])(st);b(st,[[f(),1,"delay"],[R({selector:"delay-node"}),0]]);var Re=class extends j{constructor(){super(),this.maxIterations=1e3,this.type="loop",this.name="Loop",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#795548",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=[],r=0;for(;r<this.maxIterations&&await this.condition(e,r);){let s=await this.body.execute(e);t.push(s),r++}return{success:!0,data:{iterations:r,results:t,nodeId:this.id}}}};Reflect.metadata("design:type",G)(Re.prototype,"body");Reflect.metadata("design:type",Function)(Re.prototype,"condition");Reflect.metadata("design:type",Object)(Re.prototype,"maxIterations");Reflect.metadata("design:paramtypes",[])(Re);b(Re,[[f(),1,"body"],[f(),1,"condition"],[f(),1,"maxIterations"],[R({selector:"loop-node"}),0]]);var Ie=class extends j{constructor(){super(),this.cases=new Map,this.type="switch",this.name="Switch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#00BCD4",textColor:"#ffffff",borderRadius:8}}async execute(e){let t=await this.value(e),r=this.cases.get(t)||this.defaultCase;if(!r)return{success:!1,error:new Error(`No case found for value: ${t}`),data:{value:t,nodeId:this.id}};let o=await r.execute(e);return{success:o.success,data:{value:t,caseResult:o.data,nodeId:this.id},error:o.error}}};Reflect.metadata("design:type",Function)(Ie.prototype,"value");Reflect.metadata("design:type",typeof Map<"u"?Map:Object)(Ie.prototype,"cases");Reflect.metadata("design:type",G)(Ie.prototype,"defaultCase");Reflect.metadata("design:paramtypes",[])(Ie);b(Ie,[[f(),1,"value"],[f(),1,"cases"],[f(),1,"defaultCase"],[R({selector:"switch-node"}),0]]);var Ae=class extends j{constructor(){super(),this.type="trycatch",this.name="Try-Catch",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],this.style={backgroundColor:"#E91E63",textColor:"#ffffff",borderRadius:8}}async execute(e){let t,r;try{t=await this.tryActivity.execute(e)}catch(o){r=o,this.catchActivity?t=await this.catchActivity.execute(e):t={success:!1,error:r,data:{nodeId:this.id}}}finally{this.finallyActivity&&await this.finallyActivity.execute(e)}return{...t,data:{...t.data,caughtError:r,nodeId:this.id}}}};Reflect.metadata("design:type",G)(Ae.prototype,"tryActivity");Reflect.metadata("design:type",G)(Ae.prototype,"catchActivity");Reflect.metadata("design:type",G)(Ae.prototype,"finallyActivity");Reflect.metadata("design:paramtypes",[])(Ae);b(Ae,[[f(),1,"tryActivity"],[f(),1,"catchActivity"],[f(),1,"finallyActivity"],[R({selector:"trycatch-node"}),0]]);var it=class extends j{constructor(){super(),this.type="subprocess",this.name="Sub-Process",this.inputs=[{id:"in",name:"in",type:"input",label:"Input"}],this.outputs=[{id:"out",name:"out",type:"output",label:"Output"}],this.style={backgroundColor:"#3F51B5",textColor:"#ffffff",borderRadius:8}}async execute(e){return{success:!0,data:{subprocess:this.workflow.name,nodeId:this.id}}}};Reflect.metadata("design:type",Object)(it.prototype,"workflow");Reflect.metadata("design:paramtypes",[])(it);b(it,[[f(),1,"workflow"],[R({selector:"subprocess-node"}),0]]);var he=class{constructor(){this.services=new Map}set(e,t){if(!e)throw new Error("Workflow service requires a name");return this.services.set(e,t),this}get(e){return this.services.get(e)}has(e){return this.services.has(e)}remove(e){return this.services.delete(e)}names(){return Array.from(this.services.keys())}toObject(){return Object.fromEntries(this.services.entries())}clear(){this.services.clear()}};b(he,[[E(),0]]);function Bo(a){return{id:a.id,name:a.name,description:a.description,version:a.version,nodes:(a.nodes||[]).map(e=>{let{execute:t,activityType:r,...o}=e;return JSON.parse(JSON.stringify(o))})}}var ne=class{constructor(e,t){this.nodes=e,this.services=t,this.installed=new Map}get nodeRegistry(){return this.nodes}get serviceRegistry(){return this.services}isInstalled(e){return this.installed.has(e)}get(e){return this.installed.get(e)?.plugin}list(){return Array.from(this.installed.values()).map(e=>Bo(e.plugin))}ids(){return Array.from(this.installed.keys())}async install(e){if(!e?.id)throw new Error("Workflow plugin requires an id");if(this.installed.has(e.id))return!1;let t=[];for(let i of e.nodes||[])i?.type&&(this.nodes.register({...i,pluginId:e.id,requiresServer:i.requiresServer!==!1}),t.push(i.type));let r=typeof e.services=="function"?e.services():e.services,o=[];Object.entries(r||{}).forEach(([i,l])=>{this.services.set(i,l),o.push(i)});let s={nodes:this.nodes,services:this.services,plugin:e};try{await e.setup?.(s)}catch(i){throw t.forEach(l=>this.nodes.unregister(l)),o.forEach(l=>this.services.remove(l)),i}return this.installed.set(e.id,{plugin:e,nodeTypes:t,serviceNames:o}),!0}async uninstall(e){let t=this.installed.get(e);if(!t)return!1;this.installed.delete(e);let r={nodes:this.nodes,services:this.services,plugin:t.plugin};try{await t.plugin.dispose?.(r)}finally{t.nodeTypes.forEach(o=>this.nodes.unregister(o));for(let o of t.serviceNames){let s=this.services.get(o);try{await s?.dispose?.()}finally{this.services.remove(o)}}}return!0}async uninstallAll(){for(let e of this.ids())await this.uninstall(e)}manifests(){return this.list()}async onDestroy(){await this.uninstallAll()}};Reflect.metadata("design:paramtypes",[L,he])(ne);b(ne,[[E(),0]]);function da(a){return a>0?new Promise(e=>setTimeout(e,a)):Promise.resolve()}function ca(a){if(typeof a!="string")return a;try{return JSON.parse(a)}catch{return a}}var Uo=30,Ko=300;function nt(a){let e={};a.nodeStates?.forEach((r,o)=>{e[o]={...r,result:r.result?{success:r.result.success,data:r.result.data,error:r.result.error?.message}:void 0}});let t={};return a.edgeStates?.forEach((r,o)=>{t[o]={...r}}),{executionId:a.executionId,workflowId:a.workflowId,status:a.status,currentNodeId:a.currentNodeId,startTime:a.startTime,endTime:a.endTime,error:a.error?.message,nodeStates:e,edgeStates:t,activeNodeIds:[...a.activeNodeIds||[]],logs:[...a.logs||[]]}}var le=class{constructor(e,t,r){this.injector=e,this.plugins=r,this.executions=new Map,this.pathInterceptor=new gt,this.policyInterceptor=new wt,this.interceptors=[],this.registry=t||new L;let o=this.injector.get(Be,null);o&&(o.addInterceptor(oe,this.pathInterceptor),o.addInterceptor(oe,this.policyInterceptor))}nodeInterceptors(){return[this.pathInterceptor,this.policyInterceptor,...this.interceptors]}get resolver(){return this.injector.get(Be,null)??void 0}use(e,t){return this.interceptors.includes(e)||this.interceptors.push(e),this.resolver?.addInterceptor(oe,e,t),this}remove(e){let t=this.interceptors.indexOf(e);return t>=0&&this.interceptors.splice(t,1),this.resolver?.removeInterceptor(oe,e),this}getInterceptorResolver(){return this.resolver}async execute(e,t={},r={}){let o=r.executionId||r.resumeFrom?.executionId||this.generateExecutionId(),s=this.withPluginServices(t),i=r.resumeFrom?this.createStateFromCheckpoint(e,r.resumeFrom,o):this.createState(e,o);this.executions.set(o,i),this.trimHistory(r.maxHistory),this.emit(r,i,{type:"workflow-start",status:"running"}),this.checkpoint(r,i);let l=Math.max(0,Number(r.timeout)||0),n;l>0&&(n=setTimeout(()=>{i.status==="running"&&(i.status="cancelled",i.error=new Error(`Workflow timed out after ${l}ms`))},l),n?.unref?.());try{let d=ot(e),c=d.entries.length?d.entries:d.entry?[d.entry]:[];if(!c.length)throw new Error("No entry node found in workflow");let p={executeDefinition:(k,T)=>this.execute(k,T,{...r,executionId:void 0}),executeNode:async(k,T)=>{let A=this.registry.executor(k.type);return A?A(k,T):void 0}},u=new Set,m=new Set,w=Lo(this.injector,this.nodeInterceptors()),g={success:!0};for(let k of c)if(g=await this.executeFromNode(k,d,s,i,r,p,u,w,!!r.resumeFrom,m),!g.success)break;let v=[...d.nodes.values()].filter(k=>k.type==="complete"||k.type==="catch"||k.type==="status");for(let k of v){if(u.has(k.id))continue;let T=k.type;if(T==="complete"&&!g.success||T==="catch"&&g.success)continue;let A=String(k.config?.scope||"").trim();if(A&&![...i.nodeStates?.values()||[]].some(J=>{let rr=d.nodes.get(J.nodeId)?.type;return J.nodeId!==A&&rr!==A?!1:T==="catch"?J.status==="failed":T==="complete"?J.status==="success":J.status==="success"||J.status==="failed"}))continue;let Y={...s,workflowStatus:g.success?"completed":"failed",workflowError:g.error?.message,workflowResult:g};(await this.executeFromNode(k,d,Y,i,r,p,u,w,!!r.resumeFrom,m)).success}i.status==="cancelled"||this.isCancelled(i)?(i.status="cancelled",this.finishPendingNodes(i,"skipped"),this.emit(r,i,{type:"workflow-cancelled",status:"cancelled"})):(i.status=g.success?"completed":"failed",!g.success&&g.error&&(i.error=g.error),this.finishPendingNodes(i,(g.success,"skipped")),this.finishIdleEdges(i,"skipped"),this.emit(r,i,{type:g.success?"workflow-end":"workflow-error",status:i.status,error:g.error})),i.endTime=Date.now(),i.currentNodeId=void 0,this.checkpoint(r,i);let x=nt(i);return{success:i.status==="completed",data:{executionId:o,workflowId:e.id,status:i.status,nodeResults:Object.fromEntries(i.nodeResults),executionState:x,...g.data||{}},error:i.status==="cancelled"?i.error||g.error:g.error||i.error}}catch(d){return i.status="failed",i.endTime=Date.now(),i.currentNodeId=void 0,i.error=d,this.finishPendingNodes(i,"skipped"),this.finishIdleEdges(i,"skipped"),this.emit(r,i,{type:"workflow-error",status:"failed",error:d}),this.checkpoint(r,i),{success:!1,error:d,data:{executionId:o,workflowId:e?.id,status:i.status,executionState:nt(i)}}}finally{n&&clearTimeout(n)}}withPluginServices(e){let t=this.plugins?.serviceRegistry.toObject();if(!t||!Object.keys(t).length)return e;let r=e?.services||{};return{...e,services:{...t,...r}}}createState(e,t){let r=new Map;(e.nodes||[]).forEach(s=>{r.set(s.id,{nodeId:s.id,status:"pending"})});let o=new Map;return(e.connections||[]).forEach(s=>{o.set(s.id,{connectionId:s.id,status:"idle",count:0})}),{executionId:t,workflowId:e.id,status:"running",startTime:Date.now(),nodeResults:new Map,nodeStates:r,edgeStates:o,activeNodeIds:[],logs:[]}}createStateFromCheckpoint(e,t,r){let o=this.createState(e,r);o.status="running",o.startTime=t.startTime||o.startTime,o.endTime=void 0,o.currentNodeId=void 0,o.activeNodeIds=[],o.logs=[...t.logs||[]];let s=t.nodeStates||{};for(let l of e.nodes||[]){let n=s[l.id];n&&(o.nodeStates?.set(l.id,{...n}),n.result&&o.nodeResults.set(l.id,{success:n.result.success,data:n.result.data,error:n.error?new Error(String(n.error)):void 0}))}let i=t.edgeStates||{};for(let l of e.connections||[]){let n=i[l.id];n&&o.edgeStates?.set(l.id,{...n})}return o}existingNodeResult(e,t,r){return r.nodeResults.get(e)||t.result||{success:t.status==="success",data:{nodeId:e,replayed:!0},error:t.error?new Error(t.error):void 0}}checkpoint(e,t){if(e.onCheckpoint)try{e.onCheckpoint(nt(t))}catch{}}async executeFromNode(e,t,r,o,s,i,l,n,d=!1,c=new Set,p=!1){if(o.status==="cancelled"||this.isCancelled(o))return o.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};if(l.has(e.id))return o.nodeResults.get(e.id)||{success:!0,data:{nodeId:e.id,skipped:!0}};if(e.disabled===!0){l.add(e.id);let g={success:!0,data:{nodeId:e.id,skipped:!0,disabled:!0}},v=o.nodeStates?.get(e.id);return v&&(v.status="skipped",v.finishedAt=Date.now(),v.result=g),o.nodeResults.set(e.id,g),(t.outgoing.get(e.id)||[]).forEach(x=>this.markEdgeSkipped(o,x.id,s)),g}let u=o.nodeStates?.get(e.id),m=u&&(u.status==="success"||u.status==="failed"||u.status==="skipped"||u.status==="cancelled"),w;if(m&&d&&(u.status==="success"||u.status==="failed")){if(c.has(e.id))return this.existingNodeResult(e.id,u,o);c.add(e.id),l.add(e.id),w=this.existingNodeResult(e.id,u,o)}else{if(m&&!p)return l.add(e.id),this.existingNodeResult(e.id,u,o);if(e.type==="join"&&!this.isJoinReady(t,o,e.id))return{success:!0,data:{nodeId:e.id,waiting:!0}};l.add(e.id),w=await n.handleNode({node:e,context:r,host:i,state:o,options:s,extras:{cancelled:()=>o.status==="cancelled"||this.isCancelled(o),incoming:e.type==="join"?(t.incoming.get(e.id)||[]).map(g=>({connectionId:g.id,sourcePort:g.sourcePort,nodeId:g.sourceNodeId,result:o.nodeResults.get(g.sourceNodeId)})):void 0},emit:g=>this.emit(s,o,g)}),this.checkpoint(s,o)}if(String(o.status)==="cancelled"||this.isCancelled(o)){o.status="cancelled";let g=o.nodeStates?.get(e.id);return g&&(g.status="cancelled",g.error=o.error?.message||w.error?.message),{success:!1,error:o.error||new Error("Workflow cancelled"),data:{nodeId:e.id}}}if(!w.success){let g=t.outgoing.get(e.id)||[],v=g.filter(k=>k.sourcePort==="error");if(!v.length)return w;for(let k of g)k.sourcePort!=="error"&&this.markEdgeSkipped(o,k.id,s);let x={...r,error:w.error,errorMessage:w.error?.message,failedNodeId:e.id,failedResult:w};for(let k of v){let T=t.nodes.get(k.targetNodeId);if(!T)continue;this.markEdgeTraversed(o,k,s);let A=await this.executeFromNode(T,t,x,o,s,i,l,n,d,c,p);if(!A.success)return A}return{success:!0,data:{nodeId:e.id,recovered:!0}}}if(e.type==="end")return w;if(e.type==="http-in"&&w.data?.matched!==!0)return(t.outgoing.get(e.id)||[]).forEach(g=>this.markEdgeSkipped(o,g.id,s)),w;if(e.type==="trycatch"){let g=await this.executeGuardedNode(e,t,r,w,o,s,i,l,n,d,c,p);o.nodeResults.set(e.id,g);let v=o.nodeStates?.get(e.id);return v&&(v.result=g,v.status=g.success?"success":"failed",v.error=g.error?.message),g}return e.type==="trigger"&&e.config?.emitSecond===!0?this.executeTriggerEmissions(e,t,r,w,o,s,i,n,d,c):this.traverseOutgoing(e,t,r,w,o,s,i,l,n,d,c,p)}async traverseOutgoing(e,t,r,o,s,i,l,n,d,c,p,u=!1){let m=this.selectNextConnections(e,t,r,o),w=new Set(m.map(g=>g.id));for(let g of t.outgoing.get(e.id)||[])w.has(g.id)||this.markEdgeSkipped(s,g.id,i);if(e.type==="parallel"&&m.length>1)return(await Promise.all(m.map(x=>{let k=t.nodes.get(x.targetNodeId);return k?(this.markEdgeTraversed(s,x,i),this.executeFromNode(k,t,this.mergeContext(r,o,x),s,i,l,n,d,c,p,u)):Promise.resolve({success:!1,error:new Error(`Missing node ${x.targetNodeId}`)})}))).find(x=>!x.success)||o;for(let g of m){let v=t.nodes.get(g.targetNodeId);if(!v)continue;this.markEdgeTraversed(s,g,i);let x=await this.executeFromNode(v,t,this.mergeContext(r,o,g),s,i,l,n,d,c,p,u);if(!x.success)return x}return o}triggerEmissionResult(e,t,r){return t&&typeof t=="object"&&!Array.isArray(t)?{success:!0,data:{...t,nodeId:e.id,triggered:!0,emission:r}}:{success:!0,data:{nodeId:e.id,triggered:!0,payload:t,emission:r}}}async executeTriggerEmissions(e,t,r,o,s,i,l,n,d,c){let p=e.config||{},u=[{result:this.triggerEmissionResult(e,{...o.data||{}},1),delay:0}];u.push({result:this.triggerEmissionResult(e,ca(p.secondPayload??{}),2),delay:Math.max(0,Number(p.secondDelay)||0)});let m=o;for(let w=0;w<u.length;w++){let g=u[w];if(g.delay>0&&await da(g.delay),s.status==="cancelled"||this.isCancelled(s))return s.status="cancelled",{success:!1,error:new Error("Workflow cancelled")};let v=new Set([e.id]);if(m=await this.traverseOutgoing(e,t,r,g.result,s,i,l,v,n,d,c,w>0),!m.success)return m}return m}async executeGuardedNode(e,t,r,o,s,i,l,n,d,c,p,u=!1){let m=t.outgoing.get(e.id)||[],w=m.filter(A=>A.sourcePort!=="error"),g=m.filter(A=>A.sourcePort==="error"),v,x,k=o;for(let A of w){let Y=t.nodes.get(A.targetNodeId);if(Y){this.markEdgeTraversed(s,A,i);try{let q=await this.executeFromNode(Y,t,this.mergeContext(r,o,A),s,i,l,n,d,c,p,u);if(!q.success){v=q,x=Y.id;break}k=q}catch(q){v={success:!1,error:q},x=Y.id;break}}}if(!v)return g.forEach(A=>this.markEdgeSkipped(s,A.id,i)),k;w.forEach(A=>this.markEdgeSkipped(s,A.id,i));let T={...r,error:v.error,errorMessage:v.error?.message,failedNodeId:x,failedResult:v};for(let A of g){let Y=t.nodes.get(A.targetNodeId);if(Y){this.markEdgeTraversed(s,A,i);try{let q=await this.executeFromNode(Y,t,T,s,i,l,n,d,c,p,u);if(!q.success)return q}catch(q){return{success:!1,error:q}}}}return{success:!0,data:{nodeId:e.id,guarded:!0,recovered:!0,failedNodeId:x,error:v.error?.message}}}mergeContext(e,t,r){return{...e,...t.data||{}}}isJoinReady(e,t,r){let o=e.incoming.get(r)||[];if(!o.length)return!0;let s=o.map(l=>t.nodeStates?.get(l.sourceNodeId)?.status);return s.every(l=>l==="success"||l==="failed"||l==="skipped"||l==="cancelled")&&s.some(l=>l==="success")}selectNextConnections(e,t,r,o){let s=t.outgoing.get(e.id)||[];if(!s.length)return[];let i=o.data?.port;if(typeof i=="string"&&i){let n=s.filter(d=>d.sourcePort===i);if(n.length)return n}let l=o.data?.route;if(typeof l=="number"){let n=l>0?`route-${l}`:"default",d=s.filter(c=>c.sourcePort===n);return d.length?d:s.filter(c=>c.sourcePort==="default")}if(e.type==="condition"){let n=o.data?.condition?"true":"false",d=s.filter(c=>c.sourcePort===n);return d.length?d:s.filter(c=>c.sourcePort!=="true"&&c.sourcePort!=="false")}if(e.type==="switch"){let n=o.data?.condition,d=n==null?"":String(n),c=s.filter(u=>u.sourcePort===d);if(c.length)return c;let p=s.filter(u=>u.sourcePort==="default");return p.length?p:s.filter(u=>u.sourcePort==="out")}return s.filter(n=>n.sourcePort==="error"?!1:n.condition===void 0||n.condition===null?!0:typeof n.condition=="function"?!!n.condition(r):typeof n.condition=="boolean"?n.condition:!!D(n.condition,r))}markEdgeTraversed(e,t,r){let o=e.edgeStates?.get(t.id)||{connectionId:t.id,status:"idle",count:0};o.status="traversed",o.traversedAt=Date.now(),o.count=(o.count||0)+1,e.edgeStates?.set(t.id,o),this.emit(r,e,{type:"edge-traversed",connectionId:t.id,nodeId:t.sourceNodeId,status:"traversed"})}markEdgeSkipped(e,t,r){let o=e.edgeStates?.get(t)||{connectionId:t,status:"idle",count:0};o.status!=="traversed"&&(o.status="skipped",e.edgeStates?.set(t,o),this.emit(r,e,{type:"edge-skipped",connectionId:t,status:"skipped"}))}finishPendingNodes(e,t){e.nodeStates?.forEach((r,o)=>{(r.status==="pending"||r.status==="idle")&&(r.status=t,e.nodeStates?.set(o,r))})}finishIdleEdges(e,t){e.edgeStates?.forEach((r,o)=>{(r.status==="idle"||r.status==="active")&&(r.status=t,e.edgeStates?.set(o,r))})}emit(e,t,r){let o=Date.now(),s={...r,executionId:t.executionId,workflowId:t.workflowId,timestamp:o,snapshot:nt(t)};if(t.logs&&(t.logs.push({id:`${t.executionId}_${t.logs.length+1}`,timestamp:o,level:this.logLevelFor(r.type,r.status),event:r.type,message:this.logMessageFor(t,r),nodeId:r.nodeId,connectionId:r.connectionId}),t.logs.length>Ko&&t.logs.splice(0,t.logs.length-Ko)),e.onEvent)try{e.onEvent(s)}catch{}}logLevelFor(e,t){return e==="workflow-error"||t==="failed"?"error":e==="workflow-cancelled"||e==="node-skipped"||e==="edge-skipped"?"warning":e==="workflow-end"||t==="success"||t==="completed"?"success":"info"}logMessageFor(e,t){let r=t.nodeId?e.nodeResults.get(t.nodeId):void 0;switch(t.type){case"workflow-start":return"Workflow started";case"workflow-end":return"Workflow completed";case"workflow-error":return`Workflow failed: ${t.error?.message||e.error?.message||"unknown error"}`;case"workflow-cancelled":return"Workflow cancelled";case"node-start":return`Node ${t.nodeId} started`;case"node-end":return r?.success===!1?`Node ${t.nodeId} failed: ${r.error?.message||""}`:`Node ${t.nodeId} finished`;case"node-skipped":return`Node ${t.nodeId} skipped`;case"edge-traversed":return`Edge ${t.connectionId} traversed`;case"edge-skipped":default:return`Edge ${t.connectionId} skipped`}}isCancelled(e){return this.executions.get(e.executionId)?.status==="cancelled"}trimHistory(e=Uo){let t=Math.max(1,Number(e)||Uo),r=Array.from(this.executions.values()).filter(o=>o.status!=="running").sort((o,s)=>(o.endTime||0)-(s.endTime||0));for(;r.length>t;){let o=r.shift();o&&this.executions.delete(o.executionId)}}validate(e){return ke(e)}getExecution(e){return this.executions.get(e)}getExecutionSnapshot(e){let t=this.executions.get(e);return t?nt(t):void 0}getExecutions(){return Array.from(this.executions.values())}startSchedule(e,t={}){return new mt(this).start(e,t)}async cancelExecution(e){let t=this.executions.get(e);t&&(t.status="cancelled",t.endTime=t.endTime||Date.now())}getNodeRegistry(){return this.registry}serialize(e){return JSON.stringify(e,null,2)}deserialize(e){return JSON.parse(e)}generateExecutionId(){return`exec_${Date.now()}_${Math.random().toString(36).substr(2,9)}`}};Reflect.metadata("design:paramtypes",[dt,L,ne])(le);b(le,[[S(),3,void 0,2],[S(),3,void 0,1],[E(),0]]);var Fe=class a{constructor(){this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[]}setId(e){return this.id=e,this}setName(e){return this.name=e,this}setDescription(e){return this.description=e,this}setVersion(e){return this.version=e,this}addNode(e){let t={position:{x:0,y:0},inputs:[],outputs:[],...e};return this.nodes.push(t),this}startNode(e="Start",t){return this.addNode({id:`start_${this.nodes.length}`,name:e,type:"start",position:t||{x:100,y:100},outputs:[{id:"out",name:"out",type:"output",label:"Next"}],style:{backgroundColor:"#4CAF50",textColor:"#ffffff",borderRadius:50}})}endNode(e="End",t){return this.addNode({id:`end_${this.nodes.length}`,name:e,type:"end",position:t||{x:500,y:100},inputs:[{id:"in",name:"in",type:"input",label:"Previous"}],style:{backgroundColor:"#f44336",textColor:"#ffffff",borderRadius:50}})}taskNode(e,t,r){return this.addNode({id:`task_${this.nodes.length}`,name:e,type:"task",position:r||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"},{id:"error",name:"error",type:"output",label:"Error"}],style:{backgroundColor:"#2196F3",textColor:"#ffffff",borderRadius:8}})}conditionNode(e,t,r){return this.addNode({id:`condition_${this.nodes.length}`,name:e,type:"condition",position:r||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"true",name:"true",type:"output",label:"True"},{id:"false",name:"false",type:"output",label:"False"}],style:{backgroundColor:"#FF9800",textColor:"#ffffff",borderRadius:4}})}parallelNode(e,t,r){return this.addNode({id:`parallel_${this.nodes.length}`,name:e,type:"parallel",position:r||{x:300,y:100},config:t,inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Complete"}],style:{backgroundColor:"#9C27B0",textColor:"#ffffff",borderRadius:8}})}delayNode(e,t=1e3,r){return this.addNode({id:`delay_${this.nodes.length}`,name:e,type:"delay",position:r||{x:300,y:100},config:{delay:t},inputs:[{id:"in",name:"in",type:"input",label:"Input"}],outputs:[{id:"out",name:"out",type:"output",label:"Output"}],style:{backgroundColor:"#607D8B",textColor:"#ffffff",borderRadius:8}})}customNode(e){return this.addNode(e)}connect(e,t,r){let o={id:`conn_${this.connections.length}`,sourceNodeId:e,sourcePort:r?.sourcePort||"out",targetNodeId:t,targetPort:r?.targetPort||"in",label:r?.label,condition:r?.condition};return this.connections.push(o),this}connectNodes(e,t,r="out",o="in"){return this.connect(e,t,{sourcePort:r,targetPort:o})}build(){return this.id||(this.id=`workflow_${Date.now()}`),this.name||(this.name="Unnamed Workflow"),{id:this.id,name:this.name,description:this.description,version:this.version,nodes:this.nodes,connections:this.connections,metadata:{createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}}static create(){return new a}reset(){return this.id="",this.name="",this.description="",this.version="1.0.0",this.nodes=[],this.connections=[],this}};b(Fe,[[E(),0]]);var ua={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,scheduling:!1,zoomLabel:"100%",statusLabel:""},O=class{constructor(e){this.translator=e,this.model=ua,this.locale="zh-CN",this.theme="light",this.hiddenActions=[]}visible(e){return!(Array.isArray(this.hiddenActions)?this.hiddenActions:[]).includes(e)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t,r){return C(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t,r)}get runLabel(){return this.t("run","Run")}get scheduleLabel(){return this.t("schedule","Schedule")}get stopScheduleLabel(){return this.t("stopSchedule","Stop schedule")}get resumeLabel(){return this.t("resume","Resume")}get stopLabel(){return this.t("stop","Stop")}get undoLabel(){return this.t("undo","Undo")}get redoLabel(){return this.t("redo","Redo")}get deleteLabel(){return this.t("delete","Delete")}get resetLabel(){return this.t("fit","Fit")}get layoutLabel(){return this.t("layout","Auto layout")}get duplicateLabel(){return this.t("duplicate","Duplicate")}get logsLabel(){return this.t("logs","Logs")}get zoomInLabel(){return this.t("zoomIn","Zoom in")}get zoomOutLabel(){return this.t("zoomOut","Zoom out")}get saveLabel(){return this.t("save","Save")}get libraryLabel(){return this.t("library","Workflows")}get clearLabel(){return this.t("clear","Clear")}get nodeLabel(){return this.t("nodes",`${this.model.nodeCount} nodes`,{count:this.model.nodeCount})}get connectionLabel(){return this.t("links",`${this.model.connectionCount} links`,{count:this.model.connectionCount})}run(){(this.runAction||(()=>this.action?.("run")))()}toggleSchedule(){(this.scheduleToggleAction||(()=>this.action?.("schedule")))()}resume(){(this.resumeAction||(()=>this.action?.("resume")))()}cancel(){(this.cancelAction||(()=>this.action?.("cancel")))()}undo(){(this.undoAction||(()=>this.action?.("undo")))()}redo(){(this.redoAction||(()=>this.action?.("redo")))()}remove(){(this.deleteAction||(()=>this.action?.("delete")))()}zoomIn(){(this.zoomInAction||(()=>this.action?.("zoom-in")))()}zoomOut(){(this.zoomOutAction||(()=>this.action?.("zoom-out")))()}resetView(){(this.resetViewAction||(()=>this.action?.("reset-view")))()}autoLayout(){(this.autoLayoutAction||(()=>this.action?.("auto-layout")))()}duplicate(){(this.duplicateAction||(()=>this.action?.("duplicate")))()}toggleLogs(){(this.toggleLogsAction||(()=>this.action?.("toggle-logs")))()}selectTheme(e){this.themeChangeAction?.(e)}save(){(this.saveAction||(()=>this.action?.("save")))()}openLibrary(){(this.openLibraryAction||(()=>this.action?.("open-library")))()}clear(){(this.clearAction||(()=>this.action?.("clear")))()}toggleJson(){(this.toggleJsonAction||(()=>this.action?.("toggle-json")))()}};Reflect.metadata("design:type",Object)(O.prototype,"model");Reflect.metadata("design:type",Object)(O.prototype,"locale");Reflect.metadata("design:type",Object)(O.prototype,"theme");Reflect.metadata("design:type",Function)(O.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(O.prototype,"runAction");Reflect.metadata("design:type",Function)(O.prototype,"scheduleToggleAction");Reflect.metadata("design:type",Function)(O.prototype,"resumeAction");Reflect.metadata("design:type",Function)(O.prototype,"cancelAction");Reflect.metadata("design:type",Function)(O.prototype,"undoAction");Reflect.metadata("design:type",Function)(O.prototype,"redoAction");Reflect.metadata("design:type",Function)(O.prototype,"deleteAction");Reflect.metadata("design:type",Function)(O.prototype,"zoomInAction");Reflect.metadata("design:type",Function)(O.prototype,"zoomOutAction");Reflect.metadata("design:type",Function)(O.prototype,"resetViewAction");Reflect.metadata("design:type",Function)(O.prototype,"autoLayoutAction");Reflect.metadata("design:type",Function)(O.prototype,"duplicateAction");Reflect.metadata("design:type",Function)(O.prototype,"toggleLogsAction");Reflect.metadata("design:type",Function)(O.prototype,"saveAction");Reflect.metadata("design:type",Function)(O.prototype,"openLibraryAction");Reflect.metadata("design:type",Function)(O.prototype,"clearAction");Reflect.metadata("design:type",Function)(O.prototype,"toggleJsonAction");Reflect.metadata("design:type",Function)(O.prototype,"action");Reflect.metadata("design:type",Array)(O.prototype,"hiddenActions");Reflect.metadata("design:paramtypes",[N])(O);b(O,[[f(),1,"model"],[f(),1,"locale"],[f(),1,"theme"],[f(),1,"themeChangeAction"],[f(),1,"runAction"],[f(),1,"scheduleToggleAction"],[f(),1,"resumeAction"],[f(),1,"cancelAction"],[f(),1,"undoAction"],[f(),1,"redoAction"],[f(),1,"deleteAction"],[f(),1,"zoomInAction"],[f(),1,"zoomOutAction"],[f(),1,"resetViewAction"],[f(),1,"autoLayoutAction"],[f(),1,"duplicateAction"],[f(),1,"toggleLogsAction"],[f(),1,"saveAction"],[f(),1,"openLibraryAction"],[f(),1,"clearAction"],[f(),1,"toggleJsonAction"],[f(),1,"action"],[f(),1,"hiddenActions"],[S(),3,void 0,0],[R({selector:"workflow-toolbar",template:`
    <div class="workflow-toolbar">
        <span class="workflow-toolbar-title">{{model.name}}</span>
        <span class="workflow-toolbar-meta">{{nodeLabel}} \xB7 {{connectionLabel}}</span>
        <span class="workflow-toolbar-status">{{model.statusLabel}}</span>
        <span class="workflow-status-spacer"></span>
        <button v-if="visible('schedule')" class="workflow-btn" [class.is-active]="model.scheduling" @click="toggleSchedule"><icon class="workflow-btn-icon" name="schedule" size="sm"></icon>{{model.scheduling ? stopScheduleLabel : scheduleLabel}}</button>
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
    </div>`}),0]]);var qe=class{constructor(){this.listeners=new Set}emit(e){for(let t of[...this.listeners])t(e)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}};b(qe,[[E(),0]]);var vt=new qe;var Yo=["light","dark","solarized","high-contrast"],Go={name:"",nodeCount:0,connectionCount:0,hasSelection:!1,canUndo:!1,canRedo:!1,canResume:!1,running:!1,zoomLabel:"100%",statusLabel:""},K=class{constructor(e){this.translator=e,this.model=Go,this.locale="zh-CN",this.theme="light",this.actionBus=vt,this.menuSelect=t=>{if(globalThis.__workflowMenuHandled=t,t.startsWith("language:")){let r=t.slice(9);(r==="en"||r==="zh-CN")&&(!this.actionBus&&this.localeChangeAction?this.localeChangeAction(r):this.dispatch(t));return}if(t.startsWith("theme:")){let r=t.slice(6);Yo.includes(r)&&(!this.actionBus&&this.themeChangeAction?this.themeChangeAction(r):this.dispatch(t));return}this.dispatch(t)}}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get themeName(){return ue(this.theme)?this.theme:"light"}t(e,t){return C(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get menuLabel(){return this.t("menu","Menu")}get menuGroups(){let e=this.model||Go,t=this.cache;if(t&&t.model===e&&t.theme===this.theme&&t.locale===this.locale)return t.groups;let r=(s,i)=>this.t(s,i),o=[{items:[{id:"save",label:r("save","Save"),shortcut:"Ctrl+S"},{id:"rename",label:r("rename","Rename workflow"),icon:"rename"},{id:"open-library",label:r("library","Workflows")},{id:"toggle-json",label:r("jsonMenu","Import / Export JSON")}]},{items:[{id:"run",label:r("run","Run"),icon:"run",disabled:e.running||!e.nodeCount},{id:"resume",label:r("resume","Resume"),icon:"resume",disabled:!e.canResume},{id:"cancel",label:r("stop","Stop"),icon:"stop",disabled:!e.running}]},{items:[{id:"undo",label:r("undo","Undo"),shortcut:"Ctrl+Z",disabled:!e.canUndo},{id:"redo",label:r("redo","Redo"),shortcut:"Ctrl+Y",disabled:!e.canRedo},{id:"duplicate",label:r("duplicate","Duplicate"),shortcut:"Ctrl+D",disabled:!e.hasSelection},{id:"delete",label:r("delete","Delete"),shortcut:"Del",disabled:!e.hasSelection,danger:!0},{id:"clear",label:r("clear","Clear"),disabled:!e.nodeCount}]},{items:[{id:"reset-view",label:r("fit","Fit")},{id:"auto-layout",label:r("layout","Auto layout")},{id:"toggle-logs",label:r("logs","Logs")},{id:"theme",label:r("themeMenu","Theme"),icon:"theme",children:Yo.map(s=>({id:`theme:${s}`,label:this.themeOptionLabel(s),checked:this.themeName===s}))}]},{items:[{id:"language",label:r("language","Language"),icon:"language",children:[{id:"language:en",label:"English",checked:!this.isZh},{id:"language:zh-CN",label:"\u4E2D\u6587",checked:this.isZh}]},{id:"shortcuts",label:r("shortcuts","Keyboard shortcuts"),shortcut:"?"}]}];return this.cache={model:e,theme:this.theme,locale:this.locale,groups:o},o}themeOptionLabel(e){switch(e){case"dark":return this.t("themeDark","Dark");case"solarized":return this.t("themeSolarized","Solarized");case"high-contrast":return this.t("themeHighContrast","High contrast");default:return this.t("themeLight","Light")}}dispatch(e){this.actionBus?this.actionBus.emit(e):this.action?.(e)}};Reflect.metadata("design:type",Object)(K.prototype,"model");Reflect.metadata("design:type",Object)(K.prototype,"locale");Reflect.metadata("design:type",Object)(K.prototype,"theme");Reflect.metadata("design:type",Function)(K.prototype,"action");Reflect.metadata("design:type",Function)(K.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(K.prototype,"localeChangeAction");Reflect.metadata("design:type",Object)(K.prototype,"cache");Reflect.metadata("design:paramtypes",[N])(K);b(K,[[f(),1,"model"],[f(),1,"locale"],[f(),1,"theme"],[f(),1,"action"],[f(),1,"themeChangeAction"],[f(),1,"localeChangeAction"],[V(),1,"cache"],[S(),3,void 0,0],[R({selector:"workflow-management-menu",template:`
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="menu" label="" caret="caret-down" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`}),0]]);var ee=class{constructor(e){this.translator=e,this.groups=[],this.locale="zh-CN",this.query=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get searchPlaceholder(){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.searchNodes","Search nodes\u2026")}get noMatchesLabel(){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.noMatches","No matching nodes")}get visibleGroups(){let e=this.query.trim().toLowerCase();return e?(this.groups||[]).map(t=>({...t,items:(t.items||[]).filter(r=>this.matches(r,e))})).filter(t=>t.items.length>0):this.groups||[]}search(e){this.query=String(e?.target?.value??"")}searchKeydown(e){e?.key==="Escape"&&this.query&&(e.preventDefault?.(),this.query="")}add(e){this.addAction?.(e)}dragStart(e,t){e?.dataTransfer?.setData&&(e.dataTransfer.setData("application/x-tsdi-workflow-node",t.type),e.dataTransfer.effectAllowed="copy"),this.dragStartAction?.(e,t)}matches(e,t){return[e.type,e.label,e.description,e.category].filter(Boolean).some(r=>String(r).toLowerCase().includes(t))}};Reflect.metadata("design:type",Array)(ee.prototype,"groups");Reflect.metadata("design:type",Object)(ee.prototype,"locale");Reflect.metadata("design:type",Function)(ee.prototype,"addAction");Reflect.metadata("design:type",Function)(ee.prototype,"dragStartAction");Reflect.metadata("design:paramtypes",[N])(ee);b(ee,[[f(),1,"groups"],[f(),1,"locale"],[f(),1,"addAction"],[f(),1,"dragStartAction"],[S(),3,void 0,0],[R({selector:"workflow-palette",template:`
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
    </div>`}),0]]);var pa={nodes:[],edges:[],width:1200,height:720,zoom:1,pan:{x:0,y:0},gridStyle:{}},X=class{constructor(e,t){this.elementRef=e,this.translator=t,this.model=pa,this.locale="zh-CN"}onAfterViewInit(){ge(this.canvasRoot)}get emptyHint(){let e=String(this.locale||"").toLowerCase().startsWith("zh")?"zh-CN":"en";return C(this.translator,e,"workflow.ui.canvasEmpty","Drag a component from the palette, or click one to add it")}get canvasStyle(){return{"--wf-grid-size":`${24*(this.model.zoom||1)}px`,"--wf-grid-x":`${this.model.pan?.x||0}px`,"--wf-grid-y":`${this.model.pan?.y||0}px`}}get contentStyle(){let e=this.model.zoom||1,t=this.model.pan||{x:0,y:0};return{width:`${this.model.width||1200}px`,height:`${this.model.height||720}px`,transform:`translate(${t.x}px, ${t.y}px) scale(${e})`}}get svgAttrs(){return{width:String(this.model.width||1200),height:String(this.model.height||720)}}portAttrs(e,t,r){return{class:`workflow-node-port workflow-node-port-${r}`,"data-port-id":t.id,"data-port-side":r,title:t.label,"aria-label":t.label,style:`left:${t.x-e.x}px;top:${t.y-e.y}px`}}backgroundDown(e){this.panStart={clientX:Number(e?.clientX)||0,clientY:Number(e?.clientY)||0},this.emit({type:"background-down",event:e,world:this.worldFromEvent(e)})}pointerMove(e){if(this.panStart&&this.panAction){let t=Number(e?.clientX)||0,r=Number(e?.clientY)||0;this.panAction(t-this.panStart.clientX,r-this.panStart.clientY),this.panStart={clientX:t,clientY:r}}this.emit({type:"pointer-move",event:e,world:this.worldFromEvent(e)})}pointerUp(e){this.panStart=void 0,this.emit({type:"pointer-up",event:e,world:this.worldFromEvent(e)})}pointerLeave(e){this.panStart=void 0,this.emit({type:"pointer-leave",event:e})}nodeDown(e,t){this.stop(e),this.panStart=void 0,this.emit({type:"node-down",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}nodeUp(e,t){this.stop(e),this.emit({type:"node-up",event:e,nodeId:t.id,world:this.worldFromEvent(e)})}edgeClick(e,t){this.stop(e),this.emit({type:"edge-click",event:e,connectionId:t.id})}edgeDown(e){this.stop(e),this.panStart=void 0}portDown(e,t,r,o){this.stop(e),e?.preventDefault?.(),this.panStart=void 0,this.emit({type:"port-down",event:e,nodeId:t.id,portId:r.id,portType:o,world:this.worldFromEvent(e)})}portUp(e,t,r,o){this.stop(e),this.emit({type:"port-up",event:e,nodeId:t.id,portId:r.id,portType:o,world:this.worldFromEvent(e)})}dragOver(e){e?.preventDefault?.(),e?.dataTransfer&&(e.dataTransfer.dropEffect="copy")}drop(e){e?.preventDefault?.();let t=e?.dataTransfer?.getData?.("application/x-tsdi-workflow-node")||void 0;this.emit({type:"drop",event:e,nodeType:t,world:this.worldFromEvent(e)})}keyDown(e){let t=e?.key;t&&(["Delete","Backspace","Escape","z","Z","y","Y","d","D"].includes(t)&&e?.preventDefault?.(),this.emit({type:"key-down",event:e,key:t,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey}))}wheel(e){e?.preventDefault?.(),this.emit({type:"wheel",event:e,clientX:e?.clientX,clientY:e?.clientY,deltaX:e?.deltaX,deltaY:e?.deltaY,shiftKey:!!e.shiftKey,ctrlKey:!!e.ctrlKey,metaKey:!!e.metaKey,world:this.worldFromEvent(e)})}worldFromEvent(e){let t=this.model.zoom||1,r=this.model.pan||{x:0,y:0},o=globalThis.document,s=this.canvasRoot?.nativeElement||this.elementRef?.nativeElement?.querySelector?.(".workflow-canvas")||o?.querySelector?.(".workflow-canvas")||this.elementRef?.nativeElement,i=s?.getBoundingClientRect?.()||{left:0,top:0},l=Number(e?.clientX),n=Number(e?.clientY),d=(Number.isFinite(l)?l:0)-(i.left||0)+(s?.scrollLeft||0),c=(Number.isFinite(n)?n:0)-(i.top||0)+(s?.scrollTop||0);return{x:(d-r.x)/t,y:(c-r.y)/t}}emit(e){this.pointerAction?.(e)}stop(e){e?.stopPropagation?.()}};Reflect.metadata("design:type",Object)(X.prototype,"model");Reflect.metadata("design:type",Object)(X.prototype,"locale");Reflect.metadata("design:type",Function)(X.prototype,"pointerAction");Reflect.metadata("design:type",Function)(X.prototype,"panAction");Reflect.metadata("design:type",F)(X.prototype,"canvasRoot");Reflect.metadata("design:paramtypes",[F,N])(X);b(X,[[f(),1,"model"],[f(),1,"locale"],[f(),1,"pointerAction"],[f(),1,"panAction"],[ce("canvasRoot",F),1,"canvasRoot"],[S(),3,void 0,1],[S(),3,void 0,0],[R({selector:"workflow-canvas",template:`
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
    </div>`}),0]]);var Xo={hasSelection:!1,nodeId:"",name:"",description:"",disabled:!1,icon:"",color:"",typeLabel:"",typeDescription:"",status:"idle",statusLabel:"",durationLabel:"",fields:[],resultText:"",errorText:""};function fa(a){return a.hasSelection?JSON.stringify([a.nodeId,a.name,a.description,a.disabled?1:0,a.icon,a.color,a.typeLabel,a.status,a.statusLabel,a.durationLabel,a.resultText,a.errorText,a.fields.map(e=>[e.key,e.type,e.value??null,e.displayValue,e.checked?1:0,e.visible===!1?0:1,e.group||"",e.placeholder||"",e.description||"",e.hasDefault?1:0])]):"empty"}var W=class{constructor(e){this.translator=e,this.locale="zh-CN",this.codeChangeDelay=160,this.codeSuggestions=[],this._model=Xo,this.modelSignature="",this.destroyed=!1,this.formChange=t=>{if(!t.valid){this.flushPendingChange();return}let r=this.changeType(t.field);if(r==="code"){this.queueChange(t.key,t.value,r);return}this.flushPendingChange(),this.changeAction?.(t.key,t.value,r,this._model.nodeId)},this.formBlur=()=>{this.flushPendingChange()}}get model(){return this._model}set model(e){let t=e||Xo,r=fa(t);r!==this.modelSignature&&(this.pendingChange&&this.pendingChange.nodeId!==t.nodeId&&this.flushPendingChange(),this.modelSignature=r,this._model=t)}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return C(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get titleLabel(){return this.t("inspectorTitle","Node inspector")}get emptyLabel(){return this.t("inspectorEmpty","Select a node on the canvas to edit its properties.")}get nameLabel(){return this.t("name","Name")}get descriptionLabel(){return this.t("description","Description")}get appearanceLabel(){return this.t("appearance","Appearance")}get iconLabel(){return this.t("icon","Icon")}get colorLabel(){return this.t("color","Color")}get enabledLabel(){return this.t("enabled","Enabled")}get resultLabel(){return this.t("latestOutput","Latest output")}get restoreLabel(){return this.t("restoreDefaults","Reset")}get resetFieldLabel(){return this.t("resetField","Reset to default")}get noPropertiesLabel(){return this.t("noProperties","This node has no editable properties.")}get namePlaceholder(){return this.t("namePlaceholder","Node name")}get descriptionPlaceholder(){return this.t("descriptionPlaceholder","Optional note for this node")}get requiredMessage(){return this.t("requiredMessage","Required")}get numberMessage(){return this.t("numberMessage","Number out of range")}get patternMessage(){return this.t("patternMessage","Invalid format")}get jsonMessage(){return this.t("jsonMessage","Invalid JSON")}get emailMessage(){return this.t("invalidEmail","Invalid email address")}get urlMessage(){return this.t("invalidUrl","Invalid URL")}get integerMessage(){return this.t("integerMessage","Must be an integer")}get formSchema(){let e=[];if(!this._model.hasSelection)return{fields:e};let t=this.t("properties","Properties");return e.push({key:"name",type:"text",label:this.nameLabel,placeholder:this.namePlaceholder,required:!0,inputClass:"workflow-inspector-name"}),e.push({key:"description",type:"text",label:this.descriptionLabel,placeholder:this.descriptionPlaceholder,inputClass:"workflow-inspector-description"}),e.push({key:"enabled",type:"checkbox",label:this.enabledLabel,defaultValue:!0}),e.push({key:"icon",type:"text",label:this.iconLabel,group:this.appearanceLabel,maxLength:4,defaultValue:"\u25C6",placeholder:"\u25C6",inputClass:"workflow-inspector-icon"}),e.push({key:"color",type:"color",label:this.colorLabel,group:this.appearanceLabel,defaultValue:"#64748b",inputClass:"workflow-inspector-color"}),this._model.fields.forEach(r=>{e.push(this.toDynamicField(r))}),{fields:e,defaultGroupLabel:t,jsonFieldsLabel:this.t("fields","Fields"),jsonTextLabel:this.t("json","JSON")}}toDynamicField(e){return{key:e.key,type:this.dynamicType(e),label:e.label,placeholder:e.placeholder,description:e.description,group:e.group,options:e.options.map(t=>({label:t.label,value:t.value})),defaultValue:e.hasDefault?e.resetValue:void 0,rows:e.rows,min:e.min,max:e.max,step:e.step,unit:e.unit,span:e.span,minLength:e.minLength,maxLength:e.maxLength,required:e.required,readonly:e.readonly,disabled:e.disabled,pattern:e.pattern,rules:e.rules,errorMessages:e.errorMessages,itemFields:e.itemFields?.map(t=>this.toDynamicField(t)),addLabel:e.addLabel,removeLabel:e.removeLabel,minItems:e.minItems,maxItems:e.maxItems,visibleWhen:e.visibleWhen,inputClass:e.inputClass,fieldClass:e.fieldClass,language:e.language,suggestions:this.codeSuggestions,hidden:e.visible===!1}}get formValue(){let e={name:this._model.name,description:this._model.description,enabled:!this._model.disabled,icon:this._model.icon,color:this._model.color};return this._model.fields.forEach(t=>{e[t.key]=t.type==="boolean"?t.checked:t.type==="select"||t.type==="json"?t.value:t.displayValue}),e}get formMessages(){return{required:this.requiredMessage,requiredTrue:this.requiredMessage,min:this.numberMessage,max:this.numberMessage,minlength:this.numberMessage,maxlength:this.numberMessage,pattern:this.patternMessage,json:this.jsonMessage,email:this.emailMessage,url:this.urlMessage,number:this.numberMessage,integer:this.integerMessage}}restoreDefaults(){this.flushPendingChange(),this.nodeForm?.reset(!1),this.restoreAction?.()}dynamicType(e){return e.type==="boolean"?"checkbox":e.type==="select"?"radio":e.type}changeType(e){switch(e.type){case"checkbox":case"switch":return"boolean";case"radio":case"select":return"select";case"number":case"range":return"number";case"json":return"json";case"list":return"list";case"code":return"code";default:return"text"}}queueChange(e,t,r){this.pendingChange&&this.pendingChange.key!==e&&this.flushPendingChange(),this.pendingChange={key:e,value:t,type:r,nodeId:this._model?.nodeId||""},this.pendingTimer!==void 0&&clearTimeout(this.pendingTimer);let o=Math.max(0,Number(this.codeChangeDelay)||0);this.pendingTimer=setTimeout(()=>this.flushPendingChange(),o)}flushPendingChange(){this.pendingTimer!==void 0&&(clearTimeout(this.pendingTimer),this.pendingTimer=void 0);let e=this.pendingChange;this.pendingChange=void 0,e&&this.changeAction?.(e.key,e.value,e.type,e.nodeId)}onDestroy(){this.flushPendingChange(),this.destroyed=!0}};Reflect.metadata("design:type",Object)(W.prototype,"locale");Reflect.metadata("design:type",Object)(W.prototype,"codeChangeDelay");Reflect.metadata("design:type",Function)(W.prototype,"changeAction");Reflect.metadata("design:type",Function)(W.prototype,"restoreAction");Reflect.metadata("design:type",Array)(W.prototype,"codeSuggestions");Reflect.metadata("design:type",M)(W.prototype,"nodeForm");Reflect.metadata("design:paramtypes",[N])(W);Reflect.metadata("design:paramtypes",[])(W.prototype,"model");Reflect.metadata("design:returntype",Object)(W.prototype,"model");b(W,[[f(),1,"locale"],[f(),1,"codeChangeDelay"],[f(),1,"changeAction"],[f(),1,"restoreAction"],[f(),1,"codeSuggestions"],[ce("nodeForm",M),1,"nodeForm"],[S(),3,void 0,0],[f(),1,"model"],[R({selector:"workflow-inspector",template:`
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
    </div>`}),0]]);var re=class{constructor(e){this.translator=e,this.items=[],this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.runHistory","Runs")}chipClass(e){return{"workflow-run-chip":!0,[`workflow-run-chip-${e.tone}`]:!0,"is-active":e.active}}select(e){this.selectAction?.(e.executionId)}};Reflect.metadata("design:type",Array)(re.prototype,"items");Reflect.metadata("design:type",Object)(re.prototype,"locale");Reflect.metadata("design:type",Function)(re.prototype,"selectAction");Reflect.metadata("design:paramtypes",[N])(re);b(re,[[f(),1,"items"],[f(),1,"locale"],[f(),1,"selectAction"],[S(),3,void 0,0],[R({selector:"workflow-run-history",template:`
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
    </div>`}),0]]);var te=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.locale="zh-CN"}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}get title(){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.logTitle","Execution log")}get closeLabel(){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.close","Close")}levelLabel(e){let t={info:"INFO",success:"OK",warning:"WARN",error:"ERROR"};return C(this.translator,this.isZh?"zh-CN":"en",`workflow.log.${e}`,t[e]||e)}formatTime(e){let t=new Date(e),r=o=>String(o).padStart(2,"0");return`${r(t.getHours())}:${r(t.getMinutes())}:${r(t.getSeconds())}`}rowClass(e){return{"workflow-run-log-row":!0,[`workflow-run-log-${e.level}`]:!0}}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(te.prototype,"items");Reflect.metadata("design:type",Object)(te.prototype,"visible");Reflect.metadata("design:type",Object)(te.prototype,"locale");Reflect.metadata("design:type",Function)(te.prototype,"closeAction");Reflect.metadata("design:paramtypes",[N])(te);b(te,[[f(),1,"items"],[f(),1,"visible"],[f(),1,"locale"],[f(),1,"closeAction"],[S(),3,void 0,0],[R({selector:"workflow-run-log",template:`
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
    </div>`}),0]]);var z=class{constructor(e){this.translator=e,this.items=[],this.visible=!1,this.currentId="",this.locale="zh-CN",this.error=""}get isZh(){return String(this.locale||"").toLowerCase().startsWith("zh")}t(e,t){return C(this.translator,this.isZh?"zh-CN":"en",`workflow.ui.${e}`,t)}get title(){return this.t("libraryTitle","Workflow library")}get emptyLabel(){return this.t("libraryEmpty","No saved workflows yet.")}get saveLabel(){return this.t("save","Save")}get saveAsLabel(){return this.t("saveAs","Save as copy")}get openLabel(){return this.t("open","Open")}get removeLabel(){return this.t("remove","Delete")}get closeLabel(){return this.t("close","Close")}nodeLabel(e){return C(this.translator,this.isZh?"zh-CN":"en","workflow.ui.nodeCount",`${e.nodeCount} nodes`,{count:e.nodeCount})}rowClass(e){return{"workflow-library-row":!0,"is-active":e.id===this.currentId}}save(){this.saveAction?.()}saveAs(){this.saveAsAction?.()}open(e){this.openAction?.(e.id)}remove(e){this.removeAction?.(e.id)}close(){this.closeAction?.()}};Reflect.metadata("design:type",Array)(z.prototype,"items");Reflect.metadata("design:type",Object)(z.prototype,"visible");Reflect.metadata("design:type",Object)(z.prototype,"currentId");Reflect.metadata("design:type",Object)(z.prototype,"locale");Reflect.metadata("design:type",Object)(z.prototype,"error");Reflect.metadata("design:type",Function)(z.prototype,"saveAction");Reflect.metadata("design:type",Function)(z.prototype,"saveAsAction");Reflect.metadata("design:type",Function)(z.prototype,"openAction");Reflect.metadata("design:type",Function)(z.prototype,"removeAction");Reflect.metadata("design:type",Function)(z.prototype,"closeAction");Reflect.metadata("design:paramtypes",[N])(z);b(z,[[f(),1,"items"],[f(),1,"visible"],[f(),1,"currentId"],[f(),1,"locale"],[f(),1,"error"],[f(),1,"saveAction"],[f(),1,"saveAsAction"],[f(),1,"openAction"],[f(),1,"removeAction"],[f(),1,"closeAction"],[S(),3,void 0,0],[R({selector:"workflow-library",template:`
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
    </div>`}),0]]);var Zo="tsdi-workflow-designer-styles",ha=`
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

.workflow-node.is-disabled {
    opacity: 0.55;
    border-style: dashed;
}

.workflow-node.is-disabled .workflow-node-title {
    text-decoration: line-through;
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

`;function xt(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById(Zo))return;let e=a.createElement("style");e.setAttribute("id",Zo),e.textContent=ha,a.head.appendChild(e)}var Qo=.08,er=.6,ma=.7,P=class{constructor(e){this.elementRef=e,this.leftRatio=.2,this.rightRatio=.24,this.bottomRatio=.26,this.minLeft=160,this.minRight=180,this.minBottom=80,this.resizable=!0,this.leftCollapsed=!1,this.rightCollapsed=!1,this.bottomCollapsed=!1,this.projected=!1,ge(e)}get layoutStyle(){return{"--workspace-left":`${this.leftRatio*100}%`,"--workspace-right":`${this.rightRatio*100}%`,"--workspace-bottom":`${this.bottomRatio*100}%`}}onAfterViewInit(){ge(this.layoutRoot),this.mountProjectedContent(),this.bindResizeListeners()}onDestroy(){this.unbindResizeListeners()}mountProjectedContent(){if(this.projected)return;let e=this.layoutRoot?.nativeElement;if(!e)return;let r=(e.closest?.("workspace-layout")||e.parentElement||this.hostElement)?.[io]||[];if(!r.length)return;let o={};e.querySelectorAll?.("[data-workspace-slot]")?.forEach?.(s=>{o[s.getAttribute("data-workspace-slot")]=s}),Object.keys(o).length&&(r.forEach((s,i)=>{let l=String(s.tagName||"").toLowerCase(),n=l.startsWith("workspace-")?l.slice(10):"",d=["left","center","right","bottom"][i],c=o[n]||o[d];c&&typeof c.appendChild=="function"&&c.appendChild(s)}),this.projected=!0)}beginResize(e,t){if(!this.resizable||this.isCollapsed(t))return;e?.preventDefault?.(),e?.stopPropagation?.();let o=(this.layoutRoot?.nativeElement||this.hostElement)?.getBoundingClientRect?.()||{width:0,height:0};this.resizing={pane:t,startX:Number(e?.clientX)||0,startY:Number(e?.clientY)||0,startLeft:this.leftRatio,startRight:this.rightRatio,startBottom:this.bottomRatio,width:o.width||0,height:o.height||0}}resizeMove(e){let t=this.resizing;if(t)if(t.pane==="left"){let r=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setLeftRatio(t.startLeft+r)}else if(t.pane==="right"){let r=t.width?(Number(e?.clientX)-t.startX)/t.width:0;this.setRightRatio(t.startRight-r)}else{let r=t.height?(Number(e?.clientY)-t.startY)/t.height:0;this.setBottomRatio(t.startBottom-r)}}endResize(){this.resizing&&(this.resizing=void 0)}resizePane(e,t){e==="left"?this.setLeftRatio(t):e==="right"?this.setRightRatio(t):this.setBottomRatio(t)}isCollapsed(e){return e==="left"?this.leftCollapsed:e==="right"?this.rightCollapsed:this.bottomCollapsed}togglePane(e){this.isCollapsed(e)?this.expandPane(e):this.collapsePane(e)}collapsePane(e){this.setCollapsed(e,!0)}expandPane(e){this.setCollapsed(e,!1)}setCollapsed(e,t){e==="left"?this.leftCollapsed=t:e==="right"?this.rightCollapsed=t:this.bottomCollapsed=t,this.collapseAction?.(e,t)}stopEvent(e){e?.preventDefault?.(),e?.stopPropagation?.()}setLeftRatio(e){let t=this.layoutSize().width,r=this.minRatio(this.minLeft,t),o=Math.min(er,1-this.rightRatio-r);this.leftRatio=this.clamp(e,r,o),this.resizeAction?.("left",this.leftRatio)}setRightRatio(e){let t=this.layoutSize().width,r=this.minRatio(this.minRight,t),o=Math.min(er,1-this.leftRatio-r);this.rightRatio=this.clamp(e,r,o),this.resizeAction?.("right",this.rightRatio)}setBottomRatio(e){let t=this.layoutSize().height,r=this.minRatio(this.minBottom,t);this.bottomRatio=this.clamp(e,r,ma),this.resizeAction?.("bottom",this.bottomRatio)}layoutSize(){let e=this.layoutRoot?.nativeElement?.getBoundingClientRect?.();return{width:Number(e?.width)||0,height:Number(e?.height)||0}}minRatio(e,t){let r=Math.max(0,Number(e)||0);return t>0?Math.max(Qo,r/t):Qo}get hostElement(){return this.elementRef?.nativeElement}clamp(e,t,r){let o=Number(e);return Number.isFinite(o)?Math.max(t,Math.min(Math.max(t,r),o)):t}bindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.addEventListener!="function"||this.moveHandler||(this.moveHandler=t=>this.resizeMove(t),this.upHandler=()=>this.endResize(),e.addEventListener("mousemove",this.moveHandler),e.addEventListener("mouseup",this.upHandler))}unbindResizeListeners(){let e=this.layoutRoot?.nativeElement?.ownerDocument;!e||typeof e.removeEventListener!="function"||(this.moveHandler&&e.removeEventListener("mousemove",this.moveHandler),this.upHandler&&e.removeEventListener("mouseup",this.upHandler),this.moveHandler=void 0,this.upHandler=void 0)}};Reflect.metadata("design:type",Object)(P.prototype,"leftRatio");Reflect.metadata("design:type",Object)(P.prototype,"rightRatio");Reflect.metadata("design:type",Object)(P.prototype,"bottomRatio");Reflect.metadata("design:type",Object)(P.prototype,"minLeft");Reflect.metadata("design:type",Object)(P.prototype,"minRight");Reflect.metadata("design:type",Object)(P.prototype,"minBottom");Reflect.metadata("design:type",Object)(P.prototype,"resizable");Reflect.metadata("design:type",Object)(P.prototype,"leftCollapsed");Reflect.metadata("design:type",Object)(P.prototype,"rightCollapsed");Reflect.metadata("design:type",Object)(P.prototype,"bottomCollapsed");Reflect.metadata("design:type",Function)(P.prototype,"resizeAction");Reflect.metadata("design:type",Function)(P.prototype,"collapseAction");Reflect.metadata("design:type",F)(P.prototype,"layoutRoot");Reflect.metadata("design:paramtypes",[F])(P);b(P,[[f(),1,"leftRatio"],[f(),1,"rightRatio"],[f(),1,"bottomRatio"],[f(),1,"minLeft"],[f(),1,"minRight"],[f(),1,"minBottom"],[f(),1,"resizable"],[f(),1,"leftCollapsed"],[f(),1,"rightCollapsed"],[f(),1,"bottomCollapsed"],[f(),1,"resizeAction"],[f(),1,"collapseAction"],[ce("layoutRoot",F),1,"layoutRoot"],[S(),3,void 0,0],[R({selector:"workspace-layout",template:`
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
    </div>`}),0]]);var tr="tsdi-workspace-layout-styles",ga=`
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
`;function or(a){if(!a||typeof a.createElement!="function"||!a.head||a.getElementById&&a.getElementById(tr))return;let e=a.createElement("style");e.setAttribute("id",tr),e.textContent=ga,a.head.appendChild(e)}var $e=class{};b($e,[[H({declarations:[P],exports:[P]}),0]]);var I=class{constructor(e,t,r){this.translator=t,this.elementRef=r,this.locale="zh-CN",this.theme="light",this.applyDocumentTheme=!0,this.runContext={},this.autoRun=!1,this.saveState="saved",this.hiddenActions=[],this.showRunHistory=!0,this.showStatusbar=!0,this.showRunLogs=!0,this.showShortcuts=!1,this.showJson=!1,this.showLogs=!1,this.jsonText="",this.jsonError="",this.scheduling=!1,this.notifyChange=()=>{this.autosaveAction?.()},this.toggleSchedule=()=>{let o=this.selfRef||this;if(o.scheduleHandle){o.scheduleHandle.stop(),o.scheduleHandle=void 0,o.scheduling=!1,o.notifyChange();return}let s=o.designer.service;if(!s){o.designer.error="Scheduling is not available in this host",o.notifyChange();return}o.scheduling=!0,o.scheduleHandle=s.startSchedule(o.designer.definition,{context:o.runContext,onResult:i=>{let l=i.data?.executionState;l&&(o.designer.execution=l),o.notifyChange()},onError:i=>{o.designer.error=i.message,o.notifyChange()}}),o.notifyChange()},this.handleToolbarAction=o=>{let s=this.selfRef||this;switch(o){case"schedule":s.toggleSchedule();break;case"run":this.designer.run({context:this.runContext});break;case"resume":s.resumeWorkflow();break;case"cancel":this.designer.cancel();break;case"undo":this.designer.undo();break;case"redo":this.designer.redo();break;case"delete":this.designer.deleteSelection();break;case"zoom-in":this.designer.zoomIn();break;case"zoom-out":this.designer.zoomOut();break;case"reset-view":s.fitView();break;case"auto-layout":this.designer.autoLayout();break;case"duplicate":this.designer.duplicateSelection();break;case"toggle-logs":s.showLogs=!s.showLogs;break;case"save":s.hostAction?.("save");break;case"open-library":s.hostAction?.("open-library");break;case"clear":this.designer.clear();break;case"toggle-json":s.toggleJson();break;case"shortcuts":s.toggleShortcuts();break;default:break}s.notifyChange()},this.fitView=()=>{let o=this.canvasViewport(),s=this.designer.nodes;if(!o||!s.length){this.designer.resetView();return}let i=48,l=1/0,n=1/0,d=-1/0,c=-1/0;s.forEach(k=>{let T=yt(k);l=Math.min(l,k.position.x),n=Math.min(n,k.position.y),d=Math.max(d,k.position.x+T.width),c=Math.max(c,k.position.y+T.height)});let p=Math.max(1,d-l),u=Math.max(1,c-n),m=Math.max(.25,Math.min(1.25,Math.min((o.width-i*2)/p,(o.height-i*2)/u)));this.designer.setZoom(m);let w=this.designer.zoom||1;this.designer.pan={x:Math.round((o.width-p*w)/2-l*w),y:Math.round((o.height-u*w)/2-n*w)};let g=this.elementRef?.nativeElement,v=globalThis.document,x=g?.querySelector?.(".workflow-canvas")||v?.querySelector?.(".workflow-canvas");x&&(x.scrollLeft=0,x.scrollTop=0)},this.addFromPalette=o=>{let s=this.selfRef||this;this.designer.addNode(o.type,this.nextAddPosition()),s.notifyChange()},this.paletteDragStart=(o,s)=>{this.pendingNodeType=s.type,o?.dataTransfer&&(o.dataTransfer.setData("application/x-tsdi-workflow-node",s.type),o.dataTransfer.effectAllowed="copy"),this.designer.message="workflow.message.dropHint",this.designer.messageParams={name:s.label}},this.handlePan=(o,s)=>{this.designer.panBy(o,s)},this.selectRun=o=>{this.designer.selectExecution(o)},this.resumeWorkflow=async()=>{await this.designer.resume({context:this.runContext})},this.closeLogs=()=>{let o=this.selfRef||this;o.showLogs=!1},this.handleCanvas=o=>{let s=this.designer;switch(o.type){case"background-down":s.connectionDraft?s.cancelConnection():s.clearSelection();break;case"pointer-move":o.world&&(s.drag?s.dragNodeTo(o.world):s.connectionDraft&&s.updateConnectionDraft(o.world));break;case"pointer-up":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"pointer-leave":s.drag?s.endNodeDrag():s.connectionDraft&&s.cancelConnection();break;case"node-down":s.connectionDraft&&o.nodeId?this.connectToNode(o.nodeId):o.nodeId&&o.world&&s.beginNodeDrag(o.nodeId,o.world);break;case"node-up":s.drag?s.endNodeDrag():s.connectionDraft&&o.nodeId&&this.connectToNode(o.nodeId);break;case"edge-click":o.connectionId&&s.selectConnection(o.connectionId);break;case"port-down":{let i=o.portType==="input"?"input":"output";if(!o.nodeId||!o.portId||!o.world)break;let l=s.connectionDraft;if(l){if((l.sourceSide||"output")!==i){s.completeConnection(o.nodeId,o.portId);break}s.cancelConnection()}s.beginConnection(o.nodeId,o.portId,o.world,i);break}case"port-up":{let i=s.connectionDraft;if(!i||!o.nodeId||!o.portId)break;let l=o.portType==="input"?"input":"output",n=i.sourceSide||"output";l!==n?s.completeConnection(o.nodeId,o.portId):(o.nodeId!==i.sourceNodeId||o.portId!==i.sourcePort)&&s.cancelConnection();break}case"drop":{let i=o.nodeType||this.pendingNodeType;if(this.pendingNodeType=void 0,i&&o.world){let l=this.registry.get(i),n=l?yt({type:l.type,position:{x:0,y:0},inputs:l.inputs||[],outputs:l.outputs||[]}):{width:184,height:64};s.addNode(i,{x:Math.round(o.world.x-n.width/2),y:Math.round(o.world.y-n.height/2)})}break}case"key-down":this.handleKey(o);break;case"wheel":{let i=this.canvasRect();if(o.ctrlKey||o.metaKey)this.zoomAtPoint(o,i);else{let l=!!o.shiftKey,n=Number(o.deltaX)||0,d=Number(o.deltaY)||0,c=l&&!n?d:n,p=l&&!n?0:d;s.panBy(-c,-p)}break}default:break}(o.type==="pointer-up"||o.type==="node-up"||o.type==="drop"||o.type==="port-down"||o.type==="port-up"||o.type==="key-down")&&this.notifyChange()},this.inspectorRestore=()=>{let o=this.designer.selectedNode;o&&(this.designer.resetNodeConfig(o.id),this.notifyChange())},this.inspectorChange=(o,s,i,l)=>{let n=l?this.designer.nodes.find(c=>c.id===l):this.designer.selectedNode;if(!n)return;if(o==="name"){this.designer.renameNode(n.id,String(s)),this.notifyChange();return}if(o==="description"){this.designer.updateNode(n.id,{description:String(s)}),this.notifyChange();return}if(o==="enabled"){this.designer.updateNode(n.id,{disabled:s===!1}),this.notifyChange();return}if(o==="icon"||o==="color"){let c={...n.style||{}},p=String(s??"").trim();o==="icon"?p?c.icon=p:delete c.icon:p?c.backgroundColor=p:delete c.backgroundColor,this.designer.updateNode(n.id,{style:c}),this.notifyChange();return}if(i==="list"){this.designer.updateNodeConfig(n.id,{[o]:Array.isArray(s)?s:[]}),this.notifyChange();return}let d=s;if(i==="json")if(s&&typeof s=="object")d=s;else if(String(s??"").trim()==="")d=void 0;else try{d=JSON.parse(String(s))}catch(c){this.designer.error=`Invalid JSON: ${c.message}`;return}else if(i==="number"){if(d=s===""||s===void 0||s===null?void 0:Number(s),typeof d=="number"&&!Number.isFinite(d)){this.designer.error="Invalid number";return}}else i==="boolean"?d=!!s:i==="list"?d=Array.isArray(s)?s:[]:d=String(s??"");this.designer.updateNodeConfig(n.id,{[o]:d}),this.notifyChange()},ge(r),this.documentRef=e;try{e&&(e[Z]=!0)}catch{}xt(e),or(e),xo(e),co(e)}onAfterViewInit(){if(this.applyDocumentTheme!==!1){let e=this.documentRef||globalThis.document;Te(e,this.themeName)}}onInit(){this.selfRef=this,this.registry||(this.registry=new L),this.autoRun&&this.designer&&this.designer.run({context:this.runContext})}onDestroy(){this.scheduleHandle?.stop(),this.scheduleHandle=void 0,this.scheduling=!1}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ue(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}setTheme(e){if(this.theme=ue(e)?e:"light",this.applyDocumentTheme!==!1){let t=this.documentRef||globalThis.document;Te(t,this.theme)}this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}t(e,t){return C(this.translator,this.localeValue,`workflow.ui.${e}`,t)}get nodeWord(){return this.t("nodeWord","nodes")}get jsonTitle(){return this.t("jsonTitle","Workflow JSON (generated visually)")}get applyLabel(){return this.t("apply","Apply")}get closeLabel(){return this.t("close","Close")}get saveStateClass(){return`workflow-save-state is-${this.saveState||"saved"}`}get visibleActions(){return Array.isArray(this.hiddenActions)?this.hiddenActions:[]}visibleAction(e){return!this.visibleActions.includes(e)}get saveStateLabel(){switch(this.saveState){case"saving":return this.t("saveStateSaving","Saving\u2026");case"dirty":return this.t("saveStateDirty","Unsaved changes");case"error":return this.t("saveStateError","Save failed");default:return this.t("saveStateSaved","Saved")}}get shortcutsLabel(){return this.t("shortcutsTitle","Keyboard shortcuts")}get shortcutRows(){return[{action:this.t("save","Save"),keys:"Ctrl+S"},{action:this.t("library","Workflows"),keys:"Ctrl+O"},{action:this.t("run","Run"),keys:"Ctrl+Enter"},{action:this.t("undo","Undo"),keys:"Ctrl+Z"},{action:this.t("redo","Redo"),keys:"Ctrl+Y"},{action:this.t("duplicate","Duplicate"),keys:"Ctrl+D"},{action:this.t("delete","Delete"),keys:"Delete"},{action:this.t("zoomPan","Zoom / pan"),keys:"Ctrl+Wheel / Wheel"},{action:this.t("shortcuts","Keyboard shortcuts"),keys:"?"}]}toggleShortcuts(){let e=this.selfRef||this;e.showShortcuts=!e.showShortcuts}closeShortcuts(){let e=this.selfRef||this;e.showShortcuts=!1}stopShortcutClick(e){e?.stopPropagation?.()}get paletteGroups(){let e=`${this.localeValue}|${this.registry.revision}`,t=this.paletteCache;if(t&&t.key===e)return t.groups;let r=qo(this.registry,this.localeValue,this.translator);return this.paletteCache={key:e,groups:r},r}get canvasModel(){let e=this.canvasModelKey(),t=this.canvasModelCache;if(t&&t.key===e)return t.model;let r=Fo(this.designer,this.registry,this.localeValue,this.translator);return this.canvasModelCache={key:e,model:r},r}get inspectorModel(){let e=this.designer.selectedNode,t=this.designer.execution,r=this.localeValue,o=this.registry.revision,s=e?.id||"",i=e?.name||"",l=e?.description||"",n=e?.type||"",d=e?.config,c=!!e?.disabled,p=this.inspectorModelCache;if(p&&p.nodeId===s&&p.name===i&&p.description===l&&p.type===n&&p.config===d&&p.disabled===c&&p.execution===t&&p.locale===r&&p.revision===o)return p.model;let u=$o(this.designer,this.registry,r,this.translator);return this.inspectorModelCache={nodeId:s,name:i,description:l,type:n,config:d,disabled:c,execution:t,locale:r,revision:o,model:u},u}get toolbarModel(){let e=this.toolbarModelKey(),t=this.toolbarModelCache;if(t&&t.key===e)return t.model;let r={...Wo(this.designer,this.localeValue,this.translator),scheduling:this.scheduling};return this.toolbarModelCache={key:e,model:r},r}get statusModel(){let e=this.statusModelKey(),t=this.statusModelCache;if(t&&t.key===e)return t.model;let r=Jo(this.designer,this.localeValue,this.translator);return this.statusModelCache={key:e,model:r},r}get runHistory(){let e=this.designer.executionHistory,t=this.designer.selectedExecutionId,r=this.localeValue,o=this.runHistoryCache;if(o&&o.history===e&&o.selected===t&&o.locale===r)return o.model;let s=Ho(this.designer,r,this.translator);return this.runHistoryCache={history:e,selected:t,locale:r,model:s},s}get runLogs(){let e=this.designer.execution,t=this.runLogsCache;if(t&&t.execution===e)return t.logs;let r=e?.logs||[];return this.runLogsCache={execution:e,logs:r},r}get codeSuggestions(){let e=this.designer.nodes.map(i=>[i.id,i.type,i.config?.action||"",i.config?.field||"",i.config?.target||"",JSON.stringify(i.config?.values||""),JSON.stringify(i.config?.result||"")].join(":")).join("|"),t=this.codeSuggestionCache;if(t&&t.key===e)return t.values;let r=new Set(["context","input","msg","variables","context.variables","context.actions","context.state","context.event","context.events","input.variables","input.actions","input.state","input.data","input.value","input.result","msg.variables","msg.actions","return","const","let","var","if","else","for","while","try","catch","throw","await","async","function"]),o=i=>{typeof i=="string"&&i.trim()&&r.add(i.trim())};this.designer.nodes.forEach(i=>{let l=i.config||{};if(typeof l.action=="string"){let n=l.action.replace(/^actions\./,"");o(`context.actions.${n}`),o(`input.actions.${n}`)}typeof l.field=="string"&&(o(l.field),l.field.includes(".")||o(`variables.${l.field}`)),typeof l.target=="string"&&o(l.target.includes(".")?l.target:`variables.${l.target}`),l.values&&typeof l.values=="object"&&Object.keys(l.values).forEach(n=>o(`variables.${n}`)),l.result&&typeof l.result=="object"&&Object.keys(l.result).forEach(n=>o(`input.${n}`)),typeof l.event=="string"&&o(`context.events.${l.event}`)});let s=Array.from(r).slice(0,240);return this.codeSuggestionCache={key:e,values:s},s}canvasModelKey(){let e=this.designer,t=e.execution,r=[this.localeValue,String(e.zoom),String(e.pan?.x||0),String(e.pan?.y||0),e.selection?.nodeId||"",e.selection?.connectionId||"",String(this.registry.revision)],o=e.connectionDraft;return r.push(o?`draft:${o.sourceNodeId}:${o.sourcePort}:${o.sourceSide||"output"}:${o.x}:${o.y}`:""),(e.nodes||[]).forEach(s=>{r.push([s.id,s.name,s.type,s.description||"",s.position?.x,s.position?.y,s.dimension?.width||"",s.dimension?.height||"",s.style?.icon||"",s.style?.backgroundColor||"",s.disabled?"1":"0",s.style?.textColor||"",(s.inputs||[]).map(i=>`${i.id}:${i.label||""}:${i.name||""}:${i.type||""}`).join(","),(s.outputs||[]).map(i=>`${i.id}:${i.label||""}:${i.name||""}:${i.type||""}`).join(","),t?.nodeStates?.[s.id]?.status||""].join(":"))}),(e.connections||[]).forEach(s=>{r.push([s.id,s.sourceNodeId,s.sourcePort,s.targetNodeId,s.targetPort,s.label||"",t?.edgeStates?.[s.id]?.status||""].join(":"))}),r.join("|")}toolbarModelKey(){let e=this.designer;return[this.localeValue,e.definition?.name||"",e.nodes?.length||0,e.connections?.length||0,e.selection?.nodeId||"",e.selection?.connectionId||"",e.canUndo?1:0,e.canRedo?1:0,e.canResume?1:0,e.running?1:0,this.scheduling?1:0,e.zoom,e.execution?.status||""].join("|")}statusModelKey(){let e=this.designer,t=e.selectedNode;return[this.localeValue,e.message||"",JSON.stringify(e.messageParams||{}),e.error||"",JSON.stringify(e.errorParams||{}),e.running?1:0,e.nodes?.length||0,t?.id||"",t?.name||"",t?.type||"",String(this.registry.revision),e.zoom,e.execution?.status||""].join("|")}nextAddPosition(){let e=this.designer.nodes.length,t={x:120+e%3*220,y:110+Math.floor(e/3)*130},r=this.viewportBounds(),o=t;return r&&(t.x>=r.left&&t.x+184<=r.right&&t.y>=r.top&&t.y+64<=r.bottom||(o={x:Math.round((r.left+r.right)/2-92),y:Math.round((r.top+r.bottom)/2-32)})),this.findFreePosition(o)}canvasViewport(){let e=this.elementRef?.nativeElement,t=globalThis.document,o=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{width:o.width,height:o.height}}canvasRect(){let e=this.elementRef?.nativeElement,t=globalThis.document,o=(e?.querySelector?.(".workflow-canvas")||t?.querySelector?.(".workflow-canvas")||e)?.getBoundingClientRect?.();if(!(!o||!(o.width>0)||!(o.height>0)))return{left:o.left,top:o.top,width:o.width,height:o.height}}zoomAtPoint(e,t){let r=Number(e.deltaY)||0;if(!r)return;let o=this.designer,s=o.zoom||1,i=r<0?1.1:.9,l=Math.max(.2,Math.min(2.5,s*i)),n=(Number(e.clientX)||0)-(t?.left||0),d=(Number(e.clientY)||0)-(t?.top||0),c=o.pan||{x:0,y:0},p=(n-c.x)/s,u=(d-c.y)/s;o.setZoom(l);let m=o.zoom||l;o.pan={x:Math.round(n-p*m),y:Math.round(d-u*m)}}viewportBounds(){let e=this.canvasViewport();if(!e)return;let t=this.designer.zoom||1,r=this.designer.pan||{x:0,y:0};return{left:-r.x/t,top:-r.y/t,right:(e.width-r.x)/t,bottom:(e.height-r.y)/t}}findFreePosition(e){let o=[0,1,-1,2,-2,3,-3];for(let s=0;s<30;s++)for(let i of o){let l={x:e.x+i*220,y:e.y+s*130};if(!this.designer.nodes.some(d=>Math.abs(d.position.x-l.x)<184&&Math.abs(d.position.y-l.y)<64))return l}return e}connectToNode(e){let t=this.designer.connectionDraft;if(!t)return;if(t.sourceNodeId===e){this.designer.cancelConnection();return}let r=this.designer.nodes.find(s=>s.id===e);if(!r){this.designer.cancelConnection();return}let o=t.sourceSide==="input"?r.outputs:r.inputs;if(!o?.length){this.designer.cancelConnection();return}this.designer.completeConnection(e,o[0].id)}toggleJson(){this.showJson=!this.showJson,this.showJson&&(this.jsonText=this.designer.toJSON(),this.jsonError="")}applyJson(){this.designer.load(this.jsonText,!0)&&this.designer.validate().valid?(this.jsonError="",this.showJson=!1,this.notifyChange()):this.jsonError=this.designer.error||"Invalid workflow JSON"}handleKey(e){let t=e.key||"";if(t==="Delete"||t==="Backspace"){this.designer.deleteSelection();return}if(t==="Escape"){this.designer.cancelConnection(),this.designer.endNodeDrag();return}if((e.ctrlKey||e.metaKey)&&(t==="z"||t==="Z")){e.shiftKey?this.designer.redo():this.designer.undo();return}if((e.ctrlKey||e.metaKey)&&(t==="y"||t==="Y")){this.designer.redo();return}(e.ctrlKey||e.metaKey)&&(t==="d"||t==="D")&&this.designer.duplicateSelection()}};Reflect.metadata("design:type",Q)(I.prototype,"designer");Reflect.metadata("design:type",L)(I.prototype,"registry");Reflect.metadata("design:type",Object)(I.prototype,"locale");Reflect.metadata("design:type",Object)(I.prototype,"theme");Reflect.metadata("design:type",Object)(I.prototype,"applyDocumentTheme");Reflect.metadata("design:type",Function)(I.prototype,"themeChangeAction");Reflect.metadata("design:type",Object)(I.prototype,"runContext");Reflect.metadata("design:type",Object)(I.prototype,"autoRun");Reflect.metadata("design:type",Object)(I.prototype,"saveState");Reflect.metadata("design:type",Array)(I.prototype,"hiddenActions");Reflect.metadata("design:type",Object)(I.prototype,"showRunHistory");Reflect.metadata("design:type",Object)(I.prototype,"showStatusbar");Reflect.metadata("design:type",Object)(I.prototype,"showRunLogs");Reflect.metadata("design:type",Function)(I.prototype,"hostAction");Reflect.metadata("design:type",Function)(I.prototype,"autosaveAction");Reflect.metadata("design:type",Object)(I.prototype,"documentRef");Reflect.metadata("design:type",Object)(I.prototype,"canvasModelCache");Reflect.metadata("design:type",Object)(I.prototype,"toolbarModelCache");Reflect.metadata("design:type",Object)(I.prototype,"inspectorModelCache");Reflect.metadata("design:type",Object)(I.prototype,"runHistoryCache");Reflect.metadata("design:type",Object)(I.prototype,"statusModelCache");Reflect.metadata("design:type",Object)(I.prototype,"paletteCache");Reflect.metadata("design:type",Object)(I.prototype,"runLogsCache");Reflect.metadata("design:type",Object)(I.prototype,"codeSuggestionCache");Reflect.metadata("design:type",Object)(I.prototype,"scheduleHandle");Reflect.metadata("design:paramtypes",[Object,N,F])(I);b(I,[[f(),1,"designer"],[f(),1,"registry"],[f(),1,"locale"],[f(),1,"theme"],[f(),1,"applyDocumentTheme"],[f(),1,"themeChangeAction"],[f(),1,"runContext"],[f(),1,"autoRun"],[f(),1,"saveState"],[f(),1,"hiddenActions"],[f(),1,"showRunHistory"],[f(),1,"showStatusbar"],[f(),1,"showRunLogs"],[f(),1,"hostAction"],[f(),1,"autosaveAction"],[V(),1,"documentRef"],[V(),1,"canvasModelCache"],[V(),1,"toolbarModelCache"],[V(),1,"inspectorModelCache"],[V(),1,"runHistoryCache"],[V(),1,"statusModelCache"],[V(),1,"paletteCache"],[V(),1,"runLogsCache"],[V(),1,"codeSuggestionCache"],[V(),1,"scheduleHandle"],[S(),3,void 0,2],[S(),3,void 0,1],[B(ct),3,void 0,0],[S(),3,void 0,0],[R({selector:"workflow-designer-preview",template:`
    <div class="workflow-designer-preview workflow-designer" data-theme="{{themeName}}">
        <workflow-toolbar :model="toolbarModel" :locale="locale" :action="handleToolbarAction"
            :theme="themeName" :themeChangeAction="themeSelectAction"
            :scheduleToggleAction="toggleSchedule"
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
    </div>`}),0]]);var _=class{constructor(e,t,r,o,s,i){this.translator=o,this.elementRef=i,this.locale="zh-CN",this.theme="light",this.runContext={},this.autoRun=!1,this.store=Eo(),this.autosave=!1,this.autosaveDelay=800,this.workflowTabs=[],this.activeTabId="",this.tabVersion=0,this.saveState="saved",this.previewHiddenActions=["save","open-library"],this.showLibrary=!1,this.showRename=!1,this.renameValue="",this.renameError="",this.libraryError="",this.libraryItems=[],this.autosaveInFlight=!1,this.changeLocale=n=>{let d=this.selfRef||this;d.locale=n,d.localeChangeAction?.(n)},this.clearAutosaveTimer=()=>{this.autosaveTimer!==void 0&&(clearTimeout(this.autosaveTimer),this.autosaveTimer=void 0)},this.scheduleAutosave=()=>{let n=this.selfRef||this;n.designer?.dirty&&(n.saveState!=="saving"&&(n.saveState="dirty"),n.autosave&&(n.clearAutosaveTimer(),n.autosaveTimer=setTimeout(()=>{n.autosaveTimer=void 0,n.performAutosave()},Math.max(0,Number(n.autosaveDelay)||0))))},this.toolbarAction=n=>{let d=this.selfRef||this;if(n.startsWith("language:")){let c=n.slice(9);(c==="en"||c==="zh-CN")&&d.changeLocale(c);return}if(n.startsWith("theme:")){let c=n.slice(6);(c==="light"||c==="dark"||c==="solarized"||c==="high-contrast")&&d.setTheme(c);return}if(n==="rename"){d.openRename();return}if(n==="save"){d.saveWorkflow();return}if(n==="open-library"){d.openLibrary();return}d.preview?.handleToolbarAction(n)},this.previewHostAction=n=>{this.toolbarAction(n)},this.fitView=()=>{this.preview?.fitView()},this.openLibrary=async()=>{let n=this.selfRef||this;try{n.libraryItems=await n.designer.listSaved(n.store),n.libraryError=""}catch(d){n.libraryError=d.message}n.showLibrary=!0},this.openRename=()=>{let n=this.selfRef||this;n.renameValue=n.designer?.definition?.name||"",n.renameError="",n.showRename=!0},this.renameInput=n=>{let d=this.selfRef||this;d.renameValue=String(n?.target?.value??""),d.renameError=""},this.renameKey=n=>{let d=String(n?.key||"");if(d==="Enter"){n?.preventDefault?.(),this.commitRename();return}d==="Escape"&&(n?.preventDefault?.(),this.cancelRename())},this.cancelRename=()=>{let n=this.selfRef||this;n.showRename=!1,n.renameError=""},this.commitRename=()=>{let n=this.selfRef||this,d=String(n.renameValue||"").trim();if(!d){n.renameError=n.t("renameEmpty","Enter a workflow name");return}let c=n.activeTab();if(!c){n.showRename=!1;return}c.designer.renameWorkflow(d),n.showRename=!1,n.renameError="",n.emitTabs(),n.scheduleAutosave()},this.saveWorkflow=async()=>{let n=this.selfRef||this;n.clearAutosaveTimer(),n.saveState="saving";try{await n.designer.saveTo(n.store);let d=n.activeTab();d&&(d.persisted=!0),n.syncActiveTabId(),n.libraryError="",n.saveState="saved",await n.refreshLibrary()}catch(d){n.saveState="error",n.libraryError=d.message}},this.saveWorkflowAs=async()=>{let n=this.selfRef||this;n.clearAutosaveTimer(),n.saveState="saving";try{await n.designer.saveTo(n.store,{as:!0,name:`${n.designer.definition.name} copy`});let d=n.activeTab();d&&(d.persisted=!0),n.syncActiveTabId(),n.libraryError="",n.saveState="saved",await n.refreshLibrary()}catch(d){n.saveState="error",n.libraryError=d.message}},this.loadWorkflow=async n=>{let d=this.selfRef||this,c=d.workflowTabs.find(u=>u.id===n);if(c){try{let u=await d.store.get(n);if(!u){d.libraryError=`${d.t("notFound","Workflow not found")}: ${n}`;return}c.designer.load(u),d.setActiveTab(c),d.syncActiveTabId(),d.clearAutosaveTimer(),d.libraryError="",d.showLibrary=!1}catch(u){d.libraryError=u.message}return}await d.openWorkflowTab(n)&&(d.clearAutosaveTimer(),d.saveState=d.designer.dirty?"dirty":"saved",d.libraryError="",d.showLibrary=!1)},this.deleteWorkflow=async n=>{let d=this.selfRef||this;try{d.workflowTabs.some(c=>c.id===n)&&await d.closeWorkflowTab(n),await d.designer.removeSaved(d.store,n),await d.refreshLibrary()}catch(c){d.libraryError=c.message}},this.closeLibrary=()=>{let n=this.selfRef||this;n.showLibrary=!1},this.documentRef=r;try{r&&(r[Z]=!0)}catch{}this.registry=e||new L,this.service=t,this.reactiveEffect=s,xt(r),Te(r,this.themeName);let l=new Q({registry:this.registry,service:t,definition:Zt(this.registry,this.localeValue,o)});this.designer=s?Ue(l,s):l,this.workflowTabs=[{id:this.designer.definition.id,designer:this.designer,persisted:!1}],this.activeTabId=this.workflowTabs[0].id}onInit(){this.selfRef=this,vt.subscribe(t=>this.toolbarAction(t));let e=globalThis.document;e?.addEventListener&&(this.menuClickHandler=t=>{let o=t?.target?.closest?.("[data-menu-id]")?.getAttribute?.("data-menu-id");o&&setTimeout(()=>{globalThis.__workflowMenuHandled!==o&&this.toolbarAction(o)},0)},e.addEventListener("click",this.menuClickHandler,!0)),this.saveState=this.designer.dirty?"dirty":"saved",this.bindGlobalShortcuts(),this.initialDefinition&&(this.designer.load(this.initialDefinition),this.syncActiveTabId()),this.autoRun&&this.designer.run({context:this.runContext})}onDestroy(){this.clearAutosaveTimer();let e=globalThis.document;this.menuClickHandler&&e?.removeEventListener&&e.removeEventListener("click",this.menuClickHandler,!0);let t=this.documentRef;t?.removeEventListener&&this.keyHandler&&t.removeEventListener("keydown",this.keyHandler,!0),this.keyHandler=void 0}get localeValue(){return String(this.locale||"").toLowerCase().startsWith("en")?"en":"zh-CN"}get themeName(){return ue(this.theme)?this.theme:"light"}get themeSelectAction(){return e=>this.setTheme(e)}get toolbarModel(){return this.preview?.toolbarModel}get workflowTabSource(){if(this.tabVersion,this.tabSourceCache)return this.tabSourceCache;let e=this.workflowTabs.map(t=>({id:t.id,label:t.designer.definition.name||this.t("newWorkflow","New workflow"),active:t.id===this.activeTabId}));return this.tabSourceCache={visible:!0,items:e,showCreate:!0,createLabel:"+",select:t=>{this.activateWorkflowTab(t)},close:t=>{this.closeWorkflowTab(t)},create:()=>{this.createWorkflowTab()}},this.tabSourceCache}get openWorkflowCount(){return this.tabVersion,this.workflowTabs.length}async createWorkflowTab(){let e=this.selfRef||this;await e.persistActiveTab();let t=Mo(e.localeValue,e.t("newWorkflow","New workflow"));t.id=e.nextWorkflowId();let r=e.createTab(t);e.workflowTabs.push(r),e.setActiveTab(r),e.emitTabs()}async openWorkflowTab(e){let t=this.selfRef||this;if(t.workflowTabs.find(o=>o.id===e))return await t.activateWorkflowTab(e),!0;try{let o=await t.store.get(e);if(!o)return t.libraryError=`${t.t("notFound","Workflow not found")}: ${e}`,!1;await t.persistActiveTab();let s=t.createTab(o,!0);return t.workflowTabs.push(s),t.setActiveTab(s),t.emitTabs(),!0}catch(o){return t.libraryError=o.message,!1}}async restoreWorkflowTabs(e,t){let r=this.selfRef||this,o=[],s;try{s=new Set((await r.store.list()).map(l=>l.id))}catch{s=new Set(e||[])}for(let l of Array.from(new Set(e||[])))if(!(!l||!s.has(l)))try{let n=await r.store.get(l);n&&o.push(r.createTab(n,!0))}catch{}if(!o.length)return!1;r.workflowTabs=o;let i=o.find(l=>l.id===t)||o[0];return r.setActiveTab(i),r.emitTabs(),!0}createTab(e,t=!1){let r=new Q({registry:this.registry,service:this.service,definition:e}),o=this.reactiveEffect?Ue(r,this.reactiveEffect):r;return{id:o.definition.id,designer:o,persisted:t}}nextWorkflowId(){let e;do e=`workflow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;while(this.workflowTabs.some(t=>t.id===e));return e}setActiveTab(e){this.clearAutosaveTimer(),this.activeTabId=e.id,this.designer=e.designer,this.saveState=e.designer.dirty?"dirty":"saved",this.tabSourceCache=void 0,this.tabVersion+=1}activeTab(){return this.workflowTabs.find(e=>e.id===this.activeTabId)}async activateWorkflowTab(e){let t=this.selfRef||this,r=t.workflowTabs.find(o=>o.id===e);!r||r.id===t.activeTabId||(await t.persistActiveTab(),t.setActiveTab(r),t.emitTabs())}async closeWorkflowTab(e){let t=this.selfRef||this,r=t.workflowTabs.findIndex(s=>s.id===e);if(r<0)return;let[o]=t.workflowTabs.splice(r,1);if(t.autosave&&o.designer.dirty)try{await t.saveTab(o)}catch{}if(t.activeTabId===e){let s=t.workflowTabs[Math.min(r,t.workflowTabs.length-1)];s?t.setActiveTab(s):await t.createWorkflowTab()}t.emitTabs()}async persistActiveTab(){let e=this.selfRef||this,t=e.activeTab();e.autosave&&t?.designer.dirty&&await e.saveTab(t)}async saveTab(e){let t=this.selfRef||this;await e.designer.saveTo(t.store),e.persisted=!0,t.syncTabId(e),t.emitTabs(),t.saveState="saved"}syncActiveTabId(){let e=this.selfRef||this,t=e.activeTab();t&&(t.id=e.designer.definition.id,e.activeTabId=t.id,e.emitTabs())}syncTabId(e){let t=this.selfRef||this,r=e.id,o=e.designer.definition.id;r!==o&&(e.id=o,t.activeTabId===r&&(t.activeTabId=o),t.emitTabs())}emitTabs(){let e=this.selfRef||this;e.tabSourceCache=void 0,e.tabVersion+=1;let t=e.workflowTabs.filter(o=>o.persisted),r=e.activeTab();e.tabChangeAction?.({openIds:t.map(o=>o.id),activeId:r?.persisted?r.id:t[0]?.id})}setTheme(e){this.theme=ue(e)?e:"light";let t=this.documentRef||globalThis.document;Te(t,this.theme),this.themeChangeAction?.(this.themeName)}get isZh(){return this.localeValue==="zh-CN"}get renameTitle(){return this.t("renameTitle","Rename workflow")}get renamePlaceholder(){return this.t("renamePlaceholder","Workflow name")}get renameConfirmLabel(){return this.t("renameConfirm","Rename")}get cancelLabel(){return this.t("cancel","Cancel")}t(e,t){return C(this.translator,this.localeValue,`workflow.ui.${e}`,t)}async performAutosave(){let e=this.selfRef||this;if(!(!e.autosave||!e.designer.dirty||e.autosaveInFlight)){e.autosaveInFlight=!0,e.saveState="saving";try{await e.designer.saveTo(e.store);let t=e.activeTab();t&&(t.persisted=!0),e.emitTabs(),e.libraryError="",e.saveState=e.designer.dirty?"dirty":"saved"}catch(t){e.saveState="error",e.libraryError=t.message}finally{e.autosaveInFlight=!1,e.designer.dirty&&e.scheduleAutosave()}}}bindGlobalShortcuts(){let e=this.documentRef;!e?.addEventListener||this.keyHandler||(this.keyHandler=t=>this.handleGlobalKey(t),e.addEventListener("keydown",this.keyHandler,!0))}handleGlobalKey(e){let t=this.selfRef||this,r=String(e?.key||""),o=!!(e?.ctrlKey||e?.metaKey),s=e?.target,i=String(s?.tagName||"").toLowerCase(),l=i==="input"||i==="textarea"||i==="select"||!!s?.isContentEditable;if(o&&(r==="s"||r==="S")){e.preventDefault(),t.saveWorkflow();return}if(o&&(r==="o"||r==="O")){e.preventDefault(),t.openLibrary();return}if(o&&r==="Enter"){e.preventDefault(),!t.designer.running&&t.designer.nodes.length&&t.toolbarAction("run");return}if(!l&&(r==="?"||r==="F1")){e.preventDefault(),t.preview?.toggleShortcuts();return}r==="Escape"&&t.preview?.showShortcuts&&(e.preventDefault(),t.preview?.closeShortcuts())}get canvasModel(){return this.preview?.canvasModel}get inspectorModel(){return this.preview?.inspectorModel}get statusModel(){return this.preview?.statusModel}get codeSuggestions(){return this.preview?.codeSuggestions??[]}get saveStateLabel(){return this.preview?.saveStateLabel??""}get showLogs(){return!!this.preview?.showLogs}set showLogs(e){this.preview&&(this.preview.showLogs=e)}get jsonText(){return this.preview?.jsonText??""}set jsonText(e){this.preview&&(this.preview.jsonText=e)}toggleJson(){this.preview?.toggleJson()}handleCanvas(e){this.preview?.handleCanvas(e)}toggleShortcuts(){this.preview?.toggleShortcuts()}async refreshLibrary(){let e=this.selfRef||this;e.libraryItems=await e.designer.listSaved(e.store)}};Reflect.metadata("design:type",Object)(_.prototype,"locale");Reflect.metadata("design:type",Object)(_.prototype,"theme");Reflect.metadata("design:type",Function)(_.prototype,"themeChangeAction");Reflect.metadata("design:type",Function)(_.prototype,"localeChangeAction");Reflect.metadata("design:type",Q)(_.prototype,"designer");Reflect.metadata("design:type",Object)(_.prototype,"initialDefinition");Reflect.metadata("design:type",Object)(_.prototype,"runContext");Reflect.metadata("design:type",Object)(_.prototype,"autoRun");Reflect.metadata("design:type",Object)(_.prototype,"store");Reflect.metadata("design:type",Object)(_.prototype,"autosave");Reflect.metadata("design:type",Object)(_.prototype,"autosaveDelay");Reflect.metadata("design:type",Function)(_.prototype,"tabChangeAction");Reflect.metadata("design:type",I)(_.prototype,"preview");Reflect.metadata("design:type",Object)(_.prototype,"autosaveTimer");Reflect.metadata("design:type",Object)(_.prototype,"autosaveInFlight");Reflect.metadata("design:type",Function)(_.prototype,"keyHandler");Reflect.metadata("design:type",Object)(_.prototype,"documentRef");Reflect.metadata("design:paramtypes",[L,le,Object,N,ut,F])(_);b(_,[[f(),1,"locale"],[f(),1,"theme"],[f(),1,"themeChangeAction"],[f(),1,"localeChangeAction"],[f(),1,"designer"],[f(),1,"initialDefinition"],[f(),1,"runContext"],[f(),1,"autoRun"],[f(),1,"store"],[f(),1,"autosave"],[f(),1,"autosaveDelay"],[f(),1,"tabChangeAction"],[ce("preview",I),1,"preview"],[V(),1,"autosaveTimer"],[V(),1,"autosaveInFlight"],[V(),1,"keyHandler"],[V(),1,"documentRef"],[S(),3,void 0,5],[S(),3,void 0,4],[S(),3,void 0,3],[B(ct),3,void 0,2],[S(),3,void 0,2],[S(),3,void 0,1],[S(),3,void 0,0],[R({selector:"workflow-designer",template:`
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
    </div>`}),0]]);var wa=ae("TAB_BAR_SOURCE"),me=class{constructor(e){this.injectedSource=e}get activeSource(){return this.source||this.injectedSource}get visible(){return this.activeSource?this.activeSource.visible:!0}get items(){return this.activeSource?.items||[]}get showCreate(){return this.activeSource?this.activeSource.showCreate!==!1:!0}get createLabel(){return this.activeSource?.createLabel||"+"}get closeLabel(){return this.activeSource?.closeLabel||"\u2715"}select(e,t){!e||(this.activeSource?.items||[]).some(o=>o.id===e&&o.disabled)||t?.target?.closest?.(".tab-close")||this.activeSource?.select?.(e)}closeTab(e,t){t?.stopPropagation?.(),this.close(e)}create(){this.activeSource?.create?.()}close(e){this.activeSource?.close?.(e)}};Reflect.metadata("design:type",Object)(me.prototype,"source");Reflect.metadata("design:paramtypes",[Object])(me);b(me,[[f(),1,"source"],[B(wa),3,void 0,0],[S(),3,void 0,0],[R({selector:"tab-bar",template:`
    <p class="tab-bar" role="tablist" v-show="visible">
        <span class="tab" role="tab" aria-selected="{{tab.active}}" data-disabled="{{tab.disabled}}" v-for="tab in items" @click="select(tab.id, $event)">
            <span class="tab-label" @click="select(tab.id, $event)">{{tab.label}}</span><span class="tab-close" role="button" v-if="tab.showClose !== false" data-cell-width="3" @click="closeTab(tab.id, $event)">{{closeLabel}}</span>
        </span>
        <span class="tab-new" role="button" v-show="showCreate" @click="create">{{createLabel}}</span>
    </p>
    `}),0]]);var We=class{};b(We,[[H({declarations:[me],exports:[me]}),0]]);var lt=class{};b(lt,[[H({imports:[At,Et,Ot,We,Mt,Lt,Ve,$e,je,Oe],providers:[le,Fe,L,he,qe,ne],declarations:[O,ee,X,W,re,te,z,I,K,_],exports:[At,Et,Ot,We,Mt,Lt,Ve,$e,je,Oe,le,Fe,L,he,ne,O,ee,X,W,re,te,z,I,K,_]}),0]]);var He={route:"gateway-route",condition:"gateway-condition",deny:"gateway-deny"};function Je(a,e,t,r){return{id:a,name:e,type:t,label:r}}var ya=[{type:He.route,label:"Gateway route",description:"Forward matching requests to a microservice or static upstream",category:"action",icon:"\u21E5",color:"#2563eb",textColor:"#ffffff",inputs:[Je("in","in","input","Input")],outputs:[Je("out","out","output","Next")],fields:[{key:"path",label:"Inbound path",type:"text",placeholder:"/api/users",description:"Defaults to the path condition value."},{key:"service",label:"Service",type:"text",placeholder:"users-service",required:!0},{key:"targetUrl",label:"Target URL",type:"text",placeholder:"http://127.0.0.1:3001"},{key:"targetPath",label:"Target path",type:"text",placeholder:"/users"},{key:"stripPrefix",label:"Strip prefix",type:"boolean",defaultValue:!1},{key:"timeout",label:"Timeout (ms)",type:"number",min:0,step:100},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"headers",label:"Request headers",type:"json",placeholder:'{ "x-gateway": "1" }'},{key:"responseHeaders",label:"Response headers",type:"json",placeholder:'{ "x-served-by": "gateway" }'},{key:"rateLimit",label:"Rate limit",type:"json",placeholder:'{ "limit": 100, "windowMs": 60000 }'},{key:"cache",label:"Cache",type:"json",placeholder:'{ "enabled": true, "ttl": 30000 }'},{key:"circuitBreaker",label:"Circuit breaker",type:"json",placeholder:'{ "failureThreshold": 5 }'},{key:"bulkhead",label:"Bulkhead",type:"json",placeholder:'{ "maxConcurrent": 20 }'}],defaultConfig:{stripPrefix:!1}},{type:He.condition,label:"Gateway condition",description:"Match path, method, host, header or query values",category:"flow",icon:"?",color:"#d97706",textColor:"#ffffff",inputs:[Je("in","in","input","Input")],outputs:[Je("true","true","output","True"),Je("false","false","output","False")],fields:[{key:"field",label:"Field",type:"select",defaultValue:"path",options:[{label:"Path",value:"path"},{label:"Method",value:"method"},{label:"Host",value:"host"},{label:"Header",value:"header"},{label:"Query",value:"query"}]},{key:"name",label:"Header / query name",type:"text",placeholder:"x-role"},{key:"operator",label:"Operator",type:"select",defaultValue:"equals",options:[{label:"equals",value:"equals"},{label:"not equals",value:"not-equals"},{label:"prefix",value:"prefix"},{label:"not prefix",value:"not-prefix"},{label:"exists",value:"exists"},{label:"not exists",value:"not-exists"}]},{key:"value",label:"Value",type:"text",placeholder:"/api/users"}],defaultConfig:{field:"path",operator:"equals"}},{type:He.deny,label:"Gateway deny",description:"Reject matching requests at the gateway",category:"flow",icon:"\u2298",color:"#dc2626",textColor:"#ffffff",inputs:[Je("in","in","input","Input")],outputs:[],fields:[{key:"status",label:"Status",type:"number",defaultValue:403,min:100,max:599},{key:"message",label:"Message",type:"text",defaultValue:"Forbidden"},{key:"priority",label:"Priority",type:"number",defaultValue:0,description:"Lower runs first."},{key:"body",label:"Body",type:"json",placeholder:'{ "error": "forbidden" }'}],defaultConfig:{status:403,message:"Forbidden"}}];function eo(a){return ya.forEach(e=>a.register(e)),a}function ba(){return eo(new L)}function St(a="zh-CN"){let e=a==="zh-CN",t=ba(),r=(c,p,u,m,w,g)=>t.createNode(c,{x:m,y:w},{id:p,name:u,config:g}),o=r("start","start_1",e?"\u8BF7\u6C42\u8FDB\u5165":"Request",80,220),s=r(He.condition,"condition_1",e?"\u7BA1\u7406\u5458\u8BF7\u6C42":"Admin request",330,220,{field:"header",name:"x-role",operator:"equals",value:"admin"}),i=r(He.route,"route_1",e?"\u8F6C\u53D1\u5230\u7BA1\u7406\u670D\u52A1":"Admin service",680,120,{path:"/",service:"admin-service",targetUrl:"http://127.0.0.1:3002",stripPrefix:!1}),l=r(He.deny,"deny_1",e?"\u62D2\u7EDD\u5176\u4ED6\u8BF7\u6C42":"Deny others",680,320,{status:403,message:e?"\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650":"Admin role required"}),n=(c,p,u,m)=>({id:c,sourceNodeId:p,sourcePort:u,targetNodeId:m,targetPort:"in"}),d=new Date().toISOString();return{id:"gateway-rules",name:e?"\u7F51\u5173\u89C4\u5219":"Gateway rules",description:e?"\u7528\u53EF\u89C6\u5316\u6D41\u7A0B\u914D\u7F6E\u7F51\u5173\u5339\u914D\u6761\u4EF6\u548C\u8DEF\u7531/\u62D2\u7EDD\u52A8\u4F5C\u3002":"Configure gateway matching conditions and route/deny actions visually.",version:"1.0.0",nodes:[o,s,i,l],connections:[n("conn_1","start_1","out","condition_1"),n("conn_2","condition_1","true","route_1"),n("conn_3","condition_1","false","deny_1")],metadata:{createdAt:d,updatedAt:d}}}var Ct=class{constructor(e){this.http=e}async list(){let e=await this.http.listRules();if(!e.ok)return[];let t=e.body;return Array.isArray(t)?t:Array.isArray(t?.items)?t.items:[]}async get(e){let t=await this.http.getRule(e);if(t.status!==404){if(!t.ok)throw new Error(`Failed to load gateway rules: HTTP ${t.status}`);return t.body}}async save(e){let t=await this.http.saveRule(e);if(!t.ok)throw new Error(t.body?.message||t.body?.error||`Failed to apply gateway rules: HTTP ${t.status}`);return t.body?.summary??Oo(e)}async remove(e){let t=await this.http.removeRule(e);return t.ok||t.status===404}async clear(){let e=await this.list();await Promise.all(e.map(t=>this.remove(t.id)))}};var ka=["run","resume","cancel","toggle-logs","save","open-library","clear","menu"],Rt=class{constructor(e,t,r){this.state=e,this.http=r,this.designerOpen=!1,this.designerHiddenActions=ka,this.store=new Ct(r),this.registry=eo(new L);let o=new Q({registry:this.registry,definition:St("zh-CN")});this.designer=t?Ue(o,t):o}onInit(){this.state.openDesigner=()=>this.editRules(),this.state.init()}async onAfterViewInit(){await this.state.start()}onDestroy(){this.state.destroy()}async editRules(){this.state.error="",await this.loadRuleDocument(),this.designerOpen=!0}async loadRuleDocument(){if(this.state.creatingRuleWorkflow){this.state.creatingRuleWorkflow=!1;let o=St("zh-CN");o.id=`gateway_rules_${Date.now().toString(36)}`,this.state.ruleWorkflowId=o.id,this.designer.load(o);return}let e=await this.store.list().catch(()=>[]),t=this.state.ruleWorkflowId||e[0]?.id||"",r;t&&(r=await this.store.get(t)),this.state.ruleWorkflowId=t,this.designer.load(r??St("zh-CN"))}closeDesigner(){this.designerOpen=!1}async applyRules(){this.state.error="";try{let e=await this.store.save(this.designer.definition);this.designerOpen=!1,this.state.ruleWorkflowId=this.designer.definition.id,await this.state.loadRuleWorkflows(),this.state.status=this.state.t("status.rulesApplied",{count:e.nodeCount});let t=await this.state.fetchState();this.state.rules=t.rules??[],this.state.services=t.services??[]}catch(e){this.state.error=e.message}}};Reflect.metadata("design:paramtypes",[uo,ut,lo])(Rt);b(Rt,[[S(),3,void 0,2],[S(),3,void 0,1],[R({selector:"gateway-admin",imports:[lt,no],template:`
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

        <div class="ga-modal" v-if="state.configDiffOpen">
            <div class="ga-modal-card ga-config-diff">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.t('config.diffTitle', { version: state.configVersion + 1 })}}</h2>
                        <p>{{state.t('config.diffDesc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeConfigDiff">\u2715</button>
                </header>
                <div class="ga-diff-grid">
                    <div class="ga-diff-col">
                        <h3>{{state.t('config.routes')}}</h3>
                        <code v-for="item in state.configDiff?.routes.added">{{state.t('config.addedPrefix')}}{{item}}</code>
                        <code v-for="item in state.configDiff?.routes.changed">{{state.t('config.changedPrefix')}}{{item}}</code>
                        <code v-for="item in state.configDiff?.routes.removed">{{state.t('config.removedPrefix')}}{{item}}</code>
                        <span class="ga-muted" v-if="!state.configDiff?.routes.added.length && !state.configDiff?.routes.changed.length && !state.configDiff?.routes.removed.length">{{state.t('config.noChanges')}}</span>
                    </div>
                    <div class="ga-diff-col">
                        <h3>{{state.t('config.rules')}}</h3>
                        <code v-for="item in state.configDiff?.rules.added">{{state.t('config.addedPrefix')}}{{item}}</code>
                        <code v-for="item in state.configDiff?.rules.changed">{{state.t('config.changedPrefix')}}{{item}}</code>
                        <code v-for="item in state.configDiff?.rules.removed">{{state.t('config.removedPrefix')}}{{item}}</code>
                        <span class="ga-muted" v-if="!state.configDiff?.rules.added.length && !state.configDiff?.rules.changed.length && !state.configDiff?.rules.removed.length">{{state.t('config.noChanges')}}</span>
                    </div>
                    <div class="ga-diff-col">
                        <h3>{{state.t('config.options')}}</h3>
                        <code v-for="item in state.configDiff?.options">{{item}}</code>
                        <span class="ga-muted" v-if="!state.configDiff?.options.length">{{state.t('config.noChanges')}}</span>
                    </div>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeConfigDiff">{{state.t('common.close')}}</button>
                </footer>
            </div>
        </div>

        <div class="ga-modal" v-if="state.configHistoryOpen">
            <div class="ga-modal-card ga-config-history">
                <header class="ga-modal-head">
                    <div>
                        <h2>{{state.t('config.historyTitle')}}</h2>
                        <p>{{state.t('config.historyDesc')}}</p>
                    </div>
                    <button class="ga-icon-btn" type="button" @click="state.closeConfigHistory">\u2715</button>
                </header>
                <div class="ga-compact-list">
                    <div class="ga-compact-row ga-config-history-row" v-for="entry in state.configHistory">
                        <strong>v{{entry.version}}</strong>
                        <span class="ga-muted">{{entry.timestamp}}<template v-if="entry.source"> \xB7 {{entry.source}}</template></span>
                        <span class="ga-status-spacer"></span>
                        <span class="ga-pill">{{state.diffSummary(entry)}}</span>
                        <button class="ga-link-btn ga-rollback-config" type="button" @click="state.rollbackConfig(entry.version)">{{state.t('config.rollback')}}</button>
                    </div>
                    <div class="ga-empty" v-if="!state.configHistory.length">{{state.t('config.noHistory')}}</div>
                </div>
                <footer class="ga-modal-foot">
                    <button class="ga-btn" type="button" @click="state.closeConfigHistory">{{state.t('common.close')}}</button>
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
    </div>`}),0]]);export{Rt as GatewayAdminComponent};
