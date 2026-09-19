import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function HomeScreen() {
  return <View style={styles.root}><View style={styles.header}><View><Text style={styles.kicker}>NEXCHAT</Text><Text style={styles.title}>Discussions</Text></View><Pressable style={styles.icon}><Ionicons name="search-outline" size={21} color={colors.text}/></Pressable></View><View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={30} color={colors.accent}/></View><Text style={styles.emptyTitle}>Aucune discussion</Text><Text style={styles.emptyText}>Tes conversations apparaîtront ici dès que tu commenceras à échanger.</Text></View></View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.background,paddingHorizontal:22,paddingTop:25},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:colors.accent},title:{fontSize:30,fontWeight:'800',letterSpacing:-1,color:colors.text,marginTop:4},icon:{width:46,height:46,borderRadius:16,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},empty:{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:80,paddingHorizontal:35},emptyIcon:{width:72,height:72,borderRadius:24,backgroundColor:colors.surfaceSoft,alignItems:'center',justifyContent:'center'},emptyTitle:{fontSize:20,fontWeight:'800',color:colors.text,marginTop:18},emptyText:{fontSize:14,lineHeight:21,color:colors.textSecondary,textAlign:'center',marginTop:8}}
);
