/**
 * Mock Data Service for Admin Dashboard
 * This file allows testing the UI without backend integration.
 * The structure matches the backend MongoDB Mongoose schemas.
 */

// Users (Employees, Vendors, Clients)
export const mockUsers = [
    // --- Employees ---
    {
        _id: 'emp001',
        firstName: 'Arjun',
        lastName: 'Sharma',
        email: 'arjun.design@houseway.com',
        role: 'employee',
        subRole: 'designTeam',
        phone: '+91 98765 43210',
        profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
        isActive: true,
        employeeDetails: {
            employeeId: 'EMP-101',
            department: 'Design',
            position: 'Senior Architect',
            hireDate: '2023-01-15',
        },
        attendance: { status: 'checked-in', todayHours: 6.5, checkInTime: '09:30 AM' }
    },
    {
        _id: 'emp002',
        firstName: 'Priya',
        lastName: 'Verma',
        email: 'priya.vendor@houseway.com',
        role: 'employee',
        subRole: 'vendorTeam',
        phone: '+91 98765 43211',
        profileImage: 'https://randomuser.me/api/portraits/women/44.jpg',
        isActive: true,
        employeeDetails: {
            employeeId: 'EMP-102',
            department: 'Procurement',
            position: 'Vendor Manager',
            hireDate: '2023-03-10',
        },
        attendance: { status: 'checked-out', todayHours: 8.0, checkInTime: '09:00 AM' }
    },
    {
        _id: 'emp003',
        firstName: 'Rohan',
        lastName: 'Singh',
        email: 'rohan.exec@houseway.com',
        role: 'employee',
        subRole: 'executionTeam',
        phone: '+91 98765 43212',
        isActive: true,
        employeeDetails: {
            employeeId: 'EMP-103',
            department: 'Execution',
            position: 'Site Supervisor',
            hireDate: '2023-06-01',
        },
        attendance: { status: 'absent', todayHours: 0 }
    },

    // --- Vendors ---
    {
        _id: 'vnd001',
        firstName: 'Rajesh',
        lastName: 'Gupta',
        email: 'rajesh.tiles@supplies.com',
        role: 'vendor',
        phone: '+91 99887 76655',
        isActive: true,
        vendorDetails: {
            companyName: 'Gupta Tiles & Marbles',
            specialization: ['Flooring', 'Tiles'],
            rating: 4.5,
            totalProjects: 12,
        }
    },
    {
        _id: 'vnd002',
        firstName: 'Suresh',
        lastName: 'Elec',
        email: 'suresh@powerfix.com',
        role: 'vendor',
        phone: '+91 99887 76656',
        isActive: true,
        vendorDetails: {
            companyName: 'PowerFix Electricals',
            specialization: ['Electrical', 'Wiring'],
            rating: 4.8,
            totalProjects: 8,
        }
    },

    // --- Clients ---
    {
        _id: 'cli001',
        firstName: 'Vikram',
        lastName: 'Malhotra',
        email: 'vikram.m@gmail.com',
        role: 'client',
        phone: '+91 88776 65544',
        isActive: true,
        clientDetails: {
            projectBudget: 5000000,
            preferredStyle: 'modern',
            propertyType: 'residential',
            clientStatus: 'active',
            priorityLevel: 'vip',
        }
    },
    {
        _id: 'cli002',
        firstName: 'Anjali',
        lastName: 'Kapoor',
        email: 'anjali.k@gmail.com',
        role: 'client',
        phone: '+91 88776 65545',
        isActive: true,
        clientDetails: {
            projectBudget: 3500000,
            preferredStyle: 'contemporary',
            propertyType: 'apartment',
            clientStatus: 'active',
            priorityLevel: 'medium',
        }
    }
];

