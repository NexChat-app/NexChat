import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function PrimaryButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.label}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { height: 58, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  pressed: { opacity: 0.88 },
  label: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
