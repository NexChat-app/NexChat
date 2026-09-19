import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { PremiumLoader } from '../../components/PremiumLoader';
import { createAccount } from '../../services/auth';
import { sendVerificationCode, verifyVerificationCode } from '../../services/verification';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export function VerificationScreen({ route, navigation }: Props) {
  const { email, firstName, lastName, password } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  async function confirm() {
    if (code.trim().length < 4) return Alert.alert('Code incomplet', 'Saisis le code reçu par e-mail.');
    try { setLoading(true); await verifyVerificationCode(email, code); await createAccount({ email, password, firstName, lastName }); navigation.replace('Home'); }
    catch (error: any) { Alert.alert('Vérification impossible', error?.message || 'Le code est incorrect ou expiré.'); }
    finally { setLoading(false); }
  }
  async function resend() {
    try { setLoading(true); await sendVerificationCode(email); Alert.alert('Code envoyé', 'Un nouveau code vient d’être envoyé.'); }
    catch (error: any) { Alert.alert('Envoi impossible', error?.message || 'Réessaie plus tard.'); }
    finally { setLoading(false); }
  }
  return <View style={styles.root}><KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>Retour</Text></Pressable><View style={styles.body}><Text style={styles.kicker}>VÉRIFICATION</Text><Text style={styles.title}>Confirme ton e-mail</Text><Text style={styles.subtitle}>Nous avons envoyé un code à</Text><Text style={styles.email}>{email}</Text><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus placeholder="000000" placeholderTextColor={colors.textMuted} style={styles.code}/><Pressable disabled={loading} onPress={confirm} style={styles.button}><Text style={styles.buttonText}>{loading ? '…' : 'Vérifier'}</Text></Pressable><Pressable onPress={resend} disabled={loading}><Text style={styles.resend}>Renvoyer le code</Text></Pressable></View></KeyboardAvoidingView>{loading && <PremiumLoader label="Vérification…" />}</View>;
}
const styles = StyleSheet.create({root:{flex:1,backgroundColor:colors.background},container:{flex:1,padding:24,paddingTop:55},back:{color:colors.accent,fontWeight:'800',fontSize:14},body:{marginTop:72},kicker:{color:colors.accent,fontSize:12,fontWeight:'800',letterSpacing:1.5},title:{color:colors.text,fontSize:31,fontWeight:'800',letterSpacing:-1,marginTop:10},subtitle:{color:colors.textSecondary,fontSize:15,marginTop:14},email:{color:colors.text,fontSize:15,fontWeight:'700',marginTop:4},code:{backgroundColor:colors.surface,borderRadius:18,height:68,marginTop:28,paddingHorizontal:20,textAlign:'center',fontSize:27,letterSpacing:9,color:colors.text,fontWeight:'700'},button:{height:58,borderRadius:18,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center',marginTop:15},buttonText:{color:colors.white,fontSize:15,fontWeight:'800'},resend:{textAlign:'center',color:colors.accent,fontWeight:'800',fontSize:13,marginTop:20}});
