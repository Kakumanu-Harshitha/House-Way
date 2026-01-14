import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import api, { projectsAPI } from "../../utils/api";
import { getApiBaseUrl } from "../../utils/network";
import WaveHeader from "../../components/clientManagement/WaveHeader";

const CreateInvoiceScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const presetProjectId = route?.params?.projectId;

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(presetProjectId || "");
  const [invoiceInfo, setInvoiceInfo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const params =
        user?.role === "employee"
          ? { assignedTo: user._id, limit: 50 }
          : { limit: 50 };
      const response = await projectsAPI.getProjects(params);
      if (response.success) {
        setProjects(response.data.projects || []);
      } else {
        Alert.alert("Error", "Failed to load projects");
      }
    } catch (error) {
      console.error("Load projects error:", error);
      Alert.alert("Error", "Could not load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const pickInvoiceImage = async () => {
    // Validation
    if (!selectedProjectId) {
      Alert.alert("❌ Select Project", "Please select a project first.");
      return;
    }
    if (!invoiceInfo.trim()) {
      Alert.alert("❌ Enter Info", "Please provide some invoice details.");
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Allow access to your photo library.");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) {
        console.log("Image selection canceled");
        return;
      }

      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.fileName || `invoice_${Date.now()}.jpg`;
      const fileType = asset.mimeType || "image/jpeg";

      console.log("📸 Selected image:", {
        uri: fileUri.substring(0, 50) + "...",
        name: fileName,
        type: fileType,
      });

      // Show preview
      setSelectedImage(fileUri);

      // Get token
      const token = await AsyncStorage.getItem("@houseway_token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      setUploading(true);
      setUploadSuccess(false);

      // Create FormData differently for web vs native
      const formData = new FormData();

      if (Platform.OS === "web") {
        console.log("🌐 Web platform detected - using Blob");

        // For web: fetch blob and create File object
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: fileType });

        formData.append("file", file);
        console.log("✅ Web file appended:", file.name, file.size);
      } else {
        console.log("📱 Native platform detected - using URI");

        // For native: use URI directly
        formData.append("file", {
          uri: fileUri,
          name: fileName,
          type: fileType,
        });
        console.log("✅ Native file appended");
      }

      // Append other fields
      formData.append("projectId", selectedProjectId);
      formData.append("invoiceInfo", invoiceInfo);

      console.log("📤 Sending request to:", "/files/upload/invoice");

      // Upload
      let uploadResponse;

      if (Platform.OS === "web") {
        // For web: use fetch API with dynamic base URL
        uploadResponse = await fetch(`${getApiBaseUrl()}/files/upload/invoice`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await uploadResponse.json();
        console.log("✅ Upload response:", data);

        if (data.success) {
          setUploadSuccess(true);
          Alert.alert(
            "✅ Success!",
            "Invoice uploaded successfully!",
            [
              {
                text: "Upload Another",
                onPress: resetForm,
              },
              {
                text: "Done",
                onPress: () => navigation?.goBack(),
              },
            ]
          );
        } else {
          Alert.alert("Upload Failed", data.message || "Unknown error");
        }
      } else {
        // For native: use axios
        uploadResponse = await api.post("/files/upload/invoice", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("✅ Upload response:", uploadResponse.data);

        if (uploadResponse.data?.success) {
          setUploadSuccess(true);
          Alert.alert(
            "✅ Success!",
            "Invoice uploaded successfully!",
            [
              {
                text: "Upload Another",
                onPress: resetForm,
              },
              {
                text: "Done",
                onPress: () => navigation?.goBack(),
              },
            ]
          );
        } else {
          Alert.alert("Upload Failed", uploadResponse.data?.message || "Unknown error");
        }
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage = error.response?.data?.message || error.message || "Upload failed";
      Alert.alert("Error", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedImage(null);
    setUploadSuccess(false);
    setInvoiceInfo("");
    if (!presetProjectId) {
      setSelectedProjectId("");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <WaveHeader
          title="Upload Invoice"
          subtitle="Loading..."
          height={200}
          showBackButton
          backButtonPress={() => navigation?.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3E60D8" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wave Header */}
      <WaveHeader
        title="Upload Invoice"
        subtitle={uploadSuccess ? "✅ Upload Complete" : "Add project expense"}
        height={200}
        showBackButton
        backButtonPress={() => navigation?.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        {uploadSuccess && (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={28} color="#10b981" />
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>Invoice Uploaded!</Text>
              <Text style={styles.successSubtitle}>
                Your invoice has been saved successfully
              </Text>
            </View>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Project Selection */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <Feather name="folder" size={16} color="#1B2540" />
              {"  "}Select Project <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedProjectId}
                onValueChange={(itemValue) => setSelectedProjectId(itemValue)}
                style={styles.picker}
                enabled={!uploadSuccess && !presetProjectId}
              >
                <Picker.Item label="-- Choose a project --" value="" />
                {projects.map((project) => (
                  <Picker.Item
                    key={project._id}
                    label={project.title}
                    value={project._id}
                  />
                ))}
              </Picker>
            </View>
            {!selectedProjectId && !presetProjectId && (
              <Text style={styles.helperText}>
                Select which project this invoice belongs to
              </Text>
            )}
          </View>

          {/* Invoice Information */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <Feather name="file-text" size={16} color="#1B2540" />
              {"  "}Invoice Details <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Material purchase, Labor costs, Equipment rental..."
              placeholderTextColor="#7487C1"
              value={invoiceInfo}
              onChangeText={setInvoiceInfo}
              multiline
              numberOfLines={4}
              editable={!uploadSuccess}
            />
            {!invoiceInfo.trim() && (
              <Text style={styles.helperText}>
                Provide a brief description of this expense
              </Text>
            )}
          </View>

          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.label}>
                <Feather name="image" size={16} color="#1B2540" />
                {"  "}Selected Image
              </Text>
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                {!uploadSuccess && (
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Feather name="x" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.buttonDisabled,
              uploadSuccess && styles.buttonSuccess,
            ]}
            disabled={uploading || uploadSuccess}
            onPress={pickInvoiceImage}
          >
            {uploading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.uploadText}>  Uploading...</Text>
              </View>
            ) : uploadSuccess ? (
              <View style={styles.buttonContent}>
                <Feather name="check-circle" size={22} color="#fff" />
                <Text style={styles.uploadText}>  Uploaded Successfully</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Feather name="upload-cloud" size={22} color="#fff" />
                <Text style={styles.uploadText}>  Select & Upload Invoice</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Action Buttons (after success) */}
          {uploadSuccess && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetForm}
              >
                <Feather name="plus-circle" size={20} color="#3E60D8" />
                <Text style={styles.secondaryButtonText}>  Upload Another</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation?.goBack()}
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>  Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Card */}
        {!uploadSuccess && (
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color="#3E60D8" />
            <Text style={styles.infoText}>
              Upload clear photos of your invoices. Accepted formats: JPG, PNG
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default CreateInvoiceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF7EE",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7487C1",
    fontWeight: "500",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065f46",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#047857",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B2540",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  required: {
    color: "#D75A5A",
    fontSize: 16,
  },
  helperText: {
    fontSize: 13,
    color: "#7487C1",
    marginTop: 6,
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#E8F0FE",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  picker: {
    height: 54,
    color: "#1B2540",
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#E8F0FE",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F8FAFC",
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 15,
    color: "#1B2540",
    lineHeight: 22,
  },
  imagePreviewContainer: {
    marginBottom: 24,
  },
  imagePreviewWrapper: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 220,
    backgroundColor: "#F0F4F8",
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(215, 90, 90, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadButton: {
    backgroundColor: "#3E60D8",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#3E60D8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSuccess: {
    backgroundColor: "#10b981",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  uploadText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3E60D8",
  },
  secondaryButtonText: {
    color: "#3E60D8",
    fontWeight: "700",
    fontSize: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3E60D8",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#3E60D8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F0FE",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1B2540",
    lineHeight: 20,
  },
});