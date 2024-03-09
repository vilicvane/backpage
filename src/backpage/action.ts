export type ActionCallback<T extends object> = (
  data: T,
) => Promise<void> | void;

export const ACTION_ROUTE_PATTERN = '/action/:actionName';

export function RELATIVE_ACTION_PATH(name: string): string {
  return `action/${encodeURIComponent(name)}`;
}
