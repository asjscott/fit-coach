import { isValidElement, type ReactElement, type ReactNode } from "react";

// For tests that read a component's element tree: the chain of elements from the root down to the first one that
// matches, or null
export function elementPath<P extends object>(
  node: ReactNode,
  matches: (element: ReactElement<P>) => boolean,
): ReactElement<P>[] | null {
  if (!isValidElement<P>(node)) return null;
  if (matches(node)) return [node];
  const children = ([] as ReactNode[]).concat((node.props as { children?: ReactNode }).children ?? []);
  for (const child of children) {
    const path = elementPath(child, matches);
    if (path) return [node, ...path];
  }
  return null;
}
