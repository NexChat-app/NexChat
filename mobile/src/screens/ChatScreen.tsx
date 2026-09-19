import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { auth } from '../config/firebase';
import { deleteMessage, editTextMessage, Message, reactToMessage, sendMediaMessage, sendTextMessage, subscribeToMessages } from '../services/messaging';
import { pickFile, pickImagesAndVideos, uploadToCloudinary, PickedMedia } from '../services/media';
import { colors } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Chat'>;

function formatTime(value: any) {
  if (!value?.toDate) return '';
  return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mediaLabel(item: Message) {
  if (item.type === 'image') return 'Image';
  if (item.type === 'video') return 'Vidéo';
  return item.mediaName || 'Fichier';
}

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => subscribeToMessages(conversationId, setMessages), [conversationId]);

  async function send() {
    const value = text.trim();
    if (!value) return;
    setText('');
    await sendTextMessage(conversationId, value, replyingTo || undefined);
    setReplyingTo(null);
  }

  async function uploadAndSend(media: PickedMedia) {
    try {
      setUploading(true);
      setAttachmentOpen(false);
      const uploaded = await uploadToCloudinary(media);
      await sendMediaMessage(conversationId, {
        secureUrl: uploaded.secureUrl,
        publicId: uploaded.publicId,
        name: uploaded.name,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        kind: uploaded.kind,
      }, replyingTo || undefined);
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert('Envoi impossible', error?.message || 'Le média n’a pas pu être envoyé.');
    } finally {
      setUploading(false);
    }
  }

  async function chooseGallery() {
    try {
      const items = await pickImagesAndVideos();
      for (const item of items) await uploadAndSend(item);
    } catch (error: any) {
      Alert.alert('Galerie', error?.message || 'Impossible d’ouvrir la galerie.');
    }
  }

  async function chooseFile() {
    try {
      const item = await pickFile();
      if (item) await uploadAndSend(item);
    } catch (error: any) {
      Alert.alert('Fichier', error?.message || 'Impossible de sélectionner ce fichier.');
    }
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
                  if (mine && item.type === 'text' && item.text) {
                    await editTextMessage(conversationId, item.id, item.text);
                  }
                }}
                onPress={() => setReplyingTo(item)}
                style={[styles.bubble, mine ? styles.mine : styles.theirs, item.type !== 'text' && styles.mediaBubble]}
              >
                {item.replyTo ? (
                  <View style={styles.replyPreview}>
                    <Text style={styles.replyLabel}>Réponse</Text>
                    <Text numberOfLines={1} style={styles.replyText}>{item.replyTo.text || mediaLabel(item)}</Text>
                  </View>
                ) : null}

                {item.deletedAt ? (
                  <Text style={[styles.messageText, mine && styles.mineText]}>Message supprimé</Text>
                ) : item.type === 'image' && item.mediaUrl ? (
                  <Image source={{ uri: item.mediaUrl }} style={styles.image} resizeMode="cover" />
                ) : item.type === 'video' && item.mediaUrl ? (
                  <Pressable onPress={() => Linking.openURL(item.mediaUrl!)} style={styles.videoCard}>
                    <Ionicons name="play-circle-outline" size={42} color={colors.accent} />
                    <View style={styles.mediaText}><Text style={styles.mediaTitle}>Vidéo</Text><Text style={styles.mediaHint}>Ouvrir la vidéo</Text></View>
                  </Pressable>
                ) : item.type === 'file' && item.mediaUrl ? (
                  <Pressable onPress={() => Linking.openURL(item.mediaUrl!)} style={styles.fileCard}>
                    <View style={styles.fileIcon}><Ionicons name="document-text-outline" size={22} color={colors.accent} /></View>
                    <View style={styles.mediaText}><Text numberOfLines={1} style={styles.mediaTitle}>{item.mediaName || 'Fichier'}</Text><Text style={styles.mediaHint}>Ouvrir le fichier</Text></View>
                  </Pressable>
                ) : (
                  <Text style={[styles.messageText, mine && styles.mineText]}>{item.text}</Text>
                )}
                <Text style={[styles.time, mine && styles.mineTime]}>{formatTime(item.createdAt)}{item.editedAt ? ' · modifié' : ''}</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Commence la conversation.</Text></View>}
      />

      {uploading ? (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.uploadingText}>Envoi du média…</Text>
        </View>
      ) : null}

      {replyingTo ? (
        <View style={styles.replyBar}>
          <View style={styles.replyBarText}>
            <Text style={styles.replyBarTitle}>Répondre</Text>
            <Text numberOfLines={1} style={styles.replyBarBody}>{replyingTo.text || mediaLabel(replyingTo)}</Text>
          </View>
          <Pressable onPress={() => setReplyingTo(null)}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
        </View>
      ) : null}

      {attachmentOpen ? (
        <View style={styles.attachmentSheet}>
          <Pressable onPress={chooseGallery} style={styles.attachmentAction}>
            <View style={styles.attachmentIcon}><Ionicons name="images-outline" size={22} color={colors.accent} /></View>
            <Text style={styles.attachmentLabel}>Photos & vidéos</Text>
          </Pressable>
          <Pressable onPress={chooseFile} style={styles.attachmentAction}>
            <View style={styles.attachmentIcon}><Ionicons name="document-attach-outline" size={22} color={colors.accent} /></View>
            <Text style={styles.attachmentLabel}>Fichier</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable onPress={() => setAttachmentOpen((value) => !value)} style={styles.add}>
          <Ionicons name={attachmentOpen ? 'close' : 'add'} size={24} color={colors.accent} />
        </Pressable>
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

const styles = StyleSheet.create({
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
  mediaBubble:{padding:8},
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
  attachmentSheet:{paddingHorizontal:16,paddingVertical:10,flexDirection:'row',gap:12,backgroundColor:colors.surface},
  attachmentAction:{flexDirection:'row',alignItems:'center',paddingVertical:8,paddingRight:18},
  attachmentIcon:{width:40,height:40,borderRadius:13,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  attachmentLabel:{color:colors.text,fontSize:12,fontWeight:'700',marginLeft:8},
  uploadingBar:{minHeight:42,paddingHorizontal:16,flexDirection:'row',alignItems:'center',backgroundColor:colors.surfaceSoft},
  uploadingText:{color:colors.textSecondary,fontSize:12,marginLeft:8},
  image:{width:220,height:180,borderRadius:14},
  videoCard:{width:220,minHeight:90,borderRadius:14,backgroundColor:colors.surfaceSoft,flexDirection:'row',alignItems:'center',paddingHorizontal:14},
  fileCard:{width:220,minHeight:72,borderRadius:14,backgroundColor:colors.surfaceSoft,flexDirection:'row',alignItems:'center',paddingHorizontal:12},
  fileIcon:{width:42,height:42,borderRadius:13,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  mediaText:{flex:1,marginLeft:10},
  mediaTitle:{color:colors.text,fontSize:13,fontWeight:'800'},
  mediaHint:{color:colors.textMuted,fontSize:10,marginTop:3},
  composer:{minHeight:66,paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',backgroundColor:colors.surface},
  add:{width:42,height:42,borderRadius:15,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},
  input:{flex:1,minHeight:44,maxHeight:100,marginHorizontal:9,paddingHorizontal:13,color:colors.text,fontSize:15,backgroundColor:colors.background,borderRadius:16},
  send:{width:42,height:42,borderRadius:15,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'},
  sendDisabled:{opacity:0.45},
});
