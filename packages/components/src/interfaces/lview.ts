
// Used for generating unique IDs for LViews.
let uniqueIdCounter = 0;

/** Gets a unique ID that can be assigned to an LView. */
export function getUniqueLViewId(): number {
    return uniqueIdCounter++;
}

