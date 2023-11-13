// home.js
console.log('Fetched teams:');
import fetchCompanyData from "../../routes/event-teams.js";

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
    // Dropdown functionality (assuming this part is working fine)
    var dropdown1 = document.getElementsByClassName("rating-button");
    var dropdown2 = document.getElementsByClassName("price-button");

    for (var i = 0; i < dropdown1.length; i++) {
      dropdown1[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var dropdownContent = this.nextElementSibling;
        if (dropdownContent.style.display === "block") {
          dropdownContent.style.display = "none";
        } else {
          dropdownContent.style.display = "block";
        }
      });
    }

    for (var i = 0; i < dropdown2.length; i++) {
      dropdown2[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var dropdownContent = this.nextElementSibling;
        if (dropdownContent.style.display === "block") {
          dropdownContent.style.display = "none";
        } else {
          dropdownContent.style.display = "block";
        }
      });
    }
  })
  .catch((error) => {
    console.error('Error fetching or processing company data:', error);
    // Handle the error as needed
  });
