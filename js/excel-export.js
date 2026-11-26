import { getScoreTaskColumns } from "./scoring.js";

const workbookNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationshipNamespace = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRelationshipNamespace = "http://schemas.openxmlformats.org/package/2006/relationships";
const contentTypeNamespace = "http://schemas.openxmlformats.org/package/2006/content-types";
const shortTaskLabels = {
  trashRemoved: "Park Trash",
  trashKids: "Park Kids Safe",
  trashBin: "Recycle Bin",
  visitorPicked: "Visitor Picked",
  visitorRides: "Visitor Rides Safe",
  visitorKids: "Visitor Kids Safe",
  visitorCounter: "Ticket Counter",
  powerOff: "Switches Off",
  powerRides: "Power Rides Safe",
  barrierRemoved: "Barrier Removed",
  barrierKids: "Barrier Kids Safe",
  barrierRides: "Barrier Rides Safe",
  engineerPosition: "Engineer Zone",
  wallMoved: "Wall Unmoved",
  barrier: "Crowd Barrier",
  fireExit: "Fire Gate",
  locker: "Devices Locker",
  seatLever: "Seat Belt Lever",
  visitorTicket: "Ticket Counter",
  directionalSigns: "Signs",
  homeParking: "Home Area",
  partialVisitors: "Visitors Partial",
  completeVisitors: "Visitors Complete",
  engineer: "Engineer Zone",
  materials: "Materials Zone",
  powerLever: "Power Lever",
  parking: "Start / Finish",
  fences: "Fences"
};
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

export function createScoresWorkbook(categories, results) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("At least one category is required for the score workbook.");
  }
  const sheets = categories.map((category, index) => ({
    key: category,
    name: category === "Explorer" ? "Explorers" : category === "Innovator" ? "Innovators" : category,
    id: index + 1
  }));
  const files = [
    { name: "[Content_Types].xml", content: contentTypesXml(sheets) },
    { name: "_rels/.rels", content: rootRelationshipsXml() },
    { name: "xl/workbook.xml", content: workbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelationshipsXml(sheets) },
    { name: "xl/styles.xml", content: stylesXml() },
    ...sheets.map(sheet => {
      const worksheet = categoryRows(sheet.key, sheet.name, results);
      return {
        name: `xl/worksheets/sheet${sheet.id}.xml`,
        content: worksheetXml(worksheet.rows, worksheet.widths)
      };
    })
  ];
  return createZip(files);
}

function categoryRows(category, label, results) {
  const taskColumns = getScoreTaskColumns(category).map(task => ({
    ...task,
    shortName: shortTaskLabels[task.key] || task.name
  }));
  const headers = [
    "Team Name",
    ...(category === "Explorer" ? ["Selected Task"] : []),
    ...taskColumns.map(task => task.shortName),
    "Total Score", "Run Time (MM:SS:MMM)", "Submitted At", "Task Details"
  ];
  const rows = [
    [{ value: `IRO 2026 — ${label} Scores`, style: 2 }],
    [],
    [{ value: "Round 1", style: 2 }],
    headers.map(value => ({ value, style: 1 }))
  ];
  rows.push(...roundRows(category, 1, results, taskColumns));
  rows.push([]);
  rows.push([{ value: "Round 2", style: 2 }]);
  rows.push(headers.map(value => ({ value, style: 1 })));
  rows.push(...roundRows(category, 2, results, taskColumns));
  const widths = [
    28,
    ...(category === "Explorer" ? [24] : []),
    ...taskColumns.map(() => 18),
    13, 22, 26, 60
  ];
  return { rows, widths };
}

function roundRows(category, roundNumber, results, taskColumns) {
  return results
    .filter(result => result.category === category && Number(result.roundNumber) === roundNumber)
    .sort((a, b) => String(a.teamName || "").localeCompare(String(b.teamName || "")))
    .map(result => resultRow(result, category, taskColumns));
}

function resultRow(result, category, taskColumns) {
  const breakdown = result.taskBreakdown && typeof result.taskBreakdown === "object"
    ? result.taskBreakdown
    : {};
  return [
    String(result.teamName || result.teamId || ""),
    ...(category === "Explorer" ? [String(breakdown.selectedTask || "")] : []),
    ...taskColumns.map(task => numericCell(breakdown[task.key]?.value)),
    numericCell(result.totalScore),
    formatRunTime(result),
    formatSubmittedAt(result.submissionTimestamp),
    formatTaskDetails(breakdown, taskColumns)
  ];
}

