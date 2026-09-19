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
  return profile?.displayName || item.name || 'Discussion';
}

function profilePhoto(profile: any) {
  return profile?.photoURL || profile?.avatarURL || profile?.photoUrl;
}

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || '?';
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
      <View style={styles.messagesCard}>
        <View style={styles.header}>
          <Pressable style={styles.menuButton}>
            <Ionicons name="menu-outline" size={20} color={colors.white} />
          </Pressable>

          <Text style={styles.headerTitle}>MESSAGES</Text>

          <View style={styles.headerAvatar}>
            <Ionicons name="person" size={14} color={colors.accent} />
          </View>
        </View>

        <View style={styles.storyRow}>
          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.searchButton}>
            <Ionicons name="search-outline" size={17} color={colors.white} />
          </Pressable>

          {storyProfiles.map((profile: any) => {
            const photo = profilePhoto(profile);
            return (
              <View key={profile.uid} style={styles.story}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.storyImage} />
                ) : (
                  <View style={styles.storyFallback}>
                    <Text style={styles.storyLetter}>{initials(profile.displayName || '')}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {storyProfiles.length < 5 &&
            Array.from({ length: 5 - storyProfiles.length }).map((_, index) => (
              <View key={`empty-${index}`} style={styles.story}>
                <View style={styles.storyFallback}>
                  <Ionicons name="person-outline" size={17} color={colors.textMuted} />
                </View>
              </View>
            ))}
        </View>
      </View>

      <View style={styles.listCard}>
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
                    <Text style={styles.avatarText}>{initials(title)}</Text>
                  )}
                </View>

                <View style={styles.body}>
                  <View style={styles.nameLine}>
                    <Text style={styles.name} numberOfLines={1}>{title}</Text>
                    {item.type === 'group' ? (
                      <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
                    ) : null}
                  </View>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage || 'Nouvelle discussion'}
                  </Text>
                </View>

                <View style={styles.meta}>
                  <Text style={styles.time}>13:30</Text>
                  {item.lastMessage ? (
                    <View style={styles.unread}>
                      <Text style={styles.unreadText}>1</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={26} color={colors.accent} />
              <Text style={styles.emptyTitle}>Aucune discussion</Text>
              <Text style={styles.emptyText}>Commence une nouvelle conversation.</Text>
            </View>
          }
        />

        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem}>
            <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          </Pressable>

          <Pressable style={styles.navItem}>
            <Ionicons name="call-outline" size={17} color={colors.textMuted} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.addButton}>
            <Ionicons name="add" size={20} color={colors.white} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.navItem}>
            <Ionicons name="person-outline" size={17} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.navItem}>
            <Ionicons name="settings-outline" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#C9D8FA',
    paddingHorizontal: 0,
    paddingTop: 26,
  },
  messagesCard: {
    marginHorizontal: 28,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
  },
  header: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 35,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.8,
    textAlign: 'center',
  },
  headerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRow: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  searchButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  story: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    padding: 2,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  storyFallback: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLetter: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  listCard: {
    flex: 1,
    marginHorizontal: 28,
    backgroundColor: '#F5FAFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    overflow: 'hidden',
    minHeight: 0,
  },
  list: {
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 64,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 64,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#DCE6FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 31,
    height: 31,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginLeft: 9,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    color: '#20253A',
    fontSize: 11,
    fontWeight: '700',
  },
  preview: {
    color: '#7F8493',
    fontSize: 8.5,
    marginTop: 2,
  },
  meta: {
    width: 31,
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    paddingTop: 9,
  },
  time: {
    color: '#A1A6B5',
    fontSize: 7,
  },
  unread: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  unreadText: {
    color: colors.white,
    fontSize: 6,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    backgroundColor: '#F5FAFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    width: 36,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
});
