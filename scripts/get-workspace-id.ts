import axios from "axios";

async function getWorkspaceId() {
  try {
    const api = axios.create({
      baseURL: "https://api.clockify.me/api/v1",
      headers: {
        "X-Api-Key": process.env.CLOCKIFY_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    const response = await api.get("/workspaces");
    const workspaces = response.data;
    if (!workspaces || workspaces.length === 0) {
      throw new Error("No workspaces found in Clockify account");
    }

    console.log("Available workspaces:");
    workspaces.forEach((workspace: any, index: number) => {
      console.log(`${index + 1}. ID: ${workspace.id}`);
      console.log(`   Name: ${workspace.name}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error getting workspace ID:", error);
    process.exit(1);
  }
}

getWorkspaceId();