function formatTaskDetails(breakdown, taskColumns) {
  return taskColumns.flatMap(taskColumn => {
    const task = breakdown[taskColumn.key];
    if (!task) return [];
    if (Array.isArray(task.items) && task.items.length) {
      return task.items.map(item =>
        `${taskColumn.shortName} / ${item.label}: ${item.option || `${item.value} pts`}`
      );
    }
    return [`${taskColumn.shortName}: ${task.option || `${task.value} pts`}`];
  }).join("; ");
}

function numericCell(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function formatRunTime(result) {
  const savedTime = result.actualTimeMilliseconds ?? result.actualTimeTaken ?? result.actualTimeSeconds;
  if (savedTime === null || savedTime === undefined || savedTime === "") return "";
  const milliseconds = Number(
    result.actualTimeMilliseconds ?? Number(savedTime) * 1000
  );
  if (!Number.isFinite(milliseconds)) return "";
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const remainder = Math.floor(milliseconds % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(remainder).padStart(3, "0")}`;
}

function formatSubmittedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function worksheetXml(rows, columnWidths) {
  const columns = columnWidths.map((width, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
  ).join("");
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => cellXml(cell, rowIndex + 1, columnIndex + 1)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${workbookNamespace}"><dimension ref="A1:${columnName(columnWidths.length)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="1" topLeftCell="B1" activePane="topRight" state="frozen"/><selection pane="topRight" activeCell="B1" sqref="B1"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columns}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
}

function cellXml(cell, row, column) {
  const item = cell && typeof cell === "object" ? cell : { value: cell };
  const reference = `${columnName(column)}${row}`;
  const style = item.style ? ` s="${item.style}"` : "";
  if (item.value === null || item.value === undefined || item.value === "") {
    return item.style ? `<c r="${reference}"${style}/>` : "";
  }
  if (typeof item.value === "number" && Number.isFinite(item.value)) {
    return `<c r="${reference}"${style} t="n"><v>${item.value}</v></c>`;
  }
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(item.value)}</t></is></c>`;
}

function columnName(column) {
  let name = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    column = Math.floor((column - 1) / 26);
  }
  return name;
}

function xmlEscape(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function contentTypesXml(sheets) {
  const sheetTypes = sheets.map(sheet =>
    `<Override PartName="/xl/worksheets/sheet${sheet.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${contentTypeNamespace}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetTypes}</Types>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${packageRelationshipNamespace}"><Relationship Id="rId1" Type="${relationshipNamespace}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function workbookXml(sheets) {
  const sheetTags = sheets.map(sheet =>
    `<sheet name="${xmlEscape(sheet.name)}" sheetId="${sheet.id}" r:id="rId${sheet.id}"/>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${workbookNamespace}" xmlns:r="${relationshipNamespace}"><bookViews><workbookView/></bookViews><sheets>${sheetTags}</sheets><calcPr calcId="0"/></workbook>`;
}

function workbookRelationshipsXml(sheets) {
  const sheetRelationships = sheets.map(sheet =>
    `<Relationship Id="rId${sheet.id}" Type="${relationshipNamespace}/worksheet" Target="worksheets/sheet${sheet.id}.xml"/>`
  ).join("");
  const stylesId = sheets.length + 1;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${packageRelationshipNamespace}">${sheetRelationships}<Relationship Id="rId${stylesId}" Type="${relationshipNamespace}/styles" Target="styles.xml"/></Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${workbookNamespace}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const contents = encoder.encode(file.content);
    const crc = crc32(contents);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0x21, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contents.length, true);
    localView.setUint32(22, contents.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(name, 30);
    localParts.push(localHeader, contents);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0x21, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contents.length, true);
    centralView.setUint32(24, contents.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + contents.length;
  }
  const centralDirectory = concatenateBytes(centralParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);
  return concatenateBytes([...localParts, centralDirectory, endRecord]);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function concatenateBytes(parts) {
  const totalLength = parts.reduce((length, part) => length + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
