const {
  ESSAY_TYPES,
  TYPE_ORDER,
  addAnswer,
  createAdventure,
  detectEssayType,
  generateHarvestCard,
  isAdventureComplete
} = require("../../utils/inspirationEngine");
const { saveCard } = require("../../utils/storage");

Page({
  data: {
    mode: "setup",
    title: "",
    requirement: "",
    grade: "四年级",
    grades: ["三年级", "四年级", "五年级", "六年级"],
    detectedTypeId: "event",
    typeCards: TYPE_ORDER.map((id) => ESSAY_TYPES[id]),
    adventure: null,
    answer: "",
    currentQuestion: "",
    harvestCard: null
  },

  onTitleInput(event) {
    const title = event.detail.value;
    this.setData({
      title,
      detectedTypeId: detectEssayType(title, this.data.requirement).id
    });
  },

  onRequirementInput(event) {
    const requirement = event.detail.value;
    this.setData({
      requirement,
      detectedTypeId: detectEssayType(this.data.title, requirement).id
    });
  },

  selectGrade(event) {
    this.setData({ grade: event.currentTarget.dataset.grade });
  },

  startAdventure() {
    if (!this.data.title.trim()) {
      wx.showToast({ title: "先输入题目", icon: "none" });
      return;
    }
    const adventure = createAdventure({
      title: this.data.title,
      grade: this.data.grade,
      requirement: this.data.requirement
    });
    this.setData({
      mode: "adventure",
      adventure,
      answer: "",
      currentQuestion: adventure.prompts[0]
    });
  },

  onAnswerInput(event) {
    this.setData({ answer: event.detail.value });
  },

  useVoice() {
    wx.showToast({
      title: "语音入口已预留",
      icon: "none"
    });
  },

  submitAnswer() {
    if (!this.data.answer.trim()) {
      wx.showToast({ title: "说一点点也可以", icon: "none" });
      return;
    }
    const adventure = addAnswer(this.data.adventure, this.data.answer);
    if (isAdventureComplete(adventure)) {
      const harvestCard = generateHarvestCard(adventure);
      saveCard(harvestCard);
      this.setData({
        mode: "result",
        adventure,
        answer: "",
        currentQuestion: "",
        harvestCard
      });
      return;
    }
    this.setData({
      adventure,
      answer: "",
      currentQuestion: adventure.prompts[adventure.currentStep]
    });
  },

  resetAdventure() {
    this.setData({
      mode: "setup",
      title: "",
      requirement: "",
      detectedTypeId: "event",
      adventure: null,
      answer: "",
      currentQuestion: "",
      harvestCard: null
    });
  },

  goHistory() {
    wx.switchTab({ url: "/pages/history/history" });
  }
});
