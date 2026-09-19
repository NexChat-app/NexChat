import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>NexChat</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30 },
  brand: { color: colors.accent, fontSize: 17, fontWeight: '800', letterSpacing: -0.4, marginBottom: 34 },
  title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 320 },
});
