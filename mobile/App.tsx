import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

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
          <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
