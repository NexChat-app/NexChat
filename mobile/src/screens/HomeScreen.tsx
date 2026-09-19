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

function formatTime(value: any) {
  const date = value?.toDate ? value.toDate() : null;
  if (!date) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function HomeScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    ensureSearchFields().catch(() => undefined);
    return subscribeToConversations(setConversations);
  }, []);

  const contactShortcuts = useMemo(() => {
    const seen = new Set<string>();
    return conversations
      .filter((item) => item.type === 'direct')
      .map((item) => {
        const profile: any = Object.values(item.participantProfiles || {}).find(
          (value: any) => value.uid !== item.createdBy,
        );
        return profile?.uid ? { conversationId: item.id, profile } : null;
      })
      .filter((entry): entry is { conversationId: string; profile: any } => {
        if (!entry || seen.has(entry.profile.uid)) return false;
        seen.add(entry.profile.uid);
        return true;
      })
      .slice(0, 12);
  }, [conversations]);

  return (
    <View style={styles.root}>
      <View style={styles.topCard}>
        <View style={styles.headerRow}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="menu-outline" size={26} color={colors.white} />
          </Pressable>

          <Text style={styles.headerTitle}>NexChat</Text>

          <Pressable style={styles.avatarButton}>
            <View style={styles.avatarButtonInner}>
              <Ionicons name="person" size={18} color={colors.accent} />
            </View>
          </Pressable>
        </View>

        <View style={styles.contactsRow}>
          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.searchCircle}>
            <Ionicons name="search-outline" size={20} color={colors.white} />
          </Pressable>

          <FlatList
            horizontal
            data={contactShortcuts}
            keyExtractor={(entry) => entry.conversationId}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contactsList}
            renderItem={({ item }) => {
              const photo = profilePhoto(item.profile);
              return (
                <Pressable
                  onPress={() => navigation.navigate('Chat', {
                    conversationId: item.conversationId,
                    title: item.profile.displayName,
                    type: 'direct',
                  })}
                  style={styles.contactAvatar}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.contactAvatarImage} />
                  ) : (
                    <Text style={styles.contactAvatarLetter}>
                      {(item.profile.displayName || '?').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={conversations.length ? styles.list : styles.emptyList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
                <Text style={styles.name} numberOfLines={1}>{title}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'Nouvelle discussion'}</Text>
              </View>

              <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
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
          <Ionicons name="chatbubble" size={23} color={colors.accent} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="call-outline" size={23} color={colors.textMuted} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.addButton}>
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.navItem}>
          <Ionicons name="people-outline" size={23} color={colors.textMuted} />
        </Pressable>

        <Pressable style={styles.navItem}>
          <Ionicons name="settings-outline" size={23} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  topCard: {
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 19,
    fontWeight: '700',
  },
  avatarButton: {
    width: 34,
    height: 34,
  },
  avatarButtonInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  searchCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsList: {
    gap: 10,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contactAvatarLetter: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    paddingTop: 6,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
    paddingTop: 18,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: '#ECEFF5',
    marginLeft: 74,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  bottomNav: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
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
