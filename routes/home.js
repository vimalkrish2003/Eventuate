// home.js

import fetchCompanyData from "../routes/event-teams.js";

// Function to render cards in the main grid
function renderCards(teams) {
  let cardHTML = '';

  teams.forEach((team) => {
    cardHTML += `
      <div class="main-card">
        <div>
          <img class="main-card-img" src="${team.img}" alt="">
        </div>
        <div class="team-info">
          <div class="team-name">${team.name}</div>
          <p>Location: ${team.location}</p>
          <p>Category: ${team.category}</p>
        </div>
      </div>
    `;
  });

  document.querySelector('.main-card-grid').innerHTML = cardHTML;
}

// Fetch company data and handle the promise
fetchCompanyData()
  .then((teams) => {
    renderCards(teams);
    console.log('Fetched teams:', teams);
  })
  .catch((error) => {
    console.error('Error fetching or processing company data:', error);
    // Handle the error as needed
  });
