"use strict";
const logUnavailable = false;
const monitor = []; // e.g. ["GEOL1051", "GEOL1021", "GEOL1111"];
const log = logUnavailable || monitor.length > 0;

const minESCredits = {
  F600: [120, 100, 100, 120],
  F630: [120, 100, 100, 120],
  F643: [120,  80,  80, 120],
  F645: [100, 100, 100, 120], // GEOG & ARCH modules included
  F665: [120, 100, 100, 120],
  CFG0: [0, 0, 0, 0]
};
const maxESCredits = {
  F600: [120, 120, 120, 120],
  F630: [120, 120, 120, 120],
  F643: [120, 120, 120, 120],
  F645: [120, 120, 120, 120],
  F665: [120, 120, 120, 120],
  CFG0: [80, 80, 100, 120]
};
const mathsMods = ["GEOL1061", "GEOL1081"]

const oc2020 = "Levels 2 &amp; 3 may include up to 20 credits " +
  "from another department, or from the Level immediately above or below " +
  " (not shown).";
const otherCredits = {
  F600: oc2020,
  F630: oc2020,
  F643: "Levels 2 &amp; 3 may include up to 40 credits from any department, " +
    "of which 30 may be from the Level immediately above or below " +
    " (not shown).",
  F645: "Levels 2 &amp; 3 may include up to 20 credits from any department, " +
    "or from the Level immediately above or below (not shown).",
  F665: oc2020,
  CFG0: "This must include modules from other departments (not shown)."
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
var initialized = false;

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
    return hasChemistry();
  }
  if (code == "GEOG2XXX") {
    return $("[id^=GEOG2] > input").filter(":checked").length > 0;
  }
  return $("#" + code + " > input").is(":checked");
}

function modAvailable(code) {
  if (["Maths", "Chemistry", "GEOG2XXX", "ARCH2XXX"].includes(code)) return true;
  // only show NatScis GEOL modules
  if (degree.value == "CFG0" && code.substr(0, 4) != "GEOL") {
    return false;
  }
  return modules.hasOwnProperty(code) &&
    modules[code].available &&
    modules[code].required != "O";
}

function addNote(element, note) {
  $(element).append("<p class='invalid'>" + note + "</p>");
}

function pulse(selector) {
  $(selector).addClass("pulsating");
}

function depulse(selector) {
  $(selector).removeClass("pulsating");
}

function handbookYear() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  // Handbook goes online in June (month 5, counting from zero)
  return currentMonth > 4 ? currentYear : currentYear - 1;
}

function handbook(code) {
  return "https://apps.dur.ac.uk/faculty.handbook/"
   + handbookYear() + "/UG/search?module=" + code;
}

function moduleURL(code, level) {
  // Temporary redirects until module information pages are approved and
  // available
  let linkedCode;
  switch(code) {
    case "GEOL2FF7":
    case "GEOL2MM7":
      linkedCode = "GEOL2011";
      break;
    case "GEOL4DD7": linkedCode = "GEOL3407"; break;
    case "GEOL4EE7": linkedCode = "GEOL3447"; break;
    default:
      linkedCode = code;
  }


  const year = Math.min(handbookYear(), parseInt(startYear.value) + level - 1);
  
  // Fancy new pages aren't populated promptly with new modules; 
  // use the old pages for now.
  return "https://apps.dur.ac.uk/faculty.handbook/" + year + "/UG/module/" +
    linkedCode;
  
  // If the new pages eventually become useful:
  return year <= handbookYear() ? "https://apps.dur.ac.uk/faculty.handbook/" +
    year + "/UG/module/" + linkedCode :
    "https://www.durham.ac.uk/study/modules/undergraduate/" +
    linkedCode.toLowerCase() + ".php";
}

function addModuleSpan(code) {
  if (code == "Chemistry") {
    return toolTipText(code);
  } else if (code == "GEOG2XXX") {
    return "<span onmouseover=\"pulse(\'[id^=GEOG2]\')\" " +
      "onmouseout=\"depulse(\'[id^=GEOG2]\')\"><a href=\"" +
      handbook("GEOG2") +
      "\" target=\"_blank\">L2 GEOG module</a></span>";
  } else if (code == "ARCH2XXX") {
    return "<a href=\"" + handbook("ARCH2") +
      "\" target=\"_blank\">L2 ARCH module</a>";
  }
  return "<span onclick=\"depulse(\'#" + code + "\'); " +
    "choose(\'" + code + "\');\" " +
    "title=\"" + $("#" + code + " .module-name").text() + "\"" +
    "onmouseover=\"pulse(\'#" + code + "\');\" " +
    "onmouseout=\"depulse(\'#" + code + "\');\" " +
    ">" + code + " <span class='button'>Add</span></span>";
}

