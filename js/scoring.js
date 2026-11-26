export const CATEGORIES = {
  Explorer: { max: 100, label: "Explorers", ages: "5–7" },
  Innovator: { max: 100, label: "Innovators", ages: "7–10" },
  Techies: { max: 150, label: "Techies", ages: "10–15" }
};

export function createScoreSheet(category, container, totalCallback, maximumCallback = () => {}) {
  container.replaceChildren();
  if (category === "Explorer") {
    return createExplorerScoreSheet(container, totalCallback, maximumCallback);
  }

  const entries = category === "Innovator" ? innovatorTasks() : techiesTasks();
  const fields = container.appendChild(document.createElement("div"));
  fields.className = "score-fields";
  const calculate = () => totalCallback(calculateScore(entries, fields));
  renderTasks(entries, fields, calculate);
  maximumCallback(CATEGORIES[category].max);
  calculate();
  return { getBreakdown: () => getBreakdown(entries, fields) };
}

function createExplorerScoreSheet(container, totalCallback, maximumCallback) {
  const taskLabel = document.createElement("label");
  taskLabel.className = "explorer-task-select";
  const labelText = document.createElement("span");
  labelText.textContent = "Select task";
  const taskSelect = document.createElement("select");
  taskSelect.setAttribute("aria-label", "Select task");
  explorerTasks.forEach(task => {
    const option = document.createElement("option");
    option.value = task.key;
    option.textContent = task.name;
    taskSelect.appendChild(option);
  });
  taskLabel.append(labelText, taskSelect);

  const fields = container.appendChild(document.createElement("div"));
  fields.className = "score-fields";
  container.prepend(taskLabel);
  let selectedTask = explorerTasks[0];
  const calculate = () => totalCallback(calculateScore(selectedTask.entries, fields));
  const renderSelectedTask = () => {
    selectedTask = explorerTasks.find(task => task.key === taskSelect.value);
    renderTasks(selectedTask.entries, fields, calculate);
    maximumCallback(maximumForTask(selectedTask));
    calculate();
  };
  taskSelect.addEventListener("change", renderSelectedTask);
  renderSelectedTask();
  return {
    getBreakdown: () => ({
      selectedTask: selectedTask.name,
      ...getBreakdown(selectedTask.entries, fields)
    })
  };
}

function renderTasks(entries, fields, calculate) {
  fields.replaceChildren();
  entries.forEach(task => {
    const box = document.createElement("div");
    box.className = "score-task";
    box.dataset.task = task.key;
    const title = document.createElement("h3");
    title.textContent = task.name;
    box.appendChild(title);

    if (task.each) {
      const label = document.createElement("label");
      label.className = "score-counter";
      const description = document.createElement("span");
      description.textContent = `${task.each} points each (maximum ${task.maxPoints})`;
      const counter = document.createElement("input");
      counter.className = "score-counter-input";
      counter.type = "number";
      counter.min = "0";
      counter.max = String(task.maxPoints / task.each);
      counter.step = "1";
      counter.value = "0";
      counter.dataset.scoreCount = task.key;
      counter.setAttribute("aria-label", `Number completed for ${task.name}`);
      const points = document.createElement("output");
      points.className = "score-counter-points";
      points.setAttribute("aria-live", "polite");
      points.textContent = "0 points";
      label.append(description, counter, points);
      counter.addEventListener("input", () => {
        const count = countForTask(task, counter.value);
        if (counter.value !== "" && Number(counter.value) !== count) counter.value = String(count);
        points.textContent = `${count * task.each} points`;
        calculate();
      });
      box.appendChild(label);
    } else if (task.eachItem) {
      task.eachItem.forEach((item, index) => {
        const itemOptions = document.createElement("div");
        itemOptions.className = "score-item-options";
        const itemTitle = document.createElement("strong");
        itemTitle.textContent = item;
        const options = document.createElement("div");
        options.className = "score-options";
        task.options.forEach((option, optionIndex) => {
          const label = document.createElement("label");
          label.className = "score-option";
          const input = document.createElement("input");
          input.type = "radio";
          input.name = itemInputName(task, index);
          input.value = String(option.value);
          input.checked = optionIndex === 0;
          input.addEventListener("change", calculate);
          label.append(input, ` ${option.label} (${option.value})`);
          options.appendChild(label);
        });
        itemOptions.append(itemTitle, options);
        box.appendChild(itemOptions);
      });
    } else {
      const options = document.createElement("div");
      options.className = "score-options";
      task.options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "score-option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = task.key;
        input.value = String(option.value);
        input.checked = index === 0;
        input.addEventListener("change", calculate);
        label.append(input, ` ${option.label} (${option.value})`);
        options.appendChild(label);
      });
      box.appendChild(options);
    }

    fields.appendChild(box);
  });
}

function calculateScore(entries, container) {
  return entries.reduce((total, task) => {
    if (task.each) {
      const counter = container.querySelector(`[data-score-count="${task.key}"]`);
      return total + countForTask(task, counter?.value) * task.each;
    }
    if (task.eachItem) {
      return total + task.eachItem.reduce((itemTotal, _, index) => {
        const checked = container.querySelector(`input[name="${itemInputName(task, index)}"]:checked`);
        return itemTotal + Number(checked?.value || 0);
      }, 0);
    }
    const checked = container.querySelector(`input[name="${task.key}"]:checked`);
    return total + Number(checked?.value || 0);
  }, 0);
}

