import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { ensureSearchFields, subscribeToConversations, Conversation } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Home'>;

function conversationTitle(item: Conversation) {
  const currentUid = item.participants.find((uid) => uid === item.participantProfiles?.[uid]?.uid);
  const profile = Object.values(item.participantProfiles || {}).find((value) => value.uid !== currentUid);
  return profile?.displayName || item.name || 'Discussion';
}

function profilePhoto(profile: any) {
  return profile?.photoURL || profile?.avatarURL || profile?.photoUrl;
}

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const s = Math.max(0.82, Math.min(1.35, width / 720));
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    ensureSearchFields().catch(() => undefined);
    return subscribeToConversations(setConversations);
  }, []);

  const firstConversation = conversations[0];

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { marginHorizontal: 28 * s, borderRadius: 60 * s, height: 490 * s, padding: 42 * s }]}>
        <View style={styles.heroTop}>
          <Pressable style={[styles.menu, { width: 86 * s }]} accessibilityLabel="Menu">
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>

          <View style={styles.brand}>
            <View style={[styles.logoBox, { width: 78 * s, height: 78 * s, borderRadius: 25 * s }]}>
              <Ionicons name="chatbubbles-outline" size={48 * s} color={colors.white} />
            </View>
            <Text style={[styles.brandText, { fontSize: 48 * s }]}>
              <Text style={styles.brandBold}>Nex</Text>Chat
            </Text>
          </View>

          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={[styles.profileButton, { width: 78 * s, height: 78 * s, borderRadius: 39 * s }]}>
            <Ionicons name="person" size={39 * s} color={colors.accent} />
            <View style={[styles.profilePlus, { width: 31 * s, height: 31 * s, borderRadius: 16 * s, right: -7 * s, bottom: -5 * s }]}>
              <Ionicons name="add" size={24 * s} color={colors.white} />
            </View>
          </Pressable>
        </View>

        <View style={[styles.titleRow, { marginTop: 51 * s }]}>
          <Text style={[styles.title, { fontSize: 51 * s, letterSpacing: 8 * s }]}>DISCUSSIONS</Text>
          <View style={styles.heroActions}>
            <Pressable onPress={() => navigation.navigate('SearchUsers')} style={[styles.heroAction, { width: 92 * s, height: 92 * s, borderRadius: 46 * s }]}>
              <Ionicons name="search-outline" size={49 * s} color={colors.white} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('CreateGroup')} style={[styles.heroAction, { width: 92 * s, height: 92 * s, borderRadius: 46 * s }]}>
              <Ionicons name="people-outline" size={47 * s} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => navigation.navigate('SearchUsers')} style={[styles.heroAdd, { width: 122 * s, height: 122 * s, borderRadius: 61 * s, marginTop: 36 * s }]}>
          <Ionicons name="add" size={57 * s} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={conversations.length ? conversations : [{ id: 'demo', participants: [], type: 'direct', participantProfiles: {}, lastMessage: '' } as Conversation]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 190 * s }}
        style={{ marginTop: 32 * s }}
        renderItem={({ item }) => {
          const title = item.id === 'demo' ? 'Discussion' : item.type === 'group' ? (item.name || 'Groupe') : conversationTitle(item);
          const directProfile: any = Object.values(item.participantProfiles || {}).find((value: any) => value.uid !== item.createdBy);
          const photo = item.id === 'demo' ? null : item.type === 'group' ? item.photoURL : profilePhoto(directProfile);

          return (
            <Pressable
              onPress={() => item.id !== 'demo' && navigation.navigate('Chat', { conversationId: item.id, title, type: item.type })}
              style={({ pressed }) => [
                styles.conversation,
                { marginHorizontal: 28 * s, height: 175 * s, borderRadius: 48 * s, paddingHorizontal: 30 * s },
                pressed && item.id !== 'demo' ? { opacity: 0.75 } : null,
              ]}
            >
              <View style={[styles.conversationAvatar, { width: 116 * s, height: 116 * s, borderRadius: 58 * s }]}>
                {photo ? <Image source={{ uri: photo }} style={styles.conversationAvatarImage} /> : <Text style={[styles.avatarLetter, { fontSize: 42 * s }]}>D</Text>}
              </View>
              <View style={styles.conversationBody}>
                <Text style={[styles.conversationName, { fontSize: 34 * s }]} numberOfLines={1}>{title}</Text>
                <Text style={[styles.conversationPreview, { fontSize: 27 * s }]} numberOfLines={1}>
                  {item.lastMessage || 'Comment ça va ?'}
                </Text>
              </View>
              <Ionicons name="remove-outline" size={25 * s} color="#9AA8C7" />
            </Pressable>
          );
        }}
      />

      <View style={[styles.bottomNav, { left: 28 * s, right: 28 * s, height: 152 * s, bottom: 20 * s, borderRadius: 48 * s }]}>
        <Pressable style={styles.navItem}>
          <Ionicons name="chatbubble" size={39 * s} color={colors.accent} />
          <View style={[styles.activeBar, { width: 73 * s, height: 7 * s, borderRadius: 4 * s, bottom: 2 * s }]} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="call-outline" size={42 * s} color="#9AA3B7" />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SearchUsers')} style={[styles.centerAdd, { width: 124 * s, height: 124 * s, borderRadius: 62 * s }]}>
          <Ionicons name="add" size={64 * s} color={colors.white} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.navItem}>
          <Ionicons name="people-outline" size={42 * s} color="#9AA3B7" />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="settings-outline" size={45 * s} color="#9AA3B7" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FD',
  },
  hero: {
    backgroundColor: colors.accent,
    overflow: 'visible',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: {
    justifyContent: 'center',
    gap: 10,
  },
  menuLine: {
    width: 45,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoBox: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: colors.white,
    letterSpacing: -1.5,
  },
  brandBold: {
    fontWeight: '900',
  },
  profileButton: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlus: {
    position: 'absolute',
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.white,
    fontWeight: '700',
    flexShrink: 1,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 16,
  },
  heroAction: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAdd: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversation: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationAvatar: {
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  conversationAvatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    color: colors.accent,
    fontWeight: '700',
  },
  conversationBody: {
    flex: 1,
    marginLeft: 27,
  },
  conversationName: {
    color: '#18264D',
    fontWeight: '800',
  },
  conversationPreview: {
    color: '#7381A3',
    marginTop: 5,
  },
  bottomNav: {
    position: 'absolute',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  navItem: {
    width: 70,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBar: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  centerAdd: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -52,
  },
});