function dropModuleSpan(code) {
  if (modules[code].required) {
    return "<span onmouseover=\"pulse(\'#" + code +  "\');\" " +
     "onmouseout=\"depulse(\'#" + code +  "\');\">" +
    code + "</span>"
    ;
  } else {
    return "<span onclick=\"depulse(\'#" + code + "\'); " +
      "choose(\'" + code + "\', false);\" " +
      "title=\"" + $("#" + code + " .module-name").text() + "\"" +
      "onmouseover=\"pulse(\'#" + code + "\');\" " +
      "onmouseout=\"depulse(\'#" + code + "\');\" " +
      ">" + code + " <span class='button'>Drop</span></span>";
  }
}

function moduleSpan(code) {
  return "<span onclick=\"depulse(\'#" + code + "\');\" " +
    "title=\"" + $("#" + code + " .module-name").text() + "\"" +
    "onmouseover=\"pulse(\'#" + code + "\');\" " +
    "onmouseout=\"depulse(\'#" + code + "\');\" " +
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
    code = id.trim();
    if (!modules.hasOwnProperty(code)) {
      console.warn("Could not find module " + code);
      return;
    }
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
  return modules.hasOwnProperty(code) && modules[code].mandatory;
}

function moduleCompare(a, b) {
  const idA = typeof(a) === "string" ? a : a.id;
  const idB = typeof(b) === "string" ? b : b.id;
  if (idA == "Chemistry") {
    return 1;
  } else if (idB == "Chemistry") {
    return -1;
  }

  const ma = modules[idA];
  const mb = modules[idB];
  if (ma === undefined) {
    console.warn("Sorting non-existent module " + idA)
    return 0;
  } else if (mb === undefined) {
    console.warn("Sorting non-existent module " + idb)
    return 0;
  }
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

  const deptA = idA.substr(0, 4);
  const deptB = idB.substr(0, 4);
  if (deptA != deptB) {
    // GEOL modules first
    if (deptA == "GEOL") return -1;
    if (deptB == "GEOL") return 1;
    // GEOG modules second
    if (deptA == "GEOG") return -1;
    if (deptB == "GEOG") return 1;
    // Other departments alphabetically
    return deptA > deptB ? 1 : -1;
  }

  return idA.localeCompare(idB);
}

function selector(code) {
  return code == "GEOG2XXX" ? "[id^=GEOG2]" : "#" + code;
}

function highlight(code) {
  if (code == "ARCH2XXX") return;
  if (code == "Chemistry") return;
  const $box = $(selector(code));
  if ($box.length == 0) {
    console.error("No modules match selector " + selector(code));
  }
  const borders = $box[0].style.boxShadow.split("inset,");
  for (const border of borders) {
    const col = border.split(" -20px");
    if (col.length) {
      $box.addClass("pulsating");
      const tint = col[0].replace("rgb", "rgba").replace(")", ", 1)");
      $box.css("background", "linear-gradient(90deg, " +
      //$box.css("background-color") + ", 85%, " +
        "#A5C8D0, 85%, " +
         tint + " 92%" +
        ")");
    }
  }
}

function unlight(code) {
  $(selector(code)).removeClass("pulsating").css("background", "");
}

