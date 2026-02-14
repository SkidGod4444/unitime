import { Account, Client, Teams } from "react-native-appwrite";

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!) // Your API Endpoint
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!); // Your project ID

const account = new Account(client);
const teams = new Teams(client);

const getUser = async () => {
  try {
    return await account.get();
  } catch (error: any) {
    // Suppress "missing scopes" error for guests, as it's expected behavior
    if (error?.message?.includes("missing scopes")) {
      return null;
    }
    console.error(error);
    return null;
  }
};

const getTeam = async (id: string) => {
  try {
    const result = await teams.get(id);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const getTeams = async () => {
  try {
    const result = await teams.list();
    return result;
  } catch (error) {
    console.error(error);
  }
};

const getTeamPrefs = async (id: string) => {
  try {
    const result = await teams.getPrefs(id);
    return result;
  } catch (error) {
    console.error(error);
  }
};

const createTeamMember = async (
  teamId: string,
  userId: string,
  userEmail: string,
) => {
  try {
    const result = await teams.createMembership(
      teamId,
      ["member"],
      userEmail,
      userId,
    );
    return result;
  } catch (error) {
    console.error(error);
  }
};
export { account, createTeamMember, getTeam, getTeamPrefs, getTeams, getUser };
