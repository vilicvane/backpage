import type {Delta} from 'jsondiffpatch';
import {clone, create} from 'jsondiffpatch';
import type {PlainNode} from 'plain-dom';

export type PageSnapshot = {
  title: string;
  body: PlainNode;
};

export type PageUpdateContent =
  | {
      type: 'snapshot';
      snapshot: PageSnapshot;
    }
  | {
      type: 'delta';
      delta: Delta;
    }
  | undefined;

const jsonDiffPatch = create({
  objectHash(object: any, index) {
    return object?.attributes?.['data-key'] ?? index;
  },
});

export function getPageUpdateContent(
  previous: PageSnapshot | undefined,
  current: PageSnapshot | undefined,
): [update: boolean, content: PageUpdateContent] {
  if (current) {
    if (previous) {
      const delta = jsonDiffPatch.diff(previous, current);

      if (delta) {
        return [
          true,
          {
            type: 'delta',
            delta,
          },
        ];
      } else {
        return [false, undefined];
      }
    } else {
      return [
        true,
        {
          type: 'snapshot',
          snapshot: current,
        },
      ];
    }
  } else {
    if (previous) {
      // Reset to initial state.
      return [true, undefined];
    } else {
      return [false, undefined];
    }
  }
}

export function patchPageSnapshotInPlace(
  snapshot: PageSnapshot,
  delta: Delta,
): void {
  jsonDiffPatch.patch(snapshot, delta);
}

export function patchPageSnapshot(
  snapshot: PageSnapshot,
  delta: Delta,
): PageSnapshot {
  snapshot = clone(snapshot) as PageSnapshot;

  patchPageSnapshotInPlace(snapshot, delta);

  return snapshot;
}