function toolTipText(code) {
  if (code == "Chemistry") {
    return "A-level Chemistry @ Grade B+";
  } else if (code.match("2XXX")) {
    return ("L2 " + code.replace("2XXX", "") + " module");
  }
  return code;
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
          // Reset hover-pulsation
          $(mod.box).off("mouseover");
          $(mod.box).off("mouseout");
          if (monitor.includes(code)) {
            console.log("Updating choices: " + code, mod);
          }

          // Check requisites
          if (mod.req) {
            const missing = mod.req
              .filter(modAvailable)
              .filter(m => !moduleChosen(m))
              .sort(moduleCompare);
            $(mod.box).mouseover(function() {missing.forEach(highlight);});
            $(mod.box).mouseout(function() {missing.forEach(unlight);});
            if (mod.allReqs) {
              if (!mod.req.every(moduleChosen)) {
                if (mod.selected) {
                  addNote(note,
                    moduleSpan(code) + " requires " +
                    missing.map(addModuleSpan).join(" + "));
                }
                $(mod.box).addClass("cantdo");
                if (monitor.includes(code)) {
                  console.log("Can't do " + code + "%c " + mod.name +
                   "%c: not selected all reqs",
                   "color: grey", "color: white;");
                }
                mod.box.title = mod.name + "\nRequires " + missing.join(" + ");
              } else {
                if (monitor.includes(code)) {
                  console.log("  %cCan do " + code + "%c " + mod.name,
                   "color: green", "color: grey");
                }
                $(mod.box).removeClass("cantdo");
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
                mod.box.title = mod.name + "\nRequires " +
                  missing.map(toolTipText).join(" or ");
              } else {
                $(mod.box).removeClass("cantdo")
                mod.box.title = mod.name;
              }
            }
          } else if (code == "GEOL1061") {
            if (hasMaths()) {
              $(mod.box).addClass("cantdo")
            } else {
              $(mod.box).removeClass("cantdo")
            }
            mod.box.title = mod.name + "\nUnavailable to students with A-level Maths";
          } else if (code == "GEOL1081") {
            if (hasMaths()) {
              $(mod.box).removeClass("cantdo")
            } else {
              $(mod.box).addClass("cantdo")
            }
            mod.box.title = mod.name + "\nRequires A-level Maths @ Grade B+";
          } else {
            $(mod.box).removeClass("cantdo")
            mod.box.title = mod.name;
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
  if (!initialized) {
    const urlParams = new URLSearchParams(window.location.search);
    const chosen = urlParams.get("modules") ||
        urlParams.get("module") ||
        urlParams.get("mods") ||
        urlParams.get("mod");
    if (chosen) {
      chosen.toUpperCase().replace(";", ",").split(",").forEach((mod) => choose(mod, true));
    }
    initialized = true;
  }
  const permalink = ".?" +
   ("entry=" + startYear.value.match(/\b2\d{3}\b/)[0]) +
   ("&pathway=" + degree.value) +
   (maths.checked ? "&maths=A" : "") +
   (chem.checked ? "&chemistry=A" : "") +
   (yearOut.checked ? "&inset=yes" : "") +
   "&modules=" + Object.keys(modules).filter((code) => {
     return modules[code].selected && modules[code].required != "X";
   }).sort(moduleCompare).join(",");
  ;
  history.pushState(null, null, permalink);
  $("#permalink")[0].href = permalink;

}

async function updateParams() {
  if (log) {
    console.log("%cNew call to %cupdateParams()",
    "font-size: larger; padding-top: 2em;",
    "font-size: larger; color: cyan;")
  }

  // Update other credits note
  $("#other-credits").html(otherCredits[degree.value]);

  // Reset box classes
  const regex = /requires\-[A-Z]{4}\d+/;
  $(".module-box").each(function () {
    var classes = $(this).attr("class").split(" ");
    var filteredClasses = classes.filter(function (className) {
      return !regex.test(className);
    });

    $(this).attr("class", filteredClasses.join(" "));
  })

  // Check geophysicists have required maths
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
  $("#col4").css("display", yearOut.checked ? "none" : "");
  if (yearOut.checked) {
    $("#col1, #col2, #col3").addClass("col-4").removeClass("col-3");
  } else {
    $("#col1, #col2, #col3").addClass("col-3").removeClass("col-4");
  }
  var levelCache = $("<div>").css("display", "none");
  levelCache.append($("<div>"))
    .append($("<div>"))
    .append($("<div>"))
    .append($("<div>"))
    .append($("<div>"));
  $("body").append(levelCache);

  for (const level of levelsToShow) {
    // Modules already available at this level
    const levelMods = Object.entries(modules).reduce((result, [key, value]) => {
      if (value.level === level) {
        result[key] = value;
      }
      return result;
    }, {});

    const missedYear = level > 2 & yearOut.checked
    const yearJson = yearFile(startYear.value, (level - 1) + missedYear);
    await fetch(yearJson)
      .then(response => {
        if (!response.ok) {
          throw new Error("Could not load data for year");
        }
        return response.json();
      })
      .then(data => {
        const dataCodes = Object.values(data).map(item => item["Module code"]);
        for (const code in levelMods) {
          if (!(dataCodes.includes(code))
        || (degree.value == "CFG0" && code.substr(0, 4) != "GEOL")) {
            if (log) {
              console.log("Hiding " + code);
            }
            makeAvailable(levelMods[code].box, false, false);
            modules[code].required = "O";
            modules[code].selected = false;
          }
        }

        // Work through each module available this year at this level
        const thisLevel = data.filter(module =>
          module.Level == level &&
          (degree.value != "CFG0" || // Only show GEOL under Natural Sciences
           module["Module code"].substr(0, 4) == "GEOL")
        );

        // Create modules
        thisLevel.forEach(module => {
          const code = module["Module code"];
          const name = module["Module name"];
          let required = (module[degree.value] === undefined ?
            false : module[degree.value].toUpperCase());

          // Maths required if required by pathway, AND lacking A-level
          if (required && required !== "O") {
            if (code == "GEOL1061") {
              required = maths.checked ? false : "X";
            } else if (code == "GEOL1081") {
              required = maths.checked ? "X" : false;
            }
          }

          const moduleExists = modules.hasOwnProperty(code);
          const box = moduleExists ? modules[code].box :
                      document.createElement("div");

          if (moduleExists) {
            $(box)
              .find(".module-link")
              .attr("href", moduleURL(module["Module code"], level));
          } else {
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
            const link = document.createElement("a");
            link.innerHTML = "<i class=\"fa fa-info-circle\" " +
              "title=\"Module proforma\"></i>"
            link.href = moduleURL(module["Module code"], level);
            link.target = "_blank";
            link.classList.add("module-link");
            text.classList.add("module-text");
            code.appendChild(link);
            text.appendChild(name);
            text.appendChild(code);
            box.appendChild(text);

            levelCache.children(":nth-child(" + module.Level + ")").append(box);
          }

          box.setAttribute("title", name);
          $("#name-" + code).html(name);

          // Mark module requirements
          var modReq = module.Requisites;
          const requireOne = modReq ?
            modReq.includes("/") || modReq.includes("XXX") :
            null;
          var reqs = modReq ? modReq.split(requireOne ? "/" : "&") : null;
          if (reqs) {
            if (!requireOne) {
              reqs = reqs.map(r => {
                if (r == "Maths") {
                  return hasMaths() ? undefined : "GEOL1061";
                }

                return r;
              }).filter(el => el !== undefined);
            }
            if (!reqs.length) {
              reqs = null;
              modReq = false;
            }
          }

          const selected = (modules[code] &&
             modules[code].selected &&
             modules[code].required != "X") || false;

          modules[code] = {
            available: required != "O",
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

        // Now all modules loaded, check requisites are available
        thisLevel.filter((module) => module.Requisites).forEach(module => {
          const code = module["Module code"];
          const mod = modules[code];
          var available = mod.available;

          const reqs = mod.req;
          if (reqs !== null) {
            // Check module's requisites are available
            if (mod.allReqs) {
              if (!reqs.every(modAvailable)) {
                if (monitor.includes(code)) {
                  console.log(code + " %c" + mod.name + "%c needs all: %o",
                  "color: grey;", "color: white", reqs);
                  console.log(reqs)
                }
                if (reqs.filter(m => !mathsMods.includes(m)).every(modAvailable)) {
                  modules[code].req = ["GEOL1081"];
                  available = true;
                } else {
                  available = false;
                }
              }
              // Add requisites of any requisites
              for (const req of reqs) {
                if (modules[req] === undefined) {
                  console.warn(code + " %c" + mod.name +
                  "%c requires unavailable module " + req,
                  "color: grey;", "color: white")
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
              // If no requisites are available, neither is this module
              if (!reqs.some(modAvailable) && reqs.every(x => !x.match("XXX"))) {
                if (monitor.includes(code)) {
                    console.log(code + " %c" + mod.name +
                    "%c is %cunavailable%c; it needs: %o",
                    "color: grey;", "color: white",
                    "color: red;", "color: white",
                     reqs);
                  }
                available = false;
              }
              modules[code].req = reqs.filter(modAvailable);
            }
            if (available && (mod.allReqs || !reqs.some(mandatory))) {
              mod.req.forEach(function (req) {
                if (monitor.includes(code)) {
                  console.log("%cAdding req %o", "font-size: large", req);
                }
                mod.box.classList.add("requires-" + req);
                requisite[req] = true;
              })
            }

          }
          modules[code].available = available;
        });
        // Temporary hard-coding of MEP GEOL2251 workaround
        // We want to display this L2 module as an L3 option in AY25/26
        if (yearJson == "data/2025-26.json" && level == 3) {
          console.log(modules);

          const moduleExists = modules.hasOwnProperty("GEOL2251L3");
          const box = moduleExists ? modules["GEOL2251L3"].box :
                      document.createElement("div");

          if (moduleExists) {
            $(box)
              .find(".module-link")
              .attr("href", moduleURL("GEOL2251", 2));
          } else {
            box.classList.add("module-box");
            box.setAttribute("id", "GEOL2251L3");
            
            const check = document.createElement("input");
            check.type = "checkbox";
            check.id = "checkGEOL2251L3";

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
            code.innerHTML = "GEOL2251";
            code.classList.add("module-code");
            const name = document.createElement("span");
            name.id = "name-GEOL2251L3";
            name.innerHTML = "Modelling Earth Processes (L2)";
            name.classList.add("module-name");
            const link = document.createElement("a");
            link.innerHTML = "<i class=\"fa fa-info-circle\" " +
              "title=\"Module proforma\"></i>"
            link.href = moduleURL("GEOL2251", 2);
            link.target = "_blank";
            link.classList.add("module-link");
            text.classList.add("module-text");
            code.appendChild(link);
            text.appendChild(name);
            text.appendChild(code);
            box.appendChild(text);

            levelCache.children(":nth-child(3)").append(box);
          }

          box.setAttribute("title", name);
          modules["GEOL2251L3"] = {
            available: true,
            name: "Modelling Earth Processes (L2)",
            required: false,
            excludes: ["GEOL2251"],
            credits: 20,
            level: 3,
            mich: true,
            epip: true,
            selected: (modules["GEOL2251L3"] &&
             modules["GEOL2251L3"].selected) || false,
            req: [],
            allReqs: true,
            box: box
          };
          
          console.log(modules);
        }

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
        if (logUnavailable) {
          console.group("Unavailable at Level " + level + ":");
        }
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
          modules[code].mandatory = mod.required == "X";
          makeRequired(box, mod.required == "X", false)
          if ((logUnavailable || monitor.includes(code)) &&
              !modules[code].available) {
            console.log(code + " %c" + mod.name + " is %cunavailable",
             "color: grey;", "color: red");
          };
          makeAvailable(box, modules[code].available, false);
        })
        
        // Temporary hard-coding of MEP GEOL2251 workaround
        // We want to display this L2 module as an L3 option in AY25/26
        if (yearJson == "data/2025-26.json" && level == 3) {
          const code = "GEOL2251L3";
          const mod = modules[code];
          const box = mod.box;
          box.getElementsByTagName("input")[0].checked = mod.selected;
          makeAvailable(box, modules[code].available, false);
        }
        if (logUnavailable) console.groupEnd();
      })
      .catch(error => {
        console.error(error);
        addNote($("#level" + level),
                "Could not load data for this year");

      });
  };

  const requiredMods = Object.keys(modules)
    .filter(code => modules[code].required == "X");

  if (log) {
    console.log("Required modules:", requiredMods)
    console.group("%cExcluded:", "color: yellow;");
  }
  for (const code in modules) {
    // Reset side paint
    $("#" + code).css("box-shadow", "none");
    $(".requires-" + code).css("box-shadow", "none");

    // Check module is not excluded by required combination
    if (requiredMods.some(i => modules[code].excludes.some(j => i == j))) {
      if (log) {
        console.log("%c" + code + " %c" + modules[code].name,
         "color: yellow;", "color: grey", modules[code].excludes);
      }
      if (!mathsMods.includes(code)) {
        // Always display maths so students can see what they are missing
        makeAvailable(modules[code].box, false, false);
      }
    }
  }
  if (log) console.groupEnd();

  var n = 0;
  if (requisite.Maths) {
    if (!hasMaths()) {
      requisite.GEOL1061 = true;
      $(".requires-Maths").addClass("requires-GEOL1061");
    }
    delete requisite.Maths;
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
        modules[filtered].mandatory = true;
        makeRequired(modules[filtered].box, true, false);
        return undefined;
      }
      return [i, filtered];
    })
    .filter(entry => entry !== undefined)
  );

  if (log) {
    console.log("Requisites: %o", requisite)
  }
  // Now that all requirements are established, paint sides
  for (var req in requisite) {
    if (logUnavailable || monitor.includes(req)) {
      console.log(req + ": " +
          (modAvailable(req) ? "Available" : "Unavailable") + ", " +
              (mandatory(req) ? "Mandatory" : "Optional"));
    }

    if (modAvailable(req) && !mandatory(req) &&
     !["Chemistry", "ARCH2XXX"].includes(req)) {
      paintSide("#" +
        (req == "GEOG2XXX" ?
          Object.keys(modules)
          .filter(key => key.substr(0, 5) == "GEOG2")
          .join(", #")
          : req), 0, palette[n]
      );
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
  if (urlParams.size > 0) {
    $('#features header, footer').hide();
  }

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
  const inset = urlParams.get("inset");

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
  if (inset) {
    yearOut.checked = true;
  }
};
