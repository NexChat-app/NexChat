import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { endCall } from '../services/calls';

type Props = NativeStackScreenProps<AuthStackParamList, 'Call'>;

export function CallScreen({ route, navigation }: Props) {
  const { callId, title, kind } = route.params;

  async function close() {
    try { await endCall(callId); } catch {}
    navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>{kind === 'video' ? 'Appel vidéo' : 'Appel audio'}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>Les appels NexChat utilisent les fonctions audio et vidéo de l’application mobile.</Text>
      <Pressable onPress={() => void close()} style={styles.button}>
        <Text style={styles.buttonText}>Fermer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.black,alignItems:'center',justifyContent:'center',padding:28},
  kicker:{color:colors.accent,fontSize:11,fontWeight:'800',textTransform:'uppercase',letterSpacing:1},
  title:{color:colors.white,fontSize:28,fontWeight:'800',marginTop:10,textAlign:'center'},
  text:{color:'rgba(255,255,255,0.78)',fontSize:14,lineHeight:21,textAlign:'center',marginTop:12},
  button:{marginTop:26,backgroundColor:colors.accent,borderRadius:16,paddingHorizontal:24,paddingVertical:14},
  buttonText:{color:colors.white,fontWeight:'800'},
});
