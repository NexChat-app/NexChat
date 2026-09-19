import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { auth } from '../config/firebase';
import { Conversation, Message, subscribeToConversations, getConversation, forwardMessage } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForwardMessage'>;

export function ForwardMessageScreen({ route, navigation }: Props) {
  const { conversationId, messageId } = route.params;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [source, setSource] = useState<Conversation | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getConversation(conversationId).then(async (conversation) => {
      if (!active) return;
      setSource(conversation);
      const { getDoc, doc } = await import('firebase/firestore');
      const snap = await getDoc(doc((await import('../config/firebase')).db, 'conversations', conversationId, 'messages', messageId));
      if (snap.exists() && active) setMessage({ id: snap.id, ...snap.data() } as Message);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [conversationId, messageId]);

  useEffect(() => subscribeToConversations(setConversations), []);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return conversations.filter((item) => {
      if (item.id === conversationId) return false;
      const title = item.type === 'group'
        ? item.name || 'Groupe'
        : Object.values(item.participantProfiles || {}).find((profile) => profile.uid !== auth.currentUser?.uid)?.displayName || 'Discussion';
      return !value || title.toLowerCase().includes(value);
    });
  }, [conversations, conversationId, search]);

  async function confirm() {
    if (!message || !Object.keys(selected).length) return;
    try {
      setSending(true);
      for (const targetId of Object.keys(selected)) {
        if (selected[targetId]) await forwardMessage(conversationId, targetId, message);
      }
      navigation.goBack();
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.icon}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
        <View style={styles.headerText}><Text style={styles.title}>Transférer</Text><Text style={styles.subtitle}>Choisir une ou plusieurs discussions</Text></View>
        <Pressable disabled={!Object.keys(selected).length || sending} onPress={confirm} style={styles.icon}>
          {sending ? <ActivityIndicator size="small" color={colors.accent} /> : <Ionicons name="arrow-forward-outline" size={22} color={Object.keys(selected).length ? colors.accent : colors.textMuted} />}
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={19} color={colors.textMuted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher une discussion" placeholderTextColor={colors.textMuted} style={styles.search} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const title = item.type === 'group'
            ? item.name || 'Groupe'
            : Object.values(item.participantProfiles || {}).find((profile) => profile.uid !== auth.currentUser?.uid)?.displayName || 'Discussion';
          const active = !!selected[item.id];
          const profile = Object.values(item.participantProfiles || {}).find((p) => p.uid !== auth.currentUser?.uid);
          return (
            <Pressable onPress={() => setSelected((current) => ({ ...current, [item.id]: !current[item.id] }))} style={styles.row}>
              <View style={styles.avatar}>
                {item.type === 'group' && item.photoURL ? <Image source={{ uri: item.photoURL }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{title.charAt(0).toUpperCase()}</Text>}
              </View>
              <View style={styles.body}><Text style={styles.name}>{title}</Text><Text style={styles.kind}>{item.type === 'group' ? 'Groupe' : profile?.displayName || 'Discussion'}</Text></View>
              <View style={[styles.check, active && styles.checkActive]}>{active ? <Ionicons name="checkmark" size={17} color={colors.white} /> : null}</View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune autre discussion.</Text>}
      />
    </View>
  );
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.background,paddingHorizontal:18,paddingTop:18},
 header:{minHeight:62,flexDirection:'row',alignItems:'center'},
 icon:{width:42,height:42,borderRadius:14,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
 headerText:{flex:1,marginHorizontal:12},
 title:{fontSize:20,fontWeight:'800',color:colors.text},
 subtitle:{fontSize:11,color:colors.textMuted,marginTop:3},
 searchWrap:{height:48,borderRadius:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:14,marginVertical:12},
 search:{flex:1,marginLeft:8,color:colors.text,fontSize:14},
 list:{paddingBottom:24},
 row:{minHeight:68,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginBottom:8},
 avatar:{width:46,height:46,borderRadius:16,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
 avatarImage:{width:46,height:46,borderRadius:16},
 avatarText:{color:colors.accent,fontWeight:'800',fontSize:16},
 body:{flex:1,marginLeft:12},
 name:{fontSize:14,fontWeight:'800',color:colors.text},
 kind:{fontSize:11,color:colors.textMuted,marginTop:3},
 check:{width:25,height:25,borderRadius:9,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
 checkActive:{backgroundColor:colors.accent},
 empty:{textAlign:'center',color:colors.textMuted,paddingTop:50}
});