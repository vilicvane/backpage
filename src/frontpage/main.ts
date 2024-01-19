import {Back} from './@back.js';
import {Content} from './@content.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = `${location.protocol.replace(/^http/, 'ws')}//${location.host}${location.pathname}`;

const INITIAL_CONNECT_DELAY = 1000;

const back = new Back(WS_URL);

const _content = new Content(back);

setTimeout(() => back.connect(), INITIAL_CONNECT_DELAY);
