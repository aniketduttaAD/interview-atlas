import { redirect } from 'next/navigation';

/** Legacy `/admin` entry — Content Tree removed; AI Generator is the admin home. */
export default function AdminPage() {
  redirect('/admin/generate');
}
