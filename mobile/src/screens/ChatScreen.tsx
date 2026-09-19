import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { auth } from '../config/firebase';
import { deleteMessage, editTextMessage, Message, reactToMessage, sendTextMessage, subscribeToMessages } from '../services/messaging';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Chat'>;

function formatTime(value: any) {
  if (!value?.toDate) return '';
  return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  useEffect(() => subscribeToMessages(conversationId, setMessages), [conversationId]);

  async function send() {
    const value = text.trim();
    if (!value) return;
    setText('');
    await sendTextMessage(conversationId, value, replyingTo || undefined);
    setReplyingTo(null);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerAvatar}><Text style={styles.headerAvatarText}>{title.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.headerText}><Text style={styles.title}>{title}</Text><Text style={styles.status}>Conversation privée</Text></View>
        <Pressable style={styles.headerAction}><Ionicons name="call-outline" size={21} color={colors.text} /></Pressable>
        <Pressable style={styles.headerAction}><Ionicons name="videocam-outline" size={22} color={colors.text} /></Pressable>
      </View>

      <FlatList
        data={[...messages].reverse()}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          const mine = item.senderId === auth.currentUser?.uid;
          return (
            <View style={[styles.messageRow, mine && styles.messageRowMine]}>
              <Pressable
                onLongPress={async () => {
                  if (mine && item.text) {
                    await editTextMessage(conversationId, item.id, item.text);
                  }
                }}
                onPress={() => setReplyingTo(item)}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                {item.replyTo ? (
                  <View style={styles.replyPreview}>
                    <Text style={styles.replyLabel}>Réponse</Text>
                    <Text numberOfLines={1} style={styles.replyText}>{item.replyTo.text}</Text>
                  </View>
                ) : null}
                <Text style={[styles.messageText, mine && styles.mineText]}>{item.deletedAt ? 'Message supprimé' : item.text}</Text>
                <Text style={[styles.time, mine && styles.mineTime]}>{formatTime(item.createdAt)}{item.editedAt ? ' · modifié' : ''}</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Commence la conversation.</Text></View>}
      />

      {replyingTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyBarText}>
            <Text style={styles.replyBarTitle}>Répondre</Text>
            <Text numberOfLines={1} style={styles.replyBarBody}>{replyingTo.text}</Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
        </View>
      ) : null}
      <View style={styles.composer}>
        <Pressable style={styles.add}><Ionicons name="add" size={24} color={colors.accent} /></Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder="Écrire un message"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="send"
        />
        <Pressable onPress={send} style={[styles.send, !text.trim() && styles.sendDisabled]}>
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  header:{minHeight:76,paddingHorizontal:12,flexDirection:'row',alignItems:'center',backgroundColor:colors.surface},
  back:{width:40,height:40,borderRadius:14,alignItems:'center',justifyContent:'center'},
  headerAvatar:{width:42,height:42,borderRadius:15,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  headerAvatarText:{color:colors.accent,fontSize:16,fontWeight:'800'},
  headerText:{flex:1,marginLeft:11},
  title:{color:colors.text,fontSize:15,fontWeight:'800'},
  status:{color:colors.textMuted,fontSize:11,marginTop:3},
  headerAction:{width:38,height:38,alignItems:'center',justifyContent:'center'},
  messages:{padding:16,paddingBottom:22},
  messageRow:{alignItems:'flex-start',marginBottom:8},
  messageRowMine:{alignItems:'flex-end'},
  bubble:{maxWidth:'78%',paddingHorizontal:14,paddingVertical:10,borderRadius:18},
  mine:{backgroundColor:colors.accent,borderBottomRightRadius:5},
  theirs:{backgroundColor:colors.surface,borderBottomLeftRadius:5},
  messageText:{color:colors.text,fontSize:15,lineHeight:20},
  mineText:{color:colors.white},
  time:{color:colors.textMuted,fontSize:10,marginTop:5,alignSelf:'flex-end'},
  mineTime:{color:'rgba(255,255,255,0.75)'},
  empty:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:120},
  emptyText:{color:colors.textMuted,fontSize:13},
  replyPreview:{backgroundColor:'rgba(97,128,242,0.10)',borderRadius:10,padding:7,marginBottom:7},
  replyLabel:{color:colors.accent,fontSize:10,fontWeight:'800'},
  replyText:{color:colors.textSecondary,fontSize:11,marginTop:2},
  replyBar:{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',backgroundColor:colors.surfaceSoft},
  replyBarText:{flex:1},
  replyBarTitle:{color:colors.accent,fontSize:11,fontWeight:'800'},
  replyBarBody:{color:colors.textSecondary,fontSize:12,marginTop:2},
  composer:{minHeight:66,paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',backgroundColor:colors.surface},
  add:{width:42,height:42,borderRadius:15,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  input:{flex:1,minHeight:44,maxHeight:100,marginHorizontal:9,paddingHorizontal:13,color:colors.text,fontSize:15,backgroundColor:colors.background,borderRadius:16},
  send:{width:42,height:42,borderRadius:15,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  sendDisabled:{opacity:0.45},
});
