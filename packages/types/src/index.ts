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
  status?: "ACTIVE" | "INACTIVE" | null;
};

type ProfileT = {
  admissionNumber: string;
  enrollmentNumber?: string | null;
  studentEmail?: string | null;
  contactNumber?: string | null;
  userId: string;
  department: string;
  course: string;
  yearOfStudy: number;
  semester: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
};

type OrgT = {
  id: string;
  departmentName: string;
  courseName: string;
  semester: string;
  section: number;
  students: ProfileT[];
  createdAt: Date;
  updatedAt: Date;
};

export type { OrgT, ProfileT, TeamT, Theme, UserT };

