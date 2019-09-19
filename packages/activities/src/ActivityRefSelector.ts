import { RefSelector } from '@tsdi/components';
import { Type, Inject, Injectable, lang } from '@tsdi/ioc';
import { SequenceActivity } from './activities';
import { Activity } from './core';

@Injectable
export class ActivityRefSelector extends RefSelector {
    getComponentSelector(): string {
        return 'activity';
    }

    getSelectorId(): string {
        return 'refId';
    }

    select(element: any, selector: string) {

    }
    getDefaultCompose(): Type<any> {
        return SequenceActivity
    }
    isComponentType(dectoator: string, element: any):  boolean {
        return super.isComponentType(dectoator, element) || lang.isExtendsClass(element, Activity);
    }
}
