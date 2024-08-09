// ホワイトリスト（許可されたメールアドレスのリスト）
const allowedEmails = [
  "ogatetsunietono@gmail.com",
  "another.allowed@example.com",
  // 追加の許可メールアドレスをここに記載
];

// Google Sign-Inからのレスポンスを処理する関数
function handleCredentialResponse(response) {
  // JWT IDトークンを取得
  console.log("Encoded JWT ID token: " + response.credential);

  // トークンをデコードし、必要に応じてユーザー情報を取得
  const responsePayload = parseJwt(response.credential);

  // デコードしたユーザー情報をコンソールに表示
  console.log("Decoded JWT Payload:", responsePayload);
  console.log("User Email: " + responsePayload.email);

  // メールアドレスがホワイトリストにあるか確認
  if (allowedEmails.includes(responsePayload.email)) {
    console.log("Email is in the allowed list. Access granted.");
    // サインインに成功したらコンテンツを表示し、サインインボタンを非表示にする
    document.getElementById("g_id_onload").style.display = "none";
    document.getElementById("content-container").style.display = "block";
  } else {
    console.log("Email is NOT in the allowed list. Access denied.");
    // 許可されていないメールアドレスの場合、エラーメッセージを表示
    document.getElementById("g_id_onload").style.display = "none";
    document.getElementById("error-container").style.display = "block";
  }
}

// JWTトークンをデコードする関数
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

// 計算ツールのためのスクリプト

document
  .getElementById("calc-result-file-input")
  .addEventListener("change", handleCalcResultFileSelect);

let csvData = [];
let skillData = [];
let currentLabels = [];
const hintLevels = [1, 0.9, 0.8, 0.8, 0.7, 0.6];

// スキルデータを自動で読み込む
window.onload = function () {
  fetch("スキルデータ.csv")
    .then((response) => response.text())
    .then((text) => {
      skillData = parseSkillCSV(text);
      console.log("Skill Data:", skillData);
    });
};

// 表示形式を切り替えるボタンのイベントリスナー
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

// テーブルを更新する関数
function updateTable() {
  console.log("Updating table...");
  const tableBody = document.getElementById("table-body");
  tableBody.innerHTML = ""; // 既存の行をクリア

  const cards = Array.from(document.getElementsByClassName("card"));
  console.log("Cards found:", cards);

  cards.forEach((card) => {
    const key = card.dataset.key;
    const label = card.dataset.label;
    const spValue = card.dataset.sp;

    console.log(
      `Processing card - Key: ${key}, Label: ${label}, SP: ${spValue}`
    );

    if (!key || !label || !spValue) {
      console.log("Skipping invalid card");
      return;
    }

    const selectedRadio = card.querySelector(
      'input[name^="length-option-"]:checked'
    );
    console.log("Selected Radio:", selectedRadio);

    if (!selectedRadio) {
      console.log("No selected radio button found");
      return;
    }

    const businValue = card.querySelector(
      `#${selectedRadio.value}-${key}`
    ).textContent;
    console.log("Busin Value:", businValue);

    const businSpValue = card.querySelector(`#busin-sp-${key}`).textContent;
    console.log("Busin/SP Value:", businSpValue);

    const hintLevelSelect = card.querySelector(`#hint-level-${key}`);
    console.log("Hint Level Select:", hintLevelSelect);

    const hintLevel = hintLevelSelect ? hintLevelSelect.value : "";
    console.log("Hint Level:", hintLevel);

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

// テーブルの行を更新する関数
function updateTableRow(selectElement, key) {
  const hintLevel = parseFloat(selectElement.value);
  const card = document.querySelector(`.card[data-key="${key}"]`);
  const spValue = parseInt(card.dataset.sp);
  const displaySpValue = Math.round(spValue * hintLevel);

  document.getElementById(`sp-value-${key}`).textContent = displaySpValue;
  updateBusinSpValue(key, displaySpValue);
  updateTable(); // テーブルを更新
}

// スキルデータCSVをパースする関数
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

// 計算結果CSVをパースし、key列を追加する関数
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

// 計算結果ファイルが選択されたときの処理
function handleCalcResultFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    csvData = parseResultCSVWithKey(text);
    console.log("CSV Data:", csvData);
    populateIdSelect();
  };
  reader.readAsText(file);
}

// ユニークなIDを取得し、昇順にソートしてIDセレクトボックスにオプションを追加
function populateIdSelect() {
  const uniqueIds = [...new Set(csvData.map((item) => item.id))].sort(
    (a, b) => a - b
  );
  const idSelect = document.getElementById("id-select");
  idSelect.innerHTML = ""; // 既存のオプションをクリア
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

// ラベルの選択肢を更新
function updateLabelOptions(selectedId) {
  const labelInput = document.getElementById("label-input");
  const labelDatalist = document.getElementById("label-datalist");
  labelDatalist.innerHTML = ""; // 既存のオプションをクリア

  if (selectedId) {
    // skill_id + labelの組み合わせがユニークなものを作成
    const uniqueSkillLabelCombinations = [
      ...new Set(
        csvData
          .filter((item) => item.id == selectedId)
          .map((item) => `${item.skill_id}-${item.label}`)
      ),
    ];

    // currentLabels を skill_id + label で設定
    currentLabels = uniqueSkillLabelCombinations;

    // プルダウンに候補を追加 (skill_id + label を表示)
    uniqueSkillLabelCombinations.forEach((combination) => {
      const option = document.createElement("option");
      option.value = combination; // skill_id + label の組み合わせを表示
      labelDatalist.appendChild(option);
    });
  }
  validateInput();
}

// 入力フィールドのイベントリスナー
document.getElementById("label-input").addEventListener("input", function () {
  const inputValue = this.value.toLowerCase();
  const filteredLabels = currentLabels.filter((label) =>
    label.toLowerCase().includes(inputValue)
  );
  const labelDatalist = document.getElementById("label-datalist");
  labelDatalist.innerHTML = ""; // 既存のオプションをクリア
  filteredLabels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    labelDatalist.appendChild(option);
  });
  validateInput();
});

