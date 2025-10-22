export interface Holiday {
  id: number;
  name: string;
  date: string; // ISO date string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHolidayData {
  name: string;
  date: string; // YYYY-MM-DD
  is_active?: boolean;
}

export interface UpdateHolidayData {
  name?: string;
  date?: string;
  is_active?: boolean;
}