/**
 * Comprehensive Seed Script for Houseway Platform
 * Creates a large dataset for testing all features
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../src/models/User');
const Project = require('../src/models/Project');
const MaterialRequest = require('../src/models/MaterialRequest');
const Quotation = require('../src/models/Quotation');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const NegotiationMessage = require('../src/models/NegotiationMessage');
const VendorInvoice = require('../src/models/VendorInvoice');
const ClientInvoice = require('../src/models/ClientInvoice');
const Attendance = require('../src/models/Attendance');
const Task = require('../src/models/Task');
const File = require('../src/models/File');
const WorkStatus = require('../src/models/WorkStatus');

// Helper functions
const generateId = (prefix, index) => `${prefix}-${String(index).padStart(4, '0')}`;

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Seed data
async function seedHugeDataset() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      MaterialRequest.deleteMany({}),
      Quotation.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      NegotiationMessage.deleteMany({}),
      VendorInvoice.deleteMany({}),
      ClientInvoice.deleteMany({}),
      Attendance.deleteMany({}),
      Task.deleteMany({}),
      File.deleteMany({}),
      WorkStatus.deleteMany({}),
    ]);
    console.log('✅ Cleared existing data');

    // ============= USERS =============
    console.log('👥 Creating users...');
    // Don't hash password here - User model will hash it automatically
    const plainPassword = 'password123';

    // 1 Owner
    const owner = await User.create({
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'owner@houseway.com',
      password: plainPassword,
      role: 'owner',
      approvedByAdmin: true,
      phone: '+91-9876543210',
      isActive: true,
    });

    // 15 Employees (5 design, 5 vendor team, 5 execution)
    const employees = [];
    const employeeTypes = [
      { subRole: 'designTeam', count: 5, dept: 'Design' },
      { subRole: 'vendorTeam', count: 5, dept: 'Vendor Management' },
      { subRole: 'executionTeam', count: 5, dept: 'Execution' },
    ];

    for (const type of employeeTypes) {
      for (let i = 1; i <= type.count; i++) {
        const emp = await User.create({
          firstName: `Employee${type.subRole}`,
          lastName: `${i}`,
          email: `employee.${type.subRole.toLowerCase()}.${i}@houseway.com`,
          password: plainPassword,
          role: 'employee',
          subRole: type.subRole,
          approvedByAdmin: true,
          phone: `+91-98765432${10 + employees.length}`,
          employeeDetails: {
            employeeId: generateId('EMP', employees.length + 1),
            department: type.dept,
            position: i === 1 ? 'Team Lead' : 'Team Member',
            hireDate: getRandomDate(new Date('2023-01-01'), new Date('2024-01-01')),
            skills: ['Project Management', 'Communication', 'Problem Solving'],
          },
          isActive: true,
        });
        employees.push(emp);
      }
    }

    // 20 Vendors (different specializations)
    const vendors = [];
    const specializations = [
      ['Electrical', 'Plumbing'],
      ['Carpentry', 'Furniture'],
      ['Painting', 'Waterproofing'],
      ['Flooring', 'Tiling'],
      ['HVAC', 'Ventilation'],
    ];

    for (let i = 1; i <= 20; i++) {
      const spec = specializations[i % specializations.length];
      const vendor = await User.create({
        firstName: `Vendor`,
        lastName: `${i}`,
        email: `vendor${i}@company.com`,
        password: plainPassword,
        role: 'vendor',
        approvedByAdmin: true,
        phone: `+91-98765${String(i).padStart(5, '0')}`,
        vendorDetails: {
          companyName: `${spec[0]} Solutions Pvt Ltd`,
          businessLicense: `BL-${generateId('VND', i)}`,
          specialization: spec,
          rating: 3 + Math.random() * 2, // 3-5 rating
          totalProjects: Math.floor(Math.random() * 50),
        },
        isActive: true,
      });
      vendors.push(vendor);
    }

    // 30 Clients
    const clients = [];
    const propertyTypes = ['apartment', 'villa', 'office', 'retail'];
    const styles = ['modern', 'traditional', 'minimalist', 'luxury'];

    for (let i = 1; i <= 30; i++) {
      const client = await User.create({
        firstName: `Client`,
        lastName: `${i}`,
        email: `client${i}@example.com`,
        password: plainPassword,
        role: 'client',
        clientId: generateId('CLI', i),
        approvedByAdmin: true,
        phone: `+91-98${String(i).padStart(8, '0')}`,
        clientDetails: {
          projectBudget: 500000 + Math.random() * 4500000, // 5L to 50L
          preferredStyle: getRandomElement(styles),
          propertyType: getRandomElement(propertyTypes),
        },
        address: {
          city: getRandomElement(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad']),
          state: getRandomElement(['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana']),
          zipCode: `5000${String(i).padStart(2, '0')}`,
          country: 'India',
        },
        isActive: true,
      });
      clients.push(client);
    }

    // 5 Guest users
    const guests = [];
    for (let i = 1; i <= 5; i++) {
      const guest = await User.create({
        firstName: `Guest`,
        lastName: `${i}`,
        email: `guest${i}@example.com`,
        password: plainPassword,
        role: 'guest',
        approvedByAdmin: true,
        phone: `+91-90000000${i}`,
        isActive: true,
      });
      guests.push(guest);
    }

    console.log(`✅ Created ${1 + employees.length + vendors.length + clients.length + guests.length} users`);

    // ============= PROJECTS =============
    console.log('🏗️  Creating projects...');
    const projects = [];
    const statuses = ['planning', 'in-progress', 'on-hold', 'completed'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    const projectTypes = ['residential', 'commercial', 'industrial', 'renovation', 'interior'];
    
    for (let i = 1; i <= 50; i++) {
      const client = clients[i % clients.length];
      const status = getRandomElement(statuses);
      const startDate = getRandomDate(new Date('2024-01-01'), new Date('2024-11-01'));
      const designEmployee = employees[i % 5]; // Design team employee
      
      const project = await Project.create({
        projectId: generateId('PRJ', i),
        title: `${client.clientDetails.propertyType} Interior Design - ${i}`,
        description: `Complete interior design and renovation project for ${client.clientDetails.propertyType}. Style: ${client.clientDetails.preferredStyle}.`,
        client: client._id,
        createdBy: owner._id, // Owner creates projects
        projectType: getRandomElement(projectTypes),
        assignedEmployees: [
          designEmployee._id, // Design team
          employees[5 + (i % 5)]._id, // Vendor team
          employees[10 + (i % 5)]._id, // Execution team
        ],
        // Note: Vendors are NOT pre-assigned. They should only be assigned 
        // when there is a material requirement (via material requests flow)
        assignedVendors: [],
        status,
        priority: getRandomElement(priorities),
        budget: {
          estimated: 300000 + Math.random() * 2700000,
          actual: status === 'completed' ? 300000 + Math.random() * 2700000 : Math.random() * 1000000,
          currency: 'INR',
        },
        timeline: {
          startDate,
          expectedEndDate: addDays(startDate, 90 + Math.random() * 90),
          actualEndDate: status === 'completed' ? addDays(startDate, 100 + Math.random() * 80) : null,
        },
        location: {
          address: `${i}, Main Street`,
          city: client.address.city,
          state: client.address.state,
          zipCode: client.address.zipCode,
          country: 'India',
        },
        installments: [
          {
            title: '1st Installment (Advance)',
            amount: client.clientDetails.projectBudget * 0.3,
            dueDate: startDate,
            status: status !== 'planning' ? 'paid' : 'pending',
            paidDate: status !== 'planning' ? startDate : null,
          },
          {
            title: '2nd Installment (Mid-Progress)',
            amount: client.clientDetails.projectBudget * 0.3,
            dueDate: addDays(startDate, 45),
            status: status === 'completed' || status === 'in-progress' ? 'paid' : 'pending',
            paidDate: status === 'completed' || status === 'in-progress' ? addDays(startDate, 45) : null,
          },
          {
            title: '3rd Installment (Final)',
            amount: client.clientDetails.projectBudget * 0.4,
            dueDate: addDays(startDate, 90),
            status: status === 'completed' ? 'paid' : 'pending',
            paidDate: status === 'completed' ? addDays(startDate, 90) : null,
          },
        ],
        images: [
          {
            url: `/uploads/images/project-${i}-1.jpg`,
            name: `Design mockup ${i}`,
            type: 'design',
            uploadedBy: designEmployee._id,
            uploadedAt: startDate,
          },
          {
            url: `/uploads/images/project-${i}-2.jpg`,
            name: `Site photo ${i}`,
            type: 'progress',
            uploadedBy: designEmployee._id,
            uploadedAt: addDays(startDate, 10),
          },
        ],
        documents: [
          {
            url: `/uploads/documents/project-${i}-contract.pdf`,
            name: `Contract Document`,
            type: 'contract',
            uploadedBy: owner._id,
            uploadedAt: startDate,
          },
        ],
      });
      projects.push(project);
    }

    console.log(`✅ Created ${projects.length} projects`);

    // ============= MATERIAL REQUESTS =============
    console.log('📦 Creating material requests...');
    const materialRequests = [];
    const materials = [
      { name: 'Cement', category: 'cement', unit: 'kg' },
      { name: 'Steel Bars', category: 'steel', unit: 'kg' },
      { name: 'Tiles', category: 'tiles', unit: 'sqft' },
      { name: 'Paint', category: 'paint', unit: 'liters' },
      { name: 'Electrical Wiring', category: 'electrical', unit: 'meters' },
      { name: 'PVC Pipes', category: 'plumbing', unit: 'meters' },
      { name: 'Door Hardware', category: 'hardware', unit: 'pcs' },
      { name: 'Wooden Planks', category: 'wood', unit: 'pcs' },
    ];

    for (let i = 0; i < 100; i++) {
      const project = projects[i % projects.length];
      const requestedBy = project.assignedEmployees[0];
      const material = materials[i % materials.length];

      const randomStatus = getRandomElement(['pending', 'approved', 'rejected', 'partially_fulfilled', 'fulfilled']);
      const mr = await MaterialRequest.create({
        project: project._id,
        requestedBy,
        title: `${material.name} for ${project.title}`,
        description: `Requesting ${material.name} for project execution`,
        status: randomStatus,
        priority: getRandomElement(priorities),
        // Assign vendor for approved/fulfilled requests (simulates vendor acceptance)
        assignedVendors: ['approved', 'fulfilled', 'partially_fulfilled'].includes(randomStatus) ? [
          {
            vendor: vendors[i % vendors.length]._id,
            assignedAt: addDays(new Date(), -10),
            assignedBy: vendors[i % vendors.length]._id,
          }
        ] : [],
        materials: [
          {
            name: material.name,
            description: `High quality ${material.name}`,
            quantity: 50 + Math.random() * 450,
            unit: material.unit,
            category: material.category,
            estimatedCost: 10000 + Math.random() * 90000,
            priority: getRandomElement(priorities),
            requiredBy: addDays(new Date(), 10 + Math.random() * 20),
            specifications: {
              brand: getRandomElement(['Brand A', 'Brand B', 'Premium Brand']),
              grade: getRandomElement(['Standard', 'Premium', 'Economy']),
            },
          },
        ],
        urgency: getRandomElement(['low', 'medium', 'high']),
        estimatedTotalCost: 10000 + Math.random() * 90000,
        requiredBy: addDays(new Date(), 10 + Math.random() * 20),
      });
      materialRequests.push(mr);
    }

    console.log(`✅ Created ${materialRequests.length} material requests`);

    // ============= QUOTATIONS =============
    console.log('💰 Creating quotations...');
    const quotations = [];

    for (let i = 0; i < 150; i++) {
      const mr = materialRequests[i % materialRequests.length];
      const vendor = vendors[i % vendors.length];
      const material = mr.materials[0];

      const quotation = await Quotation.create({
        materialRequest: mr._id,
        vendor: vendor._id,
        quotationNumber: generateId('QUO', i + 1),
        title: `Quotation for ${mr.title}`,
        description: `Detailed quotation from ${vendor.vendorDetails.companyName}`,
        status: getRandomElement(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired']),
        items: [
          {
            materialRequestItem: material._id,
            materialName: material.name,
            description: material.description,
            quantity: material.quantity,
            unit: material.unit,
            unitPrice: 100 + Math.random() * 900,
            totalPrice: material.quantity * (100 + Math.random() * 900),
            specifications: material.specifications,
            availability: {
              inStock: Math.random() > 0.3,
              deliveryTime: Math.floor(5 + Math.random() * 15),
              minimumOrderQuantity: 1,
            },
          },
        ],
        subtotal: material.quantity * (100 + Math.random() * 900),
        tax: {
          percentage: 18,
          amount: material.quantity * (100 + Math.random() * 900) * 0.18,
        },
        totalAmount: material.quantity * (100 + Math.random() * 900) * 1.18,
        validUntil: addDays(new Date(), 30),
        paymentTerms: {
          paymentMethod: getRandomElement(['bank_transfer', 'cash', 'check', 'advance']),
          advancePercentage: 30,
          creditDays: 15,
        },
        deliveryTerms: {
          deliveryTime: Math.floor(5 + Math.random() * 15),
          deliveryLocation: 'Project Site Address',
          deliveryCharges: 500 + Math.random() * 1500,
        },
      });
      quotations.push(quotation);
    }

    console.log(`✅ Created ${quotations.length} quotations`);

    // ============= PURCHASE ORDERS (NEW WORKFLOW) =============
    console.log('📝 Creating purchase orders with negotiation flow...');
    const purchaseOrders = [];
    const negotiationMessages = [];
    const vendorInvoices = [];
    
    // Get material requests with assigned vendors (simulating vendor acceptance)
    const assignedMaterialRequests = materialRequests.filter(mr => mr.assignedVendors.length > 0).slice(0, 60);

    for (let i = 0; i < assignedMaterialRequests.length; i++) {
      const mr = assignedMaterialRequests[i];
      const vendor = vendors.find(v => v._id.equals(mr.assignedVendors[0].vendor));
      const project = projects.find(p => p._id.equals(mr.project));
      
      // Create Purchase Order (created when vendor accepts material request)
      // Map material request items to purchase order items format
      const poItems = (mr.materials || []).map(material => ({
        materialName: material.name,
        description: material.description || '',
        quantity: material.quantity,
        unit: material.unit,
        unitPrice: 0,
        totalPrice: 0,
      }));

      const po = await PurchaseOrder.create({
        materialRequest: mr._id,
        project: project._id,
        vendor: vendor._id,
        createdBy: owner._id,
        purchaseOrderNumber: generateId('PO', i + 1),
        title: `Purchase Order for ${mr.title}`,
        description: mr.description || 'Purchase order for material procurement',
        items: poItems,
        status: i < 10 ? 'draft' : i < 30 ? 'accepted' : i < 45 ? 'in_progress' : 'completed',
        negotiation: {
          isActive: i < 30, // First 30 are still negotiating or just accepted
          startedAt: addDays(new Date(), -10),
          chatClosed: i >= 30, // After 30, chats are closed (delivery details submitted)
          chatClosedAt: i >= 30 ? addDays(new Date(), -5) : null,
          lastMessageAt: addDays(new Date(), -2),
        },
        orderDate: addDays(new Date(), -10),
        expectedDeliveryDate: addDays(new Date(), 15),
      });
      purchaseOrders.push(po);

      // Scenario 1: Draft POs (i < 10) - Just created, vendor hasn't submitted quotation yet
      // No messages needed
      
      // Scenario 2: Accepted POs (10 <= i < 30) - Quotation submitted and accepted, awaiting delivery
      if (i >= 10 && i < 30) {
        // Initial quotation message from vendor
        const quotationMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: vendor._id,
          senderRole: 'vendor',
          messageType: 'quotation',
          content: `Initial quotation for ${mr.title}`,
          quotation: {
            amount: 50000 + Math.random() * 200000,
            currency: 'INR',
            note: 'Best quality materials with warranty',
            status: 'accepted',
            items: poItems,
            validUntil: addDays(new Date(), 30),
          },
          createdAt: addDays(new Date(), -8),
        });
        negotiationMessages.push(quotationMsg);

        // Some back-and-forth messages
        if (i % 3 === 0) {
          const counterMsg = await NegotiationMessage.create({
            purchaseOrder: po._id,
            sender: owner._id,
            senderRole: 'owner',
            messageType: 'text',
            content: 'Can you reduce the price by 10%?',
            createdAt: addDays(new Date(), -7),
          });
          negotiationMessages.push(counterMsg);

          const revisedQuotationMsg = await NegotiationMessage.create({
            purchaseOrder: po._id,
            sender: vendor._id,
            senderRole: 'vendor',
            messageType: 'quotation',
            content: 'Revised quotation with discount',
            quotation: {
              amount: quotationMsg.quotation.amount * 0.92,
              currency: 'INR',
              note: 'Revised quote with 8% discount',
              status: 'accepted',
              items: poItems,
              validUntil: addDays(new Date(), 30),
              inResponseTo: quotationMsg._id,
            },
            createdAt: addDays(new Date(), -6),
          });
          negotiationMessages.push(revisedQuotationMsg);
        }

        // Acceptance system message
        const acceptanceMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: owner._id,
          senderRole: 'owner',
          messageType: 'system',
          content: 'Quotation accepted. Awaiting delivery details from vendor.',
          systemEvent: 'quotation_accepted',
          createdAt: addDays(new Date(), -5),
        });
        negotiationMessages.push(acceptanceMsg);

        // Delivery prompt message
        const deliveryPromptMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: owner._id,
          senderRole: 'system',
          messageType: 'system',
          content: 'Please submit delivery details to proceed with the order.',
          systemEvent: 'delivery_details_required',
          createdAt: addDays(new Date(), -5),
        });
        negotiationMessages.push(deliveryPromptMsg);

        // Update PO with accepted quotation
        po.negotiation.acceptedQuotationMessage = quotationMsg._id;
        po.negotiation.finalAmount = quotationMsg.quotation.amount;
        await po.save();
      }

      // Scenario 3: In Progress/Completed POs (i >= 30) - Full workflow completed
      if (i >= 30) {
        // Quotation message
        const quotationMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: vendor._id,
          senderRole: 'vendor',
          messageType: 'quotation',
          content: `Quotation for ${mr.title}`,
          quotation: {
            amount: 50000 + Math.random() * 200000,
            currency: 'INR',
            note: 'Premium quality materials',
            status: 'accepted',
            items: poItems,
            validUntil: addDays(new Date(), 30),
          },
          createdAt: addDays(new Date(), -15),
        });
        negotiationMessages.push(quotationMsg);

        // Acceptance messages
        const acceptanceMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: owner._id,
          senderRole: 'owner',
          messageType: 'system',
          content: 'Quotation accepted. Awaiting delivery details from vendor.',
          systemEvent: 'quotation_accepted',
          createdAt: addDays(new Date(), -12),
        });
        negotiationMessages.push(acceptanceMsg);

        // Delivery details message
        const deliveryMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: vendor._id,
          senderRole: 'vendor',
          messageType: 'delivery',
          content: 'Delivery details submitted',
          delivery: {
            estimatedDeliveryDate: addDays(new Date(), 10),
            trackingNumber: `TRACK-${generateId('', i + 1000)}`,
            carrier: getRandomElement(['FedEx', 'DHL', 'Blue Dart', 'DTDC']),
            notes: 'Standard shipping, signature required',
          },
          createdAt: addDays(new Date(), -10),
        });
        negotiationMessages.push(deliveryMsg);

        // Create Vendor Invoice
        const invoice = await VendorInvoice.create({
          invoiceNumber: generateId('VINV', i + 1),
          purchaseOrder: po._id,
          project: project._id,
          vendor: vendor._id,
          acceptedQuotation: quotationMsg._id,
          title: `Invoice for ${mr.title}`,
          description: quotationMsg.quotation.note,
          items: poItems,
          subtotal: quotationMsg.quotation.amount,
          totalAmount: quotationMsg.quotation.amount,
          currency: 'INR',
          status: i >= 45 ? 'paid' : 'pending',
          createdBy: vendor._id,
          dueDate: addDays(new Date(), 30),
          paidAt: i >= 45 ? addDays(new Date(), -3) : null,
        });
        vendorInvoices.push(invoice);

        // Invoice message in chat
        const invoiceMsg = await NegotiationMessage.create({
          purchaseOrder: po._id,
          sender: vendor._id,
          senderRole: 'system',
          messageType: 'invoice',
          content: `Invoice generated: ${invoice.invoiceNumber}`,
          invoice: {
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            status: invoice.status,
          },
          createdAt: addDays(new Date(), -10),
        });
        negotiationMessages.push(invoiceMsg);

        // Update PO
        po.negotiation.acceptedQuotationMessage = quotationMsg._id;
        po.negotiation.finalAmount = quotationMsg.quotation.amount;
        po.deliveryTracking = {
          status: i >= 45 ? 'delivered' : 'processing',
          trackingNumber: deliveryMsg.delivery.trackingNumber,
          carrier: deliveryMsg.delivery.carrier,
          expectedDeliveryDate: deliveryMsg.delivery.estimatedDeliveryDate,
          notes: deliveryMsg.delivery.notes,
          updatedAt: addDays(new Date(), -8),
          updatedBy: vendor._id,
        };
        await po.save();
      }
    }

    console.log(`✅ Created ${purchaseOrders.length} purchase orders`);
    console.log(`✅ Created ${negotiationMessages.length} negotiation messages`);
    console.log(`✅ Created ${vendorInvoices.length} vendor invoices`);

    // ============= WORK STATUS UPDATES =============
    console.log('🔄 Creating work status updates...');
    const workStatuses = [];

    for (let i = 0; i < 100; i++) {
      const quotation = quotations[i % quotations.length];
      
      const ws = await WorkStatus.create({
        quotation: quotation._id,
        materialRequest: quotation.materialRequest,
        vendor: quotation.vendor,
        message: `Work progress update ${i + 1}: ${getRandomElement([
          'Materials delivered on site',
          'Installation in progress',
          'Quality check completed',
          'Partial delivery received',
          'Work completed successfully',
        ])}`,
        progress: Math.floor(Math.random() * 100),
      });
      workStatuses.push(ws);
    }

    console.log(`✅ Created ${workStatuses.length} work status updates`);

    // ============= CLIENT INVOICES =============
    console.log('💳 Creating client invoices...');
    const clientInvoices = [];

    for (let i = 0; i < 60; i++) {
      const project = projects[i % projects.length];
      
      const invoice = await ClientInvoice.create({
        invoiceNumber: generateId('INV', i + 1),
        clientId: project.client,
        projectId: project._id,
        createdBy: owner._id,
        lineItems: [
          {
            description: 'Design Consultation',
            quantity: 1,
            unitPrice: 50000,
            total: 50000,
            category: 'consulting',
            taxable: true,
          },
          {
            description: 'Material Cost',
            quantity: 1,
            unitPrice: project.budget.estimated * 0.6,
            total: project.budget.estimated * 0.6,
            category: 'materials',
            taxable: true,
          },
          {
            description: 'Labor Cost',
            quantity: 1,
            unitPrice: project.budget.estimated * 0.3,
            total: project.budget.estimated * 0.3,
            category: 'labor',
            taxable: true,
          },
        ],
        subtotal: project.budget.estimated * 0.9 + 50000,
        taxRate: 18,
        taxAmount: (project.budget.estimated * 0.9 + 50000) * 0.18,
        totalAmount: (project.budget.estimated * 0.9 + 50000) * 1.18,
        status: getRandomElement(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']),
        issueDate: getRandomDate(project.timeline.startDate, new Date()),
        dueDate: addDays(new Date(), 30),
        paymentMethod: 'bank_transfer',
        paymentTerms: 'Payment due within 30 days. Late fees of 2% will apply after due date.',
      });
      clientInvoices.push(invoice);
    }

    console.log(`✅ Created ${clientInvoices.length} client invoices`);

    // ============= ATTENDANCE =============
    console.log('📅 Creating attendance records...');
    const attendanceRecords = [];
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    });

    for (const employee of employees) {
      for (const date of last30Days) {
        // 80% attendance rate
        if (Math.random() < 0.8) {
          const checkInTime = new Date(date);
          checkInTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
          
          const checkOutTime = new Date(checkInTime);
          checkOutTime.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
          
          const totalMinutes = (checkOutTime - checkInTime) / 60000;

          const attendance = await Attendance.create({
            user: employee._id,
            date,
            checkInTime,
            checkOutTime,
            totalActiveMinutes: totalMinutes,
            isCheckedIn: false,
          });
          attendanceRecords.push(attendance);
        }
      }
    }

    console.log(`✅ Created ${attendanceRecords.length} attendance records`);

    // ============= TASKS =============
    console.log('✅ Creating tasks...');
    const tasks = [];
    const taskTypes = [
      'Client Meeting',
      'Site Inspection',
      'Material Procurement',
      'Design Review',
      'Vendor Coordination',
      'Quality Check',
      'Payment Follow-up',
    ];

    for (let i = 0; i < 200; i++) {
      const project = projects[i % projects.length];
      const assignedTo = project.assignedEmployees[i % project.assignedEmployees.length];
      const taskDate = addDays(new Date(), -10 + Math.random() * 30);

      const task = await Task.create({
        projectId: project._id,
        taskName: `${getRandomElement(taskTypes)} - ${project.title}`,
        taskDescription: `Important task for project ${project.projectId}`,
        date: taskDate,
        time: `${String(9 + Math.floor(Math.random() * 8)).padStart(2, '0')}:00`,
        status: getRandomElement(['pending', 'in-progress', 'completed', 'cancelled']),
        priority: getRandomElement(['low', 'medium', 'high']),
        assignedTo,
        createdBy: project.assignedEmployees[0],
        notifyBefore: 30,
      });
      tasks.push(task);
    }

    console.log(`✅ Created ${tasks.length} tasks`);

    // ============= FILES =============
    console.log('📁 Creating file records...');
    const files = [];
    const fileCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update', 'invoices'];

    for (let i = 0; i < 300; i++) {
      const project = projects[i % projects.length];
      const category = getRandomElement(fileCategories);
      const uploader = project.assignedEmployees[i % project.assignedEmployees.length];

      const file = await File.create({
        filename: `file-${i + 1}.${category === 'images' ? 'jpg' : 'pdf'}`,
        originalName: `${category}-document-${i + 1}.${category === 'images' ? 'jpg' : 'pdf'}`,
        category,
        mimeType: category === 'images' ? 'image/jpeg' : 'application/pdf',
        size: 50000 + Math.random() * 950000,
        path: `/uploads/${category}/file-${i + 1}.${category === 'images' ? 'jpg' : 'pdf'}`,
        uploadedBy: uploader,
        project: project._id,
        tags: [category, project.projectId],
      });
      files.push(file);
    }

    console.log(`✅ Created ${files.length} file records`);

    // Summary
    console.log('\n🎉 ============= SEED COMPLETED =============');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${1 + employees.length + vendors.length + clients.length + guests.length}`);
    console.log(`     • Owner: 1`);
    console.log(`     • Employees: ${employees.length}`);
    console.log(`     • Vendors: ${vendors.length}`);
    console.log(`     • Clients: ${clients.length}`);
    console.log(`     • Guests: ${guests.length}`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Material Requests: ${materialRequests.length}`);
    console.log(`   - Quotations: ${quotations.length}`);
    console.log(`   - Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   - Work Status Updates: ${workStatuses.length}`);
    console.log(`   - Client Invoices: ${clientInvoices.length}`);
    console.log(`   - Attendance Records: ${attendanceRecords.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Files: ${files.length}`);
    console.log(`\n✅ Total records created: ${
      1 + employees.length + vendors.length + clients.length + guests.length +
      projects.length + materialRequests.length + quotations.length +
      purchaseOrders.length + workStatuses.length + clientInvoices.length +
      attendanceRecords.length + tasks.length + files.length
    }`);

    console.log('\n🔐 Test Credentials:');
    console.log(`   Owner: owner@houseway.com / password123`);
    console.log(`   Employee (Design): employee.designteam.1@houseway.com / password123`);
    console.log(`   Employee (Vendor Team): employee.vendorteam.1@houseway.com / password123`);
    console.log(`   Employee (Execution): employee.executionteam.1@houseway.com / password123`);
    console.log(`   Vendor: vendor1@company.com / password123`);
    console.log(`   Client: client1@example.com / password123`);
    console.log(`   Guest: guest1@example.com / password123`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seed
if (require.main === module) {
  seedHugeDataset()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedHugeDataset;
