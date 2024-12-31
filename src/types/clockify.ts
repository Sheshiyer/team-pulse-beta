export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
  status: string;
  profilePicture: string;
}

export interface ClockifyWorkspace {
  id: string;
  name: string;
  workspaceSettings: {
    timeTrackingMode: string;
  };
}

export interface ClockifyUserGroup {
  id: string;
  name: string;
  workspaceId: string;
  userIds: string[];
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  isActive?: boolean; // Made optional since it will be determined by active time entry
  group?: string;
  weeklyLogs: DailyLog[];
  employeeType?: "intern" | "fulltime" | "consultant";
  customDetails?: {
    dateOfBirth?: string;
    timeOfBirth?: string;
    humanDesignType?: string;
    profile?: string;
    incarnationCross?: string;
    location?: {
      address: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
  };
}

export interface DailyLog {
  date: Date;
  loginTime: Date;
  logoutTime: Date;
}

export interface TimeEntry {
  id: string;
  description: string;
  userId: string;
  billable: boolean;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
}
