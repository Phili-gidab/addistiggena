import { Redirect } from 'expo-router';
import { useAuth } from '../store/auth';

/**
 * Route gate: signed-out → welcome; otherwise the side they are currently on.
 *
 * This used to send anyone whose role was PROVIDER to the technician board, no
 * exceptions. Registering as a technician sets that role for good, so someone
 * who signed up as a technician could never book a repair of their own again -
 * the app took them to the job board whatever they did. The mode is the
 * person's own choice and a technician can change it from either Profile tab.
 */
export default function Index() {
  const { user, ready, mode } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/welcome" />;
  if (mode === 'technician') return <Redirect href="/(tech)/jobs" />;
  return <Redirect href="/(customer)/home" />;
}
