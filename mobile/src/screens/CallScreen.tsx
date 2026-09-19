import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { CallSession, endCall, subscribeToCall, updateCallStatus } from '../services/calls';

type Props = NativeStackScreenProps<AuthStackParamList, 'Call'>;

export function CallScreen({ route, navigation }: Props) {
  const { callId, title, kind } = route.params;
  const [call, setCall] = useState<CallSession | null>(null);

  useEffect(() => subscribeToCall(callId, setCall), [callId]);

  useEffect(() => {
    if (call?.status === 'ended' || call?.status === 'declined') {
      navigation.goBack();
    }
  }, [call?.status, navigation]);

  const label = useMemo(() => {
    if (!call) return 'Connexion…';
    if (call.status === 'ringing') return 'Appel en cours…';
    if (call.status === 'accepted') return 'Connecté';
    if (call.status === 'declined') return 'Appel refusé';
    return 'Appel terminé';
  }, [call]);

  async function hangUp() {
    try {
      await endCall(callId);
    } catch {
      Alert.alert('Appel', 'Impossible de terminer l’appel.');
    }
  }

  async function accept() {
    try {
      await updateCallStatus(callId, 'accepted');
    } catch {
      Alert.alert('Appel', 'Impossible d’accepter l’appel.');
    }
  }

  const isIncoming = !!call && call.callerId !== call.participants[0] && call.status === 'ringing';

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.kind}>{kind === 'video' ? 'Appel vidéo' : 'Appel audio'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.status}>{label}</Text>
      </View>

      <View style={styles.center}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text></View>
        {call?.status === 'ringing' ? <ActivityIndicator size="small" color={colors.accent} style={styles.loader} /> : null}
        <Text style={styles.note}>La connexion d’appel sera établie ici avec le moteur WebRTC.</Text>
      </View>

      <View style={styles.controls}>
        {isIncoming ? (
          <Pressable onPress={accept} style={[styles.control, styles.accept]}>
            <Ionicons name="call" size={23} color={colors.white} />
            <Text style={styles.controlText}>Accepter</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={hangUp} style={[styles.control, styles.end]}>
          <Ionicons name="call" size={23} color={colors.white} />
          <Text style={styles.controlText}>{call?.status === 'ringing' ? 'Annuler' : 'Terminer'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,padding:24,justifyContent:'space-between'},
  top:{alignItems:'center',paddingTop:28},
  kind:{fontSize:12,fontWeight:'800',color:colors.accent,textTransform:'uppercase',letterSpacing:1},
  title:{fontSize:28,fontWeight:'800',color:colors.text,marginTop:10},
  status:{fontSize:14,color:colors.textSecondary,marginTop:7},
  center:{alignItems:'center',justifyContent:'center',paddingHorizontal:28},
  avatar:{width:108,height:108,borderRadius:38,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:38,fontWeight:'800',color:colors.accent},
  loader:{marginTop:22},
  note:{fontSize:12,color:colors.textMuted,textAlign:'center',lineHeight:18,marginTop:20},
  controls:{flexDirection:'row',justifyContent:'center',gap:16,paddingBottom:20},
  control:{minWidth:116,height:54,borderRadius:18,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8},
  accept:{backgroundColor:colors.success},
  end:{backgroundColor:colors.danger},
  controlText:{color:colors.white,fontWeight:'800',fontSize:13},
});
