import axios from "axios";
import {
  ClockifyUser,
  ClockifyWorkspace,
  ClockifyUserGroup,
  TimeEntry,
} from "../types/clockify";
import { SupabaseService } from "./supabase";
let API_KEY: string;

try {
  // Try to get value from Raycast preferences
  const raycast = require("@raycast/api");
  const preferences = raycast.getPreferenceValues();
  API_KEY = preferences.clockifyApiKey;
} catch (error) {
  // Fallback to environment variable
  API_KEY = process.env.CLOCKIFY_API_KEY || '';
}

if (!API_KEY) {
  throw new Error('Missing Clockify API key. Set CLOCKIFY_API_KEY environment variable or Raycast preference.');
}
const BASE_URL = "https://api.clockify.me/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-Api-Key": API_KEY,
    "Content-Type": "application/json",
  },
});

export class ClockifyService {
  private static instance: ClockifyService;
  private workspace: string | null = "630f768292cc4b674e5ae3e4"; // Thought Seed's workspace
  private supabaseService: SupabaseService;

  private constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  static getInstance(): ClockifyService {
    if (!ClockifyService.instance) {
      ClockifyService.instance = new ClockifyService();
    }
    return ClockifyService.instance;
  }

  async getWorkspaces(): Promise<ClockifyWorkspace[]> {
    const response = await api.get("/workspaces");
    return response.data;
  }

  async setActiveWorkspace(workspaceId: string) {
    this.workspace = workspaceId;
  }

  async getUsers(): Promise<ClockifyUser[]> {
    if (!this.workspace) {
      const workspaces = await this.getWorkspaces();
      if (!workspaces || workspaces.length === 0) {
        throw new Error("No workspaces found in Clockify account");
      }
      this.workspace = workspaces[0].id;
    }

    const response = await api.get(`/workspaces/${this.workspace}/users`);
    const users = response.data;

    if (!Array.isArray(users)) {
      throw new Error("Invalid response format from Clockify API");
    }

    return users.map((user) => ({
      id: user.id || "",
      name: user.name || "",
      email: user.email || "",
      activeWorkspace: user.activeWorkspace || "",
      defaultWorkspace: user.defaultWorkspace || "",
      status: user.status || "INACTIVE",
      profilePicture: user.profilePicture || "",
    }));
  }

  async getUserGroups(): Promise<ClockifyUserGroup[]> {
    if (!this.workspace) {
      const workspaces = await this.getWorkspaces();
      if (!workspaces || workspaces.length === 0) {
        throw new Error("No workspaces found in Clockify account");
      }
      this.workspace = workspaces[0].id;
    }

    const response = await api.get(`/workspaces/${this.workspace}/user-groups`);
    const groups = response.data;

    if (!Array.isArray(groups)) {
      throw new Error("Invalid response format from Clockify API");
    }

    return groups.map((group) => ({
      id: group.id || "",
      name: group.name || "Unnamed Group",
      workspaceId: group.workspaceId || this.workspace || "",
      userIds: Array.isArray(group.userIds) ? group.userIds : [],
    }));
  }

  async getTimeEntries(userId: string, start: string, end: string): Promise<TimeEntry[]> {
    if (!this.workspace) {
      const workspaces = await this.getWorkspaces();
      if (!workspaces || workspaces.length === 0) {
        throw new Error("No workspaces found in Clockify account");
      }
      this.workspace = workspaces[0].id;
    }

    const response = await api.get(`/workspaces/${this.workspace}/user/${userId}/time-entries`, {
      params: {
        start,
        end,
        hydrated: true
      }
    });

    return response.data;
  }

  async getWeeklyTimeEntries(userId: string): Promise<TimeEntry[]> {
    const now = new Date();
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    );
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (6 - now.getDay())
    );
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getTimeEntries(
      userId,
      startOfWeek.toISOString(),
      endOfWeek.toISOString()
    );
  }

  async getMonthlyTimeEntries(userId: string): Promise<TimeEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.getTimeEntries(
      userId,
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    );
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    if (!this.workspace) {
      const workspaces = await this.getWorkspaces();
      if (!workspaces || workspaces.length === 0) {
        throw new Error("No workspaces found in Clockify account");
      }
      this.workspace = workspaces[0].id;
    }

    try {
      const response = await api.get(`/workspaces/${this.workspace}/user/${userId}/time-entries/in-progress`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