// Projects
export const mockProjects = [
    {
        _id: 'prj001',
        projectId: 'HW-00001',
        title: 'Modern Villa Renovation',
        description: 'Complete renovation of G+1 villa with modern aesthetics.',
        client: mockUsers.find(u => u._id === 'cli001'),
        assignedEmployees: [mockUsers.find(u => u._id === 'emp001'), mockUsers.find(u => u._id === 'emp003')],
        assignedVendors: [mockUsers.find(u => u._id === 'vnd001')],
        status: 'in-progress',
        priority: 'high',
        budget: {
            estimated: 5000000,
            actual: 1200000,
            currency: 'INR'
        },
        timeline: {
            startDate: '2024-01-10',
            expectedEndDate: '2024-06-30',
        },
        progress: {
            percentage: 35,
            milestones: [
                { name: 'Design Finalization', status: 'completed', completedDate: '2024-01-25' },
                { name: 'Material Procurement', status: 'in-progress', targetDate: '2024-02-15' },
                { name: 'Flooring Installation', status: 'pending', targetDate: '2024-03-01' },
            ]
        },
        location: {
            address: 'Plot 45, Jubilee Hills',
            city: 'Hyderabad',
        }
    },
    {
        _id: 'prj002',
        projectId: 'HW-00002',
        title: 'Luxury Apartment Interior',
        description: 'Interior design for 3BHK high-rise apartment.',
        client: mockUsers.find(u => u._id === 'cli002'),
        assignedEmployees: [mockUsers.find(u => u._id === 'emp001')],
        assignedVendors: [mockUsers.find(u => u._id === 'vnd002')],
        status: 'planning',
        priority: 'medium',
        budget: {
            estimated: 3500000,
            actual: 0,
            currency: 'INR'
        },
        timeline: {
            startDate: '2024-02-15',
            expectedEndDate: '2024-05-15',
        },
        progress: {
            percentage: 10,
            milestones: [
                { name: 'Initial Concepts', status: 'completed', completedDate: '2024-02-20' },
                { name: 'Client Approval', status: 'pending', targetDate: '2024-02-28' },
            ]
        },
        location: {
            address: 'Skyline Towers, Flat 204',
            city: 'Hyderabad',
        }
    }
];

// Material Requests
export const mockMaterialRequests = [
    {
        _id: 'mr001',
        requestNumber: 'MR-1001',
        project: mockProjects[0],
        items: [
            { name: 'Italian Marble (White)', quantity: 2000, unit: 'sqft' },
            { name: 'Granite Slabs (Black)', quantity: 500, unit: 'sqft' }
        ],
        status: 'pending', // pending, approved, rejected
        priority: 'high',
        requestedBy: mockUsers.find(u => u._id === 'emp003'),
        createdAt: '2024-02-20T10:00:00Z',
    }
];

// Quotations
export const mockQuotations = [
    {
        _id: 'qt001',
        quotationNumber: 'QT-5001',
        materialRequest: mockMaterialRequests[0],
        vendor: mockUsers.find(u => u._id === 'vnd001'),
        amount: 450000,
        status: 'submitted', // submitted, approved, rejected
        submittedAt: '2024-02-21T14:30:00Z',
        items: [
            { name: 'Italian Marble (White)', price: 210, quantity: 2000, total: 420000 },
            { name: 'Granite Slabs (Black)', price: 60, quantity: 500, total: 30000 }
        ],
        negotiation: [
            { sender: 'vendor', message: 'Best price for verified quality.', time: '2024-02-21T14:35:00Z' },
            { sender: 'admin', message: 'Can you do 200/sqft for the marble?', time: '2024-02-21T15:00:00Z' },
        ]
    }
];

