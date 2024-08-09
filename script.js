async function decryptWhitelist(encryptedWhitelist, key) {
  const encryptedData = Uint8Array.from(atob(encryptedWhitelist), (c) =>
    c.charCodeAt(0)
  );
  const iv = encryptedData.slice(0, 16);
  const encrypted = encryptedData.slice(16);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv },
    cryptoKey,
    encrypted
  );

  const decodedWhitelist = new TextDecoder().decode(decrypted);

  return decodedWhitelist.split(",");
}

async function fetchKeyAndEncryptedWhitelist(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  const lines = text.split("\n");

  const key = lines[0].trim();

  const encryptedWhitelist = lines[1].trim();

  return { key, encryptedWhitelist };
}

const csvFilePath = "./new_white.csv";

let allowedEmails = [];

fetchKeyAndEncryptedWhitelist(csvFilePath)
  .then(async ({ key, encryptedWhitelist }) => {
    allowedEmails = await decryptWhitelist(encryptedWhitelist, key);
  })
  .catch((error) => {
    console.error("Error while decrypting whitelist:", error);
  });

function handleCredentialResponse(response) {
  const responsePayload = parseJwt(response.credential);

  if (allowedEmails.includes(responsePayload.email)) {
    document.getElementById("g_id_onload").style.display = "none";
    document.getElementById("content-container").style.display = "block";
  } else {
    document.getElementById("g_id_onload").style.display = "none";
    document.getElementById("error-container").style.display = "block";
  }
}

function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

let csvData = [];
let skillData = [];
let currentLabels = [];
const hintLevels = [1, 0.9, 0.8, 0.8, 0.7, 0.6];

window.onload = function () {
  fetch("スキルデータ.csv")
    .then((response) => response.text())
    .then((text) => {
      skillData = parseSkillCSV(text);
    });

  fetch("計算結果.csv")
    .then((response) => response.text())
    .then((text) => {
      csvData = parseResultCSVWithKey(text);
      populateIdSelect();
    });
};

document
  .getElementById("toggle-view-button")
  .addEventListener("click", function () {
    const cardContainer = document.getElementById("card-container");
    const tableContainer = document.getElementById("table-container");
    if (cardContainer.style.display === "none") {
      cardContainer.style.display = "flex";
      tableContainer.style.display = "none";
    } else {
      cardContainer.style.display = "none";
      tableContainer.style.display = "block";
      updateTable();
    }
  });

