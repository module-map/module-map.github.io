"use strict";
fetch("data/years.json")
  .then(response => response.json())
  .then(data => {
    const select = document.getElementById("startYear");

    data.forEach(year => {
      const option = document.createElement("option");
      option.textContent = year;
      select.appendChild(option);
    })
  })
  //.catch(error => console.error("Error fetching years.json: ", error))
