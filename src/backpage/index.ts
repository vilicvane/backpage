import {window} from './@jsdom.js';

Object.assign(global, {
  window,
});

export * from './backpage.js';
export * from './@jsdom.js';
export * from './tunnel.js';
export * from './tunnels/index.js';
