export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Verification: { email: string; firstName: string; lastName: string; password: string };
  Home: undefined;
  SearchUsers: undefined;
  Chat: { conversationId: string; title: string };
};
