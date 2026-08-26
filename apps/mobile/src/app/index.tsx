import { Redirect } from 'expo-router';
import { useAuth } from '../store/auth';

/** Route gate: signed-out → welcome; technicians → jobs; everyone else → customer home. */
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/welcome" />;
  if (user.role === 'PROVIDER') return <Redirect href="/(tech)/jobs" />;
  return <Redirect href="/(customer)/home" />;
}
