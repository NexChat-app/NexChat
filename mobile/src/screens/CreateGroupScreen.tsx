import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { createGroupConversation, searchUsers, UserSummary } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'CreateGroup'>;

export function CreateGroupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selected, setSelected] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!term.trim()) { setUsers([]); return; }
      setLoading(true);
      try {
        const result = await searchUsers(term);
        if (active) setUsers(result.filter((user) => !selected.some((item) => item.uid === user.uid)));
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [term, selected]);

  function toggleUser(user: UserSummary) {
    setSelected((current) => current.some((item) => item.uid === user.uid)
      ? current.filter((item) => item.uid !== user.uid)
      : [...current, user]);
  }

  async function create() {
    if (!name.trim() || selected.length < 1 || creating) return;
    setCreating(true);
    try {
      const conversationId = await createGroupConversation(name, selected);
      navigation.replace('Chat', { conversationId, title: name.trim() });
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
        <View style={styles.headerText}><Text style={styles.title}>Nouveau groupe</Text><Text style={styles.subtitle}>{selected.length} membre{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}</Text></View>
        <Pressable disabled={!name.trim() || selected.length < 1 || creating} onPress={create} style={[styles.createButton, (!name.trim() || selected.length < 1 || creating) && styles.disabled]}>
          {creating ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="checkmark" size={22} color={colors.white} />}
        </Pressable>
      </View>

      <TextInput value={name} onChangeText={setName} placeholder="Nom du groupe" placeholderTextColor={colors.textMuted} style={styles.nameInput} />

      {selected.length > 0 ? (
        <FlatList
          horizontal
          data={selected}
          keyExtractor={(item) => item.uid}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectedList}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggleUser(item)} style={styles.selectedItem}>
              <View style={styles.smallAvatar}><Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text></View>
              <Text numberOfLines={1} style={styles.selectedName}>{item.firstName}</Text>
              <View style={styles.remove}><Ionicons name="close" size={11} color={colors.white} /></View>
            </Pressable>
          )}
        />
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput value={term} onChangeText={setTerm} placeholder="Ajouter des membres" placeholderTextColor={colors.textMuted} style={styles.input} />
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => toggleUser(item)} style={styles.userRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.userText}><Text style={styles.userName}>{item.displayName}</Text><Text style={styles.userMeta}>{item.firstName} {item.lastName}</Text></View>
              <View style={styles.check}><Ionicons name="add" size={20} color={colors.accent} /></View>
            </Pressable>
          )}
          ListEmptyComponent={term.trim() ? <View style={styles.center}><Text style={styles.empty}>Aucun utilisateur trouvé.</Text></View> : <View style={styles.center}><Text style={styles.empty}>Recherche des personnes à ajouter au groupe.</Text></View>}
        />
      )}
    </View>
  );
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,paddingHorizontal:20,paddingTop:20},
  header:{flexDirection:'row',alignItems:'center',marginBottom:16},
  back:{width:42,height:42,borderRadius:15,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  headerText:{flex:1,marginLeft:10}, title:{fontSize:21,fontWeight:'800',color:colors.text}, subtitle:{fontSize:11,color:colors.textMuted,marginTop:3},
  createButton:{width:42,height:42,borderRadius:15,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'}, disabled:{opacity:.4},
  nameInput:{height:56,borderRadius:18,backgroundColor:colors.surface,paddingHorizontal:16,color:colors.text,fontSize:15,marginBottom:12},
  selectedList:{paddingVertical:4,paddingBottom:12}, selectedItem:{width:64,alignItems:'center',marginRight:10,position:'relative'}, smallAvatar:{width:48,height:48,borderRadius:16,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'}, avatarText:{color:colors.accent,fontSize:17,fontWeight:'800'}, selectedName:{color:colors.text,fontSize:11,marginTop:5,maxWidth:60}, remove:{position:'absolute',right:3,top:-2,width:17,height:17,borderRadius:9,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  searchBox:{height:54,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:15}, input:{flex:1,color:colors.text,fontSize:14,marginLeft:10},
  list:{paddingTop:12,paddingBottom:30}, userRow:{minHeight:70,backgroundColor:colors.surface,borderRadius:18,flexDirection:'row',alignItems:'center',paddingHorizontal:13,marginBottom:9}, avatar:{width:46,height:46,borderRadius:16,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'}, userText:{flex:1,marginLeft:12}, userName:{color:colors.text,fontSize:14,fontWeight:'800'}, userMeta:{color:colors.textSecondary,fontSize:11,marginTop:3}, check:{width:36,height:36,borderRadius:12,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'}, center:{flex:1,alignItems:'center',justifyContent:'center',padding:30}, empty:{color:colors.textMuted,textAlign:'center',fontSize:13},
});
