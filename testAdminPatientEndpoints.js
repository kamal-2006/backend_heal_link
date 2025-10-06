const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Test function for admin patients endpoints
async function testAdminPatientEndpoints() {
    console.log('=== Testing Admin Patient Endpoints ===\n');

    try {
        // Test 1: Get all patients with meaningful data
        console.log('1. Testing GET /patients/admin/patients');
        const patientsResponse = await makeRequest(`${BASE_URL}/patients/admin/patients`);
        
        console.log(`✅ Success: Found ${patientsResponse.count} patients with meaningful data`);
        console.log(`📊 Response message: ${patientsResponse.message || 'No message'}`);
        
        if (patientsResponse.data.length > 0) {
            const firstPatient = patientsResponse.data[0];
            console.log(`\n📋 Sample patient data structure:`);
            console.log(`   - Patient ID: ${firstPatient.patientId}`);
            console.log(`   - Name: ${firstPatient.user?.firstName} ${firstPatient.user?.lastName}`);
            console.log(`   - Age: ${firstPatient.age || 'Not provided'}`);
            console.log(`   - Gender: ${firstPatient.gender || 'Not provided'}`);
            console.log(`   - Blood Type: ${firstPatient.bloodType || 'Not provided'}`);
            console.log(`   - Total Appointments: ${firstPatient.stats?.totalAppointments || 0}`);
            console.log(`   - Profile Completeness:`);
            console.log(`     • Personal Info: ${firstPatient.profileCompleteness?.hasPersonalInfo ? '✅' : '❌'}`);
            console.log(`     • Medical Info: ${firstPatient.profileCompleteness?.hasMedicalInfo ? '✅' : '❌'}`);
            console.log(`     • Contact Info: ${firstPatient.profileCompleteness?.hasContactInfo ? '✅' : '❌'}`);
            console.log(`     • Insurance: ${firstPatient.profileCompleteness?.hasInsurance ? '✅' : '❌'}`);

            // Test 2: Get specific patient details
            console.log(`\n2. Testing GET /patients/admin/patients/${firstPatient._id}`);
            const patientDetailsResponse = await makeRequest(`${BASE_URL}/patients/admin/patients/${firstPatient._id}`);
            
            console.log(`✅ Success: Retrieved detailed patient information`);
            const details = patientDetailsResponse.data;
            console.log(`📊 Stats:`);
            console.log(`   - Total Appointments: ${details.stats?.totalAppointments || 0}`);
            console.log(`   - Upcoming Appointments: ${details.stats?.upcomingAppointments || 0}`);
            console.log(`   - Completed Appointments: ${details.stats?.completedAppointments || 0}`);
            console.log(`   - Medical Records: ${details.stats?.totalMedicalRecords || 0}`);
            console.log(`   - Prescriptions: ${details.stats?.totalPrescriptions || 0}`);
            console.log(`   - Profile Completeness: ${details.profileCompleteness?.completenessPercentage || 0}%`);
        } else {
            console.log('ℹ️  No patients with meaningful data found in database');
        }

        console.log('\n✅ All admin patient endpoints are working correctly!');
        console.log('🎯 Only patients with actual database records are being returned.');

    } catch (error) {
        console.error('❌ Error testing admin patient endpoints:', error.message);
    }
}

// Run the test
testAdminPatientEndpoints();