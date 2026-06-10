import type { Question } from "@/types";

/**
 * Bible round question bank (25 questions + 1 bonus).
 *
 * AUTHORING CONVENTION: the correct answer is always written FIRST
 * (correctIndex 0). Answer positions are shuffled per-game by
 * `shuffleQuestionOptions` in src/lib/utils.ts, so players can never learn
 * "the first color is always right".
 */
export const bibleQuestions: Question[] = [
  {
    id: "bi-01",
    topic: "bible",
    question: "Who built the ark?",
    options: ["Noah", "Moses", "Abraham", "David"],
    correctIndex: 0,
  },
  {
    id: "bi-02",
    topic: "bible",
    question: "What was the name of the garden where Adam and Eve lived?",
    options: [
      "The Garden of Eden",
      "The Garden of Gethsemane",
      "The Garden of Babylon",
      "The Garden of Galilee",
    ],
    correctIndex: 0,
  },
  {
    id: "bi-03",
    topic: "bible",
    question: "How many disciples did Jesus have?",
    options: ["12", "10", "11", "7"],
    correctIndex: 0,
  },
  {
    id: "bi-04",
    topic: "bible",
    question: "Who was swallowed by a great fish?",
    options: ["Jonah", "Job", "Joshua", "Jacob"],
    correctIndex: 0,
  },
  {
    id: "bi-05",
    topic: "bible",
    question: "What was Jesus' mother's name?",
    options: ["Mary", "Martha", "Elizabeth", "Ruth"],
    correctIndex: 0,
  },
  {
    id: "bi-06",
    topic: "bible",
    question: "What is the first book of the Bible?",
    options: ["Genesis", "Exodus", "Matthew", "Psalms"],
    correctIndex: 0,
  },
  {
    id: "bi-07",
    topic: "bible",
    question: "What is the last book of the Bible?",
    options: ["Revelation", "Malachi", "Jude", "Acts"],
    correctIndex: 0,
  },
  {
    id: "bi-08",
    topic: "bible",
    question: "Who defeated Goliath?",
    options: ["David", "Saul", "Samson", "Joshua"],
    correctIndex: 0,
  },
  {
    id: "bi-09",
    topic: "bible",
    question: "What did God create on the first day?",
    options: ["Light", "Animals", "Humans", "Stars"],
    correctIndex: 0,
  },
  {
    id: "bi-10",
    topic: "bible",
    question: "What city was Jesus born in?",
    options: ["Bethlehem", "Nazareth", "Jerusalem", "Jericho"],
    correctIndex: 0,
  },
  {
    id: "bi-11",
    topic: "bible",
    question: "What was the name of Moses' brother?",
    options: ["Aaron", "Joshua", "Caleb", "Eli"],
    correctIndex: 0,
  },
  {
    id: "bi-12",
    topic: "bible",
    question: "Which disciple walked on water with Jesus?",
    options: ["Peter", "John", "Andrew", "James"],
    correctIndex: 0,
  },
  {
    id: "bi-13",
    topic: "bible",
    question: "How many days and nights did it rain during the flood?",
    options: ["40", "7", "30", "100"],
    correctIndex: 0,
  },
  {
    id: "bi-14",
    topic: "bible",
    question: "What was Saul's name changed to after his conversion?",
    options: ["Paul", "Peter", "Philip", "Timothy"],
    correctIndex: 0,
  },
  {
    id: "bi-15",
    topic: "bible",
    question: "Who interpreted Pharaoh's dreams in Egypt?",
    options: ["Joseph", "Daniel", "Moses", "Benjamin"],
    correctIndex: 0,
  },
  {
    id: "bi-16",
    topic: "bible",
    question: "What were the names of Lazarus' sisters?",
    options: [
      "Mary and Martha",
      "Ruth and Naomi",
      "Rachel and Leah",
      "Mary and Elizabeth",
    ],
    correctIndex: 0,
  },
  {
    id: "bi-17",
    topic: "bible",
    question: "Which judge led Israel with an army of only 300 men?",
    options: ["Gideon", "Samson", "Joshua", "Deborah"],
    correctIndex: 0,
  },
  {
    id: "bi-18",
    topic: "bible",
    question:
      "What fruit did the spies bring back from Canaan as evidence of the land's abundance?",
    options: [
      "A cluster of grapes",
      "A basket of figs",
      "Pomegranates",
      "Olives",
    ],
    correctIndex: 0,
  },
  {
    id: "bi-19",
    topic: "bible",
    question: "What occupation did Matthew have before following Jesus?",
    options: ["Tax collector", "Fisherman", "Carpenter", "Shepherd"],
    correctIndex: 0,
  },
  {
    id: "bi-20",
    topic: "bible",
    question: "Which king asked God for wisdom rather than riches?",
    options: ["Solomon", "David", "Hezekiah", "Josiah"],
    correctIndex: 0,
  },
  {
    id: "bi-21",
    topic: "bible",
    question: "Who betrayed Jesus?",
    options: ["Judas", "Peter", "Thomas", "John"],
    correctIndex: 0,
  },
  {
    id: "bi-22",
    topic: "bible",
    question: "Which prophet's donkey spoke to him?",
    options: ["Balaam", "Elijah", "Elisha", "Micah"],
    correctIndex: 0,
  },
  {
    id: "bi-23",
    topic: "bible",
    question:
      "What was the name of the woman who hid the Israelite spies in Jericho?",
    options: ["Rahab", "Ruth", "Esther", "Deborah"],
    correctIndex: 0,
  },
  {
    id: "bi-24",
    topic: "bible",
    question: 'In which book of the Bible is the verse "Jesus wept" found?',
    options: ["John", "Luke", "Matthew", "Mark"],
    correctIndex: 0,
  },
  {
    id: "bi-25",
    topic: "bible",
    question:
      "What was the name of the short tax collector who climbed a tree to see Jesus?",
    options: ["Zacchaeus", "Matthew", "Nicodemus", "Bartimaeus"],
    correctIndex: 0,
  },
  // Bonus question
  {
    id: "bi-26",
    topic: "bible",
    question: 'BONUS: Which disciple was known as "the doubter"?',
    options: ["Thomas", "Peter", "Philip", "Andrew"],
    correctIndex: 0,
  },
];
