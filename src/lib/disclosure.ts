/** Stable keys for every collapsible thing, so pages and search agree on them. IDs only, never names. */
export const disclosureKey = {
  project: (id: string) => `project:${id}`,
  section: (id: string) => `section:${id}`,
  /** Tasks that sit directly in a project that also has sections. */
  noSection: (projectId: string) => `nosection:${projectId}`,
  subtasks: (taskId: string) => `task:${taskId}`,
};
