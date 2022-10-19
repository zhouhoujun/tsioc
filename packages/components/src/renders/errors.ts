import { RuntimeErrorCode, RuntimeExecption } from '../errors';
import { LView, TVIEW } from '../interfaces/view';



/** Throws an ExpressionChangedAfterChecked error if checkNoChanges mode is on. */
export function throwErrorIfNoChangesMode(
    creationMode: boolean, oldValue: any, currValue: any, propName?: string): never {
  const field = propName ? ` for '${propName}'` : '';
  let msg =
      `ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value${
          field}: '${oldValue}'. Current value: '${currValue}'.`;
  if (creationMode) {
    msg +=
        ` It seems like the view has been created after its parent and its children have been dirty checked.` +
        ` Has it been created in a change detection hook?`;
  }
  throw new RuntimeExecption(RuntimeErrorCode.EXPRESSION_CHANGED_AFTER_CHECKED, msg);
}

/**
 * The special delimiter we use to separate property names, prefixes, and suffixes
 * in property binding metadata. See storeBindingMetadata().
 *
 * We intentionally use the Unicode "REPLACEMENT CHARACTER" (U+FFFD) as a delimiter
 * because it is a very uncommon character that is unlikely to be part of a user's
 * property names or interpolation strings. If it is in fact used in a property
 * binding, DebugElement.properties will not return the correct value for that
 * binding. However, there should be no runtime effect for real applications.
 *
 * This character is typically rendered as a question mark inside of a diamond.
 * See https://en.wikipedia.org/wiki/Specials_(Unicode_block)
 *
 */
export const INTERPOLATION_DELIMITER = `�`;


function constructDetailsForInterpolation(
    lView: LView, rootIndex: number, expressionIndex: number, meta: string, changedValue: any) {
  const [propName, prefix, ...chunks] = meta.split(INTERPOLATION_DELIMITER);
  let oldValue = prefix, newValue = prefix;
  for (let i = 0; i < chunks.length; i++) {
    const slotIdx = rootIndex + i;
    oldValue += `${lView[slotIdx]}${chunks[i]}`;
    newValue += `${slotIdx === expressionIndex ? changedValue : lView[slotIdx]}${chunks[i]}`;
  }
  return {propName, oldValue, newValue};
}

/**
 * Constructs an object that contains details for the ExpressionChangedAfterItHasBeenCheckedError:
 * - property name (for property bindings or interpolations)
 * - old and new values, enriched using information from metadata
 *
 * More information on the metadata storage format can be found in `storePropertyBindingMetadata`
 * function description.
 */
export function getExpressionChangedErrorDetails(
    lView: LView, bindingIndex: number, oldValue: any,
    newValue: any): {propName?: string, oldValue: any, newValue: any} {
  const tData = lView[TVIEW].data;
  const metadata = tData[bindingIndex];

  if (typeof metadata === 'string') {
    // metadata for property interpolation
    if (metadata.indexOf(INTERPOLATION_DELIMITER) > -1) {
      return constructDetailsForInterpolation(
          lView, bindingIndex, bindingIndex, metadata, newValue);
    }
    // metadata for property binding
    return {propName: metadata, oldValue, newValue};
  }

  // metadata is not available for this expression, check if this expression is a part of the
  // property interpolation by going from the current binding index left and look for a string that
  // contains INTERPOLATION_DELIMITER, the layout in tView.data for this case will look like this:
  // [..., 'id�Prefix � and � suffix', null, null, null, ...]
  if (metadata === null) {
    let idx = bindingIndex - 1;
    while (typeof tData[idx] !== 'string' && tData[idx + 1] === null) {
      idx--;
    }
    const meta = tData[idx];
    if (typeof meta === 'string') {
      const matches = meta.match(new RegExp(INTERPOLATION_DELIMITER, 'g'));
      // first interpolation delimiter separates property name from interpolation parts (in case of
      // property interpolations), so we subtract one from total number of found delimiters
      if (matches && (matches.length - 1) > bindingIndex - idx) {
        return constructDetailsForInterpolation(lView, idx, bindingIndex, meta, newValue);
      }
    }
  }
  return {propName: undefined, oldValue, newValue};
}