function updateTable() {
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = "";

  const cards = Array.from(document.getElementsByClassName("card"));

  cards.forEach((card) => {
    const key = card.dataset.key;
    const label = card.dataset.label;
    const spValue = card.dataset.sp;

    if (!key || !label || !spValue) {
      return;
    }

    const selectedRadio = card.querySelector(
      'input[name^="length-option-"]:checked'
    );

    if (!selectedRadio) {
      return;
    }

    const businValue = card.querySelector(
      `#${selectedRadio.value}-${key}`
    ).textContent;

    const businSpValue = card.querySelector(`#busin-sp-${key}`).textContent;

    const hintLevelSelect = card.querySelector(`#hint-level-${key}`);

    const hintLevel = hintLevelSelect ? hintLevelSelect.value : "";

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${label}</td>
            <td>${businValue}</td>
            <td>${businSpValue}</td>
            <td>
                <select class="form-control" onchange="updateTableRow(this, '${key}')">
                    ${hintLevels
                      .map(
                        (level, index) =>
                          `<option value="${level}" ${
                            hintLevel == level ? "selected" : ""
                          }>${index}</option>`
                      )
                      .join("")}
                </select>
            </td>
        `;
    tableBody.appendChild(row);
  });
}

function updateTableRow(selectElement, key) {
  const hintLevel = parseFloat(selectElement.value);
  const card = document.querySelector(`.card[data-key="${key}"]`);
  const spValue = parseInt(card.dataset.sp);
  const displaySpValue = Math.round(spValue * hintLevel);

  document.getElementById(`sp-value-${key}`).textContent = displaySpValue;
  updateBusinSpValue(key, displaySpValue);
  updateTable();
}

function parseSkillCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });
    return obj;
  });
}

function parseResultCSVWithKey(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    let obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });
    obj["key"] = `${obj.id}-${obj.skill_id}`;
    return obj;
  });
}

function populateIdSelect() {
  const uniqueIds = [...new Set(csvData.map((item) => item.id))].sort(
    (a, b) => a - b
  );
  const idSelect = document.getElementById("id-select");
  idSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "選択してください";
  idSelect.appendChild(defaultOption);
  uniqueIds.forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = id;
    idSelect.appendChild(option);
  });
  idSelect.addEventListener("change", function () {
    const selectedId = this.value;
    updateLabelOptions(selectedId);
  });
}

function updateLabelOptions(selectedId) {
  const labelInput = document.getElementById("label-input");
  const labelDatalist = document.getElementById("label-datalist");
  labelDatalist.innerHTML = "";

  if (selectedId) {
    const uniqueSkillLabelCombinations = [
      ...new Set(
        csvData
          .filter((item) => item.id == selectedId)
          .map((item) => `${item.skill_id}-${item.label}`)
      ),
    ];

    currentLabels = uniqueSkillLabelCombinations;

    uniqueSkillLabelCombinations.forEach((combination) => {
      const option = document.createElement("option");
      option.value = combination;
      labelDatalist.appendChild(option);
    });
  }
  validateInput();
}

document.getElementById("label-input").addEventListener("input", function () {
  const inputValue = this.value.toLowerCase();
  const filteredLabels = currentLabels.filter((label) =>
    label.toLowerCase().includes(inputValue)
  );
  const labelDatalist = document.getElementById("label-datalist");
  labelDatalist.innerHTML = "";
  filteredLabels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    labelDatalist.appendChild(option);
  });
  validateInput();
});

function validateInput() {
  const selectedId = document.getElementById("id-select").value;
  const selectedLabelCombination = document.getElementById("label-input").value;
  const addButton = document.getElementById("add-button");

  const isValid = currentLabels.includes(selectedLabelCombination);

  addButton.disabled = !(selectedId && isValid);
}

document.getElementById("add-button").addEventListener("click", function () {
  const selectedId = document.getElementById("id-select").value;
  const selectedLabelCombination = document.getElementById("label-input").value;
  if (selectedId && selectedLabelCombination) {
    const [skillId, selectedLabel] = selectedLabelCombination.split("-");
    const initialSkill = csvData.find(
      (item) =>
        item.id == selectedId &&
        item.label == selectedLabel &&
        item.skill_id == skillId
    );
    addCard(initialSkill.key, selectedLabel, initialSkill.skill_id);
    handleSkillChain(selectedId, selectedLabel);

    document.getElementById("label-input").value = "";
    updateLabelOptions(selectedId);
    validateInput();
  }
});

function addCard(key, label, skillId) {
  const cardContainer = document.getElementById("card-container");
  const matchingItems = csvData.filter((item) => item.key === key);

  const lengths = matchingItems
    .map((item) => parseFloat(item.length))
    .filter((length) => !isNaN(length));

  let average = 0;
  let median = 0;
  let max = 0;

  if (lengths.length > 0) {
    average = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    lengths.sort((a, b) => a - b);
    median = lengths[Math.floor(lengths.length / 2)];
    max = Math.max(...lengths);
  }

  const skill = skillData.find((item) => item.id == skillId);
  const spValue = skill ? parseInt(skill.SP) : "N/A";

  const cardCol = document.createElement("div");
  cardCol.className = "col-md-6 col-lg-4 mb-4";

  const card = document.createElement("div");
  card.className = "card border-primary shadow-sm";
  card.dataset.key = key;
  card.dataset.label = label;
  card.dataset.average = average.toFixed(2);
  card.dataset.median = median.toFixed(2);
  card.dataset.max = max.toFixed(2);
  card.dataset.sp = spValue;
  card.dataset.skillId = skillId;

  if (!skill || skill["SP"] === "") {
    card.style.backgroundImage =
      "linear-gradient(45deg, rgba(255, 0, 0, 0.2), rgba(255, 165, 0, 0.2), rgba(255, 255, 0, 0.2), rgba(0, 128, 0, 0.2), rgba(0, 0, 255, 0.2), rgba(75, 0, 130, 0.2), rgba(238, 130, 238, 0.2))";
  } else if (skill["下位スキル"] && skill["下位スキル"] !== "") {
    card.style.backgroundColor = "rgba(255, 248, 220, 0.7)";
  }

  card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">ラベル: ${label}</h5>
            <p class="card-text">
                <strong>SP:</strong> <span id="sp-value-${key}">${spValue}</span><br>
                <strong>バ身/SP:</strong> <span id="busin-sp-${key}"></span><br>
            </p>
            <div class="form-check">
                <input class="form-check-input" type="radio" name="length-option-${key}" value="average" checked>
                <label class="form-check-label" for="average-${key}">平均バ身: <span id="average-${key}">${average.toFixed(
    2
  )}</span></label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" name="length-option-${key}" value="median">
                <label class="form-check-label" for="median-${key}">中央値バ身: <span id="median-${key}">${median.toFixed(
    2
  )}</span></label>
            </div>
            <div class="form-check">
                <input class="form-check-input" type="radio" name="length-option-${key}" value="max">
                <label class="form-check-label" for="max-${key}">最大バ身: <span id="max-${key}">${max.toFixed(
    2
  )}</span></label>
            </div>
            <div class="form-group">
                <label for="hint-level-${key}">ヒントレベル:</label>
                <select id="hint-level-${key}" class="form-control">
                    ${hintLevels
                      .map(
                        (level, index) =>
                          `<option value="${level}">${index}</option>`
                      )
                      .join("")}
                </select>
            </div>
            <button class="btn btn-danger mt-2" onclick="removeCard('${key}')">削除</button>
        </div>
    `;
  cardCol.appendChild(card);
  cardContainer.appendChild(cardCol);

  updateBusinSpValue(key, spValue);

  document
    .getElementById(`hint-level-${key}`)
    .addEventListener("change", function () {
      const hintLevel = parseFloat(this.value);
      const displaySpValue = Math.round(spValue * hintLevel);
      document.getElementById(`sp-value-${key}`).textContent = displaySpValue;
      updateBusinSpValue(key, displaySpValue);
    });

  document
    .querySelectorAll(`input[name="length-option-${key}"]`)
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        updateBusinSpValue(
          key,
          document.getElementById(`sp-value-${key}`).textContent
        );
      });
    });
}