// 入力値を検証して追加ボタンの有効・無効を切り替える関数
function validateInput() {
  const selectedId = document.getElementById("id-select").value;
  const selectedLabelCombination = document.getElementById("label-input").value;
  const addButton = document.getElementById("add-button");

  // 入力された値が currentLabels に存在するかチェック
  const isValid = currentLabels.includes(selectedLabelCombination);

  addButton.disabled = !(selectedId && isValid);
}

// 追加ボタンのクリックイベントリスナーの修正
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
    console.log("Initial Skill:", initialSkill);
    addCard(initialSkill.key, selectedLabel, initialSkill.skill_id);
    handleSkillChain(selectedId, selectedLabel);
    // ラベル入力欄を空にし、予測変換も初期化する
    document.getElementById("label-input").value = "";
    updateLabelOptions(selectedId); // 予測変換の候補を再初期化
    validateInput(); // 入力欄が空になったことを反映
  }
});

// カードを追加する関数
function addCard(key, label, skillId) {
  const cardContainer = document.getElementById("card-container");
  const matchingItems = csvData.filter((item) => item.key === key);
  console.log("Matching Items:", matchingItems);

  const lengths = matchingItems
    .map((item) => parseFloat(item.length))
    .filter((length) => !isNaN(length));
  console.log("Lengths:", lengths);

  let average = 0;
  let median = 0;
  let max = 0;

  if (lengths.length > 0) {
    average = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    lengths.sort((a, b) => a - b);
    median = lengths[Math.floor(lengths.length / 2)];
    max = Math.max(...lengths);
  }
  console.log("Average:", average);
  console.log("Median:", median);
  console.log("Max:", max);

  const skill = skillData.find((item) => item.id == skillId);
  const spValue = skill ? parseInt(skill.SP) : "N/A";
  console.log("Skill Data:", skill);
  console.log("SP Value:", spValue);

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

  // 背景色を設定
  if (!skill || skill["SP"] === "") {
    card.style.backgroundImage =
      "linear-gradient(45deg, rgba(255, 0, 0, 0.2), rgba(255, 165, 0, 0.2), rgba(255, 255, 0, 0.2), rgba(0, 128, 0, 0.2), rgba(0, 0, 255, 0.2), rgba(75, 0, 130, 0.2), rgba(238, 130, 238, 0.2))";
  } else if (skill["下位スキル"] && skill["下位スキル"] !== "") {
    card.style.backgroundColor = "rgba(255, 248, 220, 0.7)"; // lightgoldenrodyellow を薄く
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

  // バ身/SPを更新する関数を呼び出し
  updateBusinSpValue(key, spValue);

  // ヒントレベルのプルダウンが更新された時のイベントリスナーを追加
  document
    .getElementById(`hint-level-${key}`)
    .addEventListener("change", function () {
      const hintLevel = parseFloat(this.value);
      const displaySpValue = Math.round(spValue * hintLevel);
      document.getElementById(`sp-value-${key}`).textContent = displaySpValue;
      console.log(
        `Hint Level Changed - Key: ${key}, Hint Level: ${hintLevel}, Display SP Value: ${displaySpValue}`
      );
      updateBusinSpValue(key, displaySpValue);
    });

  // ラジオボタンが変更されたときのイベントリスナーを追加
  document
    .querySelectorAll(`input[name="length-option-${key}"]`)
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        console.log(
          `Radio Button Changed - Key: ${key}, Value: ${radio.value}`
        );
        updateBusinSpValue(
          key,
          document.getElementById(`sp-value-${key}`).textContent
        );
      });
    });
}

