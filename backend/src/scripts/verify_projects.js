const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Project = require('../models/Project');
const User = require('../models/User');

const verifyProjects = async () => {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log('Connected to MongoDB');

        // Get last 5 projects
        const projects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('client', 'firstName lastName email')
            .populate('assignedEmployees', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email');

        log('\n--- Recent Projects ---');
        if (projects.length === 0) {
            log('No projects found.');
        } else {
            projects.forEach(p => {
                log(`\nID: ${p._id}`);
                log(`Title: ${p.title}`);
                log(`Status: ${p.status}`);
                log(`Created By: ${p.createdBy?.email} (${p.createdBy?._id})`);
                log(`Client: ${p.client?.email}`);
                log(`Assigned Employees: ${p.assignedEmployees.map(e => `${e.firstName} ${e.lastName} (${e.email}) [${e._id}]`).join(', ')}`);
                log('-----------------------');
            });
        }

        // Also list all users to verify IDs
        log('\n--- Recent Users ---');
        const users = await User.find().sort({ createdAt: -1 }).limit(10);
        users.forEach(u => {
            log(`${u.role.toUpperCase()}: ${u.email} (${u._id})`);
        });

        fs.writeFileSync('verification_result.txt', output);

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync('verification_result.txt', 'Error: ' + error.message);
    } finally {
        await mongoose.disconnect();
        log('\nDisconnected');
    }
};

verifyProjects();
