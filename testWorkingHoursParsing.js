// Test the working hours parsing logic
const workingHours = "Mon-Fri:10:30-11:30";

console.log('Original working hours:', workingHours);

// Fixed parsing logic
const days = [];

// Extract day information
if (workingHours.includes('Mon-Fri') || workingHours.includes('Monday-Friday')) {
    days.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
}
if (workingHours.includes('Sat')) days.push('Saturday');
if (workingHours.includes('Sun')) days.push('Sunday');

console.log('Parsed days:', days);

// Extract time information - split by the first colon to handle time format with colons
const timeSlots = [];
const colonIndex = workingHours.indexOf(':');
if (colonIndex !== -1) {
    const timeMatch = workingHours.substring(colonIndex + 1).trim();
    console.log('Time match:', timeMatch);
    
    if (timeMatch && timeMatch.includes('-')) {
        const [startTime, endTime] = timeMatch.split('-');
        if (startTime && endTime) {
            timeSlots.push({
                startTime: startTime.trim(),
                endTime: endTime.trim()
            });
        }
    }
}

console.log('Parsed timeSlots:', timeSlots);

const availabilityData = {
    days,
    timeSlots
};

console.log('Final availability data:', JSON.stringify(availabilityData, null, 2));