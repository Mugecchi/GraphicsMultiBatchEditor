import { DashboardSummary, ExportHistoryItem, LogoAsset, ProjectData } from '../types/studio';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      errText = data.detail || JSON.stringify(data);
    } catch {
      errText = await res.text();
    }
    throw new Error(errText);
  }
  return res.json();
}

export const api = {
  async getDashboard(): Promise<DashboardSummary> {
    const res = await fetch('/api/dashboard');
    return handleResponse<DashboardSummary>(res);
  },

  async getFonts(): Promise<{
    fonts: string[];
    custom_font_files: { family: string; filename: string; url: string }[];
  }> {
    const res = await fetch('/api/fonts');
    return handleResponse<{
      fonts: string[];
      custom_font_files: { family: string; filename: string; url: string }[];
    }>(res);
  },

  async uploadFont(file: File): Promise<{
    fonts: string[];
    custom_font_files: { family: string; filename: string; url: string }[];
  }> {
    const fd = new FormData();
    fd.append('font_file', file);
    const res = await fetch('/api/fonts/upload', {
      method: 'POST',
      body: fd,
    });
    return handleResponse(res);
  },

  async createProject(formData: FormData): Promise<ProjectData> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      body: formData,
    });
    return handleResponse<ProjectData>(res);
  },

  async createDemoProject(preset: 'roadshow' | 'gad' = 'roadshow'): Promise<ProjectData> {
    const res = await fetch(`/api/demo-project?preset=${preset}`, {
      method: 'POST',
    });
    return handleResponse<ProjectData>(res);
  },

  async getProject(projectId: string): Promise<ProjectData> {
    const res = await fetch(`/api/projects/${projectId}`);
    return handleResponse<ProjectData>(res);
  },

  async updateProject(projectId: string, payload: Partial<ProjectData>): Promise<ProjectData> {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<ProjectData>(res);
  },

  async replaceTemplate(projectId: string, file: File): Promise<ProjectData> {
    const fd = new FormData();
    fd.append('template_file', file);
    const res = await fetch(`/api/projects/${projectId}/template`, {
      method: 'POST',
      body: fd,
    });
    return handleResponse<ProjectData>(res);
  },

  async uploadLogos(
    projectId: string,
    files: File[]
  ): Promise<{ uploaded: LogoAsset[]; project: ProjectData }> {
    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f);
    }
    const res = await fetch(`/api/projects/${projectId}/logos`, {
      method: 'POST',
      body: fd,
    });
    return handleResponse<{ uploaded: LogoAsset[]; project: ProjectData }>(res);
  },

  async trimLogo(
    projectId: string,
    assetId: string,
    mode: 'auto' | 'circle' = 'auto'
  ): Promise<ProjectData> {
    const res = await fetch(`/api/projects/${projectId}/logos/${assetId}/trim?mode=${mode}`, {
      method: 'POST',
    });
    return handleResponse<ProjectData>(res);
  },

  async trimAllLogos(projectId: string, mode: 'auto' | 'circle' = 'auto'): Promise<ProjectData> {
    const res = await fetch(`/api/projects/${projectId}/logos-trim-all?mode=${mode}`, {
      method: 'POST',
    });
    return handleResponse<ProjectData>(res);
  },

  async duplicateProject(projectId: string, newName?: string): Promise<ProjectData> {
    const query = newName ? `?new_name=${encodeURIComponent(newName)}` : '';
    const res = await fetch(`/api/projects/${projectId}/duplicate${query}`, {
      method: 'POST',
    });
    return handleResponse<ProjectData>(res);
  },

  async deleteProject(projectId: string): Promise<{ deleted: boolean; id: string }> {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ deleted: boolean; id: string }>(res);
  },

  async importProjectConfig(file: File): Promise<ProjectData> {
    const fd = new FormData();
    fd.append('config_file', file);
    const res = await fetch('/api/projects/config-import', {
      method: 'POST',
      body: fd,
    });
    return handleResponse<ProjectData>(res);
  },

  async exportTarpaulins(
    projectId: string,
    options: {
      event_ids: string[];
      custom_width?: number | null;
      custom_height?: number | null;
      preserve_aspect_ratio?: boolean;
      dpi?: number;
      as_zip?: boolean;
    }
  ): Promise<{
    exports: ExportHistoryItem[];
    zip: ExportHistoryItem | null;
    count: number;
  }> {
    const res = await fetch(`/api/projects/${projectId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return handleResponse(res);
  },
};
