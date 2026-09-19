import type { RTCIceServer } from 'react-native-webrtc';

const meterUsername = process.env.EXPO_PUBLIC_METERED_TURN_USERNAME;
const meterCredential = process.env.EXPO_PUBLIC_METERED_TURN_CREDENTIAL;

export const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(meterUsername && meterCredential
    ? [
        {
          urls: [
            'turn:standard.relay.metered.ca:80',
            'turn:standard.relay.metered.ca:80?transport=tcp',
            'turn:standard.relay.metered.ca:443',
            'turns:standard.relay.metered.ca:443?transport=tcp',
          ],
          username: meterUsername,
          credential: meterCredential,
        },
      ]
    : []),
];
