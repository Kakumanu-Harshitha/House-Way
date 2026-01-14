import React, { useState, useEffect, useRef } from 'react';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { projectsAPI, usersAPI } from '../../../utils/api';

// Light Cream/Yellow Theme
const COLORS = {
  primary: '#FFC107',        // Warm Yellow/Gold
  primaryLight: 'rgba(255, 193, 7, 0.15)',
  background: '#FDFBF7',     // Warm cream background
  cardBg: '#FFFFFF',         // White cards
  border: 'rgba(0, 0, 0, 0.05)',
  text: '#1F2937',           // Dark gray text
  textMuted: '#6B7280',      // Muted text
  inputBg: '#F9FAFB',        // Light gray input
  success: '#10B981',
  danger: '#EF4444',
};

const CreateProjectScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  /* Toast State */
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };
  const [existingClients, setExistingClients] = useState([]);
  const [executionTeam, setExecutionTeam] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Fetch real clients and employees from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients
        const clientsRes = await usersAPI.getUsers({ role: 'client' });
        if (clientsRes.success && clientsRes.data?.users) {
          setExistingClients(clientsRes.data.users);
        }
        // Fetch employees for team assignment
        const employeesRes = await usersAPI.getUsers({ role: 'employee' });
        if (employeesRes.success && employeesRes.data?.users) {
          setExecutionTeam(employeesRes.data.users);
        }
        // Fetch projects to get next project ID
        const projectsRes = await projectsAPI.getProjects({ limit: 1, sortBy: 'projectId', sortOrder: 'desc' });
        if (projectsRes.success && projectsRes.data?.projects?.length > 0) {
          const lastProjectId = projectsRes.data.projects[0].projectId;
          if (lastProjectId) {
            const match = lastProjectId.match(/HW-(\d+)/);
            if (match) {
              const nextNum = parseInt(match[1], 10) + 1;
              setProjectForm(prev => ({ ...prev, projectId: `HW-${String(nextNum).padStart(5, '0')}` }));
            }
          }
        } else {
          // First project
          setProjectForm(prev => ({ ...prev, projectId: 'HW-00001' }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set default project ID on error
        setProjectForm(prev => ({ ...prev, projectId: 'HW-00001' }));
      } finally {
        setLoadingClients(false);
      }
    };
    fetchData();
  }, []);

  const [isNewClient, setIsNewClient] = useState(false);

  const [clientForm, setClientForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const [projectForm, setProjectForm] = useState({
    projectId: '',
    title: '',
    description: '',
    projectType: 'residential',
    client: '',
    assignedEmployee: '',
    budget: '',
    startDate: '',
    endDate: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });

  const handleClientChange = (field, value, nested = null) => {
    if (nested) {
      setClientForm(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setClientForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleProjectChange = (field, value) => {
    setProjectForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!projectForm.title.trim()) return "Project title is required";
    if (!projectForm.budget.trim()) return "Budget is required";

    if (isNewClient) {
      if (!clientForm.firstName.trim()) return "Client first name is required";
      if (!clientForm.email.trim() || !clientForm.email.includes('@')) return "Valid email is required";
      if (!clientForm.password || clientForm.password.length < 6) return "Password must be at least 6 characters";
    } else {
      if (!projectForm.client) return "Please select a client";
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    setIsLoading(true);
    try {
      let finalClientId = projectForm.client;

      // 1. Create Client if New
      if (isNewClient) {
        const clientPayload = {
          firstName: clientForm.firstName,
          lastName: clientForm.lastName,
          email: clientForm.email,
          password: clientForm.password,
          phone: clientForm.phone,
          role: 'client',
          isActive: true,
          address: clientForm.address
        };

        const clientRes = await usersAPI.registerClient(clientPayload);

        if (clientRes.success) {
          // Backend returns: { data: { client: { _id, ... } } }
          finalClientId = clientRes.data?.client?._id || clientRes.data?._id;
          console.log('Created client with ID:', finalClientId);
          if (!finalClientId) throw new Error("Created client but couldn't get ID");
        } else {
          throw new Error(clientRes.message || "Failed to create client");
        }
      }

      // 2. Create Project
      const projectPayload = {
        projectId: projectForm.projectId,  // Custom project ID like HW-00001
        title: projectForm.title,
        description: (projectForm.description || projectForm.title).padEnd(10, ' '), // Ensure min 10 chars
        clientId: finalClientId,  // Backend expects 'clientId' not 'client'
        projectType: projectForm.projectType,
        budget: parseFloat(projectForm.budget) || 0,  // Send as number, not object
        timeline: {
          startDate: projectForm.startDate ? new Date(projectForm.startDate).toISOString() : undefined,
          expectedEndDate: projectForm.endDate ? new Date(projectForm.endDate).toISOString() : undefined,
        },
        location: {
          address: projectForm.address,
          city: projectForm.city,
          state: projectForm.state,
          zipCode: projectForm.zipCode
        },
        assignedEmployees: [user._id, ...(projectForm.assignedEmployee ? [projectForm.assignedEmployee] : [])],
        status: 'planning',
        createdBy: user._id
      };

      const projectRes = await projectsAPI.createProject(projectPayload);

      if (projectRes.success) {
        showToast("Project created successfully!", 'success');
        // Navigate back after showing toast
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        // Check for duplicate project ID
        if (projectRes.message?.includes('duplicate') || projectRes.message?.includes('exists')) {
          showToast("Project ID already exists! Please use a different ID.", 'error');
        } else {
          showToast(projectRes.message || "Failed to create project", 'error');
        }
      }

    } catch (error) {
      console.error("Submission Error:", error);
      if (error.message?.includes('duplicate') || error.message?.includes('exists')) {
        showToast("Project ID already exists! Please use a different ID.", 'error');
      } else {
        showToast(error.message || "Something went wrong", 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast.visible && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? COLORS.danger : COLORS.success
        }}>
          <Feather name={toast.type === 'error' ? 'alert-circle' : 'check-circle'} size={20} color="#fff" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </button>
        <div>
          <h1 style={styles.headerTitle}>Create Project</h1>
          <p style={styles.headerSubtitle}>New Project & Client Details</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} style={styles.scrollContainer}>
        <div style={styles.contentWrapper}>

          {/* CLIENT DETAILS SECTION */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Client Details</h2>
              <div style={styles.toggleContainer}>
                <span style={{ ...styles.toggleLabel, ...((!isNewClient) && styles.activeLabel) }}>Existing</span>
                <label style={styles.switchLabel}>
                  <input
                    type="checkbox"
                    checked={isNewClient}
                    onChange={(e) => setIsNewClient(e.target.checked)}
                    style={styles.switchInput}
                  />
                  <span style={{ ...styles.switch, ...(isNewClient && styles.switchActive) }}></span>
                </label>
                <span style={{ ...styles.toggleLabel, ...(isNewClient && styles.activeLabel) }}>New</span>
              </div>
            </div>

            {isNewClient ? (
              <div style={styles.formGroup}>
                <div style={styles.row}>
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <label style={styles.label}>First Name *</label>
                    <input
                      style={styles.input}
                      placeholder="John"
                      value={clientForm.firstName}
                      onChange={e => handleClientChange('firstName', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <label style={styles.label}>Last Name</label>
                    <input
                      style={styles.input}
                      placeholder="Doe"
                      value={clientForm.lastName}
                      onChange={e => handleClientChange('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <label style={styles.label}>Email Address *</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="client@email.com"
                  value={clientForm.email}
                  onChange={e => handleClientChange('email', e.target.value)}
                />

                <label style={styles.label}>Password *</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Enter password"
                  value={clientForm.password}
                  onChange={e => handleClientChange('password', e.target.value)}
                />

                <label style={styles.label}>Phone Number</label>
                <input
                  style={styles.input}
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={clientForm.phone}
                  onChange={e => handleClientChange('phone', e.target.value)}
                />

                <label style={styles.label}>Address</label>
                <input
                  style={styles.input}
                  placeholder="Street Address"
                  value={clientForm.address.street}
                  onChange={e => handleClientChange('street', e.target.value, 'address')}
                />
                <div style={styles.row}>
                  <input
                    style={{ ...styles.input, flex: 1, marginRight: 8 }}
                    placeholder="City"
                    value={clientForm.address.city}
                    onChange={e => handleClientChange('city', e.target.value, 'address')}
                  />
                  <input
                    style={{ ...styles.input, flex: 1, marginLeft: 8 }}
                    placeholder="State"
                    value={clientForm.address.state}
                    onChange={e => handleClientChange('state', e.target.value, 'address')}
                  />
                </div>
                <input
                  style={styles.input}
                  placeholder="Zip Code"
                  value={clientForm.address.zipCode}
                  onChange={e => handleClientChange('zipCode', e.target.value, 'address')}
                />
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Client *</label>
                <select
                  style={styles.select}
                  value={projectForm.client}
                  onChange={e => handleProjectChange('client', e.target.value)}
                >
                  <option value="">-- Select a client --</option>
                  {existingClients.map(client => (
                    <option key={client._id} value={client._id}>
                      [{client._id.slice(-6).toUpperCase()}] {client.firstName} {client.lastName} - {client.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* PROJECT DETAILS SECTION */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Project Information</h2>

            <label style={styles.label}>Project ID *</label>
            <input
              style={{ ...styles.input, fontWeight: 'bold', color: COLORS.primary }}
              placeholder="HW-00001"
              value={projectForm.projectId}
              onChange={e => handleProjectChange('projectId', e.target.value.toUpperCase())}
            />

            <label style={styles.label}>Project Title *</label>
            <input
              style={styles.input}
              placeholder="e.g. Modern Villa Renovation"
              value={projectForm.title}
              onChange={e => handleProjectChange('title', e.target.value)}
            />

            <label style={styles.label}>Project Type</label>
            <div style={styles.chipContainer}>
              {['residential', 'commercial', 'renovation'].map(type => (
                <button
                  key={type}
                  style={{
                    ...styles.typeChip,
                    ...(projectForm.projectType === type && styles.typeChipActive)
                  }}
                  onClick={() => handleProjectChange('projectType', type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <label style={styles.label}>Estimated Budget (₹) *</label>
            <input
              style={styles.input}
              type="number"
              placeholder="50000"
              value={projectForm.budget}
              onChange={e => handleProjectChange('budget', e.target.value)}
            />

            <label style={styles.label}>Location</label>
            <input
              style={{ ...styles.input, marginBottom: 8 }}
              placeholder="Street Address"
              value={projectForm.address}
              onChange={e => handleProjectChange('address', e.target.value)}
            />
            <div style={styles.row}>
              <input
                style={{ ...styles.input, flex: 1, marginRight: 8 }}
                placeholder="City"
                value={projectForm.city}
                onChange={e => handleProjectChange('city', e.target.value)}
              />
              <input
                style={{ ...styles.input, flex: 1, marginLeft: 8 }}
                placeholder="State"
                value={projectForm.state}
                onChange={e => handleProjectChange('state', e.target.value)}
              />
            </div>

            <label style={styles.label}>Start Date</label>
            <input
              style={styles.input}
              type="date"
              value={projectForm.startDate}
              onChange={e => handleProjectChange('startDate', e.target.value)}
            />

            <label style={styles.label}>Expected End Date</label>
            <input
              style={styles.input}
              type="date"
              value={projectForm.endDate}
              onChange={e => handleProjectChange('endDate', e.target.value)}
            />

            <label style={styles.label}>Assign Team Member</label>
            <select
              style={styles.select}
              value={projectForm.assignedEmployee}
              onChange={e => handleProjectChange('assignedEmployee', e.target.value)}
            >
              <option value="">-- None --</option>
              {executionTeam.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            style={{ ...styles.submitBtn, ...(isLoading && { opacity: 0.7 }) }}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>

        </div>
      </div>

      {/* Scroll to Top Button */}
      <button style={styles.scrollTopBtn} onClick={scrollToTop} title="Scroll to top">
        ↑
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
  },
  header: {
    backgroundColor: COLORS.cardBg,
    padding: '20px',
    borderBottom: `1px solid ${COLORS.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  backButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: COLORS.primary,
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '14px',
    color: COLORS.textMuted,
    margin: '4px 0 0 0',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
  },
  contentWrapper: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    paddingBottom: '40px',
  },
  section: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: COLORS.cardBg,
    borderRadius: '16px',
    border: `1px solid ${COLORS.border}`,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
  },
  toggleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toggleLabel: {
    fontSize: '12px',
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  activeLabel: {
    color: COLORS.text,
  },
  switchLabel: {
    position: 'relative',
    display: 'inline-block',
    width: '44px',
    height: '24px',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switch: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E5E5E5', // Darker toggle track for light theme
    transition: '0.3s',
    borderRadius: '24px',
    '::before': {
      content: '""',
      position: 'absolute',
      height: '18px',
      width: '18px',
      left: '3px',
      bottom: '3px',
      backgroundColor: '#fff',
      transition: '0.3s',
      borderRadius: '50%',
    },
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    color: COLORS.textMuted,
    marginBottom: '8px',
    marginTop: '4px',
    display: 'block',
  },
  input: {
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    padding: '14px 16px',
    color: COLORS.text,
    fontSize: '16px',
    marginBottom: '12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    caretColor: COLORS.primary,
  },
  select: {
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    padding: '14px 16px',
    color: COLORS.text,
    fontSize: '16px',
    marginBottom: '12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFD700' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '20px',
  },
  row: {
    display: 'flex',
    gap: '0',
    marginBottom: '0',
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textMuted,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    color: '#000',
    fontWeight: '600',
  },
  typeChip: {
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: COLORS.inputBg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textMuted,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  typeChipActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: COLORS.primary,
    color: COLORS.primary,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    padding: '18px',
    borderRadius: '12px',
    border: 'none',
    color: '#000',
    fontSize: '16px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s',
    boxShadow: `0 4px 12px ${COLORS.primary}40`,
  },
  scrollTopBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: COLORS.primary,
    color: '#000',
    border: 'none',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'all 0.2s',
    zIndex: 1000,
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    borderRadius: '50px',
    color: '#fff',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 2000,
    animation: 'slideDown 0.3s ease-out',
    minWidth: '300px',
    justifyContent: 'center',
  },
};

export default CreateProjectScreen;