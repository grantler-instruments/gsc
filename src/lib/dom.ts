/** True when the pointer left `el` and did not move into a descendant. */
export function pointerLeftElement(el: Element, relatedTarget: EventTarget | null): boolean {
  if (!(relatedTarget instanceof Node)) return true;
  return !el.contains(relatedTarget);
}
