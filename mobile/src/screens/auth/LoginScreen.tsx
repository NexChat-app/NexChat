import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { BrandHeader } from '../../components/BrandHeader';
import { AuthField } from '../../components/AuthField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PremiumLoader } from '../../components/PremiumLoader';
import { signIn } from '../../services/auth';
import { colors } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Informations manquantes', 'Renseigne ton adresse e-mail et ton mot de passe.');
    try { setLoading(true); await signIn(email, password); navigation.replace('Home'); }
    catch (error: any) { Alert.alert('Connexion impossible', error?.message || 'Vérifie tes informations.'); }
    finally { setLoading(false); }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandHeader title="Bon retour" subtitle="Connecte-toi pour retrouver tes conversations et ton espace NexChat." />
          <AuthField icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Adresse e-mail" />
          <AuthField icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mot de passe" />
          <Pressable style={styles.forgot}><Text style={styles.forgotText}>Mot de passe oublié ?</Text></Pressable>
          <PrimaryButton title="Se connecter" loading={loading} onPress={handleLogin} />
          <View style={styles.bottom}>
            <Text style={styles.muted}>Pas encore de compte ?</Text>
            <Pressable onPress={() => navigation.navigate('Register')}><Text style={styles.link}>Créer un compte</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {loading && <PremiumLoader label="Connexion…" />}
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},flex:{flex:1},content:{paddingHorizontal:24,paddingTop:48,paddingBottom:30},forgot:{alignSelf:'flex-end',paddingVertical:9},forgotText:{color:colors.accent,fontSize:13,fontWeight:'700'},bottom:{flexDirection:'row',justifyContent:'center',gap:6,marginTop:28},muted:{color:colors.textSecondary,fontSize:13},link:{color:colors.accent,fontSize:13,fontWeight:'800'}
});
