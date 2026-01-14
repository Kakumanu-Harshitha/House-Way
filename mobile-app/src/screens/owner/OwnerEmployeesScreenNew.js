/**
 * OwnerEmployeesScreen - Simplified
 * 
 * Features:
 * - Simple calendar (1-31) for current month
 * - Click on day to see all employee attendance details
 * - Search employee to see all days they attended
 * - Clean, intuitive interface
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const { width } = Dimensions.get('window');
// Calculate day size to fit 7 columns with proper margins
// Account for container padding (16*2=32) and some margin between cells
const CALENDAR_PADDING = 32; // 16 left + 16 right
const DAY_SIZE = Math.floor((width - CALENDAR_PADDING - 14) / 7); // 14 for 2px gap between 7 items

// Simple Calendar Component showing days 1-31
const SimpleCalendar = ({ 
    currentMonth, 
    onMonthChange, 
    attendanceByDate, 
    onDayPress,
    totalEmployees 
}) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();
    
    // Build calendar grid
    const calendarDays = [];
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    // Add days 1 to end of month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }
    
    const getDayStatus = (day) => {
        if (!day) return null;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = attendanceByDate[dateStr];
        
        if (!dayData) return 'none';
        const attendanceRate = totalEmployees > 0 ? (dayData.presentCount / totalEmployees) * 100 : 0;
        
        if (attendanceRate >= 80) return 'good';
        if (attendanceRate >= 50) return 'partial';
        return 'low';
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return '#10B981';
            case 'partial': return '#F59E0B';
            case 'low': return '#EF4444';
            default: return '#E5E7EB';
        }
    };
    
    return (
        <View style={styles.calendarContainer}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity 
                    onPress={() => onMonthChange(new Date(year, month - 1))}
                    style={styles.navButton}
                >
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthNames[month]} {year}</Text>
                <TouchableOpacity 
                    onPress={() => onMonthChange(new Date(year, month + 1))}
                    style={styles.navButton}
                >
                    <Ionicons name="chevron-forward" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
                {dayNames.map(day => (
                    <View key={day} style={styles.dayHeader}>
                        <Text style={styles.dayHeaderText}>{day}</Text>
                    </View>
                ))}
            </View>
            
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                    const status = getDayStatus(day);
                    const isToday = isCurrentMonth && day === todayDate;
                    const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                    const dayData = dateStr ? attendanceByDate[dateStr] : null;
                    
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCell,
                                isToday && styles.todayCell,
                            ]}
                            onPress={() => day && onDayPress(dateStr, dayData)}
                            disabled={!day}
                        >
                            {day && (
                                <>
                                    <Text style={[
                                        styles.dayNumber,
                                        isToday && styles.todayNumber,
                                    ]}>
                                        {day}
                                    </Text>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: getStatusColor(status) }
                                    ]} />
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            
            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>80%+ Present</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.legendText}>50-80%</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.legendText}>&lt;50%</Text>
                </View>
            </View>
        </View>
    );
};

// Day Details Modal - Shows all employees' attendance for a specific day
const DayDetailsModal = ({ visible, date, dayData, employees, onClose }) => {
    if (!visible || !date) return null;
    
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const attendanceRecords = dayData?.records || [];
    
    // Map records to employees
    const employeeAttendance = employees.map(emp => {
        const record = attendanceRecords.find(r => 
            r.user?._id === emp._id || r.user === emp._id
        );
        return {
            employee: emp,
            record: record || null,
        };
    });
    
    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>📅 {formattedDate}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.modalStats}>
                        <View style={styles.modalStatBox}>
                            <Text style={styles.modalStatValue}>{dayData?.presentCount || 0}</Text>
                            <Text style={styles.modalStatLabel}>Present</Text>
                        </View>
                        <View style={styles.modalStatBox}>
                            <Text style={styles.modalStatValue}>{employees.length - (dayData?.presentCount || 0)}</Text>
                            <Text style={styles.modalStatLabel}>Absent</Text>
                        </View>
                    </View>
                    
                    <ScrollView style={styles.modalBody}>
                        <Text style={styles.sectionTitle}>Employee Attendance</Text>
                        
                        {employeeAttendance.map(({ employee, record }) => (
                            <View key={employee._id} style={styles.attendanceRow}>
                                <View style={styles.employeeInfo}>
                                    <View style={[
                                        styles.avatarSmall,
                                        { backgroundColor: record ? '#10B981' : '#EF4444' }
                                    ]}>
                                        <Text style={styles.avatarText}>
                                            {employee.firstName?.[0]?.toUpperCase() || 'E'}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.employeeName}>
                                            {employee.firstName} {employee.lastName}
                                        </Text>
                                        <Text style={styles.employeePosition}>
                                            {employee.employeeDetails?.position || 'Employee'}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.timeInfo}>
                                    {record ? (
                                        <>
                                            <Text style={styles.timeLabel}>
                                                🟢 {formatTime(record.checkInTime)}
                                            </Text>
                                            <Text style={styles.timeLabel}>
                                                🔴 {formatTime(record.checkOutTime)}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={styles.absentText}>Absent</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// Employee Search Results Modal - Shows full employee details and attendance
const EmployeeAttendanceModal = ({ visible, employee, attendanceRecords, projects, onClose }) => {
    if (!visible || !employee) return null;
    
    // Sort attendance records
    const sortedRecords = [...attendanceRecords].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Get projects this employee is assigned to
    const assignedProjects = projects?.filter(p => 
        p.assignedEmployees?.some(e => e._id === employee._id || e === employee._id)
    ) || [];
    
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };
    
    const formatTime = (dateStr) => {
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    const calculateHours = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return '-';
        const diff = new Date(checkOut) - new Date(checkIn);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${mins}m`;
    };
    
    // Calculate total hours worked
    const totalHoursWorked = sortedRecords.reduce((total, record) => {
        if (record.checkInTime && record.checkOutTime) {
            const diff = new Date(record.checkOutTime) - new Date(record.checkInTime);
            return total + (diff / (1000 * 60 * 60));
        }
        return total;
    }, 0);
    
    // Get subRole display text
    const getSubRoleText = (subRole) => {
        switch(subRole) {
            case 'designTeam': return '🎨 Design Team';
            case 'vendorTeam': return '🏭 Vendor Team';
            case 'executionTeam': return '🔧 Execution Team';
            default: return 'General';
        }
    };
    
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>
                                👤 {employee.firstName} {employee.lastName}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {employee.employeeDetails?.position || 'Employee'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Employee Info Section */}
                        <View style={styles.infoSection}>
                            <Text style={styles.sectionTitle}>📋 EMPLOYEE INFORMATION</Text>
                            
                            <View style={styles.infoGrid}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Employee ID</Text>
                                    <Text style={styles.infoValue}>
                                        {employee.employeeDetails?.employeeId || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Department</Text>
                                    <Text style={styles.infoValue}>
                                        {employee.employeeDetails?.department || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Team Type</Text>
                                    <Text style={styles.infoValue}>
                                        {getSubRoleText(employee.subRole)}
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Email</Text>
                                    <Text style={styles.infoValue} numberOfLines={1}>
                                        {employee.email || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={styles.infoValue}>
                                        {employee.phone || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoLabel}>Hire Date</Text>
                                    <Text style={styles.infoValue}>
                                        {employee.employeeDetails?.hireDate 
                                            ? new Date(employee.employeeDetails.hireDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                            : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                            
                            {/* Skills */}
                            {employee.employeeDetails?.skills?.length > 0 && (
                                <View style={styles.skillsContainer}>
                                    <Text style={styles.infoLabel}>Skills</Text>
                                    <View style={styles.skillsRow}>
                                        {employee.employeeDetails.skills.map((skill, idx) => (
                                            <View key={idx} style={styles.skillTag}>
                                                <Text style={styles.skillText}>{skill}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                        
                        {/* Attendance Stats */}
                        <View style={styles.statsSection}>
                            <Text style={styles.sectionTitle}>📊 ATTENDANCE STATS</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{sortedRecords.length}</Text>
                                    <Text style={styles.statLabel}>Days Attended</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{Math.round(totalHoursWorked)}</Text>
                                    <Text style={styles.statLabel}>Total Hours</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>
                                        {sortedRecords.length > 0 
                                            ? Math.round(totalHoursWorked / sortedRecords.length) 
                                            : 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Avg Hours/Day</Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* Assigned Projects */}
                        <View style={styles.projectsSection}>
                            <Text style={styles.sectionTitle}>🏗️ ASSIGNED PROJECTS ({assignedProjects.length})</Text>
                            
                            {assignedProjects.length === 0 ? (
                                <Text style={styles.emptyText}>No projects assigned</Text>
                            ) : (
                                assignedProjects.map((project, idx) => (
                                    <View key={idx} style={styles.projectCard}>
                                        <View style={styles.projectHeader}>
                                            <Text style={styles.projectTitle}>{project.title}</Text>
                                            <View style={[
                                                styles.projectStatus,
                                                { backgroundColor: project.status === 'in-progress' ? '#D1FAE5' : '#FEF3C7' }
                                            ]}>
                                                <Text style={[
                                                    styles.projectStatusText,
                                                    { color: project.status === 'in-progress' ? '#10B981' : '#F59E0B' }
                                                ]}>
                                                    {project.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.projectClient}>
                                            Client: {project.client?.firstName} {project.client?.lastName}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                        
                        {/* Attendance History */}
                        <View style={styles.historySection}>
                            <Text style={styles.sectionTitle}>📅 ATTENDANCE HISTORY</Text>
                            
                            {sortedRecords.length === 0 ? (
                                <Text style={styles.emptyText}>No attendance records found</Text>
                            ) : (
                                sortedRecords.map((record, index) => (
                                    <View key={index} style={styles.historyRow}>
                                        <View style={styles.historyDate}>
                                            <Text style={styles.historyDateText}>
                                                {formatDate(record.date)}
                                            </Text>
                                        </View>
                                        <View style={styles.historyTimes}>
                                            <Text style={styles.historyTime}>
                                                🟢 In: {formatTime(record.checkInTime)}
                                            </Text>
                                            <Text style={styles.historyTime}>
                                                🔴 Out: {formatTime(record.checkOutTime)}
                                            </Text>
                                        </View>
                                        <View style={styles.historyDuration}>
                                            <Text style={styles.durationText}>
                                                {calculateHours(record.checkInTime, record.checkOutTime)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// Main Screen Component
const OwnerEmployeesScreen = ({ navigation }) => {
    const toLocalDateKey = (value) => {
        if (!value) return null;
        const d = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [attendanceByDate, setAttendanceByDate] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    // Modals
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedDayData, setSelectedDayData] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeAttendance, setEmployeeAttendance] = useState([]);
    
    const [stats, setStats] = useState({
        presentToday: 0,
        totalEmployees: 0,
        avgAttendance: 0,
    });

    const fetchData = async () => {
        try {
            console.log('[OwnerEmployees] Fetching data...');
            
            // Fetch employees, attendance, and projects in parallel
            const [employeesData, attendanceData, projectsData] = await Promise.all([
                api.getUsers('employee').catch(() => []),
                api.getAllAttendance().catch(() => []),
                api.getProjects().catch(() => ({ projects: [] })),
            ]);
            
            console.log('[OwnerEmployees] Employees:', employeesData?.length || 0);
            console.log('[OwnerEmployees] Projects:', projectsData?.projects?.length || 0);
            
            setEmployees(employeesData || []);
            setProjects(projectsData?.projects || projectsData || []);
            setAllAttendance(attendanceData || []);
            
            // Process attendance by date
            const byDate = {};
            (attendanceData || []).forEach(record => {
                const dateStr = toLocalDateKey(record.date);
                if (!dateStr) return;
                if (!byDate[dateStr]) {
                    byDate[dateStr] = {
                        presentCount: 0,
                        records: [],
                    };
                }
                byDate[dateStr].records.push(record);
                if (record.checkInTime) {
                    byDate[dateStr].presentCount++;
                }
            });
            setAttendanceByDate(byDate);
            
            // Calculate stats
            const today = toLocalDateKey(new Date());
            const todayData = byDate[today];
            
            setStats({
                presentToday: todayData?.presentCount || 0,
                totalEmployees: employeesData?.length || 0,
                avgAttendance: Object.keys(byDate).length > 0 
                    ? Math.round(Object.values(byDate).reduce((sum, d) => 
                        sum + (d.presentCount / (employeesData?.length || 1)) * 100, 0
                      ) / Object.keys(byDate).length)
                    : 0,
            });
            
        } catch (error) {
            console.error('[OwnerEmployees] Error:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleDayPress = (date, dayData) => {
        setSelectedDay(date);
        setSelectedDayData(dayData);
    };

    const handleEmployeeSelect = (employee) => {
        // Find all attendance records for this employee
        const empAttendance = allAttendance.filter(record => 
            record.user?._id === employee._id || record.user === employee._id
        );
        setSelectedEmployee(employee);
        setEmployeeAttendance(empAttendance);
    };

    // Filter employees based on search
    const filteredEmployees = employees.filter(emp => {
        if (!searchQuery.trim()) return true;
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = emp.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminNavbar title="Manage Employees" navigation={navigation} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFC107" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Manage Employees" navigation={navigation} />
            
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.presentToday}</Text>
                        <Text style={styles.statLabel}>Present Today</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
                        <Text style={styles.statLabel}>Total Employees</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.avgAttendance}%</Text>
                        <Text style={styles.statLabel}>Avg Attendance</Text>
                    </View>
                </View>
                
                {/* Calendar Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>📅 ATTENDANCE CALENDAR</Text>
                    <Text style={styles.sectionSubtext}>Tap on any day to see attendance details</Text>
                    
                    <SimpleCalendar
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        attendanceByDate={attendanceByDate}
                        onDayPress={handleDayPress}
                        totalEmployees={employees.length}
                    />
                </View>
                
                {/* Employee Directory */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>👥 EMPLOYEE DIRECTORY</Text>
                    <Text style={styles.sectionSubtext}>Search and tap to see attendance history</Text>
                    
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {/* Employee List */}
                    {filteredEmployees.map(emp => {
                        const empRecords = allAttendance.filter(r => 
                            r.user?._id === emp._id || r.user === emp._id
                        );
                        const today = toLocalDateKey(new Date());
                        const todayRecord = empRecords.find(r => toLocalDateKey(r.date) === today);
                        const isPresent = todayRecord && todayRecord.checkInTime;
                        
                        return (
                            <TouchableOpacity
                                key={emp._id}
                                style={styles.employeeCard}
                                onPress={() => handleEmployeeSelect(emp)}
                            >
                                <View style={[
                                    styles.avatar,
                                    { backgroundColor: isPresent ? '#10B981' : '#9CA3AF' }
                                ]}>
                                    <Text style={styles.avatarLetter}>
                                        {emp.firstName?.[0]?.toUpperCase() || 'E'}
                                    </Text>
                                </View>
                                <View style={styles.employeeDetails}>
                                    <Text style={styles.employeeNameLarge}>
                                        {emp.firstName} {emp.lastName}
                                    </Text>
                                    <Text style={styles.employeeRole}>
                                        {emp.employeeDetails?.position || 'Employee'}
                                    </Text>
                                    <Text style={styles.attendanceCount}>
                                        {empRecords.length} days recorded
                                    </Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <View style={[
                                        styles.statusIndicator,
                                        { backgroundColor: isPresent ? '#10B981' : '#EF4444' }
                                    ]} />
                                    <Text style={styles.statusText}>
                                        {isPresent ? 'Present' : 'Absent'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    
                    {filteredEmployees.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="person-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyText}>No employees found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
            
            {/* Day Details Modal */}
            <DayDetailsModal
                visible={!!selectedDay}
                date={selectedDay}
                dayData={selectedDayData}
                employees={employees}
                onClose={() => {
                    setSelectedDay(null);
                    setSelectedDayData(null);
                }}
            />
            
            {/* Employee Attendance Modal */}
            <EmployeeAttendanceModal
                visible={!!selectedEmployee}
                employee={selectedEmployee}
                attendanceRecords={employeeAttendance}
                projects={projects}
                onClose={() => {
                    setSelectedEmployee(null);
                    setEmployeeAttendance([]);
                }}
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
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    
    // Stats
    statsRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    
    // Sections
    section: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        letterSpacing: 0.5,
    },
    sectionSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        marginBottom: 16,
    },
    
    // Calendar
    calendarContainer: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    navButton: {
        padding: 8,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    dayHeaders: {
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
    },
    dayHeader: {
        width: DAY_SIZE,
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    todayCell: {
        backgroundColor: '#FEF3C7',
        borderRadius: DAY_SIZE / 2,
    },
    dayNumber: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    todayNumber: {
        fontWeight: '700',
        color: '#F59E0B',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 2,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: '#666',
    },
    
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
    },
    
    // Employee Card
    employeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    employeeDetails: {
        flex: 1,
        marginLeft: 12,
    },
    employeeNameLarge: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    employeeRole: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    attendanceCount: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#666',
    },
    
    // Empty State
    emptyContainer: {
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    modalStats: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    modalStatBox: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
    modalStatValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    modalStatLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    modalBody: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    
    // Info Section
    infoSection: {
        marginBottom: 20,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    infoItem: {
        width: '47%',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    infoLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    skillsContainer: {
        marginTop: 12,
    },
    skillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    skillTag: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    skillText: {
        fontSize: 12,
        color: '#4F46E5',
    },
    
    // Stats Section
    statsSection: {
        marginBottom: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    
    // Projects Section
    projectsSection: {
        marginBottom: 20,
    },
    projectCard: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    projectTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    projectStatus: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    projectStatusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    projectClient: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    
    // History Section
    historySection: {
        marginBottom: 20,
    },
    closeButton: {
        padding: 4,
    },
    
    // Attendance Row
    attendanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    employeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    employeeName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    employeePosition: {
        fontSize: 11,
        color: '#666',
    },
    timeInfo: {
        alignItems: 'flex-end',
    },
    timeLabel: {
        fontSize: 12,
        color: '#333',
    },
    absentText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
    },
    
    // History Row
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    historyDate: {
        width: 80,
    },
    historyDateText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    historyTimes: {
        flex: 1,
        paddingHorizontal: 8,
    },
    historyTime: {
        fontSize: 12,
        color: '#666',
    },
    historyDuration: {
        width: 60,
        alignItems: 'flex-end',
    },
    durationText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
});

export default OwnerEmployeesScreen;
