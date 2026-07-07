import api from './api';

export interface Skill       { _id: string; name: string; proficiency: string; }
export interface Project     { _id: string; title: string; description?: string; imageUrl?: string; liveLink?: string; githubLink?: string; otherLinks?: {label:string;url:string}[]; skills?: string[]; }
export interface Experience  { _id: string; jobTitle: string; company: string; employmentType: string; startDate: string; endDate?: string; isCurrent: boolean; location?: string; description?: string; skills?: string[]; }
export interface Education   { _id: string; school: string; degree: string; fieldOfStudy?: string; startDate?: string; endDate?: string; isCurrent: boolean; grade?: string; activities?: string; description?: string; }
export interface Language    { _id: string; name: string; proficiency: string; }
export interface Contact     { _id: string; type: string; value: string; label?: string; }

export interface FullUser {
  _id: string; email: string; firstName?: string; lastName?: string;
  profilePicture?: string; coverPicture?: string; headline?: string; about?: string;
  location?: string; phone?: string; resumeUrl?: string; resumeOriginalName?: string;
  isBlockedByMe?: boolean; role?: string; workStatus?: string;
  skills: Skill[]; projects: Project[]; experiences: Experience[];
  educations: Education[]; languages: Language[]; contacts: Contact[];
  connections: string[]; profileViews: number;
  company?: string; jobTitle?: string; school?: string; degree?: string;
  fieldOfStudy?: string; startYear?: string;
  createdAt?: string;
}

export const getProfile       = (userId: string)             => api.get<{success:boolean;data:FullUser}>(`/profile/${userId}`);
export const updateBasic      = (fd: FormData)               => api.patch('/profile/me/basic', fd, { headers: {'Content-Type':'multipart/form-data'} });

export const addSkill         = (d: Omit<Skill,'_id'>)       => api.post('/profile/me/skills', d);
export const editSkill        = (id: string, d: Partial<Skill>)   => api.patch(`/profile/me/skills/${id}`, d);
export const deleteSkill      = (id: string)                 => api.delete(`/profile/me/skills/${id}`);

export const addProject       = (fd: FormData)               => api.post('/profile/me/projects', fd, { headers: {'Content-Type':'multipart/form-data'} });
export const editProject      = (id: string, fd: FormData)   => api.patch(`/profile/me/projects/${id}`, fd, { headers: {'Content-Type':'multipart/form-data'} });
export const deleteProject    = (id: string)                 => api.delete(`/profile/me/projects/${id}`);

export const addExperience    = (d: Omit<Experience,'_id'>) => api.post('/profile/me/experiences', d);
export const editExperience   = (id: string, d: Partial<Experience>) => api.patch(`/profile/me/experiences/${id}`, d);
export const deleteExperience = (id: string)                => api.delete(`/profile/me/experiences/${id}`);

export const addEducation     = (d: Omit<Education,'_id'>) => api.post('/profile/me/educations', d);
export const editEducation    = (id: string, d: Partial<Education>) => api.patch(`/profile/me/educations/${id}`, d);
export const deleteEducation  = (id: string)               => api.delete(`/profile/me/educations/${id}`);

export const addLanguage      = (d: Omit<Language,'_id'>)  => api.post('/profile/me/languages', d);
export const editLanguage     = (id: string, d: Partial<Language>) => api.patch(`/profile/me/languages/${id}`, d);
export const deleteLanguage   = (id: string)               => api.delete(`/profile/me/languages/${id}`);

export const addContact       = (d: Omit<Contact,'_id'>)   => api.post('/profile/me/contacts', d);
export const editContact      = (id: string, d: Partial<Contact>) => api.patch(`/profile/me/contacts/${id}`, d);
export const deleteContact    = (id: string)               => api.delete(`/profile/me/contacts/${id}`);

export const deactivateAccount = () => api.post('/profile/me/deactivate');
export const deleteAccount     = () => api.delete('/profile/me/delete');

// ─── Blocking ─────────────────────────────────────────────────────────────────

export interface BlockedUser { _id: string; firstName?: string; lastName?: string; profilePicture?: string; headline?: string; }

export const getBlockedUsers = ()             => api.get<{success:boolean;data:BlockedUser[]}>('/profile/me/blocked');
export const blockUser       = (id: string)   => api.post(`/profile/me/block/${id}`);
export const unblockUser     = (id: string)   => api.post(`/profile/me/unblock/${id}`);

// ─── Reporting a user ─────────────────────────────────────────────────────────

export const reportUser = (targetId: string, d: { reason: string; description?: string; evidence?: File[] }) => {
  const fd = new FormData();
  fd.append('reason', d.reason);
  if (d.description) fd.append('description', d.description);
  (d.evidence ?? []).slice(0, 3).forEach(f => fd.append('evidence', f));
  return api.post(`/social/report-user/${targetId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// ─── Resume URL helpers ───────────────────────────────────────────────────────
// The backend stores the CLEAN Cloudinary url. Older records may still contain
// a baked-in `fl_attachment:<name>` segment, so we normalise first.

export const resumeViewUrl = (url: string) =>
  url.replace(/\/upload\/fl_attachment[^/]*\//, '/upload/');

export const resumeDownloadUrl = (url: string, originalName?: string) => {
  const clean = resumeViewUrl(url);
  const flag  = originalName ? `fl_attachment:${originalName.replace(/\.[^.]+$/, '')}` : 'fl_attachment';
  return clean.replace('/upload/', `/upload/${flag}/`);
};
