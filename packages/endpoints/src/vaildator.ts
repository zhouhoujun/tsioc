import { Incoming, Outgoing, RequestContext } from "@tsdi/common";

export interface Vaildator {
    /**
     * vaild request, throw execption ify.
     * @param req 
     * @param context 
     */
    reqVaild?(req: Incoming, context: RequestContext): void;


    /**
     * vaild responsem throw execption ify.
     * @param req 
     * @param context 
     */
    resVaild?(res: Outgoing, context: RequestContext): void;

}