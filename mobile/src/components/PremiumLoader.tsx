import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function PremiumLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(247,248,252,0.86)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  card: { backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 20, borderRadius: 20, alignItems: 'center', minWidth: 150 },
  label: { marginTop: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
