import { BirthData, CalculationResponse } from "../types/humanDesign";
import axios from "axios";

export class HumanDesignService {
  private static instance: HumanDesignService;
  private readonly apiUrl: string = "https://hd-calc.onrender.com";

  private constructor() {}

  public static getInstance(): HumanDesignService {
    if (!HumanDesignService.instance) {
      HumanDesignService.instance = new HumanDesignService();
    }
    return HumanDesignService.instance;
  }

  public async calculateProfile(birthData: BirthData): Promise<CalculationResponse> {
    try {
      const response = await axios.post(`${this.apiUrl}/api/calculate`, birthData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        throw new Error(response.data.error || "Failed to calculate Human Design profile");
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error calculating Human Design profile:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  public async lookupProfile(id: string): Promise<CalculationResponse> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/lookup/${id}`);

      if (response.status !== 200) {
        throw new Error(response.data.error || "Failed to lookup Human Design profile");
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error looking up Human Design profile:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }
}
