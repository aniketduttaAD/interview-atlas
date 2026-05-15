import { getAllData } from '@/lib/data/loader';
import { ProgressClient } from '@/components/progress/ProgressClient';

export default async function ProgressPage() {
  const allQuestions = await getAllData();
  return <ProgressClient allQuestions={allQuestions} />;
}
