"use strict";
const startYear = document.getElementById("startYear");
const degree = document.getElementById("degree");

function yearFile(year, plus = 0) {
  const y = parseInt(year) + plus;
  return "data/" + y + "-" + (y - 2000 + 1) + ".json";
}

function updateStartYear() {
  [1, 2, 3, 4].forEach(level => {
    $("#level" + level + " > div").remove();
    fetch(yearFile(startYear.value, level - 1))
      .then(response => response.json())
      .then(data => {
        data.forEach(module => {
          if (module.Level == level) {
            const required = (module[degree.value] === undefined ?
              false : module[degree.value].toUpperCase());
            console.log(module["Module code"] + " - " + required);
            const box = document.createElement("div");
            box.classList.add("module-box");
            if (module.Credits == 40) {
              box.classList.add("double");
            } else if (module.Credits == 60) {
              box.classList.add("triple");
            } else if (module.Credits == 10) {
              if (module.Epip) {
                box.classList.add("epip")
              } else if (module.Mich) {
                box.classList.add("mich")
              }
            }
            if (required == "X") {
              box.classList.add("required");
            } else if (required == "O") {
              box.classList.add("unavailable");
            }

            const check = document.createElement("input");
            check.type = "checkbox";
            check.id = module["Module code"];
            if (required == "X") {
              check.checked = "checked";
              check.disabled = "disabled";
            }


            box.appendChild(check);

            const text = document.createElement("div");
            const code = document.createElement("span");
            code.innerHTML = module["Module code"];
            code.classList.add("module-code");
            const name = document.createElement("span");
            name.innerHTML = module["Module name"];
            name.classList.add("module-name");
            text.classList.add("module-text");
            text.appendChild(name);
            text.appendChild(code);
            box.appendChild(text);
            document.getElementById("level" + module.Level).appendChild(box);
          }
        })
      });
  });
}

fetch("data/years.json")
  .then(response => response.json())
  .then(data => {

    data.slice(0, -2).forEach(year => {
      const option = document.createElement("option");
      option.textContent = year.replace("-", "/");
      option.value = year.substring(0, 4);
      startYear.appendChild(option);
    })
    updateStartYear();
  })
  .catch(error => console.error("Error fetching years.json: ", error))

startYear.addEventListener("change", updateStartYear)
