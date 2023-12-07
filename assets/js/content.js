"use strict";
const startYear = document.getElementById("startYear");
const degree = document.getElementById("degree");
const maths = document.getElementById("maths");
const chem = document.getElementById("chem");
const palette = ["#68246D", "#FFD53A", "#00AEEF", "#BE1E2D", "#AFA961",
  "#CBA8B1", "#DACDA2", // sky: "#A5C8D0",
  "#B6AAA7", "#B3BDB1", // white: "#ffffff",
  "#333132", "#002A41"];

var modules = [];
var chooseFrom = {};

function yearFile(year, plus = 0) {
  const y = parseInt(year) + plus;
  return "data/" + y + "-" + (y - 2000 + 1) + ".json";
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.substr(1, 7), 16);
    return "rgb(" + [
       (bigint >> 16) & 255,
       (bigint >> 8) & 255,
       bigint & 255].join(", ") + ")";
}

function paintSide(selector, left, col) {
  $(selector).each(function() {
    const existing = $(this).css("box-shadow");
    if (existing.includes(hexToRgb(col))) return;

    const existingWidth = existing.match(/\) (\d)0px /);
    $(this).css(
      "box-shadow",
       (existing == "none" ? "" : existing + ", ") +
       "inset " + (left ? "" : "-") +
       (left && existingWidth ? parseInt(existingWidth[1]) + 2 : "2") +
       "0px 0 0 0 " +
       col);
  });
}

function hasMaths() {
  return document.getElementById("maths").checked;
}

function hasChemistry() {
  return document.getElementById("chem").checked;
}

function moduleChosen(code) {
  if (code == "Maths") {
    return hasMaths() ? true : moduleChosen("GEOL1061");
  }
  if (code == "Chemistry") {
    return hasChemistry() ? true : moduleChosen("GEOL2171");
  }
  return $("#" + code + " > input").is(":checked");
}

function modAvailable(code) {
  if (code == "Maths" || code == "Chemistry") return true;
  return modules.hasOwnProperty(code) && modules[code].available;
}

function addNote(element, note) {
  $(element).append("<p class='invalid'>" + note + "</p>");
}

function addModuleSpan(code) {
  return "<span onclick=\"choose(\'" + code + "\');\">" + code + " [add]</span>";
}

function updateChoices() {
  for (const level of [1, 2, 3]) {
    let credits = 0;
    let michCredits = 0;
    let epipCredits = 0;
    const note = document.getElementById("note" + level);
    $(note).empty();
    for (const code in modules) {
      if (modules.hasOwnProperty(code)) {
        const mod = modules[code];
        if (mod.level == level && mod.selected) {
          // Check requisites
          if (mod.req) {
            if (mod.allReqs) {
              if (!mod.req.every(moduleChosen)) {
                addNote(note,
                  code + " requires " +
                  mod.req.filter(m => !moduleChosen(m))
                    .sort(moduleCompare)
                    .map(addModuleSpan)
                    .join(" + "));
              }
            } else {
              if (!mod.req.some(moduleChosen)) {
                addNote(note,
                  code + " requires " +
                  mod.req.sort(moduleCompare)
                  .map(addModuleSpan)
                  .join(" or "));
              }
            }
          }

          // Check for excluded combinations
          if (mod.excludes) {
            if (moduleChosen(mod.excludes)) {
              addNote(note,
                "Cannot take " + mod.excludes + " with " + code);
            }
          }

          // Count credit splits
          const modCreds = mod.credits;
          credits += mod.credits;
          if (mod.mich && mod.epip) {
            michCredits += mod.credits / 2;
            epipCredits += mod.credits / 2;
          } else if (mod.mich) {
            michCredits += mod.credits;
          } else if (mod.epip) {
            epipCredits += mod.credits;
          } else {
            console.error("Module seems not to run in either term: ", code);
          }
        }
      }
    }
    const credNote = document.createElement("p");
    const credTot = document.createElement("span");
    credTot.innerHTML = credits + "/120";
    if (credits != 120) {
      credTot.classList.add("invalid");
    }
    const michTot = document.createElement("span");
    const epipTot = document.createElement("span");
    michTot.innerHTML = michCredits;
    epipTot.innerHTML = epipCredits;
    if (michCredits > 70 || michCredits < 50) {
      michTot.classList.add("invalid");
    }
    if (epipCredits > 70 || epipCredits < 50) {
      epipTot.classList.add("invalid");
    }

    $(credNote).prepend(credTot, "&nbsp;credits (", michTot,
                       " Michaelmas; ", epipTot, " Epiphany)");
    $(note).prepend(credNote);
  }

  // Check that one-of-this-list criteria are met
  for (const i in chooseFrom) {
    const el = chooseFrom[i];
    const filtered = el.filter(modAvailable).sort(moduleCompare);
    if (filtered.length > 1) {
      if (!filtered.some(moduleChosen)) {
        addNote($("#note" + modules[el[0]].level),
                "Must select one of " +
                filtered.map(addModuleSpan).join("; ")
        );
      }
    } else {
      console.warn("Uncaught singleton");
    }
  }
}

