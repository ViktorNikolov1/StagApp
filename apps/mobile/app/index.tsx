import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth-store';

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (accessToken) {
    return <Redirect href="/(app)/feed" />;
  }

  return <Redirect href="/(auth)/login" />;
}