function updateBusinSpValue(key, spValue) {
  const selectedRadio = document.querySelector(
    `input[name="length-option-${key}"]:checked`
  );
  const businValue = document.getElementById(
    `${selectedRadio.value}-${key}`
  ).textContent;
  const businSpValue = (
    (parseFloat(businValue) / parseFloat(spValue)) *
    100
  ).toFixed(2);
  document.getElementById(`busin-sp-${key}`).textContent = businSpValue;
  document.querySelector(`.card[data-key="${key}"]`).dataset.businSp =
    businSpValue;
}

function updateParentCardValues(
  parentKey,
  childAverage,
  childMedian,
  childMax
) {
  const parentCardAverageElem = document.getElementById(`average-${parentKey}`);
  const parentCardMedianElem = document.getElementById(`median-${parentKey}`);
  const parentCardMaxElem = document.getElementById(`max-${parentKey}`);

  if (parentCardAverageElem) {
    const parentAverage = parseFloat(parentCardAverageElem.textContent);
    const newAverage = parentAverage - childAverage;
    parentCardAverageElem.textContent = newAverage.toFixed(2);
  }

  if (parentCardMedianElem) {
    const parentMedian = parseFloat(parentCardMedianElem.textContent);
    const newMedian = parentMedian - childMedian;
    parentCardMedianElem.textContent = newMedian.toFixed(2);
  }

  if (parentCardMaxElem) {
    const parentMax = parseFloat(parentCardMaxElem.textContent);
    const newMax = parentMax - childMax;
    parentCardMaxElem.textContent = newMax.toFixed(2);
  }

  const parentSpValue = parseInt(
    document.getElementById(`sp-value-${parentKey}`).textContent
  );
  updateBusinSpValue(parentKey, parentSpValue);
}

function handleSkillChain(selectId, initialLabel) {
  let currentSkill = csvData.find(
    (item) => item.id == selectId && item.label == initialLabel
  );

  if (!currentSkill) return;

  let skillId = currentSkill.skill_id;

  const parentKey = `${currentSkill.id}-${currentSkill.skill_id}`;

  while (skillId) {
    const skill = skillData.find((item) => item.id == skillId);

    if (!skill) break;

    const subSkill = skillData.find(
      (item) => item.スキル名 == skill["下位スキル"]
    );

    if (!subSkill) break;

    const subSkillId = subSkill.id;

    const combinedId = `${selectId}-${subSkillId}`;

    const combinedSkill = csvData.find((item) => item.key == combinedId);

    if (combinedSkill) {
      addCard(combinedId, combinedSkill.label, subSkillId);

      const childMatchingItems = csvData.filter(
        (item) => item.key === combinedId
      );
      const childLengths = childMatchingItems
        .map((item) => parseFloat(item.length))
        .filter((length) => !isNaN(length));
      let childAverage = 0;
      let childMedian = 0;
      let childMax = 0;

      if (childLengths.length > 0) {
        childAverage =
          childLengths.reduce((a, b) => a + b, 0) / childLengths.length;
        childLengths.sort((a, b) => a - b);
        childMedian = childLengths[Math.floor(childLengths.length / 2)];
        childMax = Math.max(...childLengths);
      }

      updateParentCardValues(parentKey, childAverage, childMedian, childMax);

      skillId = subSkillId;
    } else {
      break;
    }
  }
}

