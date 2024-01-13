import type {DiffMatchPatches} from './diff-match-patch.js';

export type BackFrontMessage = {
  type: 'update';
  title: string;
  content: string | DiffMatchPatches;
};
