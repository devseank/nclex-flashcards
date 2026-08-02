export type Question = {
  id: string;
  category: string;
  question: string;
  choices: string[];
  correctIndex: number;
  rationale: string;
};

export const questions: Question[] = [
  {
    id: "q1",
    category: "Prioritization",
    question:
      "A nurse is assigned to four clients at the start of the shift. Which client should the nurse assess first?",
    choices: [
      "A client with a chronic ulcerative colitis flare reporting 6/10 abdominal pain",
      "A client 2 hours post-thyroidectomy reporting tingling around the mouth",
      "A client with a new diagnosis of type 2 diabetes waiting for discharge teaching",
      "A client with a healing surgical wound requesting a dressing change",
    ],
    correctIndex: 1,
    rationale:
      "Perioral tingling after thyroidectomy suggests hypocalcemia from accidental parathyroid injury/removal, which can progress to laryngospasm or tetany — an airway emergency. The other clients are stable or non-urgent, so this finding takes priority (ABC/airway risk).",
  },
  {
    id: "q2",
    category: "Pharmacology",
    question:
      "A client taking warfarin has an INR of 6.0 with no active bleeding. Which action should the nurse anticipate?",
    choices: [
      "Administer the next scheduled dose of warfarin as ordered",
      "Hold warfarin and prepare to administer vitamin K as ordered",
      "Administer protamine sulfate immediately",
      "Increase the warfarin dose to reach therapeutic range",
    ],
    correctIndex: 1,
    rationale:
      "A therapeutic INR is typically 2.0–3.0; an INR of 6.0 indicates excessive anticoagulation and high bleeding risk even without current bleeding. Warfarin is held and vitamin K (its antidote) is given per protocol. Protamine sulfate reverses heparin, not warfarin.",
  },
  {
    id: "q3",
    category: "Fundamentals",
    question:
      "Which finding in an older adult client is a normal age-related change rather than a concern requiring intervention?",
    choices: [
      "A resting heart rate of 120 beats/min",
      "Decreased skin turgor with slower recoil",
      "New onset confusion over the past 24 hours",
      "A blood pressure reading of 210/120 mmHg",
    ],
    correctIndex: 1,
    rationale:
      "Decreased skin elasticity and slower turgor recoil are expected age-related skin changes, not a sign of acute illness. Tachycardia at rest, acute confusion, and hypertensive crisis are all abnormal findings warranting further assessment.",
  },
  {
    id: "q4",
    category: "Safety",
    question:
      "A nurse enters a client's room and finds a small trash can fire. What is the nurse's first action?",
    choices: [
      "Extinguish the fire with the nearest fire extinguisher",
      "Activate the fire alarm",
      "Remove the client and others from immediate danger",
      "Close all doors and windows in the unit",
    ],
    correctIndex: 2,
    rationale:
      "The RACE fire response prioritizes Rescue first — moving anyone in immediate danger away from the fire. Alarm, Confine, and Extinguish follow after people are safe.",
  },
  {
    id: "q5",
    category: "Fluid & Electrolytes",
    question:
      "A client's potassium level is 6.2 mEq/L. Which ECG change should the nurse expect?",
    choices: [
      "Flattened T waves",
      "Peaked T waves",
      "Prominent U waves",
      "Prolonged QT interval",
    ],
    correctIndex: 1,
    rationale:
      "Hyperkalemia (normal range ~3.5–5.0 mEq/L) classically produces tall, peaked T waves on ECG, and can progress to widened QRS complexes and arrhythmias. Flattened T waves and prominent U waves are associated with hypokalemia instead.",
  },
  {
    id: "q6",
    category: "Maternal-Newborn",
    question:
      "A nurse is caring for a client 2 hours postpartum. Which finding requires immediate follow-up?",
    choices: [
      "Fundus firm and located at the level of the umbilicus",
      "Moderate lochia rubra saturating half a pad in an hour",
      "Fundus soft and boggy, displaced above and to the right of the umbilicus",
      "Client reports mild afterpains during breastfeeding",
    ],
    correctIndex: 2,
    rationale:
      "A boggy, displaced fundus suggests uterine atony and a full bladder, putting the client at risk for postpartum hemorrhage — this needs immediate intervention (fundal massage, voiding). The other findings are expected in the early postpartum period.",
  },
  {
    id: "q7",
    category: "Pharmacology",
    question:
      "A client is prescribed furosemide. Which lab value should the nurse monitor most closely?",
    choices: ["Sodium", "Potassium", "Calcium", "Magnesium"],
    correctIndex: 1,
    rationale:
      "Furosemide is a loop diuretic that promotes potassium wasting, putting clients at risk for hypokalemia, which can cause dangerous arrhythmias. While it can affect other electrolytes, potassium monitoring is the priority.",
  },
  {
    id: "q8",
    category: "Respiratory",
    question:
      "A client with COPD has an oxygen saturation of 90% on room air. The nurse should prepare to administer oxygen targeting which range?",
    choices: [
      "88%–92%",
      "95%–100%",
      "80%–85%",
      "As high as tolerated with no upper limit",
    ],
    correctIndex: 0,
    rationale:
      "Clients with chronic COPD often rely on a hypoxic drive to stimulate breathing. Oxygen is titrated conservatively, typically targeting 88%–92%, to avoid suppressing respiratory drive while still correcting hypoxemia.",
  },
  {
    id: "q9",
    category: "Prioritization",
    question:
      "Using the ABC framework, which client should the nurse see first during initial rounds?",
    choices: [
      "A client with a stable tracheostomy and clear breath sounds",
      "A client reporting new-onset stridor and difficulty swallowing",
      "A client with a blood glucose of 180 mg/dL before breakfast",
      "A client requesting pain medication for a 3/10 headache",
    ],
    correctIndex: 1,
    rationale:
      "Stridor and difficulty swallowing suggest an evolving airway obstruction — an immediate threat to Airway, the first priority in ABC. The other clients are stable or have non-urgent needs.",
  },
  {
    id: "q10",
    category: "Fundamentals",
    question:
      "Before administering a medication, the nurse checks the client's identity using which two identifiers?",
    choices: [
      "Room number and bed number",
      "Full name and date of birth (or medical record number)",
      "Verbal confirmation of name only",
      "Physical appearance and chart photo",
    ],
    correctIndex: 1,
    rationale:
      "The Joint Commission's National Patient Safety Goals require two patient identifiers that are not room or bed number — typically full name plus date of birth or medical record number — to prevent wrong-patient errors.",
  },
];
