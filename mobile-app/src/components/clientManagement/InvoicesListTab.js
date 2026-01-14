import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Platform,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { invoicesAPI } from '../../utils/api';
import { Linking, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// Professional Emerald & Gold Theme
const COLORS = {
    primary: '#D4AF37',        // Golden Rod
    background: '#0a1a12',     // Very dark green
    cardBg: '#132a1e',         // Dark forest green
    cardBorder: 'rgba(184, 134, 11, 0.2)',
    text: '#FFFFFF',
    textMuted: '#a0b0a8',
    success: '#00C853',
    warning: '#FFB300',
    danger: '#FF5252',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const InvoicesListTab = ({ projectId, navigation }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [invoiceDetails, setInvoiceDetails] = useState({
        name: '',
        description: '',
    });

    useEffect(() => {
        loadInvoices();
    }, [projectId]);

    const loadInvoices = async () => {
        try {
            const response = await invoicesAPI.getProjectInvoices(projectId);
            if (response.success) {
                setInvoices(response.data.invoices || []);
            }
        } catch (error) {
            console.error('Load invoices error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadInvoices();
        setRefreshing(false);
    };

    const getStatusStyle = (status) => {
        const colors = {
            draft: { bg: COLORS.textMuted + '20', text: COLORS.textMuted },
            sent: { bg: COLORS.primary + '20', text: COLORS.primary },
            viewed: { bg: COLORS.warning + '20', text: COLORS.warning },
            paid: { bg: COLORS.success + '20', text: COLORS.success },
            overdue: { bg: COLORS.danger + '20', text: COLORS.danger },
            cancelled: { bg: COLORS.textMuted + '20', text: COLORS.textMuted },
        };
        return colors[status] || colors.draft;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
    };

    const handleDownload = (url) => {
        if (!url) {
            Alert.alert('Error', 'No download URL available');
            return;
        }
        Linking.openURL(url).catch(err => {
            console.error('Download error:', err);
            Alert.alert('Error', 'Could not open document link');
        });
    };

    const handleDeleteInvoice = (invoiceId, invoiceNumber) => {
        Alert.alert(
            'Delete Invoice',
            `Are you sure you want to delete ${invoiceNumber}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await invoicesAPI.deleteInvoice(invoiceId);
                            Alert.alert('Success', 'Invoice deleted successfully');
                            loadInvoices();
                        } catch (error) {
                            console.error('Delete invoice error:', error);
                            Alert.alert('Error', error.message || 'Failed to delete invoice');
                        }
                    }
                }
            ]
        );
    };

    const handlePickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            // Check file size (10MB limit)
            if (file.size > MAX_FILE_SIZE) {
                Alert.alert('File Too Large', 'Please select a PDF file smaller than 10MB');
                return;
            }

            // Store the file and show details modal
            setSelectedFile(file);
            setInvoiceDetails({ name: '', description: '' });
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Document picker error:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const handleConfirmUpload = async () => {
        if (!invoiceDetails.name.trim()) {
            Alert.alert('Required', 'Please enter an invoice name');
            return;
        }

        setShowDetailsModal(false);
        await uploadInvoicePDF(selectedFile, invoiceDetails);
    };

    const uploadInvoicePDF = async (file, details) => {
        try {
            setUploading(true);
            setShowUploadModal(true);

            const formData = new FormData();

            // Handle file differently for web vs native
            if (Platform.OS === 'web') {
                // On web, file.file contains the actual File object
                if (file.file) {
                    formData.append('invoice', file.file, file.name || 'invoice.pdf');
                } else {
                    // Fallback: fetch the URI and create a blob
                    const response = await fetch(file.uri);
                    const blob = await response.blob();
                    formData.append('invoice', blob, file.name || 'invoice.pdf');
                }
            } else {
                // React Native style
                formData.append('invoice', {
                    uri: file.uri,
                    type: 'application/pdf',
                    name: file.name || 'invoice.pdf',
                });
            }

            formData.append('projectId', projectId);
            formData.append('invoiceName', details.name.trim());
            formData.append('description', details.description.trim());

            const response = await invoicesAPI.uploadInvoicePDF(projectId, formData);

            if (response.success) {
                Alert.alert('Success', 'Invoice uploaded successfully!');
                loadInvoices();
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Error', error.message || 'Failed to upload invoice');
        } finally {
            setUploading(false);
            setShowUploadModal(false);
            setSelectedFile(null);
        }
    };

    const renderInvoice = ({ item }) => {
        // Use paymentTerms as invoice name, fall back to invoiceNumber
        const displayName = item.paymentTerms || item.invoiceNumber || item.name || 'Invoice';
        const fileUrl = item.attachments?.[0]?.url || item.fileUrl || item.path;

        return (
            <View style={styles.fileCard}>
                <View style={styles.fileIcon}>
                    <Feather name="file-text" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.fileMeta}>
                        {item.notes ? item.notes.substring(0, 30) + (item.notes.length > 30 ? '...' : '') : formatDate(item.createdAt)}
                    </Text>
                </View>
                <View style={styles.fileActions}>
                    <TouchableOpacity onPress={() => handleDownload(fileUrl)}>
                        <Feather name="external-link" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDownload(fileUrl)}>
                        <Feather name="download" size={18} color={COLORS.success || '#22C55E'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteInvoice(item._id, displayName)}>
                        <Feather name="trash-2" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.sectionLabel}>Project Invoices</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handlePickDocument}
                >
                    <Feather name="upload" size={18} color={COLORS.background} />
                    <Text style={styles.addBtnText}>Upload PDF</Text>
                </TouchableOpacity>
            </View>

            {/* Invoice List */}
            {invoices.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="file-text" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Invoices Yet</Text>
                    <Text style={styles.emptyText}>Upload your first invoice PDF for this project</Text>
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={handlePickDocument}
                    >
                        <Feather name="upload" size={20} color={COLORS.background} />
                        <Text style={styles.createBtnText}>Upload Invoice PDF</Text>
                    </TouchableOpacity>
                    <Text style={styles.limitText}>Max 10MB</Text>
                </View>
            ) : (
                <FlatList
                    data={invoices}
                    renderItem={renderInvoice}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.invoiceList}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                />
            )}

            {/* Invoice Details Modal */}
            <Modal visible={showDetailsModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.detailsModal}>
                        <Text style={styles.detailsModalTitle}>Invoice Details</Text>
                        <Text style={styles.detailsModalSubtitle}>Add a name and description for this invoice</Text>

                        <Text style={styles.inputLabel}>Invoice Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={invoiceDetails.name}
                            onChangeText={(text) => setInvoiceDetails(prev => ({ ...prev, name: text }))}
                            placeholder="e.g., Payment 1 - Foundation Work"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.inputLabel}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                            value={invoiceDetails.description}
                            onChangeText={(text) => setInvoiceDetails(prev => ({ ...prev, description: text }))}
                            placeholder="e.g., Invoice for foundation and structural work completed in December"
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                        />

                        {selectedFile && (
                            <View style={styles.selectedFileRow}>
                                <Feather name="file-text" size={16} color={COLORS.primary} />
                                <Text style={styles.selectedFileName} numberOfLines={1}>
                                    {selectedFile.name}
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setShowDetailsModal(false);
                                    setSelectedFile(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.uploadButton}
                                onPress={handleConfirmUpload}
                            >
                                <Feather name="upload" size={16} color={COLORS.background} />
                                <Text style={styles.uploadButtonText}>Upload</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Upload Progress Modal */}
            <Modal visible={showUploadModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.uploadModal}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.uploadingText}>Uploading Invoice...</Text>
                        <Text style={styles.uploadingSubtext}>Please wait</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.background,
    },
    invoiceList: {
        gap: 12,
    },
    invoiceCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    invoiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    invoiceNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    invoiceClient: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    invoiceDescription: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
        lineHeight: 16,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    invoiceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    invoiceAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    downloadIcon: {
        padding: 6,
        backgroundColor: 'rgba(184, 134, 11, 0.1)',
        borderRadius: 16,
    },
    invoiceHeaderActions: {
        alignItems: 'flex-end',
    },
    invoiceActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 12,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.cardBorder,
        gap: 12,
    },
    actionIcon: {
        padding: 8,
        backgroundColor: 'rgba(184, 134, 11, 0.05)',
        borderRadius: 8,
    },
    // Simple file row styles (matching FilesTab)
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 10,
    },
    fileIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(184, 134, 11, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    fileMeta: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    fileActions: {
        flexDirection: 'row',
        gap: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 4,
        marginBottom: 20,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.background,
    },
    limitText: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadModal: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    uploadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 16,
    },
    uploadingSubtext: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    detailsModal: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    detailsModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    detailsModalSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: COLORS.text,
    },
    selectedFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(184, 134, 11, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
        gap: 8,
    },
    selectedFileName: {
        flex: 1,
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '500',
    },
    modalButtonRow: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: 10,
    },
    cancelButtonText: {
        fontSize: 15,
        color: COLORS.textMuted,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        gap: 8,
    },
    uploadButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.background,
    },
});

export default InvoicesListTab;
