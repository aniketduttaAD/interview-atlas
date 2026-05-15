import { getAllData } from '@/lib/data/loader';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default async function Dashboard() {
  const allQuestions = await getAllData();

  return <DashboardClient allQuestions={allQuestions} />;
}
