import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { getOrCreateDirectConversation, searchUsers, UserSummary } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SearchUsers'>;

export function SearchUsersScreen({ navigation }: Props) {
  const [term, setTerm] = useState('');
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!term.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const result = await searchUsers(term);
        if (active) setUsers(result);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term]);

  async function openUser(user: UserSummary) {
    const conversationId = await getOrCreateDirectConversation(user);
    navigation.replace('Chat', { conversationId, title: user.displayName });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Nouvelle discussion</Text>
        <Pressable onPress={() => navigation.navigate('CreateGroup')} style={styles.groupButton}>
          <Ionicons name="people-outline" size={19} color={colors.accent} />
          <Text style={styles.groupButtonText}>Groupe</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          autoFocus
          value={term}
          onChangeText={setTerm}
          placeholder="Rechercher par prénom ou nom"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {term ? (
          <Pressable onPress={() => setTerm('')}>
            <Ionicons name="close-circle" size={19} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : users.length === 0 && term.trim() ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Aucun utilisateur trouvé</Text>
          <Text style={styles.emptyText}>Essaie avec un autre prénom ou nom.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => openUser(item)} style={({ pressed }) => [styles.userRow, pressed && styles.pressed]}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.userText}>
                <Text style={styles.userName}>{item.displayName}</Text>
                <Text style={styles.userMeta}>{item.firstName} {item.lastName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background,paddingHorizontal:20,paddingTop:22},
  header:{flexDirection:'row',alignItems:'center',marginBottom:18},
  groupButton:{marginLeft:'auto',height:40,paddingHorizontal:12,borderRadius:14,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center'},
  groupButtonText:{color:colors.accent,fontSize:12,fontWeight:'800',marginLeft:6},
  back:{width:42,height:42,borderRadius:15,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',marginRight:10},
  title:{fontSize:22,fontWeight:'800',color:colors.text,letterSpacing:-0.5},
  searchBox:{height:56,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',paddingHorizontal:16},
  input:{flex:1,color:colors.text,fontSize:15,marginLeft:11},
  list:{paddingTop:14,paddingBottom:30},
  userRow:{minHeight:72,backgroundColor:colors.surface,borderRadius:20,flexDirection:'row',alignItems:'center',paddingHorizontal:14,marginBottom:10},
  pressed:{opacity:0.82},
  avatar:{width:48,height:48,borderRadius:17,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  avatarText:{color:colors.accent,fontSize:18,fontWeight:'800'},
  userText:{flex:1,marginLeft:13},
  userName:{color:colors.text,fontSize:15,fontWeight:'800'},
  userMeta:{color:colors.textSecondary,fontSize:12,marginTop:3},
  center:{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:80},
  emptyTitle:{color:colors.text,fontSize:16,fontWeight:'800',marginTop:12},
  emptyText:{color:colors.textSecondary,fontSize:13,marginTop:5},
});
