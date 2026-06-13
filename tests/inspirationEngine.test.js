const assert = require("assert");
const {
  addAnswer,
  createAdventure,
  detectEssayType,
  generateHarvestCard,
  isAdventureComplete
} = require("../utils/inspirationEngine");

function runFullAdventure(title, expectedType) {
  let adventure = createAdventure({ title, grade: "四年级", requirement: "" });
  assert.strictEqual(adventure.typeId, expectedType);
  const sampleAnswers = ["一句常说的话", "厨房里的背影", "轻轻皱眉的小动作", "一次下雨接我", "我觉得很温暖"];
  sampleAnswers.forEach((answer) => {
    adventure = addAnswer(adventure, answer);
  });
  assert.strictEqual(isAdventureComplete(adventure), true);
  const card = generateHarvestCard(adventure);
  assert.strictEqual(card.materials.length, 5);
  assert.strictEqual(card.outline.length, 3);
  assert.strictEqual(card.hints.length, 3);
  assert.ok(!card.hints.join("").includes("范文"));
}

assert.strictEqual(detectEssayType("我的妈妈").id, "person");
assert.strictEqual(detectEssayType("难忘的一件事").id, "event");
assert.strictEqual(detectEssayType("我的小狗").id, "object");
assert.strictEqual(detectEssayType("假如我有一支魔法笔").id, "imagination");

runFullAdventure("我的妈妈", "person");
runFullAdventure("难忘的一件事", "event");
runFullAdventure("我的小狗", "object");
runFullAdventure("假如我有一支魔法笔", "imagination");

let stuck = createAdventure({ title: "我的老师", grade: "三年级" });
stuck = addAnswer(stuck, "不知道");
assert.ok(stuck.lastFeedback.includes("小角度"));

console.log("inspirationEngine tests passed");
