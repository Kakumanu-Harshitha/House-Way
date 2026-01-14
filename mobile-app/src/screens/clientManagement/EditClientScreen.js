import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { clientsAPI } from '../../utils/api';

// Premium White Theme with Gold Accents
const COLORS = {
    primary: '#D4AF37',
    primaryLight: 'rgba(184, 134, 11, 0.15)',
    background: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(184, 134, 11, 0.1)',
    text: '#1A1A1A',
    textMuted: '#666666',
    inputBg: '#FAFAFA',
    success: '#22C55E',
    danger: '#EF4444',
};

// InputField component moved OUTSIDE to prevent re-creation on each render
const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={inputFieldStyles.inputContainer}>
        <Text style={inputFieldStyles.inputLabel}>{label}</Text>
        <TextInput
            style={[inputFieldStyles.input, multiline && inputFieldStyles.multilineInput]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
        />
    </View>
);

const inputFieldStyles = StyleSheet.create({
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
    },
});

const EditClientScreen = ({ navigation, route }) => {
    const { clientId, clientData } = route?.params || {};
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!clientData);
    const [formData, setFormData] = useState({
        firstName: clientData?.firstName || '',
        lastName: clientData?.lastName || '',
        email: clientData?.email || '',
        phone: clientData?.phone || '',
        company: clientData?.clientDetails?.company || '',
        address: typeof clientData?.address === 'string' ? clientData.address : (clientData?.address?.street || ''),
        city: clientData?.address?.city || '',
        state: clientData?.address?.state || '',
        notes: clientData?.clientDetails?.notes || '',
    });

    useEffect(() => {
        if (!clientData && clientId) {
            fetchClient();
        }
    }, [clientId, clientData]);

    const fetchClient = async () => {
        try {
            setIsFetching(true);
            const response = await clientsAPI.getClient(clientId);
            if (response.success) {
                const c = response.data.client;
                setFormData({
                    firstName: c.firstName || '',
                    lastName: c.lastName || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    company: c.clientDetails?.company || '',
                    address: typeof c.address === 'string' ? c.address : (c.address?.street || ''),
                    city: c.address?.city || '',
                    state: c.address?.state || '',
                    notes: c.clientDetails?.notes || '',
                });
            }
        } catch (error) {
            console.error('Error fetching client:', error);
            showAlert('Error', 'Failed to load client data');
        } finally {
            setIsFetching(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const validateForm = () => {
        if (!formData.firstName.trim()) {
            showAlert('Error', 'First name is required');
            return false;
        }
        if (!formData.lastName.trim()) {
            showAlert('Error', 'Last name is required');
            return false;
        }
        return true;
    };

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            setIsLoading(true);

            const updateData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: {
                    street: formData.address,
                    city: formData.city,
                    state: formData.state,
                },
                clientDetails: {
                    company: formData.company,
                    notes: formData.notes,
                },
            };

            const response = await clientsAPI.updateClient(clientId, updateData);

            if (response.success) {
                if (Platform.OS === 'web') {
                    alert('✅ Client updated successfully!');
                    navigation.goBack();
                } else {
                    Alert.alert('Success', 'Client updated successfully!', [
                        { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                }
            } else {
                showAlert('Error', response.message || 'Failed to update client');
            }
        } catch (error) {
            console.error('Update client error:', error);
            showAlert('Error', 'Failed to update client');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={[COLORS.background, '#ffffff', COLORS.background]}
                style={styles.gradient}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Feather name="arrow-left" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Edit Client</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.formCard}>
                        <View style={styles.formSection}>
                            <Text style={styles.sectionLabel}>Personal Information</Text>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <InputField
                                        label="First Name *"
                                        value={formData.firstName}
                                        onChangeText={(v) => handleInputChange('firstName', v)}
                                        placeholder="John"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <InputField
                                        label="Last Name *"
                                        value={formData.lastName}
                                        onChangeText={(v) => handleInputChange('lastName', v)}
                                        placeholder="Doe"
                                    />
                                </View>
                            </View>

                            <InputField
                                label="Email"
                                value={formData.email}
                                onChangeText={(v) => handleInputChange('email', v)}
                                placeholder="john.doe@email.com"
                                keyboardType="email-address"
                            />

                            <InputField
                                label="Phone"
                                value={formData.phone}
                                onChangeText={(v) => handleInputChange('phone', v)}
                                placeholder="+1 234 567 8900"
                                keyboardType="phone-pad"
                            />

                            <InputField
                                label="Company"
                                value={formData.company}
                                onChangeText={(v) => handleInputChange('company', v)}
                                placeholder="Company name"
                            />
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionLabel}>Address</Text>
                            <InputField
                                label="Street Address"
                                value={formData.address}
                                onChangeText={(v) => handleInputChange('address', v)}
                                placeholder="123 Main Street"
                            />
                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <InputField
                                        label="City"
                                        value={formData.city}
                                        onChangeText={(v) => handleInputChange('city', v)}
                                        placeholder="City"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <InputField
                                        label="State"
                                        value={formData.state}
                                        onChangeText={(v) => handleInputChange('state', v)}
                                        placeholder="State"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.formSection}>
                            <Text style={styles.sectionLabel}>Additional Notes</Text>
                            <InputField
                                label="Notes"
                                value={formData.notes}
                                onChangeText={(v) => handleInputChange('notes', v)}
                                placeholder="Notes about client..."
                                multiline
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#1F2937" />
                        ) : (
                            <>
                                <Feather name="check" size={20} color="#1F2937" />
                                <Text style={styles.submitButtonText}>Update Client</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    gradient: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 150
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
    formCard: {
        marginHorizontal: 20,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    formSection: { marginBottom: 24 },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    inputContainer: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    multilineInput: { height: 100, textAlignVertical: 'top' },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        marginHorizontal: 20,
        marginTop: 20,
        padding: 18,
        borderRadius: 14,
        gap: 10,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitButtonText: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
});

export default EditClientScreen;
