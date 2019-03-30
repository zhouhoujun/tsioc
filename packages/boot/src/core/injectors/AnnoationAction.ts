import { IocAction } from '@tsdi/ioc';
import { AnnoationActionContext } from './AnnoationActionContext';

export abstract class AnnoationAction extends IocAction<AnnoationActionContext> {
    abstract execute(ctx: AnnoationActionContext, next: () => void): void;
}
