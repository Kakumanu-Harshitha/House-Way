import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    ScrollView,
    ActivityIndicator,
    Linking,
    TextInput,
    Alert,
    RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

// Attendance Stats Component
const AttendanceStats = ({ stats }) => {
    return (
        <View style={styles.statsGrid}>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Present Today</Text>
                <Text style={styles.statValue}>{stats.presentToday}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg Attendance</Text>
                <Text style={styles.statValue}>{stats.avgAttendance}%</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>On Leave</Text>
                <Text style={styles.statValue}>{stats.onLeave}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Alerts</Text>
                <Text style={styles.statValue}>{stats.alerts}</Text>
            </View>
        </View>
    );
};

// Employee List Item
const EmployeeListItem = ({ employee, onPress }) => {
    const [attendance, setAttendance] = useState(null);

    useEffect(() => {
        fetchEmployeeAttendance();
    }, [employee._id]);

    const fetchEmployeeAttendance = async () => {
        try {
            const data = await api.getAttendance(employee._id);
            setAttendance(data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        }
    };

    const isActive = attendance && attendance.isCheckedIn;
    const status = isActive ? 'Active' : 'Inactive';

    return (
        <TouchableOpacity style={styles.listItem} onPress={onPress}>
            <View style={styles.listContent}>
                <Text style={styles.listTitle}>
                    {employee.firstName} {employee.lastName}
                </Text>
                <Text style={styles.listSubtitle}>
                    {employee.employeeDetails?.position || 'Employee'}
                </Text>
            </View>
            <View style={[styles.badge, isActive ? styles.badgeSuccess : styles.badgeWarning]}>
                <Text style={styles.badgeText}>{status}</Text>
            </View>
        </TouchableOpacity>
    );
};

// Attendance Calendar Component
const AttendanceCalendar = ({ attendanceData, onDayPress }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const totalDays = lastDay.getDate();
        
        const days = [];
        
        // Previous month days
        for (let i = startDay - 1; i >= 0; i--) {
            const prevMonthDay = new Date(year, month, -i);
            days.push({
                date: prevMonthDay,
                type: 'other',
                day: prevMonthDay.getDate()
            });
        }
        
        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            const currentDate = new Date(year, month, i);
            const dayOfWeek = currentDate.getDay();
            
            // Check if weekend
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                days.push({
                    date: currentDate,
                    type: 'weekend',
                    day: i
                });
            } else {
                // Check attendance data
                const dateStr = currentDate.toISOString().split('T')[0];
                const attendance = attendanceData[dateStr];
                
                let type = 'absent';
                if (attendance) {
                    if (attendance.percentage >= 90) type = 'full';
                    else if (attendance.percentage >= 50) type = 'partial';
                }
                
                days.push({
                    date: currentDate,
                    type,
                    day: i
                });
            }
        }
        
        return days;
    };

    const calendarDays = generateCalendarDays();

    const renderDay = (dayData) => {
        let icon = '';
        let style = [styles.calendarDay];

        switch (dayData.type) {
            case 'full':
                icon = '✓';
                style.push(styles.dayFull);
                break;
            case 'partial':
                icon = '◐';
                style.push(styles.dayPartial);
                break;
            case 'absent':
                icon = '✗';
                style.push(styles.dayAbsent);
                break;
            case 'weekend':
                icon = 'W';
                style.push(styles.dayWeekend);
                break;
            case 'other':
                icon = dayData.day.toString();
                style.push(styles.dayOther);
                break;
        }

        return (
            <TouchableOpacity
                key={dayData.date.toISOString()}
                style={style}
                onPress={() => dayData.type !== 'weekend' && dayData.type !== 'other' && onDayPress(dayData)}
                disabled={dayData.type === 'weekend' || dayData.type === 'other'}
            >
                <Text style={styles.dayText}>{icon}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>
                Attendance Calendar - {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            
            {/* Day headers */}
            <View style={styles.calendarGrid}>
                {daysOfWeek.map(day => (
                    <View key={day} style={[styles.calendarDay, styles.dayHeader]}>
                        <Text style={styles.dayHeaderText}>{day}</Text>
                    </View>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map(renderDay)}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.dayFull]} />
                    <Text style={styles.legendText}>Full</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.dayPartial]} />
                    <Text style={styles.legendText}>Partial</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.dayAbsent]} />
                    <Text style={styles.legendText}>Absent</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, styles.dayWeekend]} />
                    <Text style={styles.legendText}>Weekend</Text>
                </View>
            </View>
        </View>
    );
};

