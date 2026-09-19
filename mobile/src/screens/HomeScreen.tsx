import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

export function HomeScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    ensureSearchFields().catch(() => undefined);
    return subscribeToConversations(setConversations);
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>NEXCHAT</Text>
          <Text style={styles.title}>Discussions</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.icon}>
            <Ionicons name="people-outline" size={21} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SearchUsers')} style={styles.icon}>
            <Ionicons name="search-outline" size={21} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={conversations.length ? styles.list : styles.emptyList}
        renderItem={({ item }) => {
          const title = item.type === 'group' ? (item.name || 'Groupe') : conversationTitle(item);
          return (
            <Pressable
              onPress={() => navigation.navigate('Chat', { conversationId: item.id, title, type: item.type })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>{title}</Text>
                <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || 'Nouvelle discussion'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={30} color={colors.accent} /></View>
            <Text style={styles.emptyTitle}>Aucune discussion</Text>
            <Text style={styles.emptyText}>Utilise la recherche pour trouver une personne et démarrer une conversation.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,paddingHorizontal:22,paddingTop:25},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18},
  headerActions:{flexDirection:'row',gap:8},
  kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:colors.accent},
  title:{fontSize:30,fontWeight:'800',letterSpacing:-1,color:colors.text,marginTop:4},
  icon:{width:46,height:46,borderRadius:16,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  list:{paddingBottom:30},
  emptyList:{flexGrow:1},
  row:{minHeight:76,backgroundColor:colors.surface,borderRadius:20,flexDirection:'row',alignItems:'center',paddingHorizontal:14,marginBottom:10},
  pressed:{opacity:0.82},
  avatar:{width:50,height:50,borderRadius:18,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  avatarText:{color:colors.accent,fontSize:18,fontWeight:'800'},
  body:{flex:1,marginLeft:13},
  name:{color:colors.text,fontSize:15,fontWeight:'800'},
  preview:{color:colors.textSecondary,fontSize:12,marginTop:4},
  empty:{alignItems:'center',justifyContent:'center',paddingHorizontal:28},
  emptyIcon:{width:72,height:72,borderRadius:24,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  emptyTitle:{fontSize:20,fontWeight:'800',color:colors.text,marginTop:18},
  emptyText:{fontSize:14,lineHeight:21,color:colors.textSecondary,textAlign:'center',marginTop:8},
});
