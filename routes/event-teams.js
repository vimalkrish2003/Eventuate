// event-teams.js


import db from '../database/connection.js';

// Function to fetch data from the database
async function fetchCompanyData() {
  try {
   
    // Perform a database query to get company data
    const [companyData] = await db.execute('SELECT * FROM COMPANY');
   
    // Ensure that companyData is an array and has at least one item
    if (!Array.isArray(companyData) || companyData.length === 0) {
      throw new Error('No company data found');
    }

    // Generate 'teams' array dynamically based on the database results
    const teams = companyData.map((item) => ({
      img: item.compimage,
      name: item.compname,
      location: item.complocation,
      category: item.compcategory,
    }));

    // Export the dynamically generated 'teams' array
    return teams;
  } catch (error) {
    // Handle errors
    console.error('Error fetching or processing company data:', error);
    throw error; // Rethrow the error to indicate that the data fetch or processing failed
  }
}

// Export the function directly instead of invoking it
export default fetchCompanyData;
