import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { BrandHeader } from '../../components/BrandHeader';
import { AuthField } from '../../components/AuthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PremiumLoader } from '../../components/PremiumLoader';
import { sendVerificationCode } from '../../services/verification';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [firstName,setFirstName]=useState(''); const [lastName,setLastName]=useState('');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false);
  async function handleRegister(){
    if(!firstName||!lastName||!email||password.length<8) return Alert.alert('Vérifie tes informations','Remplis tous les champs. Le mot de passe doit contenir au moins 8 caractères.');
    try{setLoading(true);await sendVerificationCode(email);navigation.navigate('Verification',{email,firstName,lastName,password});}
    catch(error:any){Alert.alert('Envoi impossible',error?.message||'Le code de vérification n’a pas pu être envoyé.');}
    finally{setLoading(false);}
  }
  return <View style={styles.root}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><BrandHeader title="Créer ton compte" subtitle="Quelques informations suffisent pour commencer avec NexChat."/><View style={styles.row}><View style={styles.half}><AuthField icon="person-outline" value={firstName} onChangeText={setFirstName} placeholder="Prénom"/></View><View style={styles.half}><AuthField icon="person-outline" value={lastName} onChangeText={setLastName} placeholder="Nom"/></View></View><AuthField icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Adresse e-mail"/><AuthField icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mot de passe (8 caractères min.)"/><PrimaryButton title="Continuer" loading={loading} onPress={handleRegister}/><Text style={styles.legal}>En continuant, tu pourras vérifier ton adresse e-mail avant de finaliser ton compte.</Text></ScrollView></KeyboardAvoidingView>{loading&&<PremiumLoader label="Préparation…"/>}</View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.background},flex:{flex:1},content:{paddingHorizontal:24,paddingTop:48,paddingBottom:30},row:{flexDirection:'row',gap:10},half:{flex:1},legal:{color:colors.textMuted,fontSize:12,lineHeight:18,textAlign:'center',marginTop:18,paddingHorizontal:12}});
