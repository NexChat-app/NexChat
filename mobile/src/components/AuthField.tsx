import { Ionicons } from '@expo/vector-icons';
import { TextInput, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap };

export function AuthField({ icon, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <TextInput {...props} placeholderTextColor={colors.textMuted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 58, backgroundColor: colors.surface, borderRadius: 17, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, marginBottom: 13 },
  input: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 12, paddingVertical: 14 },
});
