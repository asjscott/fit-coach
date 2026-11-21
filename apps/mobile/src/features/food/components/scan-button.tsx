import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import { useRef, useState } from "react";
import { Linking, Modal, StyleSheet, View } from "react-native";
import { LoadingButton } from "@/components/loading-button";
import { SafeAreaProvider, SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/text";
import { useToast } from "@/contexts/toast-context";
import { spacing } from "@/theme";

// The barcodes printed on packaged food
const FOOD_BARCODES: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e"];

// Scan: the phone's camera reads a food's barcode with the Expo camera's own scanning (spec #158 story 65). Native
// only: scan-button.web.tsx leaves it out of the web build until the PWA work (#120)
export type ScanButtonProps = { onScanned: (code: string) => void };

export function ScanButton({ onScanned }: ScanButtonProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  // The camera reports a barcode many times a second: only the first counts
  const scanned = useRef(false);

  const open = async () => {
    const granted = permission?.granted || (await requestPermission()).granted;
    if (!granted) {
      showToast("Scanning needs the camera. Allow it in Settings, or search instead.");
      if (permission && !permission.canAskAgain) void Linking.openSettings();
      return;
    }
    scanned.current = false;
    setIsOpen(true);
  };

  return (
    <>
      <LoadingButton label="Scan" icon="scan" size="md" action="secondary" onPress={open} />
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsOpen(false)}
      >
        {/* A presented screen needs its own provider on iOS (docs/agents/workouts.md, #68) */}
        <SafeAreaProvider>
          <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
            {isOpen ? (
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: FOOD_BARCODES }}
                onBarcodeScanned={({ data }) => {
                  if (scanned.current || !/^\d{8,14}$/.test(data)) return;
                  scanned.current = true;
                  setIsOpen(false);
                  onScanned(data);
                }}
              />
            ) : null}
            <View style={styles.footer}>
              <Text centered style={styles.hint}>
                Point the camera at the barcode on the package
              </Text>
              <LoadingButton label="Cancel" size="md" action="secondary" onPress={() => setIsOpen(false)} />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  footer: { gap: spacing[3], padding: spacing[4] },
  hint: { color: "#fff" },
});
