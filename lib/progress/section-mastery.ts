/** Completed-question share for a section (0–100). */
export function sectionMasteryPercent(
  sectionKey: string,
  questionCount: number,
  doneIds: string[],
): number {
  if (questionCount <= 0) return 0;
  const sectionDone = doneIds.filter((id) =>
    id.startsWith(`${sectionKey}-`),
  ).length;
  return Math.round((sectionDone / questionCount) * 100);
}