// バ身/SPを更新する関数
function updateBusinSpValue(key, spValue) {
  console.log(`Updating Busin/SP - Key: ${key}, SP Value: ${spValue}`);
  const selectedRadio = document.querySelector(
    `input[name="length-option-${key}"]:checked`
  );
  console.log(`Selected Radio: ${selectedRadio.value}`);
  const businValue = document.getElementById(
    `${selectedRadio.value}-${key}`
  ).textContent;
  console.log(`Busin Value: ${businValue}`);
  const businSpValue = (
    (parseFloat(businValue) / parseFloat(spValue)) *
    100
  ).toFixed(2);
  console.log(`Busin/SP Value: ${businSpValue}`);
  document.getElementById(`busin-sp-${key}`).textContent = businSpValue;
  document.querySelector(`.card[data-key="${key}"]`).dataset.businSp =
    businSpValue;
}

// 親のカードの平均バ身、中央値バ身、最大バ身を更新する関数
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

  // 親のバ身/SPも更新
  const parentSpValue = parseInt(
    document.getElementById(`sp-value-${parentKey}`).textContent
  );
  updateBusinSpValue(parentKey, parentSpValue);
}

// スキルチェーンを処理する関数
function handleSkillChain(selectId, initialLabel) {
  // 初期のスキルを計算結果データから探す
  let currentSkill = csvData.find(
    (item) => item.id == selectId && item.label == initialLabel
  );
  console.log("Initial Current Skill:", currentSkill);

  // 該当するスキルがなければ終了
  if (!currentSkill) return;

  // 現在のスキルIDを取得
  let skillId = currentSkill.skill_id;

  const parentKey = `${currentSkill.id}-${currentSkill.skill_id}`;

  // スキルチェーンを処理するループ
  while (skillId) {
    console.log("Current Skill ID:", skillId);

    // スキルデータから現在のスキルを取得
    const skill = skillData.find((item) => item.id == skillId);
    console.log("Current Skill Data:", skill);

    // スキルが存在しなければ終了
    if (!skill) break;

    // スキル名が下位スキルに一致する行をスキルデータから取得
    const subSkill = skillData.find(
      (item) => item.スキル名 == skill["下位スキル"]
    );
    console.log("Sub Skill Data:", subSkill);

    // 下位スキルが存在しなければ終了
    if (!subSkill) break;

    // 下位スキルIDを更新
    const subSkillId = subSkill.id;
    console.log("Sub Skill ID:", subSkillId);

    // 組み合わせIDを更新（selectIdとsubSkillIdをハイフンでつなぐ）
    const combinedId = `${selectId}-${subSkillId}`;
    console.log("Combined ID:", combinedId);

    // 計算結果データから組み合わせIDを探す
    const combinedSkill = csvData.find((item) => item.key == combinedId);
    console.log("Combined Skill:", combinedSkill);

    // 組み合わせスキルが存在する場合、カードを追加
    if (combinedSkill) {
      addCard(combinedId, combinedSkill.label, subSkillId);

      // 子の平均バ身、中央値バ身、最大バ身を取得
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

      // 親のカードの平均バ身、中央値バ身、最大バ身を更新
      updateParentCardValues(parentKey, childAverage, childMedian, childMax);

      // 次のスキルIDを更新してループを続ける
      skillId = subSkillId;
    } else {
      // 組み合わせスキルが存在しない場合、ループを終了
      break;
    }
  }
}

