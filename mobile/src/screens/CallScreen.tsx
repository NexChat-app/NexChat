import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
  type MediaStream,
} from '@livekit/react-native-webrtc';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';
import {
  addCallIceCandidate,
  endCall,
  saveCallAnswer,
  saveCallOffer,
  subscribeToCall,
  subscribeToCallCandidates,
  updateCallStatus,
  type CallSession,
} from '../services/calls';
import { auth } from '../config/firebase';
import { iceServers } from '../config/webrtc';

type Props = NativeStackScreenProps<AuthStackParamList, 'Call'>;
type Candidate = { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null };

export function CallScreen({ route, navigation }: Props) {
  const { callId, title, kind } = route.params;
  const [call, setCall] = useState<CallSession | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(kind === 'video');
  const [error, setError] = useState<string | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteDescription = useRef(false);
  const offerSent = useRef(false);
  const answerSent = useRef(false);
  const queuedCandidates = useRef<Candidate[]>([]);

  useEffect(() => subscribeToCall(callId, setCall), [callId]);

  useEffect(() => {
    if (call?.status === 'ended' || call?.status === 'declined') {
      dispose();
      navigation.goBack();
    }
  }, [call?.status, navigation]);

  useEffect(() => {
    if (!call || pc.current || !auth.currentUser) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: kind === 'video' ? { frameRate: 30, facingMode: 'user' } : false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localRef.current = stream;
        setLocal(stream);

        const connection = new RTCPeerConnection({ iceServers });
        pc.current = connection;
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));

        connection.addEventListener('track', (event) => {
          if (event.streams?.[0]) setRemote(event.streams[0]);
        });
        connection.addEventListener('icecandidate', (event) => {
          if (event.candidate) {
            void addCallIceCandidate(callId, {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            });
          }
        });
        connection.addEventListener('connectionstatechange', () => {
          if (connection.connectionState === 'failed') {
            setError('Connexion WebRTC impossible. Vérifie Internet ou le serveur TURN.');
          }
        });

        if (call.callerId === auth.currentUser.uid && !offerSent.current) {
          offerSent.current = true;
          const offer = await connection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: kind === 'video',
          });
          await connection.setLocalDescription(offer);
          await saveCallOffer(callId, { type: offer.type, sdp: offer.sdp });
        }
      } catch (e: any) {
        setError(e?.message || 'Accès au microphone ou à la caméra impossible.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call?.id, call?.callerId, callId, kind]);

  useEffect(() => subscribeToCallCandidates(callId, async (candidate) => {
    const connection = pc.current;
    if (!connection || !remoteDescription.current) {
      queuedCandidates.current.push(candidate);
      return;
    }
    try {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }), [callId]);

  useEffect(() => {
    const connection = pc.current;
    if (!connection || !call || !auth.currentUser) return;
    const caller = call.callerId === auth.currentUser.uid;

    (async () => {
      try {
        if (caller && call.answer && !remoteDescription.current) {
          await connection.setRemoteDescription(new RTCSessionDescription(call.answer));
          remoteDescription.current = true;
        }

        if (!caller && call.offer && !remoteDescription.current) {
          await connection.setRemoteDescription(new RTCSessionDescription(call.offer));
          remoteDescription.current = true;
        }

        if (remoteDescription.current) {
          for (const candidate of queuedCandidates.current.splice(0)) {
            await connection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (e: any) {
        setError(e?.message || 'Négociation WebRTC impossible.');
      }
    })();
  }, [call?.answer, call?.offer, call?.callerId]);

  useEffect(() => {
    if (!call || call.status !== 'accepted' || !call.offer || answerSent.current) return;
    if (!auth.currentUser || call.callerId === auth.currentUser.uid || !pc.current) return;

    answerSent.current = true;
    (async () => {
      try {
        const connection = pc.current!;
        if (!remoteDescription.current) {
          await connection.setRemoteDescription(new RTCSessionDescription(call.offer!));
          remoteDescription.current = true;
        }
        const answer = await connection.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: kind === 'video',
        });
        await connection.setLocalDescription(answer);
        await saveCallAnswer(callId, { type: answer.type, sdp: answer.sdp });
      } catch (e: any) {
        answerSent.current = false;
        setError(e?.message || 'Impossible d’accepter l’appel.');
      }
    })();
  }, [call?.status, call?.offer, call?.callerId, callId, kind]);

  function dispose() {
    pc.current?.close();
    pc.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
  }

  async function hangUp() {
    try { await endCall(callId); } catch {}
    dispose();
    navigation.goBack();
  }

  async function accept() {
    try {
      await updateCallStatus(callId, 'accepted');
    } catch {
      Alert.alert('Appel', 'Impossible d’accepter l’appel.');
    }
  }

  function toggleMute() {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleCamera() {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  const incoming = !!call && !!auth.currentUser && call.callerId !== auth.currentUser.uid && call.status === 'ringing';

  return (
    <View style={styles.root}>
      {kind === 'video' && remote ? <RTCView streamURL={remote.toURL()} objectFit="cover" style={styles.remote} /> : null}
      <View style={styles.header}>
        <Text style={styles.kind}>{kind === 'video' ? 'Appel vidéo' : 'Appel audio'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.status}>{error || (incoming ? 'Appel entrant' : call?.status === 'accepted' ? 'Connecté' : 'Appel en cours…')}</Text>
      </View>

      {kind === 'video' && local ? (
        <RTCView streamURL={local.toURL()} objectFit="cover" mirror style={styles.local} />
      ) : (
        <View style={styles.center}>
          <View style={styles.avatar}><Text style={styles.initial}>{title.charAt(0).toUpperCase()}</Text></View>
          {call?.status === 'ringing' ? <ActivityIndicator color={colors.accent} style={{ marginTop: 18 }} /> : null}
        </View>
      )}

      <View style={styles.controls}>
        {incoming ? <Pressable onPress={() => void accept()} style={[styles.button, styles.accept]}><Ionicons name="call" size={21} color={colors.white} /></Pressable> : null}
        {call?.status === 'accepted' ? (
          <>
            <Pressable onPress={toggleMute} style={styles.button}><Ionicons name={muted ? 'mic-off' : 'mic'} size={21} color={colors.text} /></Pressable>
            {kind === 'video' ? <Pressable onPress={toggleCamera} style={styles.button}><Ionicons name={cameraOn ? 'videocam' : 'videocam-off'} size={21} color={colors.text} /></Pressable> : null}
          </>
        ) : null}
        <Pressable onPress={() => void hangUp()} style={[styles.button, styles.end]}><Ionicons name="call" size={21} color={colors.white} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black, padding: 20, justifyContent: 'space-between' },
  remote: { ...StyleSheet.absoluteFillObject },
  local: { position: 'absolute', top: 88, right: 18, width: 108, height: 152, borderRadius: 20, overflow: 'hidden' },
  header: { alignItems: 'center', paddingTop: 28, zIndex: 2 },
  kind: { fontSize: 12, fontWeight: '800', color: colors.white, textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.white, marginTop: 10 },
  status: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 7, textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 108, height: 108, borderRadius: 38, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 38, fontWeight: '800', color: colors.accent },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 18, zIndex: 2 },
  button: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  accept: { backgroundColor: colors.success },
  end: { backgroundColor: colors.danger },
});
