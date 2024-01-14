import {window} from './@jsdom.js';

Object.assign(global, {
  window,
  document: window.document,
});

export * from './backpage.js';
export * from './components/index.js';
export * from './paths.js';
export * from './tunnel.js';
export * from './tunnels/index.js';
