import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { ensureSearchFields, subscribeToConversations, Conversation } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Home'>;

function titleFor(item: Conversation) {
  if (item.type === 'group') return item.name || 'Groupe';
  const profiles = Object.values(item.participantProfiles || {});
  const other = profiles.find((profile: any) => profile.uid !== item.createdBy);
  return other?.displayName || 'Discussion';
}

function photoFor(profile: any) {
  return profile?.photoURL || profile?.avatarURL || profile?.photoUrl;
}

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.max(0.88, Math.min(1.55, width / 390));
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    ensureSearchFields().catch(() => undefined);
    return subscribeToConversations(setConversations);
  }, []);

  const headerProfiles = useMemo(() => {
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

  const avatarSize = 43 * scale;

  return (
    <View style={styles.root}>
      <View style={[styles.phoneSurface, { marginHorizontal: 16 * scale, borderRadius: 28 * scale }]}>
        <View style={[styles.blueHeader, { height: 152 * scale, paddingHorizontal: 18 * scale, borderTopLeftRadius: 28 * scale, borderTopRightRadius: 28 * scale }]}>
          <View style={styles.headerTop}>
            <Pressable style={styles.menuButton}>
              <Ionicons name="menu-outline" size={24 * scale} color={colors.white} />
            </Pressable>

            <Text style={[styles.headerTitle, { fontSize: 10 * scale }]}>MESSAGES</Text>

            <View style={[styles.headerAvatar, { width: 27 * scale, height: 27 * scale, borderRadius: 14 * scale }]}>
              <Ionicons name="person" size={15 * scale} color={colors.text} />
            </View>
          </View>

          <View style={[styles.storyRow, { marginTop: 17 * scale, gap: 9 * scale }]}>
            <Pressable
              onPress={() => navigation.navigate('SearchUsers')}
              style={[styles.searchButton, { width: 32 * scale, height: 32 * scale, borderRadius: 16 * scale }]}
            >
              <Ionicons name="search-outline" size={18 * scale} color={colors.white} />
            </Pressable>

            {headerProfiles.map((profile: any) => {
              const photo = photoFor(profile);
              return (
                <View key={profile.uid} style={[styles.story, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, padding: 2 * scale }]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.storyImage} />
                  ) : (
                    <View style={styles.storyFallback}>
                      <Text style={[styles.storyLetter, { fontSize: 15 * scale }]}>
                        {(profile.displayName || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            {Array.from({ length: Math.max(0, 5 - headerProfiles.length) }).map((_, index) => (
              <View key={`empty-${index}`} style={[styles.story, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, padding: 2 * scale }]}>
                <View style={styles.storyFallback}>
                  <Ionicons name="person-outline" size={17 * scale} color="#8D96AA" />
                </View>
              </View>
            ))}
          </View>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingHorizontal: 14 * scale, paddingBottom: 76 * scale }]}
          renderItem={({ item }) => {
            const title = titleFor(item);
            const profiles = Object.values(item.participantProfiles || {});
            const other: any = profiles.find((profile: any) => profile.uid !== item.createdBy);
            const photo = item.type === 'group' ? item.photoURL : photoFor(other);

            return (
              <Pressable
                onPress={() => navigation.navigate('Chat', { conversationId: item.id, title, type: item.type })}
                style={({ pressed }) => [styles.row, { minHeight: 61 * scale }, pressed && styles.pressed]}
              >
                <View style={[styles.avatar, { width: 38 * scale, height: 38 * scale, borderRadius: 19 * scale }]}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatarImage} />
                  ) : (
                    <Text style={[styles.avatarText, { fontSize: 14 * scale }]}>{title.charAt(0).toUpperCase()}</Text>
                  )}
                </View>

                <View style={styles.body}>
                  <Text style={[styles.name, { fontSize: 12.5 * scale }]} numberOfLines={1}>{title}</Text>
                  <Text style={[styles.preview, { fontSize: 9.5 * scale }]} numberOfLines={1}>
                    {item.lastMessage || 'Je suis là, tu es où ?'}
                  </Text>
                </View>

                <View style={styles.meta}>
                  <Text style={[styles.time, { fontSize: 7.5 * scale }]}>13:30</Text>
                  {item.lastMessage ? (
                    <View style={[styles.unread, { width: 11 * scale, height: 11 * scale, borderRadius: 6 * scale }]}>
                      <Text style={[styles.unreadText, { fontSize: 6.5 * scale }]}>1</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune discussion</Text>
            </View>
          }
        />

        <View style={[styles.bottomNav, { height: 52 * scale, borderBottomLeftRadius: 28 * scale, borderBottomRightRadius: 28 * scale }]}>
          <Pressable style={styles.navItem}>
            <Ionicons name="chatbubble-outline" size={17 * scale} color="#AAB1C0" />
          </Pressable>
          <Pressable style={styles.navItem}>
            <Ionicons name="call-outline" size={18 * scale} color="#C2C7D1" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={[styles.addButton, { width: 24 * scale, height: 24 * scale, borderRadius: 12 * scale }]}>
            <Ionicons name="add" size={18 * scale} color={colors.white} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.navItem}>
            <Ionicons name="person-outline" size={16 * scale} color="#C2C7D1" />
          </Pressable>
          <Pressable style={styles.navItem}>
            <Ionicons name="settings-outline" size={17 * scale} color="#C2C7D1" />
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
    paddingTop: 25,
  },
  phoneSurface: {
    flex: 1,
    backgroundColor: '#F4FAFF',
    overflow: 'hidden',
  },
  blueHeader: {
    backgroundColor: colors.accent,
  },
  headerTop: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 42,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 1.7,
  },
  headerAvatar: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  story: {
    backgroundColor: colors.white,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  storyFallback: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#EEF1F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLetter: {
    color: colors.accent,
    fontWeight: '800',
  },
  list: {
    paddingTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    backgroundColor: '#DCE5F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.accent,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    color: '#1C2233',
    fontWeight: '700',
  },
  preview: {
    color: '#7F8798',
    marginTop: 2,
  },
  meta: {
    width: 31,
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    paddingTop: 13,
  },
  time: {
    color: '#A2A9B7',
  },
  unread: {
    marginTop: 5,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: colors.white,
    fontWeight: '800',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F4FAFF',
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },
  empty: {
    paddingTop: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9AA1B0',
    fontSize: 11,
  },
});
