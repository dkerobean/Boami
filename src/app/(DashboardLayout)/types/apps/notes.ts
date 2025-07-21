export interface NotesType {
  _id: string;
  title: string;
  content: string;
  color: 'info' | 'error' | 'warning' | 'success' | 'primary';
  isDeleted: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Legacy interface for backward compatibility
export interface LegacyNotesType {
  id: number;
  color?: string;
  title?: string;
  datef?: any | string;
  deleted: boolean;
}
