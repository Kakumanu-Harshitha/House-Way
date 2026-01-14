import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Modal,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { tasksAPI } from '../../utils/api';

// Yellow/Black Theme
const COLORS = {
    primary: '#FFD700',
    background: '#0D0D0D',
    cardBg: '#1A1A1A',
    cardBorder: 'rgba(255, 215, 0, 0.15)',
    text: '#FFFFFF',
    textMuted: '#888888',
    inputBg: '#2d2d2d',
    success: '#00C853',
    warning: '#FFB300',
    danger: '#FF5252',
};

const ScheduleTab = ({ projectId }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [formData, setFormData] = useState({
        taskName: '',
        taskDescription: '',
        date: new Date(),
        time: new Date(),
        notifyBefore: 30,
        priority: 'medium',
    });

    useEffect(() => {
        loadTasks();
    }, [projectId]);

    const loadTasks = async () => {
        try {
            const response = await tasksAPI.getProjectTasks(projectId);
            if (response.success) {
                setTasks(response.data.tasks || []);
            }
        } catch (error) {
            console.error('Load tasks error:', error);
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const resetForm = () => {
        setFormData({
            taskName: '',
            taskDescription: '',
            date: new Date(),
            time: new Date(),
            notifyBefore: 30,
            priority: 'medium',
        });
        setEditingTask(null);
    };

    const openModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            const taskDate = new Date(task.date);
            const [hours, minutes] = (task.time || '12:00').split(':');
            const taskTime = new Date();
            taskTime.setHours(parseInt(hours), parseInt(minutes));

            setFormData({
                taskName: task.taskName,
                taskDescription: task.taskDescription || '',
                date: taskDate,
                time: taskTime,
                notifyBefore: task.notifyBefore || 30,
                priority: task.priority || 'medium',
            });
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formData.taskName.trim()) {
            showAlert('Error', 'Task name is required');
            return;
        }

        try {
            const taskData = {
                projectId,
                taskName: formData.taskName,
                taskDescription: formData.taskDescription,
                date: formData.date.toISOString(),
                time: `${String(formData.time.getHours()).padStart(2, '0')}:${String(formData.time.getMinutes()).padStart(2, '0')}`,
                notifyBefore: formData.notifyBefore,
                priority: formData.priority,
            };

            let response;
            if (editingTask) {
                response = await tasksAPI.updateTask(editingTask._id, taskData);
            } else {
                response = await tasksAPI.createTask(taskData);
            }

            if (response.success) {
                showAlert('Success', editingTask ? 'Task updated!' : 'Task created!');
                setModalVisible(false);
                resetForm();
                loadTasks();
            }
        } catch (error) {
            console.error('Save task error:', error);
            showAlert('Error', 'Failed to save task');
        }
    };

    const handleDelete = async (taskId) => {
        const doDelete = async () => {
            try {
                const response = await tasksAPI.deleteTask(taskId);
                if (response.success) {
                    showAlert('Success', 'Task deleted');
                    loadTasks();
                }
            } catch (error) {
                showAlert('Error', 'Failed to delete task');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Delete this task?')) doDelete();
        } else {
            Alert.alert('Delete Task', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            await tasksAPI.updateTaskStatus(taskId, newStatus);
            loadTasks();
        } catch (error) {
            showAlert('Error', 'Failed to update status');
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: COLORS.success,
            medium: COLORS.warning,
            high: COLORS.danger,
        };
        return colors[priority] || COLORS.textMuted;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    const renderTask = ({ item }) => (
        <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
                <TouchableOpacity
                    style={[
                        styles.checkbox,
                        item.status === 'completed' && styles.checkboxCompleted,
                    ]}
                    onPress={() => handleStatusChange(item._id, item.status === 'completed' ? 'pending' : 'completed')}
                >
                    {item.status === 'completed' && (
                        <Feather name="check" size={14} color={COLORS.background} />
                    )}
                </TouchableOpacity>
                <View style={styles.taskInfo}>
                    <Text style={[
                        styles.taskName,
                        item.status === 'completed' && styles.taskCompleted,
                    ]}>
                        {item.taskName}
                    </Text>
                    {item.taskDescription && (
                        <Text style={styles.taskDescription} numberOfLines={1}>
                            {item.taskDescription}
                        </Text>
                    )}
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
                </View>
            </View>
            <View style={styles.taskFooter}>
                <View style={styles.taskMeta}>
                    <Feather name="calendar" size={12} color={COLORS.textMuted} />
                    <Text style={styles.taskMetaText}>{formatDate(item.date)}</Text>
                    <Feather name="clock" size={12} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                    <Text style={styles.taskMetaText}>{item.time}</Text>
                </View>
                <View style={styles.taskActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(item)}>
                        <Feather name="edit-2" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                        <Feather name="trash-2" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

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
                <Text style={styles.sectionLabel}>Schedule & Tasks</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
                    <Feather name="plus" size={18} color={COLORS.background} />
                    <Text style={styles.addBtnText}>Add Task</Text>
                </TouchableOpacity>
            </View>

            {/* Task List */}
            {tasks.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="calendar" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Tasks Yet</Text>
                    <Text style={styles.emptyText}>Add tasks to organize your project schedule</Text>
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    renderItem={renderTask}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.taskList}
                />
            )}

            {/* Add/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingTask ? 'Edit Task' : 'New Task'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Task Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.taskName}
                                onChangeText={(v) => setFormData(p => ({ ...p, taskName: v }))}
                                placeholder="Enter task name"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={formData.taskDescription}
                                onChangeText={(v) => setFormData(p => ({ ...p, taskDescription: v }))}
                                placeholder="Enter description"
                                placeholderTextColor={COLORS.textMuted}
                                multiline
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>Date</Text>
                                <TouchableOpacity
                                    style={styles.pickerBtn}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.pickerText}>
                                        {formData.date.toLocaleDateString()}
                                    </Text>
                                    <Feather name="calendar" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.halfInput}>
                                <Text style={styles.inputLabel}>Time</Text>
                                <TouchableOpacity
                                    style={styles.pickerBtn}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Text style={styles.pickerText}>
                                        {`${String(formData.time.getHours()).padStart(2, '0')}:${String(formData.time.getMinutes()).padStart(2, '0')}`}
                                    </Text>
                                    <Feather name="clock" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Priority</Text>
                            <View style={styles.priorityRow}>
                                {['low', 'medium', 'high'].map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.priorityOption,
                                            formData.priority === p && { backgroundColor: getPriorityColor(p) + '30', borderColor: getPriorityColor(p) },
                                        ]}
                                        onPress={() => setFormData(prev => ({ ...prev, priority: p }))}
                                    >
                                        <Text style={[
                                            styles.priorityOptionText,
                                            formData.priority === p && { color: getPriorityColor(p) },
                                        ]}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={styles.saveBtnText}>
                                {editingTask ? 'Update Task' : 'Create Task'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date Picker - for native */}
                {showDatePicker && Platform.OS !== 'web' && (
                    <DateTimePicker
                        value={formData.date}
                        mode="date"
                        onChange={(_, date) => {
                            setShowDatePicker(false);
                            if (date) setFormData(p => ({ ...p, date }));
                        }}
                    />
                )}

                {showTimePicker && Platform.OS !== 'web' && (
                    <DateTimePicker
                        value={formData.time}
                        mode="time"
                        onChange={(_, time) => {
                            setShowTimePicker(false);
                            if (time) setFormData(p => ({ ...p, time }));
                        }}
                    />
                )}
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
    taskList: {
        gap: 10,
    },
    taskCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    taskHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxCompleted: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    taskInfo: {
        flex: 1,
    },
    taskName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    taskCompleted: {
        textDecorationLine: 'line-through',
        color: COLORS.textMuted,
    },
    taskDescription: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    priorityBadge: {
        padding: 6,
        borderRadius: 6,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    taskMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    taskMetaText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    taskActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 6,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.cardBg,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
        marginBottom: 16,
    },
    pickerBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.inputBg,
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    pickerText: {
        fontSize: 15,
        color: COLORS.text,
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 10,
    },
    priorityOption: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
    },
    priorityOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.background,
    },
});

export default ScheduleTab;
