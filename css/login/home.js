import { teams } from "./event-teams.js";


//Code for cards in main grid
let cardHTML = '';

teams.forEach((team)=> {

  cardHTML = `
  <div class="main-card">

   <div>
      <img class="main-card-img" src="${team.img}" alt="">
   </div>

   <div class="team-info">
     <p class="team-name">${team.name}</p>
     

     <p>Rating: ${team.rating}&#11088;</p>

     <p>Location: ${team.location}</p>
     <p>Category: ${team.category}</p>
    </div>

  </div>
  `
  document.querySelector('.main-card-grid').innerHTML += cardHTML;


});

var dropdown1 = document.getElementsByClassName("rating-button");
var dropdown2 = document.getElementsByClassName("price-button");
var i;

for (i = 0; i < dropdown1.length; i++) {
  dropdown1[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var dropdownContent = this.nextElementSibling;
    if (dropdownContent.style.display === "block") {
      dropdownContent.style.display = "none";
    } else {
      dropdownContent.style.display = "block";
    }
  });
}

for (i = 0; i < dropdown2.length; i++) {
  dropdown2[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var dropdownContent = this.nextElementSibling;
    if (dropdownContent.style.display === "block") {
      dropdownContent.style.display = "none";
    } else {
      dropdownContent.style.display = "block";
    }
  });
}
