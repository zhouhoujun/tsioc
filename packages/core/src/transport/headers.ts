import { HeaderSet, IncommingHeader, IncommingHeaders, OutgoingHeader, OutgoingHeaders } from './packet';



/**
 * client request headers.
 */
export class ReqHeaders extends HeaderSet<IncommingHeader> {

}

export type ReqHeadersLike = ReqHeaders | IncommingHeaders;


/**
 * client response headers.
 */
export class ResHeaders extends HeaderSet<OutgoingHeader>  {

}

export type ResHeadersLike = ReqHeaders | OutgoingHeaders;