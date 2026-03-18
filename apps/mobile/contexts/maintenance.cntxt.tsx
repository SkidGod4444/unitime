import React, { ReactNode, useEffect } from "react";
import {
  Modal,
  Text,
  View,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHypertune } from "@/lib/flags/hypertune.react";
import { setAppOnMaintenance } from "@/lib/api";

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const flags = useHypertune();
  const isOnMaintenance = flags.isOnMaintenance({ fallback: false });

  useEffect(() => {
    setAppOnMaintenance(isOnMaintenance);
  }, [isOnMaintenance]);

  const handleQuitApp = () => {
    BackHandler.exitApp();
  };

  return (
    <>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={isOnMaintenance}
        onRequestClose={() => {}} // Disabled dismiss
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="construct-outline" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.titleText}>Ongoing Maintenance</Text>
            <Text style={styles.messageText}>
              We are currently performing scheduled maintenance to improve your
              experience.{"\n"}
              Please check back later.
            </Text>
            <TouchableOpacity
              onPress={handleQuitApp}
              style={styles.button}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Quit App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef3c7", // amber-50
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.9,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#f59e0b",
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
