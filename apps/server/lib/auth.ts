import { Client, Databases, Users, Functions, Account } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT as string)
  .setProject(process.env.APPWRITE_PROJECT_ID as string)
  .setKey(process.env.APPWRITE_DEV_KEY as string);

// Export initialized services
export const appwriteClient = client;
export const databases = new Databases(client);
export const account = new Account(client);
export const users = new Users(client);
export const functions = new Functions(client);
