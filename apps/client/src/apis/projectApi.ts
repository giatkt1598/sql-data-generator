import { httpClient } from './httpClient';
import type { ProjectEntity } from '../models/apiModels';

export async function getProjects(): Promise<ProjectEntity[]> {
  const response = await httpClient.get<{ items: ProjectEntity[] }>('/projects');
  return response.data.items;
}

export async function createProject(payload: {
  name: string;
  description: string;
}): Promise<ProjectEntity> {
  const response = await httpClient.post<ProjectEntity>('/projects', payload);
  return response.data;
}

export async function updateProject(
  id: string,
  payload: { name: string; description: string },
): Promise<ProjectEntity> {
  const response = await httpClient.put<ProjectEntity>(`/projects/${id}`, payload);
  return response.data;
}

export async function deleteProject(id: string): Promise<void> {
  await httpClient.delete(`/projects/${id}`);
}
