import { ProjectStatus, ProjectType, UserRole } from '@/types/enums';

export const validProjectData = {
  name: 'Test Construction Project',
  projectDescription: 'A comprehensive test project for construction management',
  status: ProjectStatus.PLANNING,
  type: ProjectType.CAPITAL,
  budget: 500000,
};

export const projectStatuses = {
  planning: ProjectStatus.PLANNING,
  inProgress: ProjectStatus.IN_PROGRESS,
  onHold: ProjectStatus.ON_HOLD,
  completed: ProjectStatus.COMPLETED,
  cancelled: ProjectStatus.CANCELLED,
};

export const projectTypes = {
  maintenance: ProjectType.MAINTENANCE,
  capital: ProjectType.CAPITAL,
};

export const sampleProjects = {
  residential: {
    name: 'Residential Building Project',
    projectDescription: 'Construction of a 10-story residential building',
    status: ProjectStatus.PLANNING,
    type: ProjectType.MAINTENANCE,
    budget: 2000000,
  },
  commercial: {
    name: 'Commercial Office Complex',
    projectDescription: 'Development of a modern office complex',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.CAPITAL,
    budget: 5000000,
  },
};

export const createProjectWithTeam = (ownerId: string, members: Array<{ id: string; role: UserRole }> = []) => ({
  ...validProjectData,
  createdBy: ownerId,
  team: [
    { user: ownerId, role: UserRole.OWNER },
    ...members.map((m) => ({ user: m.id, role: m.role })),
  ],
});

export const invalidProjectData = {
  missingName: {
    projectDescription: 'Missing name field',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CAPITAL,
    budget: 100000,
  },
  invalidBudget: {
    name: 'Invalid Budget Project',
    projectDescription: 'Project with negative budget',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CAPITAL,
    budget: -5000,
  },
  shortDescription: {
    name: 'Short Description Project',
    projectDescription: 'Too short',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CAPITAL,
    budget: 100000,
  },
};