export interface CreateProjectDTO {
  name: string;
  description: string;
  status: string;
  type: 'Capital' | 'Maintenance';
  team: {
    contractor: string[];
    consultant: string[];
  };
  documents?: string[];
  progress?: number;
  budget: number;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  status?: string;
  type?: 'Capital' | 'Maintenance';
  team?: {
    contractor?: string[];
    consultant?: string[];
  };
  documents?: string[];
  progress?: number;
  budget?: number;
}