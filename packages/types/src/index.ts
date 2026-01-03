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
  name: string;
  email: string;
  password: string;
  email_verification: boolean;
  $user_id: string;
  $created_at: string;
  $updated_at: string;
}
export type { Theme, TeamT, UserT };
