"use strict";
const log = false;

const minESCredits = {
  F600: [120, 100, 100, 120],
  F630: [120, 100, 100, 120],
  F643: [120, 100, 100, 120],
  F645: [ 60,  40,   0, 120],
  F665: [120, 100, 100, 120],
  CFG0: [0, 0, 0, 0]
};
const maxESCredits = {
  F600: [120, 120, 120, 120],
  F630: [120, 120, 120, 120],
  F643: [120, 120, 120, 120],
  F645: [100, 120, 120, 120],
  F665: [120, 120, 120, 120],
  CFG0: [80, 80, 100, 120]
};

const palette = ["#68246D", "#FFD53A", "#00AEEF", "#BE1E2D", "#AFA961",
  "#CBA8B1", "#DACDA2", // sky: "#A5C8D0",
  "#B6AAA7", "#B3BDB1", // white: "#ffffff",
  "#333132", // ink: "#002A41",
  // Exhausted palette; select more from iwanthue soft
  "#6dbb60", "#bc6739", "#b8434e", "#8650a6", "#b74d86", "#607fe6", "#5d7321"
];

const startYear = document.getElementById("startYear");
const yearOut = document.getElementById("yearOut");
const degree = document.getElementById("degree");
const maths = document.getElementById("maths");
const chem = document.getElementById("chem");

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

    const matches = existing.match(/\) \d0px /g);
    const nExisting = matches ? matches.length : 0;

    $(this).css(
      "box-shadow",
       (existing == "none" ? "" : existing + ", ") +
       "inset " + (left ? "" : "-") +
       (left && nExisting ? (nExisting + 1) * 2 : "2") +
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

function glow(code) {
  $("#" + code).addClass("glowing");
}

function deglow(code) {
  $("#" + code).removeClass("glowing");
}

function addModuleSpan(code) {
  return "<span onclick=\"unlight(\'" + code + "\'); " +
    "choose(\'" + code + "\');\" " +
    "title=\"" + $("#" + code + " .module-name").text() + "\"" +
    "onmouseover=\"highlight(\'" + code + "\');\" " +
    "onmouseout=\"unlight(\'" + code + "\');\" " +
    ">" + code + " <span class='button'>Add</span></span>";
}

function dropModuleSpan(code) {
  return "<span onclick=\"unlight(\'" + code + "\'); " +
    "choose(\'" + code + "\', false);\" " +
    "title=\"" + $("#" + code + " .module-name").text() + "\"" +
    "onmouseover=\"highlight(\'" + code + "\');\" " +
    "onmouseout=\"unlight(\'" + code + "\');\" " +
    ">" + code + " <span class='button'>Drop</span></span>";
}

function moduleSpan(code) {
  return "<span onclick=\"unlight(\'" + code + "\');\" " +
    "title=\"" + $("#" + code + " .module-name").text() + "\"" +
    "onmouseover=\"highlight(\'" + code + "\');\" " +
    "onmouseout=\"unlight(\'" + code + "\');\" " +
    ">" + code + "</span>";
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
  $("#check" + code).prop("checked", chosen);
  if (chosen) {
    $("#" + code).addClass("chosen");
  } else {
    $("#" + code).removeClass("chosen");
  }


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
  return modules.hasOwnProperty(code) &&
    modules[code].box.classList.contains("required");
}

function moduleCompare(a, b) {
  const idA = typeof(a) === "string" ? a : a.id;
  const idB = typeof(b) === "string" ? b : b.id;
  const ma = modules[idA];
  const mb = modules[idB];
  if (ma.box.classList.contains("required") +
    mb.box.classList.contains("required") == 1) {
    return ma.box.classList.contains("required") ? -1 : 1;
  }
  if (ma.credits != mb.credits) {
    return ma.credits < mb.credits ? 1 : -1;
  }
  if (ma.credits == 10) {
    if (ma.mich && !mb.mich) return -1;
    if (mb.mich && !ma.mich) return 1;
  }
  return idA.localeCompare(idB);
}

function highlight(code) {
  const $box = $("#" + code);
  const borders = $box[0].style.boxShadow.split("inset,");
  for (const border of borders) {
    const col = border.split(" -20px");
    if (col.length) {
      $box.addClass("pulsating");
      const tint = col[0].replace("rgb", "rgba").replace(")", ", 1)");
      $box.css("background", "linear-gradient(90deg, " +
        $box.css("background-color") + ", 85%, " +
         tint + " 92%" +
        ")");
    }
  }
}

function unlight(code) {
  $("#" + code).removeClass("pulsating").css("background", "");

}

function updateChoices() {
  for (const level of [1, 2, 3, 4]) {
    let credits = 0;
    const minCredits = minESCredits[degree.value][level - 1];
    const maxCredits = maxESCredits[degree.value][level - 1];
    let michCredits = 0;
    let epipCredits = 0;
    const note = document.getElementById("note" + level);
    $(note).empty();
    for (const code in modules) {
      if (modules.hasOwnProperty(code)) {
        const mod = modules[code];
        if (mod.level == level) {
          // Check requisites
          if (mod.req) {
            const missing = mod.req.filter(m => !moduleChosen(m))
              .sort(moduleCompare);
            $(mod.box).off("mouseover");
            $(mod.box).off("mouseout");
            $(mod.box).mouseover(function() {missing.forEach(highlight);});
            $(mod.box).mouseout(function() {missing.forEach(unlight);});
            if (mod.allReqs) {
              if (!mod.req.every(moduleChosen)) {
                if (mod.selected) {
                  addNote(note,
                    moduleSpan(code) + " requires " +
                    missing.map(addModuleSpan).join(" + "));
                }
                $(mod.box).addClass("cantdo")
                mod.box.title = mod.name + "\nRequires " + missing.join(" + ");
              } else {
                $(mod.box).removeClass("cantdo")
                mod.box.title = mod.name;
              }
            } else {
              if (!mod.req.some(moduleChosen)) {
                if (mod.selected) {
                  addNote(note,
                    moduleSpan(code) + " requires " +
                    missing.map(addModuleSpan).join(" or "));
                }
                $(mod.box).addClass("cantdo")
                mod.box.title = mod.name + "\nRequires " + missing.join(" or ");
              } else {
                $(mod.box).removeClass("cantdo")
                mod.box.title = mod.name;
              }
            }
          }

          if (mod.selected) {

            // Check for excluded combinations
            for (const i in mod.excludes) {
              const ex = mod.excludes[i];
              if (moduleChosen(ex)) {
                addNote(note,
                  dropModuleSpan(ex) + " precludes " + dropModuleSpan(code));
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
    }
    const credNote = document.createElement("p");
    const credTot = document.createElement("span");
    credTot.innerHTML = credits + " of 120";
    if (credits < minCredits || credits > maxCredits) {
      credTot.classList.add("invalid");
    }
    const michTot = document.createElement("span");
    const epipTot = document.createElement("span");
    michTot.innerHTML = michCredits;
    epipTot.innerHTML = epipCredits;
    if (michCredits > 70) {
      michTot.classList.add("invalid");
    }
    if (epipCredits > 70) {
      epipTot.classList.add("invalid");
    }
    const extCred = Math.max(120 - maxCredits, 120 - credits);
    const externalCred = credits > 120 ? "" : (credits > maxCredits ? (
      "; <span class='why-invalid'>" + extCred +
      " external credits required</span>"
    ) : (credits >= minCredits && credits < 120 ?
     ("; assumes <span class='alert'>" + extCred + " external credits</span>")
      : ""));

    $(credNote).prepend("Chosen ", credTot, "&nbsp;credits (", michTot,
                       " Michaelmas; ", epipTot, " Epiphany)", externalCred);
    $(note).prepend(credNote);
  }

  if (degree.value == "F665" && !maths.checked) {
    addNote($("#note1"),
            "Geophysics pathway requires A-level Maths" +
            "<span onclick=\"maths.checked = true; updateParams();\" " +
            "title=\"Add A-level Maths\" class='button'>Add</span>");
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
      if (filtered.length == 1) {
        console.warn("Uncaught singleton " + i + ": " + filtered);
      } else {
        addNote($("#note3"),
         "Some required modules not available. " +
         (maths.checked ? "" : "Is A-Level Maths needed?")
        )
        if (maths.checked) {
          console.warn("No modules available to meet requisite " + i);
        }
      }
    }
  }
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

  // Check maths requirement
  if (degree.value == "F665" && !maths.checked) {
    $("#li-maths").addClass("invalid");
  } else {
    $("#li-maths").removeClass("invalid");
  }

  // Reset pathway requirements
  chooseFrom = {};
  var requisite = {};

  // Year out?
  const levelsToShow = yearOut.checked ? [1, 2, 3] : [1, 2, 3, 4];
  $("#col4").css("display", yearOut.checked ? "none" : "unset");
  var levelCache = $("<div>").css("display", "none");
  levelCache.append($("<div>"))
    .append($("<div>"))
    .append($("<div>"))
    .append($("<div>"))
    .append($("<div>"));
  $("body").append(levelCache);

  for (const level of levelsToShow) {
    // Get modules available at this level
    const levelMods = Object.entries(modules).reduce((result, [key, value]) => {
      if (value.level === level) {
        result[key] = value;
      }
      return result;
    }, {});

    const missedYear = level > 2 & yearOut.checked
    await fetch(yearFile(startYear.value, (level - 1) + missedYear))
      .then(response => {
        if (!response.ok) {
          throw new Error("Could not load data for year");
        }
        return response.json();
      })
      .then(data => {
        const dataCodes = Object.values(data).map(item => item["Module code"]);
        for (const code in levelMods) {
          if (!(dataCodes.includes(code))) {
            if (log) {
              console.log("Hiding " + code);
            }
            makeAvailable(levelMods[code].box, false, false);
            modules[code].required = "O";
            modules[code].selected = false;
          }
        }

        // Work through each module available this year at this level
        const thisLevel = data.filter((module) => module.Level == level);

        // Create modules
        thisLevel.forEach(module => {
          const code = module["Module code"];
          const name = module["Module name"];
          let required = (module[degree.value] === undefined ?
            false : module[degree.value].toUpperCase());

          // Maths required if marked so, AND lacking A-level
          if (code == "GEOL1061" && required) {
            required = maths.checked ? "O" : "X";
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
            name.id = "name-" + module["Module code"];
            name.classList.add("module-name");
            text.classList.add("module-text");
            text.appendChild(name);
            text.appendChild(code);
            box.appendChild(text);

            levelCache.children(":nth-child(" + module.Level + ")").append(box);
          }

          box.setAttribute("title", name);
          $("#name-" + code).html(name);

          var available = required != "O";
          if (code == "GEOL1061" &&  // Mathemetical methods
                      (maths.checked || degree.value == "F665")
          ) {
            available = false;
          }
          if (code == "GEOL1081" &&  // Further maths
            !maths.checked &&
             degree.value != "F665" // Geophysicists must take this
           ) {
            available = false;
          }

          // Mark module requirements
          var modReq = module.Requisites;
          const requireOne = modReq ? modReq.includes("/") : null;
          var reqs = modReq ? modReq.split(requireOne ? "/" : "&") : null;
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

          const selected = (modules[code] &&
             modules[code].selected &&
             modules[code].required != "X") || false;

          modules[code] = {
            available: available,
            name: name,
            required: required,
            excludes: module["Excluded Combn"] ?
              module["Excluded Combn"].split(",") : [],
            credits: module.Credits,
            level: module.Level,
            mich: module.Mich,
            epip: module.Epip,
            selected: selected,
            req: reqs,
            allReqs: requireOne ? false : true,
            box: box
          }
        });

        // Once modules loaded, check requisites are available
        thisLevel.filter((module) => module.Requisites).forEach(module => {
          const code = module["Module code"];
          const mod = modules[code];
          var available = mod.available;

          const reqs = mod.req;
          if (reqs !== null) {
            // Check module's requisites are available
            if (mod.allReqs) {
              if (!reqs.every(modAvailable)) {
                if (log) {
                  console.log(reqs);
                }
                available = false;
              }
              // Add requisites of any requisites
              for (const req of reqs) {
                if (modules[req] === undefined) {
                  console.warn("Module " + req + " not yet defined; re-order in spreadsheet?")
                  continue;
                }
                if (modules[req].allReqs) {
                  let toAdd = modules[req].req;
                  if (!toAdd) continue;
                  if (typeof toAdd === "string") {
                    toAdd = [toAdd];
                  }

                  const set1 = new Set(Array.isArray(mod.req) ? mod.req : [mod.req]);
                  const set2 = new Set(Array.isArray(toAdd) ? toAdd : [toAdd]);
                  const newReq = new Set([...set1, ...set2]);
                  mod.req = [...newReq];
                }
              }
            } else {
              if (!reqs.some(modAvailable)) {
                if (log) {
                  console.log(reqs);
                }
                available = false;
              }
              modules[code].req = reqs.filter(modAvailable);
            }
            if (available) mod.req.forEach(function (req) {
              mod.box.classList.add("requires-" + req);
              requisite[req] = true;
            })

          }
          modules[code].available = available;
        });

        // Pathway one-of requirement lists
        thisLevel
        .filter((module) => modules[module["Module code"]].required)
        .forEach(module => {
          const code = module["Module code"];
          const required = modules[code].required;

          // Pathway one-of requirement lists
          if (required && required != "X" && required != "O") {
            if (chooseFrom.hasOwnProperty(required)) {
              chooseFrom[required].push(code);
            } else {
              chooseFrom[required] = [code];
            }
          }
        });

        // Update box visibility
        thisLevel.forEach(module => {
          const code = module["Module code"];
          const mod = modules[code];
          const box = mod.box;
          box.getElementsByTagName("input")[0].checked = mod.selected;
          if (module.Credits == 10) {
            if (module.Epip) {
              setTerm(box, "epip")
            } else if (module.Mich) {
              setTerm(box, "mich")
            }
          }
          makeRequired(box, mod.required == "X", false)
          if (log && !modules[code].available) {
            console.log("Unavailable: " + code + " " + mod.name);
          };
          makeAvailable(box, modules[code].available, false)
        })
      })
      .catch(error => {
        console.error(error);
        addNote($("#level" + level),
                "Could not load data for this year");

      });
  };

  const requiredMods = Object.keys(modules)
    .filter(code => modules[code].required == "X");

  for (const code in modules) {
    // Reset side paint
    $("#" + code).css("box-shadow", "none");
    $(".requires-" + code).css("box-shadow", "none");

    // Check module is not excluded by required combination
    if (requiredMods.some(i => modules[code].excludes.some(j => i == j))) {
      if (log) {
        console.log("Excluded: " + code);
      }
      makeAvailable(modules[code].box, false, false);
    }
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

  // Rewrite "Two of" requirements
  if (chooseFrom.hasOwnProperty("2")) {
    for (var i = 0; i < chooseFrom["2"].length; ++i) {
      chooseFrom["2-" + i] = chooseFrom["2"].filter((element, index) => index !== i);
    }
    delete chooseFrom["2"];
  }

  chooseFrom = Object.fromEntries(
    Object.entries(chooseFrom).map(([i, el]) => {
      const filtered = el.filter(modAvailable).sort(moduleCompare);
      if (filtered.length == 1) {
        makeRequired(modules[filtered].box, true, false);
        return undefined;
      }
      return [i, filtered];
    })
    .filter(entry => entry !== undefined)
  );

  // Now that all requirements are established, paint sides
  for (var req in requisite) {
    if (modAvailable(req) && !mandatory(req)) {
      paintSide("#" + req, 0, palette[n]);
      paintSide(".requires-" + req, 1, palette[n]);
      ++n;
    }
  }

  for (const level of [1, 2, 3, 4]) {
    $.merge(
      levelCache.children(":nth-child(" + level + ")").children(),
      $("#level" + level).children()
    )
    .sort(moduleCompare)
    .appendTo($("#level" + level));
  }
  levelCache.remove();

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
    const urlParams = new URLSearchParams(window.location.search);
    const yoe = urlParams.get("year") ||
      urlParams.get("start") ||
      urlParams.get("entry");
    if (yoe) {
      startYear.value = yoe.match(/\b2\d{3}\b/)[0];
    }
    updateParams();
  })
  .catch(error => console.error("Error fetching years.json: ", error))

startYear.addEventListener("change", updateParams)
yearOut.addEventListener("change", updateParams)
degree.addEventListener("change", updateParams)
maths.addEventListener("change", updateParams)
chem.addEventListener("change", updateParams)


window.onload = function() {
  // Get parameters from the URL
  const urlParams = new URLSearchParams(window.location.search);

  // Get values for SELECT elements from parameters
  const degr = urlParams.get("degree") ||
    urlParams.get("pathway") ||
    urlParams.get("stream") ||
    urlParams.get("program") ||
    urlParams.get("programme");
  const yoe = urlParams.get("year") ||
    urlParams.get("start") ||
    urlParams.get("entry");
  const mths = urlParams.get("maths");
  const chm = urlParams.get("chemistry") || urlParams.get("chem");

  // Update SELECT elements if values are found in parameters
  if (yoe) {
    startYear.value = yoe.match(/\b2\d{3}\b/)[0];
  }
  if (degr) {
    degree.value = degr.toUpperCase();
  }
  if (mths) {
    maths.checked = true;
  }
  if (chm) {
    chem.checked = true;
  }
};
