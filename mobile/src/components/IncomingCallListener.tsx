import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../config/firebase';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { updateCallStatus, type CallSession } from '../services/calls';
import { getConversation } from '../services/messaging';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList>;
};

export function IncomingCallListener({ navigation }: Props) {
  const [call, setCall] = useState<CallSession | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const callsQuery = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', uid),
    );

    return onSnapshot(callsQuery, (snapshot) => {
      const incoming = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() } as CallSession))
        .filter((item) => item.status === 'ringing' && item.callerId !== uid)
        .sort((a, b) => {
          const left = a.createdAt?.seconds || 0;
          const right = b.createdAt?.seconds || 0;
          return right - left;
        })[0];

      setCall(incoming || null);
    });
  }, []);

  if (!call) return null;

  async function accept() {
    try {
      const conversation = await getConversation(call.conversationId);
      await updateCallStatus(call.id, 'accepted');
      setCall(null);
      if (conversation.type === 'group') {
        navigation.navigate('GroupCall', {
          callId: call.id,
          title: call.title || conversation.name || 'Appel entrant',
          kind: call.kind,
        });
      } else {
        navigation.navigate('Call', {
          callId: call.id,
          title: call.title || 'Appel entrant',
          kind: call.kind,
        });
      }
    } catch {
      setCall(null);
    }
  }

  async function decline() {
    await updateCallStatus(call.id, 'declined');
    setCall(null);
  }

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.kicker}>{call.kind === 'video' ? 'Appel vidéo' : 'Appel audio'}</Text>
          <Text style={styles.title}>{call.title || 'Appel entrant'}</Text>
          <Text style={styles.subtitle}>Quelqu’un essaie de vous joindre sur NexChat.</Text>

          <View style={styles.actions}>
            <Pressable onPress={() => void decline()} style={[styles.action, styles.decline]}>
              <Text style={styles.declineText}>Refuser</Text>
            </Pressable>
            <Pressable onPress={() => void accept()} style={[styles.action, styles.accept]}>
              <Text style={styles.acceptText}>Accepter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(17,19,24,0.42)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', borderRadius: 28, backgroundColor: colors.surface, padding: 24 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  action: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: colors.surfaceSoft },
  accept: { backgroundColor: colors.accent },
  declineText: { color: colors.text, fontWeight: '800' },
  acceptText: { color: colors.white, fontWeight: '800' },
});
