import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthStackParamList } from './src/navigation/types';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { VerificationScreen } from './src/screens/auth/VerificationScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchUsersScreen } from './src/screens/SearchUsersScreen';
import { CreateGroupScreen } from './src/screens/CreateGroupScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { GroupInfoScreen } from './src/screens/GroupInfoScreen';
import { ForwardMessageScreen } from './src/screens/ForwardMessageScreen';
import { CallScreen } from './src/screens/CallScreen';
import { colors } from './src/theme';\nimport { IncomingCallListener } from './src/components/IncomingCallListener';

registerGlobals();

const Stack = createNativeStackNavigator<AuthStackParamList>();\n\nfunction CallOverlay() {\n  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();\n  return <IncomingCallListener navigation={navigation} />;\n}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Verification" component={VerificationScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ForwardMessage" component={ForwardMessageScreen} />
          <Stack.Screen name="Call" component={CallScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
