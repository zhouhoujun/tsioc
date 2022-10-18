import { hasOwn } from '@tsdi/ioc';
import { isLContainer, isLView } from '../interfaces/chk';
import { LContainer } from '../interfaces/container';
import { TNode, TNodeType, toTNodeTypeAsString } from '../interfaces/node';
import { DECLARATION_COMPONENT_VIEW, LView, TVIEW, TView, T_HOST } from '../interfaces/view';
import { assertDefined, assertEqual, throwError } from '../util/assert';


export function assertFirstCreatePass(tView: TView, errMessage?: string) {
    assertEqual(
        tView.firstCreatePass, true, errMessage || 'Should only be called in first create pass.');
}

export function assertFirstUpdatePass(tView: TView, errMessage?: string) {
    assertEqual(
        tView.firstUpdatePass, true, errMessage || 'Should only be called in first update pass.');
}

export function assertLContainer(value: any): asserts value is LContainer {
    assertDefined(value, 'LContainer must be defined');
    assertEqual(isLContainer(value), true, 'Expecting LContainer');
}

export function assertLViewOrUndefined(value: any): asserts value is LView | null | undefined {
    value && assertEqual(isLView(value), true, 'Expecting LView or undefined or null');
}

export function assertLView(value: any): asserts value is LView {
    assertDefined(value, 'LView must be defined');
    assertEqual(isLView(value), true, 'Expecting LView');
}


export function assertTNodeType(
    tNode: TNode | null, expectedTypes: TNodeType, message?: string): void {
    assertDefined(tNode, 'should be called with a TNode');
    if ((tNode.type & expectedTypes) === 0) {
        throwError(
            message ||
            `Expected [${toTNodeTypeAsString(expectedTypes)}] but got ${toTNodeTypeAsString(tNode.type)}.`);
    }
}

export function assertPureTNodeType(type: TNodeType) {
    if (!(type === TNodeType.Element ||           //
        type === TNodeType.Text ||              //
        type === TNodeType.Container ||         //
        type === TNodeType.ElementContainer ||  //
        // type === TNodeType.Icu ||               //
        type === TNodeType.Projection ||        //
        type === TNodeType.Placeholder)) {
        throwError(`Expected TNodeType to have only a single type selected, but got ${toTNodeTypeAsString(type)}.`);
    }
}



export function assertTNodeForLView(tNode: TNode, lView: LView) {
    assertTNodeForTView(tNode, lView[TVIEW]);
}

export function assertTNodeForTView(tNode: TNode, tView: TView) {
    assertTNode(tNode);
    hasOwn(tNode, 'tView_') &&
        assertEqual(
            (tNode as any as { tView_: TView }).tView_, tView,
            'This TNode does not belong to this TView.');
}

export function assertTNode(tNode: TNode) {
    assertDefined(tNode, 'TNode must be defined');
    if (!(tNode && typeof tNode === 'object' && hasOwn(tNode, 'directiveStylingLast'))) {
        throwError('Not of type TNode, got: ' + tNode);
    }
}

export function assertProjectionSlots(lView: LView, errMessage?: string) {
    assertDefined(lView[DECLARATION_COMPONENT_VIEW], 'Component views should exist.');
    assertDefined(
        lView[DECLARATION_COMPONENT_VIEW][T_HOST]!.projection,
        errMessage ||
        'Components with projection nodes (<ng-content>) must have projection slots defined.');
}

export function assertParentView(lView: LView | null, errMessage?: string) {
    assertDefined(
        lView,
        errMessage || 'Component views should always have a parent view (component\'s host view)');
}
