// src/api/uploadInvoice.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { filesAPI } from './api';

// ------- helper to build form data -------
export function buildInvoiceFormData(file, extra = {}) {
  const form = new FormData();
  const uri = file.uri || file.path;
  const name = file.name || file.fileName || `invoice-${Date.now()}.jpg`;
  const type = file.type || 'image/jpeg';

  form.append("invoice", {
    uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
    name,
    type,
  });

  Object.keys(extra).forEach((k) => form.append(k, extra[k]));

  return form;
}

// ------- main upload function (interceptor auto adds token) -------
export async function uploadInvoiceWithInterceptor(file, projectId) {
  try {
    const formData = buildInvoiceFormData(file, { projectId });
    return await filesAPI.uploadInvoiceImage(formData);
  } catch (err) {
    console.error("Upload error (interceptor):", err);
    throw err;
  }
}

// ------- backup explicit token version -------
export async function uploadInvoiceWithExplicitToken(file, projectId) {
  try {
    const token = await AsyncStorage.getItem("@houseway_token");
    if (!token) throw new Error("No auth token in AsyncStorage");

    const formData = buildInvoiceFormData(file, { projectId });

    return await filesAPI.uploadInvoiceImage(formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error("Upload error (explicit header):", err);
    throw err;
  }
}
