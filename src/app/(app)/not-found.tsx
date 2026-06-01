// Catch-all for non-existent routes within the app — redirect to dashboard
import { redirect } from 'next/navigation';

export default function AppNotFound() {
  redirect('/dashboard');
}
