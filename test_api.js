require("dotenv").config({ path: "./config/config.env" });
const mongoose = require("mongoose");
require("./config/db")();

setTimeout(async () => {
  try {
    const User = require("./models/User");
    const Doctor = require("./models/Doctor");

    console.log("Testing API query with different parameters...\n");

    // Test 1: Get all doctors without filters
    console.log("1. All active doctors:");
    const allDoctors = await Doctor.find({ isActive: true });
    console.log(`Found: ${allDoctors.length} doctors`);

    // Test 2: Test specialization filter - General Medicine (exists in DB)
    console.log("\n2. Doctors with General Medicine specialization:");
    const genMedDoctors = await Doctor.find({
      isActive: true,
      specialization: "General Medicine",
    });
    console.log(`Found: ${genMedDoctors.length} doctors`);
    if (genMedDoctors.length > 0) {
      console.log(
        `First doctor specialization: "${genMedDoctors[0].specialization}"`
      );
    }

    // Test 3: Test with a valid date (Monday)
    console.log("\n3. Doctors available on Monday:");
    const mondayDoctors = await Doctor.find({
      isActive: true,
      "availability.days": "Monday",
    });
    console.log(`Found: ${mondayDoctors.length} doctors available on Monday`);

    // Test 4: Test combined filters
    console.log("\n4. General Medicine doctors available on Monday:");
    const combinedDoctors = await Doctor.find({
      isActive: true,
      specialization: "General Medicine",
      "availability.days": "Monday",
    });
    console.log(`Found: ${combinedDoctors.length} doctors`);

    // Test 5: Check what specializations actually exist
    console.log("\n5. All specializations in database:");
    const allSpecs = await Doctor.distinct("specialization");
    console.log("Specializations:", allSpecs);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}, 2000);