function removeCard(key) {
  const cardToRemove = document.querySelector(`.card[data-key="${key}"]`);
  if (!cardToRemove) return;

  let subSkillList = [];

  const cards = Array.from(document.getElementsByClassName("card"));
  cards.forEach((card) => {
    const skillId = card.dataset.skillId;
    const skill = skillData.find((item) => item.id == skillId);
    if (skill && skill["下位スキル"] && skill["下位スキル"] !== "") {
      subSkillList.push(skill["下位スキル"]);
    }
  });

  const skillIdToRemove = csvData.find((item) => item.key == key).skill_id;
  const skillToRemove = skillData.find((item) => item.id == skillIdToRemove);
  const skillName = skillToRemove ? skillToRemove["スキル名"] : "";

  if (subSkillList.includes(skillName)) {
    alert(`このカードには上位スキルが存在します: ${skillName}`);
    return;
  }
  cardToRemove.parentElement.remove();
}

document.getElementById("sort-label").addEventListener("click", function () {
  sortCards("label");
});
document.getElementById("sort-length").addEventListener("click", function () {
  sortCards("length");
});
document.getElementById("sort-sp").addEventListener("click", function () {
  sortCards("sp");
});
document.getElementById("sort-busin-sp").addEventListener("click", function () {
  sortCards("businSp");
});

function sortCards(criteria) {
  const cardContainer = document.getElementById("card-container");
  const cards = Array.from(cardContainer.getElementsByClassName("card"));
  cards.forEach((card) => {});

  cards.sort((a, b) => {
    let aValue, bValue;
    if (criteria === "length") {
      const aRadio = a.querySelector('input[name^="length-option-"]:checked');
      const bRadio = b.querySelector('input[name^="length-option-"]:checked');
      aValue = parseFloat(
        a.querySelector(`#${aRadio.value}-${a.dataset.key}`).textContent
      );
      bValue = parseFloat(
        b.querySelector(`#${bRadio.value}-${b.dataset.key}`).textContent
      );
      return bValue - aValue;
    } else if (criteria === "businSp") {
      aValue = parseFloat(
        a.querySelector("#busin-sp-" + a.dataset.key).textContent
      );
      bValue = parseFloat(
        b.querySelector("#busin-sp-" + b.dataset.key).textContent
      );
      return bValue - aValue;
    } else if (criteria === "sp") {
      aValue = parseFloat(
        a.querySelector("#sp-value-" + a.dataset.key).textContent
      );
      bValue = parseFloat(
        b.querySelector("#sp-value-" + b.dataset.key).textContent
      );
      return aValue - bValue;
    } else {
      aValue = a.dataset[criteria];
      bValue = b.dataset[criteria];
      return aValue.localeCompare(bValue);
    }
  });

  cardContainer.innerHTML = "";
  cards.forEach((card) => {
    cardContainer.appendChild(card.parentElement);
  });
}

document.getElementById("sort-label").addEventListener("click", function () {
  sortTable("label");
});
document.getElementById("sort-length").addEventListener("click", function () {
  sortTable("length");
});
document.getElementById("sort-sp").addEventListener("click", function () {
  sortTable("sp");
});
document.getElementById("sort-busin-sp").addEventListener("click", function () {
  sortTable("businSp");
});

function sortTable(criteria) {
  const tableBody = document.getElementById("table-body");
  const rows = Array.from(tableBody.getElementsByTagName("tr"));

  rows.sort((a, b) => {
    let aValue, bValue;
    if (criteria === "label") {
      aValue = a.cells[0].textContent;
      bValue = b.cells[0].textContent;
      return aValue.localeCompare(bValue);
    } else if (criteria === "length") {
      aValue = parseFloat(a.cells[1].textContent);
      bValue = parseFloat(b.cells[1].textContent);
      return bValue - aValue;
    } else if (criteria === "businSp") {
      aValue = parseFloat(a.cells[2].textContent);
      bValue = parseFloat(b.cells[2].textContent);
      return bValue - aValue;
    } else if (criteria === "sp") {
      aValue = parseInt(a.cells[3].textContent);
      bValue = parseInt(b.cells[3].textContent);
      return aValue - bValue;
    }
  });

  tableBody.innerHTML = "";
  rows.forEach((row) => {
    tableBody.appendChild(row);
  });
}
