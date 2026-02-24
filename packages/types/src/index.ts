type Theme = "light" | "dark";

type TeamT = {
  $createdAt: string;
  $id: string;
  $updatedAt: string;
  name: string;
  prefs: {
    domain: string;
    icon: string;
  };
  total: number;
};

type UserT = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  banned?: boolean | null;
  role?: string | null;
  banReason?: string | null;
  banExpires?: Date | null;
  coordinates?: string | null;
  expoPushToken?: string | null;
  isOnboarded?: boolean | null;
};
export type { TeamT, Theme, UserT };
