import { AssetContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ContentSendAdapter, SendOptions } from '@tsdi/transport';


@Injectable({ static: true })
export class BrowserContentSendAdapter extends ContentSendAdapter {

    send(ctx: AssetContext, options: SendOptions<any>): Promise<string> {
        throw new Error('Method not implemented.');
    }
    
}