function countForTask(task, value) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.min(task.maxPoints / task.each, Math.max(0, Math.floor(count)));
}

function maximumForTask(task) {
  return task.entries.reduce((total, entry) =>
    total + (entry.each ? entry.maxPoints
      : entry.eachItem ? entry.eachItem.length * Math.max(...entry.options.map(option => option.value))
      : Math.max(...entry.options.map(option => option.value))), 0);
}

function getBreakdown(entries, container) {
  return Object.fromEntries(entries.map(task => {
    if (task.each) {
      const counter = container.querySelector(`[data-score-count="${task.key}"]`);
      const count = countForTask(task, counter?.value);
      const value = count * task.each;
      return [task.key, { label: task.name, value, count, each: task.each, option: `${count} × ${task.each}` }];
    }
    if (task.eachItem) {
      const items = task.eachItem.map((label, index) => {
        const checked = container.querySelector(`input[name="${itemInputName(task, index)}"]:checked`);
        return { label, value: Number(checked?.value || 0), option: checked?.parentElement.textContent.trim() || "0" };
      });
      return [task.key, { label: task.name, value: items.reduce((total, item) => total + item.value, 0), items }];
    }
    const checked = container.querySelector(`input[name="${task.key}"]:checked`);
    return [task.key, { label: task.name, value: Number(checked?.value || 0), option: checked?.parentElement.textContent.trim() || "0" }];
  }));
}

function itemInputName(task, index) {
  return `${task.key}-${index}`;
}

const explorerTasks = [
  {
    key: "cleaningPark",
    name: "Cleaning the Park",
    entries: [
      {key:"trashRemoved",name:"Trash completely removed from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
      {key:"trashKids",name:"Did not disturb kids while navigating",options:[{label:"No",value:0},{label:"Yes",value:5}]},
      {key:"trashBin",name:"Trash completely or partially inside a recycle bin",each:5,maxPoints:15}
    ]
  },
  {
    key: "transportingVisitor",
    name: "Transporting the Visitor",
    entries: [
      {key:"visitorPicked",name:"Visitor picked up from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
      {key:"visitorRides",name:"Did not disturb the rides while navigating",each:5,maxPoints:10},
      {key:"visitorKids",name:"Did not disturb the kids while navigating",each:5,maxPoints:10},
      {key:"visitorCounter",name:"Visitor completely or partially inside the ticket counter",options:[{label:"No",value:0},{label:"Yes",value:5}]}
    ]
  },
  {
    key: "powerSwitches",
    name: "Turning OFF the Power Switches",
    entries: [
      {key:"powerOff",name:"Power switch turned off",each:5,maxPoints:10},
      {key:"powerRides",name:"Did not disturb the rides while navigating",each:5,maxPoints:10}
    ]
  },
  {
    key: "removingBarrier",
    name: "Removing the Barrier",
    entries: [
      {key:"barrierRemoved",name:"Barrier completely removed from starting position",options:[{label:"No",value:0},{label:"Yes",value:5}]},
      {key:"barrierKids",name:"Did not disturb the kids while navigating",options:[{label:"No",value:0},{label:"Yes",value:5}]},
      {key:"barrierRides",name:"Did not disturb the rides while navigating",each:5,maxPoints:15}
    ]
  }
];

function innovatorTasks() {
  return [
    {key:"engineerPosition",name:"Engineer in maintenance zone",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"wallMoved",name:"Wall in maintenance zone not moved",options:[{label:"Moved",value:0},{label:"Not moved",value:10}]},
    {key:"barrier",name:"Crowd control barrier",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"fireExit",name:"Fire exit gate removed",options:[{label:"No",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"locker",name:"Electronic devices in locker",each:5,maxPoints:10},
    {key:"seatLever",name:"Ride seat belt lever turned ON",options:[{label:"No",value:0},{label:"Yes",value:10}]},
    {key:"visitorTicket",name:"Visitor at ticket counter",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"directionalSigns",name:"Directional signs not moved",each:10,maxPoints:20},
    {key:"homeParking",name:"Robot in home area",options:[{label:"Outside",value:0},{label:"Partial or complete",value:10}]}
  ];
}
function techiesTasks() {
  return [
    {key:"visitors",name:"Visitors transported to correct rides",eachItem:["Visitor 1","Visitor 2"],options:[{label:"Not transported",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"engineer",name:"Engineer in ride maintenance zone",options:[{label:"Outside",value:0},{label:"Partial",value:5},{label:"Complete",value:10}]},
    {key:"materials",name:"Construction materials in construction zone",each:5,maxPoints:10},
    {key:"powerLever",name:"Main power supply lever turned OFF",options:[{label:"No",value:0},{label:"Yes",value:15}]},
    {key:"directionalSigns",name:"Directional signs not moved",each:10,maxPoints:20},
    {key:"parking",name:"Robot in Start & Finish Area",options:[{label:"Outside",value:0},{label:"Partial or complete",value:15}]},
    {key:"bonus",name:"Fence not moved or damaged",options:[{label:"Moved/damaged",value:0},{label:"Not moved/damaged",value:40}]}
  ];
}
