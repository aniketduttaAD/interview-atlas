import { getAllData } from '@/lib/data/loader';
import { BookmarksClient } from '@/components/bookmarks/BookmarksClient';

export default async function BookmarksPage() {
  const allQuestions = await getAllData();
  return <BookmarksClient allQuestions={allQuestions} />;
}
