import { TElementNode, TNodeType } from '../node';
import { getLView, getTView, setCurrentTNode } from '../state';
import { HEADER_OFFSET, RENDERER } from '../view';
import { appendChild, createTextNode } from './mani';
import { getOrCreateTNode } from './shared';

/**
 * Create static text node
 *
 * @param index Index of the node in the data array
 * @param value Static string value to write.
 *
 * @codeGenApi
 */
export function _ρtext(index: number, value = ''): void {
    const lView = getLView();
    const tView = getTView();
    const adjustedIndex = index + HEADER_OFFSET;

    // ngDevMode &&
    //     assertEqual(
    //         getBindingIndex(), tView.bindingStartIndex,
    //         'text nodes should be created before any bindings');
    // ngDevMode && assertIndexInRange(lView, adjustedIndex);

    const tNode = tView.firstCreatePass ?
        getOrCreateTNode(tView, index, TNodeType.Element, null, null) :
        tView.data[adjustedIndex] as TElementNode;

    const textNative = lView[adjustedIndex] = createTextNode(value, lView[RENDERER]);
    appendChild(tView, lView, textNative, tNode);

    // Text nodes are self closing.
    setCurrentTNode(tNode, false);
}
