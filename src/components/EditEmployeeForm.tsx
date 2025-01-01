import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { Employee } from "../types/supabase";

interface Props {
  employee: Employee;
  onSave: (updatedEmployee: Employee) => void;
}

export function EditEmployeeForm({ employee, onSave }: Props) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    try {
      const updatedEmployee: Employee = {
        ...employee,
        name: values.name as string,
        group: values.group as string,
        isActive: values.status === "active",
        employeeType: values.employeeType as "intern" | "fulltime" | "consultant",
      };

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
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
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
    </Form>
  );
}
