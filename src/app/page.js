import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (session?.value === 'authenticated') {
    redirect('/admin');
  } else {
    // If not an admin, show the customer shop instead of the login portal
    redirect('/shop');
  }
}