function setTerm(box, term) {
  box.classList.add(term);
  if (term == "mich") {
    box.classList.remove("epip");
    const check = box.getElementsByTagName("input")[0];
    const text = check.previousElementSibling;
    if (check && text) {
      const container = check.parentNode;
      container.insertBefore(check, text);
    }
  } else {
    box.classList.remove("mich");
    const check = box.getElementsByTagName("input")[0];
    const text = check.nextElementSibling;
    if (check && text) {
      const container = check.parentNode;
      container.insertBefore(text, check);
    }
  }
}

function choose(id, chosen = true, requiresUpdate = true) {
  var code, box;
  if (typeof(id) === "string") {
    code = id;
    box = modules[code].box;
  } else {
    box = id;
    code = $(box).attr("id");
  }
  const mod = modules[code];
  const start = modules[code].selected;
  if (!mod.available) {
    chosen = false;
  } else if (mandatory(mod)) {
    chosen = true;
  }
  modules[code].selected = chosen;
  document.getElementById("check" + code).checked = chosen;

  if (start != chosen && requiresUpdate) updateChoices();
}

function makeAvailable(box, avail = true, update = true) {
  if (avail) {
    box.classList.remove("unavailable");
  } else {
    box.classList.add("unavailable");
    makeRequired(box, false, false);
    choose(box, false, update);
  }
}

function makeRequired(box, req = true, update = true) {
  if (req) {
    makeAvailable(box);
    box.classList.add("required");
    box.getElementsByTagName("input")[0].disabled = true;
    choose(box, undefined, update);
  } else {
    box.classList.remove("required");
    box.getElementsByTagName("input")[0].disabled = false;
  }
}

function mandatory(code) {
  return modules.hasOwnProperty(code) && modules[code].required;
}

function moduleCompare(a, b) {
  const idA = typeof(a) === "string" ? a : a.id;
  const idB = typeof(b) === "string" ? b : b.id;
  const ma = modules[idA];
  const mb = modules[idB];
  if (ma.credits != mb.credits) {
    return ma.credits < mb.credits ? 1 : -1;
  }
  if (ma.credits == 10) {
    if (ma.mich && !mb.mich) return -1;
    if (mb.mich && !ma.mich) return 1;
  }
  return idA.localeCompare(idB);
}

