import axios from "axios";
import {
  ClockifyUser,
  ClockifyWorkspace,
  ClockifyUserGroup,
  TimeEntry,
} from "../types/clockify";
import { SupabaseService } from "./supabase";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  clockifyApiKey: string;
}

const preferences = getPreferenceValues<Preferences>();
const API_KEY = preferences.clockifyApiKey;
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
  private workspace: string | null = null;
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

  // Time entries methods now use Supabase
  async getTimeEntries(userId: string, start: string, end: string): Promise<TimeEntry[]> {
    return this.supabaseService.getTimeEntries(userId, start, end);
  }

  async getWeeklyTimeEntries(userId: string): Promise<TimeEntry[]> {
    return this.supabaseService.getWeeklyTimeEntries(userId);
  }

  async getMonthlyTimeEntries(userId: string): Promise<TimeEntry[]> {
    return this.supabaseService.getMonthlyTimeEntries(userId);
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    return this.supabaseService.getActiveTimeEntry(userId);
  }
}
