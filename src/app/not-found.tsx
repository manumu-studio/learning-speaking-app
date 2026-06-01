// Root catch-all for non-existent routes — redirect to home
import { redirect } from 'next/navigation';

export default function NotFound() {
  redirect('/');
}
