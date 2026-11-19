export const CATEGORIES = {
  Explorer: { max: 100, seconds: 600, timeLimit: "10 minutes" },
  Innovator: { max: 100, seconds: 180, timeLimit: "3 minutes" },
  Techies: { max: 150, seconds: 150, timeLimit: "2 minutes 30 seconds" }
};

export function createScoreSheet(category, container, totalCallback) {
  container.innerHTML = "";
  const fields = container.appendChild(document.createElement("div"));
  fields.className = "score-fields";
  const entries = category === "Explorer" ? explorerTasks() : category === "Innovator" ? innovatorTasks() : techiesTasks();

  entries.forEach(task => {
    const box = document.createElement("div");
    box.className = "score-task";
    box.dataset.task = task.key;
    box.innerHTML = `<h3>${task.name}</h3><div class="score-options"></div>`;
    const options = box.querySelector(".score-options");
    task.options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "score-option";
      label.innerHTML = `<input type="radio" name="${task.key}" value="${option.value}" ${index === 0 ? "checked" : ""}> ${option.label} (${option.value})`;
      options.appendChild(label);
    });
    fields.appendChild(box);
  });

  const calculate = () => {
    let total = 0;
    entries.forEach(task => {
      const checked = container.querySelector(`input[name="${task.key}"]:checked`);
      total += Number(checked?.value || 0);
    });
    total = Math.min(total, CATEGORIES[category].max);
    totalCallback(total);
  };
  container.addEventListener("change", calculate);
  calculate();
  return { getBreakdown: () => Object.fromEntries(entries.map(task => {
    const checked = container.querySelector(`input[name="${task.key}"]:checked`);
    return [task.key, { label: task.name, value: Number(checked?.value || 0), option: checked?.parentElement.textContent.trim() || "0" }];
  })) };
}

function explorerTasks() {
  return [
    {key:"trashRemoved",name:"Trash completely removed from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"trashKids",name:"Did not disturb kids while navigating",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"trashBin",name:"Trash completely or partially inside recycle bin",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"visitorPicked",name:"Visitor picked up from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"visitorRides",name:"Did not disturb the rides",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"visitorKids",name:"Did not disturb the kids",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"visitorCounter",name:"Visitor completely or partially inside ticket counter",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"powerOff",name:"Power switch turned OFF",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"powerRides",name:"Did not disturb the rides",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"barrierRemoved",name:"Barrier completely removed from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"barrierRides",name:"Did not disturb the rides",options:[{label:"No",value:0},{label:"Yes",value:5}]},
    {key:"barrierKids",name:"Did not disturb the kids",options:[{label:"No",value:0},{label:"Yes",value:5}]}
  ];
}
function innovatorTasks() {
  return [
    {key:"engineerPosition",name:"Engineer in maintenance zone",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"wallMoved",name:"Wall in maintenance zone not moved",options:[{label:"Moved",value:0},{label:"Not moved",value:10}]},
    {key:"barrier",name:"Crowd control barrier",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"fireExit",name:"Fire exit gate removed",options:[{label:"No",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"locker",name:"Electronic devices in locker",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"seatLever",name:"Ride seat belt lever turned ON",options:[{label:"No",value:0},{label:"Yes",value:10}]},
    {key:"visitorTicket",name:"Visitor at ticket counter",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"directionalSigns",name:"Directional signs not moved",options:[{label:"Moved",value:0},{label:"Not moved",value:20}]},
    {key:"homeParking",name:"Robot in home area",options:[{label:"Outside",value:0},{label:"Partial or complete",value:10}]}
  ];
}
function techiesTasks() {
  return [
    {key:"visitors",name:"Visitors transported to correct rides",options:[{label:"0 visitors",value:0},{label:"1 complete",value:10},{label:"1 partial",value:5},{label:"2 complete",value:20},{label:"1 complete + 1 partial",value:15},{label:"2 partial",value:10}]},
    {key:"engineer",name:"Engineer in ride maintenance zone",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"materials",name:"Construction materials in construction zone",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"powerLever",name:"Main power supply lever turned OFF",options:[{label:"No",value:0},{label:"Yes",value:15}]},
    {key:"directionalSigns",name:"Directional signs not moved",options:[{label:"Moved",value:0},{label:"Not moved",value:20}]},
    {key:"parking",name:"Robot in Start & Finish Area",options:[{label:"Outside",value:0},{label:"Partial or complete",value:15}]},
    {key:"bonus",name:"Fence not moved or damaged",options:[{label:"Moved/damaged",value:0},{label:"Not moved/damaged",value:40}]}
  ];
}
