export const PROPERTY_PLANNER_NOTE_PREFIX = "property-planner::";

export function buildPlannerNote({
  scenarioId,
  scenarioType,
}: {
  scenarioId: string;
  scenarioType: string;
}) {
  return `${PROPERTY_PLANNER_NOTE_PREFIX}${scenarioId}::${scenarioType}`;
}

export function parsePlannerNote(note?: string | null) {
  if (!note || !note.startsWith(PROPERTY_PLANNER_NOTE_PREFIX)) {
    return null;
  }
  const [, scenarioId, scenarioType] = note.match(
    /^property-planner::([^:]+)::(.+)$/
  ) ?? [null, null, null];
  if (!scenarioId || !scenarioType) {
    return null;
  }
  return { scenarioId, scenarioType };
}
