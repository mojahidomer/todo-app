export type Status = 'Todo' | 'In Progress' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee: string;
  createdDate: string;
  tags: string[];
}

export interface HistoryEntry {
  snapshot: Task[];
  label: string;
}

export interface HistoryState {
  past: HistoryEntry[];
  present: Task[];
  future: HistoryEntry[];
}

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