// Financial Stats (For Charts)
export const mockfinancialStats = {
    revenue: [
        { month: 'Jan', amount: 500000 },
        { month: 'Feb', amount: 750000 },
        { month: 'Mar', amount: 450000 },
        { month: 'Apr', amount: 900000 },
        { month: 'May', amount: 800000 },
        { month: 'Jun', amount: 1200000 },
    ],
    expenses: [
        { month: 'Jan', amount: 300000 },
        { month: 'Feb', amount: 400000 },
        { month: 'Mar', amount: 350000 },
        { month: 'Apr', amount: 500000 },
        { month: 'May', amount: 450000 },
        { month: 'Jun', amount: 600000 },
    ],
    totalRevenue: 4600000,
    totalExpenses: 2600000,
    profit: 2000000,
};

// Recent Activity
export const mockActivities = [
    { id: 1, type: 'quotation', message: 'New quotation from Gupta Tiles', time: '2 hrs ago', highlight: true },
    { id: 2, type: 'project', message: 'Project HW-00001 reached 35%', time: '4 hrs ago', highlight: false },
    { id: 3, type: 'attendance', message: 'Rohan (Execution) marked absent', time: '09:00 AM', highlight: true },
    { id: 4, type: 'payment', message: 'Payment of ₹2,00,000 received from Vikram', time: 'Yesterday', highlight: false },
];
// --- New Finance Data ---

export const mockReceivables = [
    {
        id: 'rec001',
        projectTitle: 'Project Alpha',
        clientName: 'Bajaj Finserv Ltd.',
        amount: 145000,
        dueDate: '2025-12-15',
        status: 'overdue', // overdue, due-soon, future
        daysOverdue: 5,
        history: [
            { date: '2025-11-15', action: 'Invoice Sent' },
            { date: '2025-12-16', action: 'Automated Reminder' }
        ]
    },
    {
        id: 'rec002',
        projectTitle: 'Swiggy App MVP',
        clientName: 'Swiggy Labs',
        amount: 85000,
        dueDate: '2025-12-23',
        status: 'due-soon',
        daysOverdue: 0,
        history: []
    },
    {
        id: 'rec003',
        projectTitle: 'Website Revamp',
        clientName: 'TCS Digital',
        amount: 210000,
        dueDate: '2025-12-28',
        status: 'future',
        daysOverdue: 0,
        history: []
    }
];

export const mockPayables = [
    {
        id: 'pay001',
        vendorName: 'TechEquip Ltd',
        category: 'Hardware',
        uId: 'Bill #9921',
        amount: 235000,
        dueDate: '2025-12-20',
        status: 'urgent', // urgent, standard
        approvalStatus: 'pending'
    },
    {
        id: 'pay002',
        vendorName: 'Office Rent',
        category: 'Operations',
        uId: 'Rent Dec',
        amount: 50000,
        dueDate: '2025-12-25',
        status: 'standard',
        approvalStatus: 'scheduled'
    },
    {
        id: 'pay003',
        vendorName: 'Steel India',
        category: 'Materials',
        uId: 'Inv-882',
        amount: 120000,
        dueDate: '2026-01-05',
        status: 'standard',
        approvalStatus: 'pending'
    }
];

export const mockInvoices = [
    {
        id: 'inv0045',
        clientName: 'Coca Cola',
        amount: 1200,
        date: 'Dec 19, 2025',
        status: 'draft' // draft, sent, paid
    },
    {
        id: 'inv0044',
        clientName: 'Pepsi Co',
        amount: 50000,
        date: 'Dec 18, 2025',
        status: 'paid'
    },
    {
        id: 'inv0043',
        clientName: 'Local Shop',
        amount: 15000,
        date: 'Dec 10, 2025',
        status: 'sent'
    }
];

export const mockPurchaseOrders = [
    {
        id: 'po789',
        poNumber: 'PO-789',
        vendorName: 'TechEquip',
        items: 'Server Racks (x2)',
        amount: 235000,
        status: 'arriving', // ordered, shipped, arriving, delivered
        eta: 'Today'
    },
    {
        id: 'po788',
        poNumber: 'PO-788',
        vendorName: 'Steel India',
        items: 'Construction Steel',
        amount: 400000,
        status: 'delivered',
        eta: 'Delivered'
    }
];
