import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { ensureSearchFields, subscribeToConversations, Conversation } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Home'>;

function conversationTitle(item: Conversation) {
  const currentUid = item.participants.find((uid) => uid === item.participantProfiles?.[uid]?.uid);
  const profile = Object.values(item.participantProfiles || {}).find((value) => value.uid !== currentUid);
  return profile?.displayName || 'Discussion';
}

function profilePhoto(profile: any) {
  return profile?.photoURL || profile?.avatarURL || profile?.photoUrl;
}

export function HomeScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    ensureSearchFields().catch(() => undefined);
    return subscribeToConversations(setConversations);
  }, []);

  const storyProfiles = useMemo(() => {
    const seen = new Set<string>();
    return conversations
      .flatMap((item) => Object.values(item.participantProfiles || {}))
      .filter((profile: any) => {
        if (!profile?.uid || seen.has(profile.uid)) return false;
        seen.add(profile.uid);
        return true;
      })
      .slice(0, 5);
  }, [conversations]);

  return (
    <View style={styles.root}>
      <View style={styles.topCard}>
        <View style={styles.brandRow}>
          <Pressable style={styles.menuButton}>
            <Ionicons name="menu-outline" size={28} color={colors.white} />
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
            </View>
            <Text style={styles.brandText}>Nex<Text style={styles.brandLight}>Chat</Text></Text>
          </View>

          <View style={styles.profileMini}>
            <View style={styles.profileMiniInner}>
              <Ionicons name="person" size={18} color={colors.accent} />
            </View>
            <View style={styles.profilePlus}>
              <Ionicons name="add" size={12} color={colors.white} />
            </View>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>DISCUSSIONS</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.roundAction}>
              <Ionicons name="search-outline" size={25} color={colors.white} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.roundAction}>
              <Ionicons name="people-outline" size={24} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.stories}>
          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.storyAdd}>
            <Ionicons name="add" size={29} color={colors.white} />
          </Pressable>

          {storyProfiles.map((profile: any) => {
            const photo = profilePhoto(profile);
            return (
              <View key={profile.uid} style={styles.story}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.storyImage} />
                ) : (
                  <View style={styles.storyFallback}>
                    <Text style={styles.storyLetter}>{(profile.displayName || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={conversations.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => {
          const title = item.type === 'group' ? (item.name || 'Groupe') : conversationTitle(item);
          const directProfile: any = Object.values(item.participantProfiles || {}).find(
            (value: any) => value.uid !== item.createdBy,
          );
          const photo = item.type === 'group' ? item.photoURL : profilePhoto(directProfile);

          return (
            <Pressable
              onPress={() => navigation.navigate('Chat', { conversationId: item.id, title, type: item.type })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.avatar}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
                )}
              </View>

              <View style={styles.body}>
                <View style={styles.nameLine}>
                  <Text style={styles.name} numberOfLines={1}>{title}</Text>
                  {item.type === 'group' ? <Ionicons name="people" size={17} color={colors.textSecondary} /> : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'Nouvelle discussion'}</Text>
              </View>

              <View style={styles.meta}>
                <Text style={styles.time}>—</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={30} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune discussion</Text>
            <Text style={styles.emptyText}>Utilise la recherche pour trouver une personne et démarrer une conversation.</Text>
          </View>
        }
      />

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <Ionicons name="chatbubble" size={24} color={colors.accent} />
          <View style={styles.activeLine} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="call-outline" size={25} color={colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.addButton}>
          <Ionicons name="add" size={31} color={colors.white} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.navItem}>
          <Ionicons name="people-outline" size={25} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="settings-outline" size={25} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  topCard: {
    backgroundColor: colors.accent,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    minHeight: 245,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flex: 1,
  },
  brandMark: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  brandLight: {
    fontWeight: '400',
  },
  profileMini: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMiniInner: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePlus: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  pageTitle: {
    color: colors.white,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 4.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 18,
  },
  storyAdd: {
    width: 61,
    height: 61,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  story: {
    width: 61,
    height: 61,
    borderRadius: 31,
    backgroundColor: colors.white,
    padding: 3,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  storyFallback: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLetter: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 104,
  },
  emptyList: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 104,
  },
  row: {
    minHeight: 88,
    backgroundColor: colors.white,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 9,
  },
  pressed: {
    opacity: 0.82,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 58,
    height: 58,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 21,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginLeft: 14,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    flexShrink: 1,
    color: '#18264D',
    fontSize: 17,
    fontWeight: '800',
  },
  preview: {
    color: '#7180A2',
    fontSize: 14,
    marginTop: 5,
  },
  meta: {
    minWidth: 30,
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
    paddingTop: 19,
  },
  time: {
    color: '#9AABD0',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    height: 76,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.97)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    position: 'absolute',
    bottom: 3,
  },
  addButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    marginTop: 35,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 18,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