async function updateParams() {
  // Reset box classes
  const regex = /requires\-GEOL\d+/;
  $(".module-box").each(function () {
    var classes = $(this).attr('class').split(" ");
    var filteredClasses = classes.filter(function (className) {
      return !regex.test(className);
    });

    $(this).attr("class", filteredClasses.join(" "));
  })

  // Reset pathway requirements
  chooseFrom = {};
  var requisite = {};

  for (const level of [1, 2, 3, 4]) {
    // Get modules available at this level
    // Get modules available at this level
    const levelMods = Object.entries(modules).reduce((result, [key, value]) => {
      if (value.level === level) {
        result[key] = value;
      }
      return result;
    }, {});

    await fetch(yearFile(startYear.value, level - 1))
      .then(response => response.json())
      .then(data => {
        const dataCodes = Object.values(data).map(item => item["Module code"]);
        for (const code in levelMods) {
          if (!(dataCodes.includes(code))) {
            makeAvailable(levelMods[code].box, false, false);
            modules[code].required = "O";
            modules[code].selected = false;
          }
        }

        // Work through each module available this year at this level
        data.forEach(module => {
          if (module.Level == level) {
            const code = module["Module code"];
            let required = (module[degree.value] === undefined ?
              false : module[degree.value].toUpperCase());
            // Maths / further maths
            if (code == "GEOL1061" && required) {
              required = maths.checked ? "O" : "X";
            } else if (code == "GEOL1081" && required) {
              required = maths.checked ? "X" : "O";
            }

            const moduleExists = modules.hasOwnProperty(code);
            const box = moduleExists ? modules[code].box :
                        document.createElement("div");

            if (!moduleExists) {
              box.classList.add("module-box");
              box.setAttribute("id", module["Module code"]);
              if (module.Credits == 40) {
                box.classList.add("double");
              } else if (module.Credits == 60) {
                box.classList.add("triple");
              }
              box.setAttribute("title", module["Module name"]);

              const check = document.createElement("input");
              check.type = "checkbox";
              check.id = "check" + module["Module code"];

              box.appendChild(check);
              box.addEventListener("click", function(e) {
                if (e.srcElement != check && !check.disabled) {
                  check.checked = !check.checked;
                }
                choose(box, check.checked);
                updateChoices();
              })

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


            var available = required != "O";
            if (code == "GEOL1061" && maths.checked) { // Mathemetical methods
              available = false;
            }
            if (code == "GEOL1081" && !maths.checked) { // Further maths
              available = false;
            }


            // Mark module requirements
            var modReq = module.Requisites;
            const requireAll = modReq ? modReq.includes("&") : null;
            var reqs = modReq ? modReq.split(requireAll ? "&" : "/") : null;
            if (reqs) {
                reqs = reqs.map(r => {
                if (r == "Chemistry") {
                  return hasChemistry() ? undefined : "GEOL2171";
                }
                if (r == "Maths") {
                  return hasMaths() ? undefined : "GEOL1061";
                }
                return r;
              }).filter(el => el !== undefined);
              if (!reqs.length) {
                reqs = null;
                modReq = false;
              }
            }

            if (modReq) {
              if (requireAll) {
                if (!reqs.every(modAvailable)) {
                  available = false;
                }
              } else {
                if (!reqs.some(modAvailable)) {
                  available = false;
                }
                reqs = reqs.filter(modAvailable)
              }
              if (available) reqs.forEach(function (req) {
                box.classList.add("requires-" + req);
                requisite[req] = true;
              })
            }

            // Pathway one-of requirement lists
            if (required && required != "X" && required != "O") {
              if (chooseFrom.hasOwnProperty(required)) {
                chooseFrom[required].push(code);
              } else {
                chooseFrom[required] = [code];
              }
            }

            const selected = (modules[code] &&
               modules[code].selected &&
               modules[code].required != "X") || false;
            modules[code] = {
              available: available,
              required: required,
              excludes: module["Excluded Combn"],
              credits: module.Credits,
              level: module.Level,
              mich: module.Mich,
              epip: module.Epip,
              selected: selected,
              req: reqs,
              allReqs: requireAll,
              box: box
            }

            box.getElementsByTagName("input")[0].checked = selected;
            if (module.Credits == 10) {
              if (module.Epip) {
                setTerm(box, "epip")
              } else if (module.Mich) {
                setTerm(box, "mich")
              }
            }
            makeRequired(box, required == "X", false)
            makeAvailable(box, available, false)
          }
        })
      });

      const levelDiv = $("#level" + level);
      const sortedModules = levelDiv.children().sort(moduleCompare);
      levelDiv.append(sortedModules);
  };

  for (const code in modules) {
    // Reset side paint
    $("#" + code).css("box-shadow", "none");
    $(".requires-" + code).css("box-shadow", "none");
  }

  var n = 0;
  if (requisite.Maths) {
    if (!hasMaths()) {
      requisite.GEOL1061 = true;
      $(".requires-Maths").addClass("requires-GEOL1061");
    }
    delete requisite.Maths;
  }

  if (requisite.Chemistry) {
    if (!hasChemistry()) {
      requisite.GEOL2171 = true;
      $(".requires-Chemistry").addClass("requires-GEOL2171");
    }
    delete requisite.Chemistry;
  }

  for (var req in requisite) {
    if (!mandatory(req)) {
      paintSide("#" + req, 0, palette[n]);
      paintSide(".requires-" + req, 1, palette[n]);
      ++n;
    }
  }

    chooseFrom = Object.fromEntries(
    Object.entries(chooseFrom).map(([i, el]) => {
      const filtered = el.filter(modAvailable).sort(moduleCompare);
      if (filtered.length == 1) {
        makeRequired(modules[filtered].box, update = false);
        return undefined;
      }
      return [i, filtered];
    })
  );

  updateChoices();
}

fetch("data/years.json")
  .then(response => response.json())
  .then(data => {
    data.slice(0, -3).forEach(year => {
      const option = document.createElement("option");
      option.textContent = year.replace("-", "/");
      option.value = year.substring(0, 4);
      startYear.appendChild(option);
    })
    updateParams();
  })
  .catch(error => console.error("Error fetching years.json: ", error))

startYear.addEventListener("change", updateParams)
degree.addEventListener("change", updateParams)
maths.addEventListener("change", updateParams)
chem.addEventListener("change", updateParams)
