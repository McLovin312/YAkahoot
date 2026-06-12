import type { Question } from "@/types";

/**
 * Brainrot / Meme trivia question bank (25 questions).
 *
 * Convention: the correct answer is ALWAYS authored at index 0 here —
 * `shuffleQuestionOptions()` randomizes the order at game creation.
 * Questions with `image` show the picture on the host's big screen.
 */
export const brainrotQuestions: Question[] = [
  {
    id: "br-01",
    topic: "brainrot",
    question: "These two best numbers are right next to each other.",
    options: ["6, 7", "4, 5", "8, 9", "1, 2"],
    correctIndex: 0,
  },
  {
    id: "br-02",
    topic: "brainrot",
    question: "This pig likes to call people.",
    options: ["John Pork", "Peppa Pig", "Porky Pig", "Sir Oinks-a-lot"],
    correctIndex: 0,
  },
  {
    id: "br-03",
    topic: "brainrot",
    question:
      'Originally "Musical.ly", this app was popularized through trendy dances and meme culture.',
    options: ["TikTok", "Instagram Reels", "YouTube Shorts", "Snapchat"],
    correctIndex: 0,
  },
  {
    id: "br-04",
    topic: "brainrot",
    question:
      "Jump from the battle bus and be the last one standing in this battle royale game.",
    options: ["Fortnite", "Apex Legends", "PUBG", "Fall Guys"],
    correctIndex: 0,
  },
  {
    id: "br-05",
    topic: "brainrot",
    question:
      "A dance that shares its name with something you should do daily when cleaning your teeth.",
    options: ["The Floss", "The Dab", "The Griddy", "The Whip"],
    correctIndex: 0,
  },
  {
    id: "br-06",
    topic: "brainrot",
    question: "A streamer that shares its name with another word for cheese.",
    options: ["CaseOh", "IShowSpeed", "Kai Cenat", "MrBeast"],
    correctIndex: 0,
  },
  {
    id: "br-07",
    topic: "brainrot",
    question: "What's 9 + 10?",
    options: ["21", "19", "910", "Tree fiddy"],
    correctIndex: 0,
  },
  {
    id: "br-08",
    topic: "brainrot",
    question: 'Official name of "Triple T"',
    options: [
      "Tung Tung Tung Sahur",
      "Tralalero Tralala",
      "Tum Tum Tum Sahur",
      "Ballerina Cappuccina",
    ],
    correctIndex: 0,
  },
  {
    id: "br-09",
    topic: "brainrot",
    question: 'Finish this meme: "Road work ahead? _____."',
    options: [
      "Uh yeah, I sure hope it does",
      "Not on my watch",
      "Better call the city",
      "Guess we're walking",
    ],
    correctIndex: 0,
  },
  {
    id: "br-10",
    topic: "brainrot",
    question: "A move where you put your head into your bent arm.",
    options: ["The Dab", "The Floss", "The T-Pose", "The Nae Nae"],
    correctIndex: 0,
  },
  {
    id: "br-11",
    topic: "brainrot",
    question: "What soda is traditionally associated with MLG?",
    options: ["Mountain Dew", "Sprite", "Mello Yello", "Dr Pepper"],
    correctIndex: 0,
  },
  {
    id: "br-12",
    topic: "brainrot",
    question: "Name this classic meme.",
    options: ["Grumpy Cat", "Angry Cat", "Pop Cat", "Smudge the Cat"],
    correctIndex: 0,
    image: "/questions/grumpy-cat.jpg",
  },
  {
    id: "br-13",
    topic: "brainrot",
    question: '"Peanut Butter Jelly Time" showcases what dancing fruit?',
    options: ["Banana", "Apple", "Pineapple", "Mango"],
    correctIndex: 0,
  },
  {
    id: "br-14",
    topic: "brainrot",
    question:
      "A poptart cat flying in the sky with a rainbow trailing behind it.",
    options: ["Nyan Cat", "Pop Cat", "Rainbow Cat", "Keyboard Cat"],
    correctIndex: 0,
  },
  {
    id: "br-15",
    topic: "brainrot",
    question: "The imposter is ___.",
    options: ["Sus", "Red", "Vented", "Among Us"],
    correctIndex: 0,
  },
  {
    id: "br-16",
    topic: "brainrot",
    question: "A pose where you lift both arms straight out on your sides.",
    options: ["T-Pose", "The Dab", "Y-Pose", "The Griddy"],
    correctIndex: 0,
  },
  {
    id: "br-17",
    topic: "brainrot",
    question:
      "What language are the names of brainrot characters typically written in?",
    options: ["Italian", "Spanish", "French", "Portuguese"],
    correctIndex: 0,
  },
  {
    id: "br-18",
    topic: "brainrot",
    question: 'Finish this sentence: "My collar\'s _____, but my neck is _____."',
    options: ["blue, red", "red, blue", "white, red", "green, gold"],
    correctIndex: 0,
  },
  {
    id: "br-19",
    topic: "brainrot",
    question: 'Finish this sentence: "Now watch me whip, now watch me _____."',
    options: ["nae-nae", "dab", "floss", "superman"],
    correctIndex: 0,
  },
  {
    id: "br-20",
    topic: "brainrot",
    question: "What is the name of this classic internet meme?",
    options: ["Troll Face", "Rage Guy", "Me Gusta", "Smug Face"],
    correctIndex: 0,
    image: "/questions/troll-face.png",
  },
  {
    id: "br-21",
    topic: "brainrot",
    question: "What song did Bowser sing in the first Mario Bros movie?",
    options: ["Peaches", "Princess", "Mushroom Kingdom", "Mamma Mia"],
    correctIndex: 0,
  },
  {
    id: "br-22",
    topic: "brainrot",
    question:
      "What line from the Minecraft movie prompted kids to often throw popcorn in the theatre?",
    options: [
      "Chicken Jockey",
      "The Nether!",
      "Flint and Steel",
      "I am Steve",
    ],
    correctIndex: 0,
  },
  {
    id: "br-23",
    topic: "brainrot",
    question: "What is the name of this classic internet meme?",
    options: ["Forever Alone", "Troll Face", "Rage Guy", "Crying Wojak"],
    correctIndex: 0,
    image: "/questions/forever-alone.jpg",
  },
  {
    id: "br-24",
    topic: "brainrot",
    question: "Zootopia's Nick Wilde loves this dance.",
    options: ["The Scuba dance", "The Griddy", "The Floss", "The Robot"],
    correctIndex: 0,
  },
  {
    id: "br-25",
    topic: "brainrot",
    question: "Name this classic meme.",
    options: ["Doge", "Cheems", "Walter", "Shiba Steve"],
    correctIndex: 0,
    image: "/questions/doge.jpg",
  },
];
