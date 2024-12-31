import { LocalStorage } from "@raycast/api";

const EMPLOYEE_DETAILS_KEY = "employee_details";

interface StoredEmployeeDetails {
  [employeeId: string]: {
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

export async function getStoredEmployeeDetails(employeeId: string) {
  const storedData = await LocalStorage.getItem<string>(EMPLOYEE_DETAILS_KEY);
  if (!storedData) return null;

  const details: StoredEmployeeDetails = JSON.parse(storedData);
  return details[employeeId];
}

export async function getAllStoredEmployeeDetails() {
  const storedData = await LocalStorage.getItem<string>(EMPLOYEE_DETAILS_KEY);
  if (!storedData) return {};

  return JSON.parse(storedData) as StoredEmployeeDetails;
}

export async function saveEmployeeDetails(
  employeeId: string,
  details: {
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
  },
) {
  const storedData = await LocalStorage.getItem<string>(EMPLOYEE_DETAILS_KEY);
  const currentDetails: StoredEmployeeDetails = storedData
    ? JSON.parse(storedData)
    : {};

  currentDetails[employeeId] = {
    ...currentDetails[employeeId],
    ...details,
  };

  await LocalStorage.setItem(
    EMPLOYEE_DETAILS_KEY,
    JSON.stringify(currentDetails),
  );
}

export async function clearEmployeeDetails(employeeId: string) {
  const storedData = await LocalStorage.getItem<string>(EMPLOYEE_DETAILS_KEY);
  if (!storedData) return;

  const currentDetails: StoredEmployeeDetails = JSON.parse(storedData);
  delete currentDetails[employeeId];

  await LocalStorage.setItem(
    EMPLOYEE_DETAILS_KEY,
    JSON.stringify(currentDetails),
  );
}
