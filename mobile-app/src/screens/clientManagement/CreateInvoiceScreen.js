import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { invoicesAPI, projectsAPI } from '../../utils/api';
import { useAttendance } from '../../context/AttendanceContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../styles/colors';

const CreateInvoiceScreen = ({ navigation, route }) => {
    const { projectId } = route.params || {};
    const { user, isAuthenticated } = useAuth();
    const { isCheckedIn } = useAttendance();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [project, setProject] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || null);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Default 30 days
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [taxRate, setTaxRate] = useState('0');
    const [notes, setNotes] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days.');

    // Line Items
    const [lineItems, setLineItems] = useState([
        { description: '', quantity: '1', unitPrice: '0', category: 'services' }
    ]);

    // Totals
    const [totals, setTotals] = useState({
        subtotal: 0,
        tax: 0,
        total: 0
    });

    useEffect(() => {
        if (route.params?.amount) {
            setLineItems([
                {
                    description: route.params.installmentName || 'Project Payment',
                    quantity: '1',
                    unitPrice: String(route.params.amount),
                    category: 'services'
                }
            ]);
        }
    }, [route.params?.amount, route.params?.installmentName]);

    // UI State
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Protection: If employee is not checked in, redirect to Check-In screen
        if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
            if (Platform.OS === 'web') {
                alert('⏳ Access Denied: You must be Checked-In to create invoices.');
            } else {
                Alert.alert('Check-In Required', 'You must be Checked-In to create invoices.');
            }
            navigation.replace('CheckIn');
            return;
        }

        loadInfo();
    }, [isAuthenticated, user, isCheckedIn, navigation]);

    useEffect(() => {
        calculateTotals();
    }, [lineItems, taxRate]);

    useEffect(() => {
        if (selectedProjectId) {
            const selected = projects.find(p => p._id === selectedProjectId);
            setProject(selected);
        }
    }, [selectedProjectId, projects]);

    const loadInfo = async () => {
        setLoading(true);
        try {
            if (projectId) {
                // Provided project ID, load specific project
                const response = await projectsAPI.getProject(projectId);
                if (response.success) {
                    setProject(response.data.project);
                    setProjects([response.data.project]);
                    setSelectedProjectId(response.data.project._id);
                }
            } else {
                // Load all active projects for selection
                const response = await projectsAPI.getProjects({ status: 'in-progress' }); // or all
                if (response.success) {
                    setProjects(response.data.projects);
                }
            }
        } catch (error) {
            console.error('Error loading creating invoice info:', error);
            Alert.alert('Error', 'Failed to load project information');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = () => {
        let sub = 0;
        lineItems.forEach(item => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            sub += qty * price;
        });

        const tax = sub * (parseFloat(taxRate) || 0) / 100;
        const total = sub + tax;

        setTotals({
            subtotal: sub,
            tax: tax,
            total: total
        });
    };

    const handleLineItemChange = (index, field, value) => {
        const newItems = [...lineItems];
        newItems[index][field] = value;
        setLineItems(newItems);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: '1', unitPrice: '0', category: 'services' }]);
    };

    const removeLineItem = (index) => {
        if (lineItems.length === 1) return;
        const newItems = [...lineItems];
        newItems.splice(index, 1);
        setLineItems(newItems);
    };

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const handleCreateInvoice = async () => {
        if (!selectedProjectId) {
            Alert.alert('Error', 'Please select a project');
            return;
        }

        // Validation
        const newErrors = {};
        let hasError = false;

        lineItems.forEach((item, index) => {
            if (!item.description.trim()) {
                newErrors[`desc_${index}`] = true;
                hasError = true;
            }
        });

        if (hasError) {
            setErrors(newErrors);
            showToast('Please fill in all required fields', 'error');
            return;
        }

        setErrors({}); // Clear errors checks

        setSubmitting(true);
        try {
            const payload = {
                projectId: selectedProjectId,
                lineItems: lineItems.map(item => ({
                    description: item.description,
                    quantity: parseFloat(item.quantity) || 0,
                    unitPrice: parseFloat(item.unitPrice) || 0,
                    category: item.category
                })),
                taxRate: parseFloat(taxRate) || 0,
                dueDate: dueDate,
                paymentTerms: paymentTerms,
                notes: notes,
            };

            const response = await invoicesAPI.createInvoice(payload);

            if (response.success) {
                showToast('Invoice created successfully! Redirecting...', 'success');
                setTimeout(() => {
                    navigation.goBack();
                }, 1500);
            }
        } catch (error) {
            console.error('Create invoice error:', error);
            showToast(error.response?.data?.message || 'Failed to create invoice', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[COLORS.background, COLORS.background, COLORS.background]}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Invoice</Text>
                    <View style={{ width: 44 }} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >

                {/* Project Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Project</Text>
                    <View style={styles.card}>
                        {projectId ? (
                            <Text style={styles.valueText}>{project?.title || 'Loading...'}</Text>
                        ) : (
                            // Simple placeholder for selector if multiple projects
                            // In a real app we might use a modal or dropdown
                            <Text style={styles.valueText}>{project?.title || 'Select Project (Implement Dropdown)'}</Text>
                        )}
                        {project?.client && (
                            <Text style={styles.helperText}>
                                Client: {project.client.firstName} {project.client.lastName}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Dates */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Invoice Details</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.label}>Issue Date</Text>
                                <Text style={styles.valueText}>{new Date().toLocaleDateString()}</Text>
                            </View>

                            <View style={styles.halfInput}>
                                <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                                    <Text style={styles.label}>Due Date</Text>
                                    <View style={styles.dateInput}>
                                        <Text style={styles.valueText}>{dueDate.toLocaleDateString()}</Text>
                                        <Feather name="calendar" size={16} color={COLORS.primary} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={dueDate}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setDueDate(selectedDate);
                                }}
                            />
                        )}
                    </View>
                </View>

                {/* Line Items */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>Line Items</Text>
                        <TouchableOpacity onPress={addLineItem}>
                            <Text style={styles.addText}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {lineItems.map((item, index) => (
                        <View key={index} style={styles.lineItemCard}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemIndex}>#{index + 1}</Text>
                                <TouchableOpacity onPress={() => removeLineItem(index)}>
                                    <Feather name="trash-2" size={16} color={COLORS.danger} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[
                                    styles.input,
                                    errors[`desc_${index}`] && styles.inputError
                                ]}
                                placeholder="Description"
                                placeholderTextColor={COLORS.textMuted}
                                value={item.description}
                                onChangeText={(text) => {
                                    handleLineItemChange(index, 'description', text);
                                    if (errors[`desc_${index}`]) {
                                        setErrors(prev => ({ ...prev, [`desc_${index}`]: false }));
                                    }
                                }}
                            />

                            <View style={styles.row}>
                                <View style={[styles.halfInput, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>Qty</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        keyboardType="numeric"
                                        value={item.quantity}
                                        onChangeText={(text) => handleLineItemChange(index, 'quantity', text)}
                                    />
                                </View>

                                <View style={[styles.halfInput, { flex: 2 }]}>
                                    <Text style={styles.label}>Unit Price</Text>
                                    <TextInput
                                        style={styles.smallInput}
                                        keyboardType="numeric"
                                        value={item.unitPrice}
                                        onChangeText={(text) => handleLineItemChange(index, 'unitPrice', text)}
                                    />
                                </View>

                                <View style={[styles.halfInput, { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 12 }]}>
                                    <Text style={styles.totalText}>
                                        ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Summary & Globals */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Summary</Text>
                    <View style={styles.card}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.label}>Subtotal</Text>
                            <Text style={styles.valueText}>₹{totals.subtotal.toFixed(2)}</Text>
                        </View>

                        <View style={[styles.summaryRow, { marginTop: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.label}>Tax Rate (%)</Text>
                                <TextInput
                                    style={styles.taxInput}
                                    value={taxRate}
                                    keyboardType="numeric"
                                    onChangeText={setTaxRate}
                                    selectTextOnFocus
                                />
                            </View>
                            <Text style={styles.valueText}>₹{totals.tax.toFixed(2)}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.grandTotal}>₹{totals.total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Notes & Terms</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>Payment Terms</Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 12 }]}
                            value={paymentTerms}
                            onChangeText={setPaymentTerms}
                        />

                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            placeholder="Additional notes for the client..."
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerInfo}>
                    <Text style={styles.footerLabel}>Total Amount</Text>
                    <Text style={styles.footerTotal}>₹{totals.total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreateInvoice}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.createBtnText}>Create Invoice</Text>
                    )}
                </TouchableOpacity>
            </View>
            {/* Toast Notification */}
            {toast.visible && (
                <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
                    <Feather
                        name={toast.type === 'error' ? "alert-circle" : "check-circle"}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.toastText}>{toast.message}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 150,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    addText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    valueText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    halfInput: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 6,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.inputBg,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    lineItemCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    itemIndex: {
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 8,
        padding: 12,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 12,
    },
    smallInput: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 8,
        padding: 10,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    totalText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.cardBorder,
        marginVertical: 12,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    grandTotal: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.primary,
    },
    taxInput: {
        backgroundColor: COLORS.inputBg,
        width: 60,
        padding: 4,
        borderRadius: 4,
        color: COLORS.text,
        textAlign: 'center',
        marginLeft: 8,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.cardBg,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerInfo: {
        flex: 1,
    },
    footerLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    footerTotal: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        minWidth: 140,
        alignItems: 'center',
    },
    createBtnText: {
        color: '#1F2937', // Dark text on yellow button
        fontWeight: '700',
        fontSize: 16,
    },
    inputError: {
        borderColor: COLORS.danger,
        borderWidth: 1.5,
    },
    toast: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: '#333',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 1000,
    },
    toastSuccess: {
        backgroundColor: COLORS.success,
    },
    toastError: {
        backgroundColor: COLORS.danger,
    },
    toastText: {
        color: '#fff',
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default CreateInvoiceScreen;
