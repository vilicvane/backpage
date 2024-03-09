import {Back} from './@back.js';
import {Content} from './@content.js';
import {
  NOTIFICATION_PERMISSION_REQUEST_KEY,
  type NotificationPermissionRequest,
} from './@notification.js';

// Using string replace also handles the case of HTTPS.
const WS_URL = `${location.protocol.replace(/^http/, 'ws')}//${location.host}${location.pathname}`;

const INITIAL_CONNECT_DELAY = 1000;

const notificationPermissionRequest = localStorage.getItem(
  NOTIFICATION_PERMISSION_REQUEST_KEY,
) as NotificationPermissionRequest;

const showNotificationPermissionRequest =
  Notification.permission === 'default' &&
  notificationPermissionRequest === 'request';

if (showNotificationPermissionRequest) {
  document.getElementById('notification-bar')!.style.display = '';

  document
    .getElementById('allow-notifications-button')!
    .addEventListener('click', () => {
      void Notification.requestPermission().then(() => location.reload());
    });

  document
    .getElementById('dismiss-notifications-button')!
    .addEventListener('click', () => {
      localStorage.setItem(
        NOTIFICATION_PERMISSION_REQUEST_KEY,
        'dismissed' satisfies NotificationPermissionRequest,
      );
      location.reload();
    });
} else {
  const back = new Back(WS_URL);

  const _content = new Content(
    back,
    document.body.cloneNode(true) as Element,
    notificationPermissionRequest === 'dismissed',
  );

  setTimeout(() => back.connect(), INITIAL_CONNECT_DELAY);
}
