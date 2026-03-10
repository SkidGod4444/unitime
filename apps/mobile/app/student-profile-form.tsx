import { useAuth } from "@/contexts/auth.cntxt";
import { apiFetch } from "@/lib/api";
import {
  profileSchema,
  type ProfileFormErrors,
} from "@/lib/schemas/profile.schema";
import { useOrgsStore } from "@/lib/store";
import { useLabGroupsStore } from "@/lib/store/lab-groups";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudentProfileForm() {
  const router = useRouter();
  const { loggedInUser, setLoggedInUser } = useAuth();

  // Form state
  const [name, setName] = useState(loggedInUser?.name || "");
  const [email, setEmail] = useState(loggedInUser?.email || "");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [admissionId, setAdmissiontId] = useState("");
  const [yearOfAdmission, setYearOfAdmission] = useState("2025");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [labGroupId, setLabGroupId] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Dropdown visibility
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showSemDropdown, setShowSemDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showLabGroupDropdown, setShowLabGroupDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  // Constants
  const GENDERS = ["MALE", "FEMALE", "OTHER"];

  // Validation errors
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [loading, setLoading] = useState(false);

  const { orgs, fetchOrgs } = useOrgsStore();
  const { fetchOrgLabGroups } = useLabGroupsStore();
  const [availableLabGroups, setAvailableLabGroups] = useState<
    { id: string; name: string }[]
  >([]);

  React.useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const SEMESTER_MAP: Record<string, string> = {
    FIRST_SEMESTER: "Sem I",
    SECOND_SEMESTER: "Sem II",
    THIRD_SEMESTER: "Sem III",
    FOURTH_SEMESTER: "Sem IV",
    FIFTH_SEMESTER: "Sem V",
    SIXTH_SEMESTER: "Sem VI",
    SEVENTH_SEMESTER: "Sem VII",
    EIGHTH_SEMESTER: "Sem VIII",
    NINTH_SEMESTER: "Sem IX",
    TENTH_SEMESTER: "Sem X",
  };

  // ---------------------------------------------------------------------------
  // Dynamic Options Derivation
  // ---------------------------------------------------------------------------
  const cleanStr = (s?: string) => (s || "").trim().replace(/\s+/g, " ");

  const departments = Array.from(
    new Set(orgs.map((o) => cleanStr(o.departmentName))),
  );

  const courses = department
    ? Array.from(
        new Set(
          orgs
            .filter((o) => cleanStr(o.departmentName) === department)
            .map((o) => cleanStr(o.courseName)),
        ),
      )
    : [];

  const sem =
    department && course
      ? Array.from(
          new Set(
            orgs
              .filter(
                (o) =>
                  cleanStr(o.departmentName) === department &&
                  cleanStr(o.courseName) === course,
              )
              .map((o) => o.semester),
          ),
        )
      : [];

  const sections =
    department && course && semester
      ? Array.from(
          new Set(
            orgs
              .filter(
                (o) =>
                  cleanStr(o.departmentName) === department &&
                  cleanStr(o.courseName) === course &&
                  o.semester === semester,
              )
              .map((o) => o.section.toString()),
          ),
        )
      : [];

  // Dynamically resolved org (once section is picked)
  const matchedOrgPreview =
    department && course && semester && section
      ? orgs.find(
          (o) =>
            cleanStr(o.departmentName) === department &&
            cleanStr(o.courseName) === course &&
            o.semester === semester &&
            o.section.toString() === section,
        )
      : null;

  React.useEffect(() => {
    if (matchedOrgPreview) {
      fetchOrgLabGroups(matchedOrgPreview.id).then(setAvailableLabGroups);
    } else {
      setAvailableLabGroups([]);
      setLabGroupId(null);
    }
  }, [matchedOrgPreview, fetchOrgLabGroups]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const hasError = (field: keyof ProfileFormErrors) => !!errors[field];

  const fieldBorder = (field: keyof ProfileFormErrors) =>
    hasError(field) ? "border-red-400" : "border-gray-200";

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    // Validate
    const result = profileSchema.safeParse({
      name,
      admissionId,
      enrollmentId,
      whatsappNumber,
      email,
      department,
      course,
      semester,
      section,
      yearOfAdmission,
      dob,
      gender,
      labGroupId: labGroupId || "",
    });

    if (!result.success) {
      const fieldErrors: ProfileFormErrors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof ProfileFormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const matchedOrg = orgs.find(
      (o) =>
        cleanStr(o.departmentName) === department &&
        cleanStr(o.courseName) === course &&
        o.semester === semester &&
        o.section.toString() === section,
    );
    if (!matchedOrg) {
      Alert.alert(
        "Error",
        "Could not find a valid matching active Class/Organization for these selections.",
      );
      return;
    }

    // Clear any previous errors
    setErrors({});
    setLoading(true);

    try {
      const response = await apiFetch("/profiles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber: admissionId,
          enrollmentNumber: enrollmentId || null,
          studentEmail: email,
          contactNumber: whatsappNumber,
          userId: loggedInUser?.id,
          department,
          course,
          yearOfStudy: parseInt(yearOfAdmission, 10),
          semester,
          organizationId: matchedOrg.id,
          labGroupId,
          dob,
          gender,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = "Failed to save profile";
        try {
          errMsg = JSON.parse(errText)?.message || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      await response.json();

      // Mark the user as onboarded on the backend
      if (loggedInUser?.id) {
        await apiFetch(`/users/${loggedInUser.id}/onboard`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      }

      // Send welcome email — fire-and-forget, failure must not block onboarding
      apiFetch("/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, variables: { User: name } }),
      }).catch((err) => console.warn("[Email] Welcome email failed:", err));

      // Sync local auth state
      if (loggedInUser) {
        setLoggedInUser({ ...loggedInUser, name, isOnboarded: true });
      }

      Alert.alert("Success", "Profile saved successfully!");

      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Profile save failed:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to save profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900" edges={["top"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm active:bg-gray-50"
          >
            <Ionicons name="arrow-back" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            className="text-base font-bold text-gray-900 text-center flex-shrink w-full max-w-[220px]"
          >
            Edit Profile
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="px-6 pt-4">
            {/* Avatar Section */}
            <View className="items-center mb-10">
              <View className="relative shadow-xl shadow-blue-100">
                <View className="h-36 w-36 rounded-full bg-white border-4 border-white overflow-hidden items-center justify-center">
                  <Image
                    source={
                      loggedInUser?.image
                        ? { uri: loggedInUser.image }
                        : require("../assets/images/pfp-face.png")
                    }
                    className="h-full w-full rounded-full"
                  />
                </View>
                <TouchableOpacity className="absolute bottom-1 right-1 bg-dark h-10 w-10 rounded-full items-center justify-center border-2 border-white shadow-md active:scale-95 transition-transform">
                  <Ionicons name="camera" size={18} color="white" />
                </TouchableOpacity>
              </View>
              <Text
                numberOfLines={1}
                className="text-gray-400 text-xs font-medium mt-4 uppercase tracking-wider text-center w-full"
              >
                Tap to change photo
              </Text>
            </View>

            {/* Form Fields */}
            <View className="gap-6">
              {/* Full Name */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Full Name*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("name")}`}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={hasError("name") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setErrors((e) => ({ ...e, name: undefined }));
                    }}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.name && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.name}
                  </Text>
                )}
              </View>

              {/* Admission Number */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Admission Number*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("admissionId")}`}
                >
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color={hasError("admissionId") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={admissionId}
                    onChangeText={(v) => {
                      setAdmissiontId(v);
                      setErrors((e) => ({ ...e, admissionId: undefined }));
                    }}
                    placeholder="Enter your Admission ID"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
                {errors.admissionId && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.admissionId}
                  </Text>
                )}
              </View>

              {/* Enrollment ID (optional) */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Enrollment ID
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-2xl px-4 py-3.5 bg-white">
                  <Ionicons
                    name="book-outline"
                    size={20}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={enrollmentId}
                    onChangeText={setEnrollmentId}
                    placeholder="Enter your Enrollment ID"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
              </View>

              {/* WhatsApp Number */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  WhatsApp Number*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("whatsappNumber")}`}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={20}
                    color={hasError("whatsappNumber") ? "#F87171" : "#22C55E"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={whatsappNumber}
                    onChangeText={(v) => {
                      setWhatsappNumber(v);
                      setErrors((e) => ({ ...e, whatsappNumber: undefined }));
                    }}
                    placeholder="e.g. +91 98765 43210"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#22C55E"
                    cursorColor="#22C55E"
                    multiline={false}
                    numberOfLines={1}
                    keyboardType="phone-pad"
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
                {errors.whatsappNumber ? (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.whatsappNumber}
                  </Text>
                ) : (
                  <Text className="text-xs text-gray-400 mt-1.5 ml-1">
                    Include your country code (e.g. +1, +91, +44)
                  </Text>
                )}
              </View>

              {/* Email */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Student Email*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white opacity-80 ${fieldBorder("email")}`}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={hasError("email") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setErrors((e) => ({ ...e, email: undefined }));
                    }}
                    multiline={false}
                    numberOfLines={1}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 text-base text-gray-800 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                  />
                </View>
                {errors.email && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.email}
                  </Text>
                )}
              </View>

              {/* Department Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Student Department*
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setShowDepartmentDropdown(!showDepartmentDropdown)
                  }
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("department")}`}
                >
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={hasError("department") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${department ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {department || "Select your Department"}
                  </Text>
                  <Ionicons
                    name={
                      showDepartmentDropdown ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {errors.department && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.department}
                  </Text>
                )}
                {showDepartmentDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {departments.map((dept) => (
                      <TouchableOpacity
                        key={dept}
                        onPress={() => {
                          setDepartment(dept);
                          setCourse("");
                          setSemester("");
                          setSection("");
                          setShowDepartmentDropdown(false);
                          setErrors((e) => ({
                            ...e,
                            department: undefined,
                            course: undefined,
                            semester: undefined,
                            section: undefined,
                          }));
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Course Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Student Course*
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCourseDropdown(!showCourseDropdown)}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("course")}`}
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={hasError("course") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${course ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {course || "Select your Course"}
                  </Text>
                  <Ionicons
                    name={showCourseDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {errors.course && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.course}
                  </Text>
                )}
                {showCourseDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {courses.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          setCourse(c);
                          setSemester("");
                          setSection("");
                          setShowCourseDropdown(false);
                          setErrors((e) => ({
                            ...e,
                            course: undefined,
                            semester: undefined,
                            section: undefined,
                          }));
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Semester Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Current Semester*
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSemDropdown(!showSemDropdown)}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("semester")}`}
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={hasError("semester") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${semester ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {SEMESTER_MAP[semester] ||
                      semester ||
                      "Select your Semester"}
                  </Text>
                  <Ionicons
                    name={showSemDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {errors.semester && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.semester}
                  </Text>
                )}
                {showSemDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {sem.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => {
                          setSemester(s);
                          setSection("");
                          setShowSemDropdown(false);
                          setErrors((e) => ({
                            ...e,
                            semester: undefined,
                            section: undefined,
                          }));
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">
                          {SEMESTER_MAP[s] || s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Section Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Student Section*
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSectionDropdown(!showSectionDropdown)}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("section")}`}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={hasError("section") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${section ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {section || "Select your Section"}
                  </Text>
                  <Ionicons
                    name={showSectionDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {errors.section && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.section}
                  </Text>
                )}
                {showSectionDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {sections.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => {
                          setSection(s);
                          setShowSectionDropdown(false);
                          setErrors((e) => ({ ...e, section: undefined }));
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Lab Group Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Lab Group*
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (availableLabGroups.length > 0) {
                      setShowLabGroupDropdown(!showLabGroupDropdown);
                    }
                  }}
                  activeOpacity={availableLabGroups.length > 0 ? 0.2 : 1}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 ${
                    availableLabGroups.length > 0
                      ? fieldBorder("labGroupId")
                      : "bg-gray-50 border-red-400 opacity-70"
                  }`}
                >
                  <Ionicons
                    name="flask-outline"
                    size={20}
                    color={
                      hasError("labGroupId") || availableLabGroups.length === 0
                        ? "#F87171"
                        : "#9CA3AF"
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${
                      labGroupId
                        ? "text-gray-900"
                        : availableLabGroups.length > 0
                          ? "text-gray-400"
                          : "text-gray-400"
                    }`}
                  >
                    {labGroupId
                      ? availableLabGroups.find((g) => g.id === labGroupId)
                          ?.name
                      : availableLabGroups.length > 0
                        ? "Select your Lab Group"
                        : "No Lab Groups available"}
                  </Text>
                  <Ionicons
                    name={showLabGroupDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {showLabGroupDropdown && availableLabGroups.length > 0 && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {availableLabGroups.map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => {
                          setLabGroupId(g.id);
                          setShowLabGroupDropdown(false);
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.labGroupId && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.labGroupId}
                  </Text>
                )}
              </View>

              {/* Date of Birth */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Date of Birth*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("dob")}`}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={hasError("dob") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={dob}
                    onChangeText={(v) => {
                      setDob(v);
                      setErrors((e) => ({ ...e, dob: undefined }));
                    }}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                </View>
                {errors.dob && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.dob}
                  </Text>
                )}
              </View>

              {/* Gender Dropdown */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Gender*
                </Text>
                <TouchableOpacity
                  onPress={() => setShowGenderDropdown(!showGenderDropdown)}
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("gender")}`}
                >
                  <Ionicons
                    name="male-female-outline"
                    size={20}
                    color={hasError("gender") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    className={`flex-1 text-base font-semibold ${gender ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {gender || "Select your Gender"}
                  </Text>
                  <Ionicons
                    name={showGenderDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
                {errors.gender && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.gender}
                  </Text>
                )}
                {showGenderDropdown && (
                  <View className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                    {GENDERS.map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => {
                          setGender(g);
                          setShowGenderDropdown(false);
                          setErrors((e) => ({ ...e, gender: undefined }));
                        }}
                        className="px-4 py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-900 font-medium">{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Year of Admission */}
              <View>
                <Text className="text-xs font-bold text-gray-500 mb-2 ml-1 uppercase tracking-wide">
                  Year of Admission*
                </Text>
                <View
                  className={`flex-row items-center border rounded-2xl px-4 py-3.5 bg-white ${fieldBorder("yearOfAdmission")}`}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={hasError("yearOfAdmission") ? "#F87171" : "#9CA3AF"}
                    style={{ marginRight: 12 }}
                  />
                  <TextInput
                    value={yearOfAdmission}
                    onChangeText={(v) => {
                      setYearOfAdmission(v);
                      setErrors((e) => ({ ...e, yearOfAdmission: undefined }));
                    }}
                    placeholder="e.g. 2023"
                    placeholderTextColor="#9CA3AF"
                    selectionColor="#2563EB"
                    cursorColor="#2563EB"
                    multiline={false}
                    numberOfLines={1}
                    className="flex-1 text-base text-gray-900 font-semibold py-0 min-h-[20px]"
                    style={{ includeFontPadding: false }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
                {errors.yearOfAdmission && (
                  <Text className="text-xs text-red-500 mt-1 ml-1">
                    {errors.yearOfAdmission}
                  </Text>
                )}
              </View>

              <View className="my-4 px-2 bg-blue-700 rounded-2xl p-2 text-center">
                <Text className="text-sm text-white text-center">
                  Please ensure all your profile details are correct before
                  saving. Fields marked with * are required.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Save Button */}
        <View className="absolute bottom-8 left-6 right-6">
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`w-full py-3.5 rounded-2xl flex-row items-center justify-center ${
              loading ? "bg-primary/80" : "bg-primary active:bg-primary-dark"
            } shadow-lg shadow-blue-200`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base text-center flex-shrink"
              >
                Save Profile
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
