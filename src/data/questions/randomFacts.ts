import type { Question } from "@/types";

/**
 * Random round question bank (20 questions).
 *
 * AUTHORING CONVENTION: the correct answer is always written FIRST
 * (correctIndex 0). Answer positions are shuffled per-game by
 * `shuffleQuestionOptions` in src/lib/utils.ts.
 */
export const randomFactsQuestions: Question[] = [
  {
    id: "rf-01",
    topic: "random-facts",
    question: "What is the largest planet in our solar system?",
    options: ["Jupiter", "Pluto", "Mars", "Earth"],
    correctIndex: 0,
  },
  {
    id: "rf-02",
    topic: "random-facts",
    question: "Which country gifted the Statue of Liberty to the United States?",
    options: ["France", "China", "Germany", "Canada"],
    correctIndex: 0,
  },
  {
    id: "rf-03",
    topic: "random-facts",
    question: "In what year did the Titanic sink?",
    options: ["1912", "1942", "1895", "1920"],
    correctIndex: 0,
  },
  {
    id: "rf-04",
    topic: "random-facts",
    question: "What is the chemical symbol for gold?",
    options: ["Au", "Go", "Gd", "Du"],
    correctIndex: 0,
  },
  {
    id: "rf-05",
    topic: "random-facts",
    question: "Who wrote Romeo and Juliet?",
    options: [
      "William Shakespeare",
      "Edgar Allan Poe",
      "Charles Dickens",
      "Stephen King",
    ],
    correctIndex: 0,
  },
  {
    id: "rf-06",
    topic: "random-facts",
    question: "What is the capital city of Australia?",
    options: ["Canberra", "Sydney", "Melbourne", "Brisbane"],
    correctIndex: 0,
  },
  {
    id: "rf-07",
    topic: "random-facts",
    question:
      "How many players are on the court for one basketball team during play?",
    options: ["5", "6", "7", "8"],
    correctIndex: 0,
  },
  {
    id: "rf-08",
    topic: "random-facts",
    question: "What is the hardest natural substance on Earth?",
    options: ["Diamond", "Limestone", "Granite", "Quartz"],
    correctIndex: 0,
  },
  {
    id: "rf-09",
    topic: "random-facts",
    question: "Which ocean is the largest?",
    options: ["Pacific", "Atlantic", "Indian", "Arctic"],
    correctIndex: 0,
  },
  {
    id: "rf-10",
    topic: "random-facts",
    question:
      "What popular board game features properties such as Boardwalk and Park Place?",
    options: ["Monopoly", "Candy Land", "Sorry!", "Clue"],
    correctIndex: 0,
  },
  {
    id: "rf-11",
    topic: "random-facts",
    question: "What do you call a group of flamingos?",
    options: ["A flamboyance", "A flock", "A colony", "A parade"],
    correctIndex: 0,
  },
  {
    id: "rf-12",
    topic: "random-facts",
    question: 'Where is this quote from? "I am your father."',
    options: [
      "Star Wars: The Empire Strikes Back",
      "Star Wars: A New Hope",
      "Star Wars: Attack of the Clones",
      "Star Wars: Return of the Jedi",
    ],
    correctIndex: 0,
  },
  {
    id: "rf-13",
    topic: "random-facts",
    question: "How many rings are on the Olympic flag?",
    options: ["5 rings", "4 rings", "7 rings", "6 rings"],
    correctIndex: 0,
  },
  {
    id: "rf-14",
    topic: "random-facts",
    question:
      "Approximately how many gallons of ice cream does the average American eat each year?",
    options: ["4 gallons", "8 gallons", "2 gallons", "3 gallons"],
    correctIndex: 0,
  },
  {
    id: "rf-15",
    topic: "random-facts",
    question: 'Which U.S. state is known as the "Sunshine State"?',
    options: ["Florida", "California", "Colorado", "Texas"],
    correctIndex: 0,
  },
  {
    id: "rf-16",
    topic: "random-facts",
    question: "What is the fastest land animal?",
    options: ["Cheetah", "Leopard", "Lion", "Antelope"],
    correctIndex: 0,
  },
  {
    id: "rf-17",
    topic: "random-facts",
    question: "What is the name of Harry Potter's owl?",
    options: ["Hedwig", "Norbert", "Errol", "Scabbers"],
    correctIndex: 0,
  },
  {
    id: "rf-18",
    topic: "random-facts",
    question: "Which continent is the Sahara Desert located on?",
    options: ["Africa", "South America", "Asia", "Australia"],
    correctIndex: 0,
  },
  {
    id: "rf-19",
    topic: "random-facts",
    question: "What gas do plants absorb from the atmosphere?",
    options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"],
    correctIndex: 0,
  },
  {
    id: "rf-20",
    topic: "random-facts",
    question: "What is the smallest U.S. state by area?",
    options: ["Rhode Island", "Hawaii", "Vermont", "Maryland"],
    correctIndex: 0,
  },
];
