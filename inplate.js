import {readFile} from 'fs/promises';

const logoBase64 = await readFile('res/frontpage/logo.svg').then(buffer =>
  buffer.toString('base64'),
);

export default {
  'res/frontpage/index.html': {
    data: {
      logoBase64,
    },
  },
};
