import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <Text style={styles.brand}>NexChat</Text>
        <Text style={styles.subtitle}>Une nouvelle façon de rester connecté.</Text>
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: 10, textAlign: 'center' },
});
