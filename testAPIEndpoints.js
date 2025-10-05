require('dotenv').config({ path: './config/config.env' });
const express = require('express');
const connectDB = require('./config/db');

// Create a simple test server
const app = express();
app.use(express.json());

// Import routes
const appointmentRoutes = require('./routes/appointments');
app.use('/api/v1/appointments', appointmentRoutes);

async function testAPIEndpoints() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Start server
        const server = app.listen(5001, () => {
            console.log('🚀 Test server running on port 5001');
        });

        // Give server time to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test GET appointments endpoint
        console.log('\n📋 Testing GET /api/v1/appointments...');
        const fetch = require('node-fetch');
        
        const response = await fetch('http://localhost:5001/api/v1/appointments');
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ Fetched ${data.data.length} appointments`);
            console.log('📊 Appointment statuses:', data.data.map(apt => `${apt.reason} (${apt.status})`));
        } else {
            console.log('❌ Failed to fetch appointments:', data.error);
        }

        // Close server
        server.close();
        console.log('\n🎉 API test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testAPIEndpoints();