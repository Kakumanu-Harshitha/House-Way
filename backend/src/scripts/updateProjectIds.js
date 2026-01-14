const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
// Fallback if .env is in parent directory
if (!process.env.MONGODB_URI) {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}
const Project = require('../models/Project');

async function updateProjectIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all projects without a projectId
        const projects = await Project.find({
            $or: [
                { projectId: { $exists: false } },
                { projectId: null },
                { projectId: '' }
            ]
        });

        console.log(`Found ${projects.length} projects without projectId`);

        // Find the highest existing projectId to continue from there
        const lastProject = await Project.findOne({
            projectId: { $exists: true, $ne: null, $regex: /^HW-\d+$/ }
        }).sort({ projectId: -1 }).select('projectId');

        let nextNum = 1;
        if (lastProject && lastProject.projectId) {
            const match = lastProject.projectId.match(/HW-(\d+)/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }

        console.log(`Starting from HW-${String(nextNum).padStart(5, '0')}`);

        // Update each project
        for (const project of projects) {
            const newProjectId = `HW-${String(nextNum).padStart(5, '0')}`;
            await Project.updateOne(
                { _id: project._id },
                { $set: { projectId: newProjectId } }
            );
            console.log(`Updated: "${project.title}" -> ${newProjectId}`);
            nextNum++;
        }

        console.log('Done! All projects now have IDs.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

updateProjectIds();