// Day Detail Modal
const DayDetailModal = ({ visible, dayData, employees, onClose }) => {
    const [dayAttendance, setDayAttendance] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && dayData) {
            fetchDayAttendance();
        }
    }, [visible, dayData]);

    const fetchDayAttendance = async () => {
        try {
            setLoading(true);
            // Fetch attendance for all employees on this day
            const dateStr = dayData.date.toISOString().split('T')[0];
            const attendancePromises = employees.map(emp => 
                api.getAttendance(emp._id, dateStr).catch(() => null)
            );
            
            const attendanceData = await Promise.all(attendancePromises);
            
            const dayRecords = attendanceData
                .map((att, index) => ({
                    employee: employees[index],
                    attendance: att
                }))
                .filter(record => record.attendance && record.attendance.checkInTime);

            setDayAttendance(dayRecords);
        } catch (error) {
            console.error('Error fetching day attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!dayData) return null;

    const formattedDate = dayData.date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{formattedDate}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.modalLoading}>
                            <ActivityIndicator size="large" color="#ffc107" />
                        </View>
                    ) : (
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalSubtitle}>
                                {dayAttendance.length} EMPLOYEES LOGGED IN
                            </Text>

                            {dayAttendance.map((record, index) => {
                                const checkIn = record.attendance.checkInTime 
                                    ? new Date(record.attendance.checkInTime).toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                    })
                                    : '-';
                                
                                const checkOut = record.attendance.checkOutTime
                                    ? new Date(record.attendance.checkOutTime).toLocaleTimeString('en-US', { 
                                        hour: 'numeric', 
                                        minute: '2-digit',
                                        hour12: true 
                                    })
                                    : 'Still logged in';

                                return (
                                    <View key={index} style={styles.attendanceRecord}>
                                        <Text style={styles.recordName}>
                                            {record.employee.firstName} {record.employee.lastName}
                                        </Text>
                                        <Text style={styles.recordRole}>
                                            {record.employee.employeeDetails?.position || 'Employee'}
                                        </Text>
                                        <Text style={styles.recordTime}>
                                            {checkIn} - {checkOut}
                                        </Text>
                                    </View>
                                );
                            })}

                            {dayAttendance.length === 0 && (
                                <Text style={styles.emptyText}>No attendance records for this day</Text>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// Employee Detail Modal
const EmployeeDetailModal = ({ visible, employee, onClose }) => {
    const [attendance, setAttendance] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && employee) {
            fetchEmployeeDetails();
        }
    }, [visible, employee]);

    const fetchEmployeeDetails = async () => {
        try {
            setLoading(true);
            const [attendanceData, projectsData] = await Promise.all([
                api.getAttendance(employee._id),
                api.getProjects()
            ]);

            setAttendance(attendanceData);
            
            // Filter projects where employee is supervisor or assigned
            const empProjects = projectsData.filter(
                p => p.supervisor === employee._id || 
                     (p.assignedEmployees && p.assignedEmployees.includes(employee._id))
            );
            setProjects(empProjects);
        } catch (error) {
            console.error('Error fetching employee details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!employee) return null;

    const isActive = attendance && attendance.isCheckedIn;
    const lastLogin = attendance && attendance.checkInTime
        ? new Date(attendance.checkInTime).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
        : 'N/A';

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        {employee.firstName} {employee.lastName}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffc107" />
                    </View>
                ) : (
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>ROLE</Text>
                            <Text style={styles.detailValue}>
                                {employee.employeeDetails?.position || 'Employee'}
                            </Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>STATUS</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
                                <Text style={styles.detailValue}>{isActive ? 'Active' : 'Inactive'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>DEPARTMENT</Text>
                            <Text style={styles.detailValue}>
                                {employee.employeeDetails?.department || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>LAST CHECK-IN</Text>
                            <Text style={styles.detailValue}>{lastLogin}</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>CONTACT</Text>
                            <Text style={styles.detailValue}>{employee.email}</Text>
                            <Text style={styles.detailValue}>{employee.phone}</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>ASSIGNED PROJECTS</Text>
                            {projects.length > 0 ? (
                                projects.map(project => (
                                    <Text key={project._id} style={styles.projectItem}>
                                        • {project.title}
                                    </Text>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No projects assigned</Text>
                            )}
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => Linking.openURL(`tel:${employee.phone}`)}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                                onPress={() => Linking.openURL(`mailto:${employee.email}`)}
                            >
                                <Ionicons name="mail" size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>Email</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
};

// Main Screen Component
const OwnerEmployeesScreen = ({ navigation }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [attendanceData, setAttendanceData] = useState({});
    const [stats, setStats] = useState({
        presentToday: 0,
        avgAttendance: 0,
        onLeave: 0,
        alerts: 0
    });

    const fetchData = async () => {
        try {
            const [employeesData, attendanceDataRaw] = await Promise.all([
                api.getUsers('employee'),
                api.getAllAttendance()
            ]);

            setEmployees(employeesData || []);

            // Process attendance data
            const processedAttendance = {};
            if (attendanceDataRaw && Array.isArray(attendanceDataRaw)) {
                attendanceDataRaw.forEach(record => {
                    const dateStr = new Date(record.date).toISOString().split('T')[0];
                    if (!processedAttendance[dateStr]) {
                        processedAttendance[dateStr] = {
                            count: 0,
                            total: 0,
                            percentage: 0
                        };
                    }
                    processedAttendance[dateStr].count++;
                    if (record.isCheckedIn || record.checkOutTime) {
                        processedAttendance[dateStr].total++;
                    }
                });

                // Calculate percentages
                Object.keys(processedAttendance).forEach(date => {
                    const data = processedAttendance[date];
                    data.percentage = employeesData.length > 0 
                        ? Math.round((data.total / employeesData.length) * 100)
                        : 0;
                });
            }

            setAttendanceData(processedAttendance);

            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            const todayData = processedAttendance[today] || { total: 0 };
            
            const avgAttendance = Object.values(processedAttendance).length > 0
                ? Math.round(
                    Object.values(processedAttendance).reduce((sum, d) => sum + d.percentage, 0) /
                    Object.values(processedAttendance).length
                )
                : 0;

            setStats({
                presentToday: todayData.total,
                avgAttendance,
                onLeave: employeesData.length - todayData.total,
                alerts: 0 // Can be calculated based on late arrivals, etc.
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load employee data. Please check your connection.');
            setEmployees([]);
            setAttendanceData({});
            setStats({
                presentToday: 0,
                avgAttendance: 0,
                onLeave: 0,
                alerts: 0
            });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    const filteredEmployees = employees.filter(emp => {
        if (!searchQuery) return true;
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = emp.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffc107" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Manage Employees" navigation={navigation} />
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Employees</Text>
                    <TouchableOpacity onPress={fetchData}>
                        <Ionicons name="refresh" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Attendance Statistics */}
                <AttendanceStats stats={stats} />

                {/* Employee Directory */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>EMPLOYEE DIRECTORY</Text>
                    
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Employee List */}
                    {filteredEmployees.map(emp => (
                        <EmployeeListItem
                            key={emp._id}
                            employee={emp}
                            onPress={() => setSelectedEmployee(emp)}
                        />
                    ))}

                    {filteredEmployees.length === 0 && (
                        <Text style={styles.emptyText}>No employees found</Text>
                    )}
                </View>

                {/* Attendance Calendar */}
                <View style={styles.card}>
                    <AttendanceCalendar
                        attendanceData={attendanceData}
                        onDayPress={setSelectedDay}
                    />
                </View>
            </ScrollView>

            {/* Employee Detail Modal */}
            <EmployeeDetailModal
                visible={!!selectedEmployee}
                employee={selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
            />

            {/* Day Detail Modal */}
            <DayDetailModal
                visible={!!selectedDay}
                dayData={selectedDay}
                employees={employees}
                onClose={() => setSelectedDay(null)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#212529',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    statItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        flex: 1,
        minWidth: '45%',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '600',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#212529',
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 12,
    },
    searchContainer: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#212529',
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        marginBottom: 8,
        borderRadius: 8,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 2,
    },
    listSubtitle: {
        fontSize: 12,
        color: '#6c757d',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: '#28a745',
    },
    badgeWarning: {
        backgroundColor: '#ffc107',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    calendarContainer: {
        marginTop: 8,
    },
    calendarTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 12,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    calendarDay: {
        width: '12.5%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    dayHeader: {
        backgroundColor: '#f8f9fa',
    },
    dayHeaderText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6c757d',
    },
    dayText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    dayFull: {
        backgroundColor: '#28a745',
    },
    dayPartial: {
        backgroundColor: '#ffc107',
    },
    dayAbsent: {
        backgroundColor: '#dc3545',
    },
    dayWeekend: {
        backgroundColor: '#e9ecef',
    },
    dayOther: {
        backgroundColor: '#f8f9fa',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendBox: {
        width: 16,
        height: 16,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: '#6c757d',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6c757d',
        fontSize: 14,
        paddingVertical: 20,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        width: '100%',
        maxHeight: '70%',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212529',
    },
    modalSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 12,
    },
    modalBody: {
        padding: 16,
    },
    modalLoading: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attendanceRecord: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    recordName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 4,
    },
    recordRole: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 4,
    },
    recordTime: {
        fontSize: 12,
        color: '#6c757d',
    },
    detailSection: {
        marginBottom: 20,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 8,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dotActive: {
        backgroundColor: '#28a745',
    },
    dotInactive: {
        backgroundColor: '#6c757d',
    },
    projectItem: {
        fontSize: 14,
        color: '#212529',
        marginBottom: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default OwnerEmployeesScreen;
