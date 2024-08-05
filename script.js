document
  .getElementById("calc-result-file-input")
  .addEventListener("change", handleCalcResultFileSelect);

let csvData = [];
let skillData = [];
let currentLabels = [];

// スキルデータを自動で読み込む
window.onload = function () {
  fetch("スキルデータ.csv")
    .then((response) => response.text())
    .then((text) => {
      skillData = parseSkillCSV(text);
      console.log("Skill Data:", skillData);
    });
};

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
    currentLabels = [
      ...new Set(
        csvData
          .filter((item) => item.id == selectedId)
          .map((item) => item.label)
      ),
    ];
    currentLabels.forEach((label) => {
      const option = document.createElement("option");
      option.value = label;
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
  const selectedLabel = document.getElementById("label-input").value;
  const addButton = document.getElementById("add-button");
  if (selectedId && currentLabels.includes(selectedLabel)) {
    addButton.disabled = false;
  } else {
    addButton.disabled = true;
  }
}

// 追加ボタンのクリックイベントリスナー
document.getElementById("add-button").addEventListener("click", function () {
  const selectedId = document.getElementById("id-select").value;
  const selectedLabel = document.getElementById("label-input").value;
  if (selectedId && selectedLabel) {
    const initialSkill = csvData.find(
      (item) => item.id == selectedId && item.label == selectedLabel
    );
    addCard(initialSkill.key, selectedLabel);
    handleSkillChain(selectedId, selectedLabel);
    // ラベル入力欄を空にし、予測変換も初期化する
    document.getElementById("label-input").value = "";
    updateLabelOptions(selectedId); // 予測変換の候補を再初期化
    validateInput(); // 入力欄が空になったことを反映
  }
});

// カードを追加する関数
function addCard(id, label) {
  const cardContainer = document.getElementById("card-container");
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
        <strong>ID:</strong> ${id} <br>
        <strong>ラベル:</strong> ${label} <br>
        <label for="hint-level-${id}">ヒントレベル:</label>
        <select id="hint-level-${id}">
            <option value="0">無し</option>
            <option value="1">Lv1</option>
            <option value="2">Lv2</option>
            <option value="3">Lv3</option>
            <option value="4">Lv4</option>
            <option value="5">Lv5</option>
        </select>
    `;
  cardContainer.appendChild(card);
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
      addCard(combinedId, combinedSkill.label);
      // 次のスキルIDを更新してループを続ける
      skillId = subSkillId;
    } else {
      // 組み合わせスキルが存在しない場合、ループを終了
      break;
    }
  }
}
