export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Verification: { email: string; firstName: string; lastName: string; password: string };
  Home: undefined;
  SearchUsers: undefined;
  CreateGroup: undefined;
  GroupInfo: { conversationId: string };
  Chat: { conversationId: string; title: string; type?: 'direct' | 'group' };
  ForwardMessage: { conversationId: string; messageId: string };
};
