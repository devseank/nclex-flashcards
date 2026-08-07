import { describe, it, expect } from "vitest";
import type { Question } from "@/services/questions";
import { isCorrect } from "@/lib/quizLogic";

function baseFields(id: number) {
  return {
    id,
    category: "Fundamentals",
    tags: [],
    question: `Question ${id}`,
    rationale: "Because.",
    createdAt: new Date(0).toISOString(),
  };
}

describe("isCorrect", () => {
  describe("choice", () => {
    function question(correctIndices: number[]): Question {
      return { ...baseFields(1), type: "choice", choices: ["A", "B", "C", "D"], correctIndices };
    }

    it("single-select: exact match is correct", () => {
      expect(isCorrect(question([1]), [1])).toBe(true);
    });

    it("single-select: wrong pick is incorrect", () => {
      expect(isCorrect(question([1]), [0])).toBe(false);
    });

    it("SATA: same set in a different order is still correct", () => {
      expect(isCorrect(question([0, 2, 3]), [3, 0, 2])).toBe(true);
    });

    it("SATA: a missing or extra pick is incorrect", () => {
      expect(isCorrect(question([0, 2]), [0])).toBe(false);
      expect(isCorrect(question([0, 2]), [0, 1, 2])).toBe(false);
    });
  });

  describe("sequence", () => {
    function question(correctOrder: number[]): Question {
      return { ...baseFields(2), type: "sequence", choices: ["A", "B", "C"], correctOrder };
    }

    it("exact permutation is correct", () => {
      expect(isCorrect(question([1, 0, 2]), [1, 0, 2])).toBe(true);
    });

    it("same items, different order is incorrect (positional, not a set)", () => {
      expect(isCorrect(question([1, 0, 2]), [0, 1, 2])).toBe(false);
    });

    it("wrong length is incorrect", () => {
      expect(isCorrect(question([1, 0, 2]), [1, 0])).toBe(false);
    });
  });

  describe("grid", () => {
    function question(gridAnswers: number[][]): Question {
      return {
        ...baseFields(3),
        type: "grid",
        choices: ["Row A", "Row B", "Row C"],
        gridColumns: ["Indicated", "Not indicated"],
        gridAnswers,
      };
    }

    it("single-select: exact per-row match is correct", () => {
      expect(isCorrect(question([[0], [1], [0]]), [[0], [1], [0]])).toBe(true);
    });

    it("single-select: a wrong row is incorrect", () => {
      expect(isCorrect(question([[0], [1], [0]]), [[0], [0], [0]])).toBe(false);
    });

    it("multi-select: a row's selections compare as a set, order-independent", () => {
      expect(isCorrect(question([[0, 3], [2]]), [[3, 0], [2]])).toBe(true);
    });

    it("multi-select: a missing or extra selection in a row is incorrect", () => {
      expect(isCorrect(question([[0, 3], [2]]), [[0], [2]])).toBe(false);
      expect(isCorrect(question([[0, 3], [2]]), [[0, 3, 1], [2]])).toBe(false);
    });

    it("wrong row count is incorrect", () => {
      expect(isCorrect(question([[0], [1], [0]]), [[0], [1]])).toBe(false);
    });
  });

  describe("cloze", () => {
    function question(clozeBlanks: { options: string[]; correctIndex: number }[]): Question {
      return {
        ...baseFields(4),
        type: "cloze",
        clozeTemplate: "The nurse should first address the client's {{1}} because {{2}}.",
        clozeBlanks,
      };
    }

    const blanks = [
      { options: ["airway", "hydration status", "pain level"], correctIndex: 0 },
      { options: ["it is the immediate life threat", "it improves comfort", "it is documented first"], correctIndex: 0 },
    ];

    it("correct pick for every blank is correct", () => {
      expect(isCorrect(question(blanks), [0, 0])).toBe(true);
    });

    it("a wrong pick on any one blank is incorrect (positional, not a set)", () => {
      expect(isCorrect(question(blanks), [0, 1])).toBe(false);
      expect(isCorrect(question(blanks), [1, 0])).toBe(false);
    });

    it("wrong blank count is incorrect", () => {
      expect(isCorrect(question(blanks), [0])).toBe(false);
    });
  });
});
