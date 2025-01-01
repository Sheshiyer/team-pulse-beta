import React from "react";
import { HumanDesignCalculator } from "./components/HumanDesignCalculator";
import { HDProfile } from "./types/humanDesign";
import { Employee } from "./types/clockify";

interface Props {
  employee: Employee;
  profile: HDProfile;
}

export function HumanDesign({ employee, profile }: Props) {
  if (
    !employee.customDetails?.dateOfBirth ||
    !employee.customDetails?.timeOfBirth ||
    !employee.customDetails?.location ||
    !profile
  ) {
    return null;
  }

  return <HumanDesignCalculator profile={profile} />;
}
