import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { Employee } from "../types/clockify";
import { saveEmployeeDetails } from "../utils/storage";
import { format } from "date-fns";
import { useState, useCallback, useRef } from "react";
import { searchLocations, getLocationDetails } from "../services/location";
import { useCachedPromise } from "@raycast/utils";
import { HumanDesignService } from "../services/humanDesign";

interface Props {
  employee: Employee;
  onSave: (updatedEmployee: Employee) => void;
}

const mindfulMessages = [
  "Taking a deep breath while we connect with the cosmos...",
  "Aligning with the universal energy...",
  "Channeling the wisdom of the stars...",
  "Discovering your unique cosmic blueprint...",
  "Connecting with your inner truth...",
];

export function EditEmployeeForm({ employee, onSave }: Props) {
  const { pop } = useNavigation();
  const [locationQuery, setLocationQuery] = useState("");
  const [formValues, setFormValues] = useState<Form.Values>({
    dateOfBirth: employee.customDetails?.dateOfBirth,
    timeOfBirth: employee.customDetails?.timeOfBirth,
    location: employee.customDetails?.location ? 
      `${employee.customDetails.location.latitude},${employee.customDetails.location.longitude}` : undefined
  });
  
  const { data: locationSuggestions, isLoading: isLoadingLocations } = useCachedPromise(
    async (query: string) => {
      if (query.length < 3) return [];
      return searchLocations(query);
    },
    [locationQuery],
    {
      execute: locationQuery.length >= 3,
    }
  );

  const calculateHumanDesign = async (values: Form.Values) => {
    try {
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: mindfulMessages[Math.floor(Math.random() * mindfulMessages.length)],
      });

      if (!values.dateOfBirth || !values.timeOfBirth || !values.location) {
        throw new Error("Missing required birth details");
      }

      const hdService = HumanDesignService.getInstance();
      const [lat, lon] = (values.location as string).split(",").map(Number);
      const locationDetails = await getLocationDetails(lat, lon);

      if (!locationDetails) {
        throw new Error("Could not get location details");
      }

      const [hours, minutes] = (values.timeOfBirth as string).split(":");
      const time = `${hours}:${minutes}:00`;
      
      const response = await hdService.calculateProfile({
        date: values.dateOfBirth as string,
        time,
        location: {
          lat: locationDetails.latitude,
          lng: locationDetails.longitude,
          timezone: locationDetails.timezone,
        },
      });

      if (!response.success || !response.profile) {
        throw new Error(response.error || "Failed to calculate Human Design profile");
      }

      loadingToast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "✨ Human Design Profile Updated",
        message: "Your cosmic blueprint has been revealed",
      });

      return response.profile;
    } catch (error) {
      console.error("Error calculating Human Design:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Calculation Error",
        message: error instanceof Error ? error.message : "Failed to calculate profile",
      });
      return null;
    }
  };

  async function handleSubmit(values: Form.Values) {
    try {
      // Validate date format and range
      if (values.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(values.dateOfBirth as string)) {
          throw new Error("Date must be in YYYY-MM-DD format");
        }
        
        const [year, month, day] = (values.dateOfBirth as string).split("-").map(Number);
        const birthDate = new Date(year, month - 1, day);
        
        // Check if date is valid
        if (isNaN(birthDate.getTime())) {
          throw new Error("Invalid date");
        }
        
        // Check if date is in the past
        if (birthDate > new Date()) {
          throw new Error("Date of birth cannot be in the future");
        }
      }

      // Validate time format and range
      if (values.timeOfBirth) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(values.timeOfBirth as string)) {
          throw new Error("Time must be in HH:mm format (e.g., 09:30)");
        }
      }

      // If location is selected, get its details
      let locationDetails;
      if (values.location) {
        const [lat, lon] = (values.location as string).split(",").map(Number);
        locationDetails = await getLocationDetails(lat, lon);
      }

      // Save custom details to storage
      await saveEmployeeDetails(employee.id, {
        dateOfBirth: values.dateOfBirth as string,
        timeOfBirth: values.timeOfBirth as string,
        location: locationDetails,
        humanDesignType: employee.customDetails?.humanDesignType,
        profile: employee.customDetails?.profile,
        incarnationCross: employee.customDetails?.incarnationCross,
      });

      const updatedEmployee: Employee = {
        ...employee,
        name: values.name as string,
        group: values.group as string,
        isActive: values.status === "active",
        employeeType: values.employeeType as
          | "intern"
          | "fulltime"
          | "consultant",
        customDetails: {
          dateOfBirth: values.dateOfBirth as string,
          timeOfBirth: values.timeOfBirth as string,
          location: locationDetails,
          humanDesignType: employee.customDetails?.humanDesignType,
          profile: employee.customDetails?.profile,
          incarnationCross: employee.customDetails?.incarnationCross,
        },
      };

      // Calculate Human Design if all required fields are present
      if (values.dateOfBirth && values.timeOfBirth && values.location) {
        const profile = await calculateHumanDesign(values);
        if (profile) {
          updatedEmployee.customDetails = {
            ...updatedEmployee.customDetails,
            humanDesignType: profile.type,
            profile: profile.profile.join("/"),
            incarnationCross: profile.incarnationCross,
          };
        }
      }

      onSave(updatedEmployee);
      await showToast({
        style: Toast.Style.Success,
        title: "Employee details updated",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update employee",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Human Design">
            <Action
              title="Calculate Human Design"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
              onAction={async () => {
                if (formValues.dateOfBirth && formValues.timeOfBirth && formValues.location) {
                  await calculateHumanDesign(formValues);
                } else {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Missing Required Fields",
                    message: "Please fill in Date of Birth, Time of Birth, and Location",
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={employee.name}
        placeholder="Employee name"
      />
      <Form.TextField
        id="group"
        title="Group"
        defaultValue={employee.group}
        placeholder="Team or group name"
      />
      <Form.Dropdown
        id="status"
        title="Status"
        defaultValue={employee.isActive ? "active" : "inactive"}
      >
        <Form.Dropdown.Item value="active" title="Active" />
        <Form.Dropdown.Item value="inactive" title="Inactive" />
      </Form.Dropdown>
      <Form.Dropdown
        id="employeeType"
        title="Employee Type"
        defaultValue={employee.employeeType || "fulltime"}
      >
        <Form.Dropdown.Item value="intern" title="Intern" />
        <Form.Dropdown.Item value="fulltime" title="Full Time" />
        <Form.Dropdown.Item value="consultant" title="Consultant" />
      </Form.Dropdown>
      <Form.TextField
        id="dateOfBirth"
        onChange={(value) => setFormValues(prev => ({ ...prev, dateOfBirth: value }))}
        title="Date of Birth"
        defaultValue={employee.customDetails?.dateOfBirth}
        placeholder="YYYY-MM-DD"
      />
      <Form.TextField
        id="timeOfBirth"
        onChange={(value) => setFormValues(prev => ({ ...prev, timeOfBirth: value }))}
        title="Time of Birth"
        defaultValue={employee.customDetails?.timeOfBirth}
        placeholder="HH:mm (e.g., 09:30)"
      />
      <Form.Dropdown
        id="location"
        title="Location"
        placeholder="Search for a city..."
        defaultValue={
          employee.customDetails?.location
            ? `${employee.customDetails.location.latitude},${employee.customDetails.location.longitude}`
            : undefined
        }
        onSearchTextChange={setLocationQuery}
        isLoading={isLoadingLocations}
        throttle
        filtering={true}
      >
        {locationSuggestions?.map((location) => (
          <Form.Dropdown.Item
            key={location.placeId}
            value={`${location.latitude},${location.longitude}`}
            title={location.formattedAddress}
            keywords={[location.formattedAddress]}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
