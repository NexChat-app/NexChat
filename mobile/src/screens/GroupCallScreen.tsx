import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AudioSession, LiveKitRoom, RoomAudioRenderer, VideoTrack, isTrackReference, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../config/firebase';
import { brevoConfig } from '../config/brevo';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { endCall } from '../services/calls';

type Props = NativeStackScreenProps<AuthStackParamList, 'GroupCall'>;

export function GroupCallScreen({ route, navigation }: Props) {
  const { callId, title, kind } = route.params;
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('Utilisateur non connecté.');
        const firebaseToken = await user.getIdToken();
        const response = await fetch(`${brevoConfig.baseUrl}/api/livekit/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            roomName: `nexchat-${callId}`,
            participantName: user.displayName || user.email || user.uid,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error || 'Impossible de rejoindre l’appel de groupe.');
        if (mounted) {
          setToken(body.token);
          setServerUrl(body.url);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Impossible de rejoindre l’appel.');
      }
    })();

    void AudioSession.startAudioSession().catch(() => undefined);
    return () => {
      mounted = false;
      void AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [callId]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Appel de groupe</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.button}>
          <Text style={styles.buttonText}>Fermer</Text>
        </Pressable>
      </View>
    );
  }

  if (!token || !serverUrl) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={styles.loading}>Connexion à l’appel…</Text></View>;
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={kind === 'video'}
      options={{ adaptiveStream: { pixelDensity: 'screen' } }}
    >
      <GroupCallContent title={title} kind={kind} callId={callId} onLeave={() => navigation.goBack()} />
    </LiveKitRoom>
  );
}

function GroupCallContent({ title, kind, callId, onLeave }: { title: string; kind: 'audio' | 'video'; callId: string; onLeave: () => void }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const routeCallId = callId;

  async function leave() {
    try {
      await endCall(routeCallId);
    } finally {
      onLeave();
    }
  }
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.kind}>{kind === 'video' ? 'Appel vidéo de groupe' : 'Appel audio de groupe'}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      {kind === 'video' ? (
        <FlatList
          data={tracks}
          numColumns={2}
          keyExtractor={(item, index) => isTrackReference(item) ? item.participant.identity + String(index) : String(index)}
          renderItem={({ item }) => (
            <View style={styles.tile}>
              {isTrackReference(item) ? <VideoTrack trackRef={item} style={styles.video} /> : <View style={styles.placeholder} />}
            </View>
          )}
          contentContainerStyle={styles.grid}
        />
      ) : (
        <View style={styles.audioCenter}>
          <Text style={styles.audioText}>Les participants sont connectés.</Text>
        </View>
      )}

      <RoomAudioRenderer />
      <Pressable onPress={() => void leave()} style={styles.end}>
        <Text style={styles.endText}>Quitter l’appel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black, padding: 18 },
  center: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', paddingTop: 28, paddingBottom: 18 },
  kind: { color: colors.white, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.white, fontSize: 25, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  loading: { color: colors.white, marginTop: 14 },
  error: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12, lineHeight: 19 },
  button: { marginTop: 22, backgroundColor: colors.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 13 },
  buttonText: { color: colors.white, fontWeight: '800' },
  grid: { gap: 8 },
  tile: { width: '50%', aspectRatio: 0.78, padding: 4 },
  video: { flex: 1, borderRadius: 18, overflow: 'hidden' },
  placeholder: { flex: 1, borderRadius: 18, backgroundColor: colors.surfaceSoft },
  audioCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  audioText: { color: 'rgba(255,255,255,0.8)' },
  end: { height: 52, borderRadius: 18, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  endText: { color: colors.white, fontWeight: '800' },
});