// カードを削除する関数
function removeCard(key) {
  const cardToRemove = document.querySelector(`.card[data-key="${key}"]`);
  if (!cardToRemove) return;

  // 下位スキルリストを初期化
  let subSkillList = [];

  // 画面に表示されているカードのskill_idと一致するスキルの下位スキルのみリストに追加
  const cards = Array.from(document.getElementsByClassName("card"));
  cards.forEach((card) => {
    const skillId = card.dataset.skillId;
    const skill = skillData.find((item) => item.id == skillId);
    if (skill && skill["下位スキル"] && skill["下位スキル"] !== "") {
      subSkillList.push(skill["下位スキル"]);
    }
  });

  console.log("Sub Skill List:", subSkillList);

  // 削除するカードのスキル名を取得
  const skillIdToRemove = csvData.find((item) => item.key == key).skill_id;
  const skillToRemove = skillData.find((item) => item.id == skillIdToRemove);
  const skillName = skillToRemove ? skillToRemove["スキル名"] : "";

  // 下位スキルリストに存在するか確認
  if (subSkillList.includes(skillName)) {
    alert(`このカードには上位スキルが存在します: ${skillName}`);
    console.log(`Cannot remove ${key} because it is a sub-skill`);
    return;
  }

  // カードを削除
  console.log("Removing Card:", cardToRemove);
  cardToRemove.parentElement.remove();
}

// ソートボタンのイベントリスナー
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

// カードをソートする関数
function sortCards(criteria) {
  const cardContainer = document.getElementById("card-container");
  const cards = Array.from(cardContainer.getElementsByClassName("card"));

  console.log("Sorting Criteria:", criteria);
  cards.forEach((card) => {
    console.log(
      `Card Data - Key: ${card.dataset.key}, Label: ${card.dataset.label}, Average: ${card.dataset.average}, Median: ${card.dataset.median}, Max: ${card.dataset.max}, SP: ${card.dataset.sp}, BusinSp: ${card.dataset.businSp}`
    );
  });

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
      return bValue - aValue; // 大きい順に並べ替え
    } else if (criteria === "businSp") {
      aValue = parseFloat(
        a.querySelector("#busin-sp-" + a.dataset.key).textContent
      );
      bValue = parseFloat(
        b.querySelector("#busin-sp-" + b.dataset.key).textContent
      );
      return bValue - aValue; // 大きい順に並べ替え
    } else if (criteria === "sp") {
      aValue = parseFloat(
        a.querySelector("#sp-value-" + a.dataset.key).textContent
      );
      bValue = parseFloat(
        b.querySelector("#sp-value-" + b.dataset.key).textContent
      );
      return aValue - bValue; // 小さい順に並べ替え
    } else {
      aValue = a.dataset[criteria];
      bValue = b.dataset[criteria];
      return aValue.localeCompare(bValue); // アルファベット順に並べ替え
    }
  });

  // 並び替えたカードをコンテナに再追加
  cardContainer.innerHTML = "";
  cards.forEach((card) => {
    cardContainer.appendChild(card.parentElement);
    console.log(`Appended Card - Key: ${card.dataset.key}`);
  });
}

// テーブルヘッダーにソート機能を追加
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

// テーブルをソートする関数
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
      return bValue - aValue; // 大きい順に並べ替え
    } else if (criteria === "businSp") {
      aValue = parseFloat(a.cells[2].textContent);
      bValue = parseFloat(b.cells[2].textContent);
      return bValue - aValue; // 大きい順に並べ替え
    } else if (criteria === "sp") {
      aValue = parseInt(a.cells[3].textContent);
      bValue = parseInt(b.cells[3].textContent);
      return aValue - bValue; // 小さい順に並べ替え
    }
  });

  // 並び替えた行をテーブルに再追加
  tableBody.innerHTML = "";
  rows.forEach((row) => {
    tableBody.appendChild(row);
  });
}
