import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { auth } from '../config/firebase';
import { addGroupMember, Conversation, getConversation, removeGroupMember, searchUsers, setGroupAdmin, UserSummary } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'GroupInfo'>;

export function GroupInfoScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const [group, setGroup] = useState<Conversation | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const uid = auth.currentUser?.uid;
  const isCreator = !!uid && group?.createdBy === uid;
  const isAdmin = !!uid && (group?.admins || []).includes(uid);
  const canManageMembers = isCreator || isAdmin;

  async function load() {
    try {
      const value = await getConversation(conversationId);
      setGroup(value);
    } catch (error: any) {
      Alert.alert('Groupe', error?.message || 'Impossible de charger le groupe.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [conversationId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!term.trim() || !canManageMembers) { setResults([]); return; }
      setSearching(true);
      try {
        const users = await searchUsers(term);
        const participantIds = new Set(group?.participants || []);
        if (active) setResults(users.filter((user) => !participantIds.has(user.uid)));
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [term, group, canManageMembers]);

  async function addMember(user: UserSummary) {
    try {
      setBusy(true);
      await addGroupMember(conversationId, user);
      setTerm('');
      await load();
    } catch (error: any) {
      Alert.alert('Membre', error?.message || 'Impossible d’ajouter ce membre.');
    } finally { setBusy(false); }
  }

  async function removeMember(memberUid: string) {
    Alert.alert('Retirer le membre', 'Retirer cette personne du groupe ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => {
        try { setBusy(true); await removeGroupMember(conversationId, memberUid); await load(); }
        catch (error: any) { Alert.alert('Membre', error?.message || 'Impossible de retirer ce membre.'); }
        finally { setBusy(false); }
      }},
    ]);
  }

  async function toggleAdmin(memberUid: string, currentlyAdmin: boolean) {
    try {
      setBusy(true);
      await setGroupAdmin(conversationId, memberUid, !currentlyAdmin);
      await load();
    } catch (error: any) {
      Alert.alert('Administrateur', error?.message || 'Impossible de modifier les droits.');
    } finally { setBusy(false); }
  }

  if (loading || !group) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  const members = group.participants.map((memberUid) => group.participantProfiles?.[memberUid]).filter(Boolean) as UserSummary[];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.icon}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
        <Text style={styles.headerTitle}>Infos du groupe</Text>
        <View style={styles.icon} />
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <View style={styles.heroAvatar}><Text style={styles.heroAvatarText}>{(group.name || 'G').charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>{members.length} membre{members.length > 1 ? 's' : ''}</Text>
              <Text style={styles.creator}>Créé par {group.createdBy === uid ? 'vous' : (group.participantProfiles?.[group.createdBy || '']?.displayName || 'un membre')}</Text>
            </View>

            {canManageMembers ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ajouter des membres</Text>
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={19} color={colors.textMuted} />
                  <TextInput value={term} onChangeText={setTerm} placeholder="Rechercher une personne" placeholderTextColor={colors.textMuted} style={styles.input} />
                </View>
                {searching ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : results.map((item) => (
                  <Pressable key={item.uid} onPress={() => addMember(item)} style={styles.resultRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text></View>
                    <Text style={styles.resultName}>{item.displayName}</Text>
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Membres · {members.length}</Text>
          </>
        }
        renderItem={({ item }) => {
          const admin = (group.admins || []).includes(item.uid);
          const creator = group.createdBy === item.uid;
          return (
            <View style={styles.memberRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.memberText}>
                <Text style={styles.memberName}>{item.displayName}{item.uid === uid ? ' (vous)' : ''}</Text>
                <Text style={styles.memberRole}>{creator ? 'Créateur' : admin ? 'Administrateur' : 'Membre'}</Text>
              </View>
              {isCreator && item.uid !== uid ? (
                <View style={styles.actions}>
                  <Pressable onPress={() => toggleAdmin(item.uid, admin)} style={styles.action}>
                    <Ionicons name={admin ? 'shield' : 'shield-outline'} size={19} color={colors.accent} />
                  </Pressable>
                  <Pressable onPress={() => removeMember(item.uid)} style={styles.action}>
                    <Ionicons name="person-remove-outline" size={19} color={colors.danger} />
                  </Pressable>
                </View>
              ) : canManageMembers && item.uid !== uid && item.uid !== group.createdBy ? (
                <Pressable onPress={() => removeMember(item.uid)} style={styles.action}>
                  <Ionicons name="person-remove-outline" size={19} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun membre.</Text>}
      />

      {busy ? <View style={styles.busy}><ActivityIndicator color={colors.accent} /></View> : null}
    </View>
  );
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  center:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.background},
  header:{height:76,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:colors.surface},
  icon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'}, headerTitle:{fontSize:18,fontWeight:'800',color:colors.text},
  content:{padding:18,paddingBottom:40}, hero:{alignItems:'center',paddingVertical:10,marginBottom:24},
  heroAvatar:{width:92,height:92,borderRadius:30,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  heroAvatarText:{fontSize:34,fontWeight:'800',color:colors.accent}, groupName:{fontSize:23,fontWeight:'800',color:colors.text,marginTop:13}, groupMeta:{fontSize:12,color:colors.textSecondary,marginTop:4}, creator:{fontSize:11,color:colors.textMuted,marginTop:5},
  sectionTitle:{fontSize:13,fontWeight:'800',color:colors.text,marginBottom:10,marginTop:10}, section:{marginBottom:18},
  searchBox:{height:52,borderRadius:17,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:14}, input:{flex:1,color:colors.text,fontSize:14,marginLeft:9},
  loader:{marginVertical:12}, resultRow:{minHeight:58,borderRadius:16,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginTop:8},
  resultName:{flex:1,color:colors.text,fontSize:14,fontWeight:'700',marginLeft:10}, avatar:{width:44,height:44,borderRadius:15,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'}, avatarText:{color:colors.accent,fontSize:16,fontWeight:'800'},
  memberRow:{minHeight:68,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:12,marginBottom:8}, memberText:{flex:1,marginLeft:11}, memberName:{color:colors.text,fontSize:14,fontWeight:'800'}, memberRole:{color:colors.textMuted,fontSize:11,marginTop:3}, actions:{flexDirection:'row',gap:4}, action:{width:38,height:38,alignItems:'center',justifyContent:'center'},
  empty:{color:colors.textMuted,textAlign:'center',padding:30}, busy:{position:'absolute',left:0,right:0,bottom:20,alignItems:'center'},
});
