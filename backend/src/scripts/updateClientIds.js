/**
 * Script to update existing clients that don't have a clientId assigned.
 * Run this once to backfill clientIds for existing clients.
 * 
 * Usage: node updateClientIds.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const updateClientIds = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/houseway';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Find all clients without a clientId
        const clientsWithoutId = await User.find({
            role: 'client',
            clientId: { $exists: false }
        }).select('_id firstName lastName email');

        // Also find clients where clientId is null or empty
        const clientsWithNullId = await User.find({
            role: 'client',
            clientId: null
        }).select('_id firstName lastName email');

        const clientsWithEmptyId = await User.find({
            role: 'client',
            clientId: ''
        }).select('_id firstName lastName email');

        const allClientsToUpdate = [...clientsWithoutId, ...clientsWithNullId, ...clientsWithEmptyId];

        // Remove duplicates
        const uniqueClients = [...new Map(allClientsToUpdate.map(c => [c._id.toString(), c])).values()];

        console.log(`Found ${uniqueClients.length} clients without clientId`);

        if (uniqueClients.length === 0) {
            console.log('All clients already have clientIds assigned.');
            await mongoose.disconnect();
            return;
        }

        // Find the highest existing clientId
        const lastClient = await User.findOne({
            clientId: { $exists: true, $ne: null, $regex: /^CLT-\d+$/ }
        })
            .sort({ clientId: -1 })
            .select('clientId');

        let nextNumber = 1;
        if (lastClient && lastClient.clientId) {
            const match = lastClient.clientId.match(/CLT-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }

        console.log(`Starting clientId generation from CLT-${String(nextNumber).padStart(5, '0')}`);

        // Update each client
        for (const client of uniqueClients) {
            const newClientId = `CLT-${String(nextNumber).padStart(5, '0')}`;

            await User.findByIdAndUpdate(client._id, { clientId: newClientId });

            console.log(`✅ Updated client "${client.firstName} ${client.lastName}" (${client.email}) with clientId: ${newClientId}`);

            nextNumber++;
        }

        console.log(`\n✅ Successfully updated ${uniqueClients.length} clients with clientIds`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error updating clientIds:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

updateClientIds();
