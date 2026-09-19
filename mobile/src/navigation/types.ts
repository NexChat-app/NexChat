export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Verification: { email: string; firstName: string; lastName: string; password: string };
  Home: undefined;
};
