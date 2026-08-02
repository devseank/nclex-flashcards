-- Optional: run after schema.sql to seed the same starter questions used in
-- the app's dummy data, so the real DB isn't empty while you build out your CSV.

insert into public.questions (category, question, choices, correct_index, rationale) values
('Prioritization',
 'A nurse is assigned to four clients at the start of the shift. Which client should the nurse assess first?',
 '["A client with a chronic ulcerative colitis flare reporting 6/10 abdominal pain","A client 2 hours post-thyroidectomy reporting tingling around the mouth","A client with a new diagnosis of type 2 diabetes waiting for discharge teaching","A client with a healing surgical wound requesting a dressing change"]'::jsonb,
 1,
 'Perioral tingling after thyroidectomy suggests hypocalcemia from accidental parathyroid injury/removal, which can progress to laryngospasm or tetany — an airway emergency. The other clients are stable or non-urgent, so this finding takes priority (ABC/airway risk).'),

('Pharmacology',
 'A client taking warfarin has an INR of 6.0 with no active bleeding. Which action should the nurse anticipate?',
 '["Administer the next scheduled dose of warfarin as ordered","Hold warfarin and prepare to administer vitamin K as ordered","Administer protamine sulfate immediately","Increase the warfarin dose to reach therapeutic range"]'::jsonb,
 1,
 'A therapeutic INR is typically 2.0–3.0; an INR of 6.0 indicates excessive anticoagulation and high bleeding risk even without current bleeding. Warfarin is held and vitamin K (its antidote) is given per protocol. Protamine sulfate reverses heparin, not warfarin.'),

('Fundamentals',
 'Which finding in an older adult client is a normal age-related change rather than a concern requiring intervention?',
 '["A resting heart rate of 120 beats/min","Decreased skin turgor with slower recoil","New onset confusion over the past 24 hours","A blood pressure reading of 210/120 mmHg"]'::jsonb,
 1,
 'Decreased skin elasticity and slower turgor recoil are expected age-related skin changes, not a sign of acute illness. Tachycardia at rest, acute confusion, and hypertensive crisis are all abnormal findings warranting further assessment.'),

('Safety',
 'A nurse enters a client''s room and finds a small trash can fire. What is the nurse''s first action?',
 '["Extinguish the fire with the nearest fire extinguisher","Activate the fire alarm","Remove the client and others from immediate danger","Close all doors and windows in the unit"]'::jsonb,
 2,
 'The RACE fire response prioritizes Rescue first — moving anyone in immediate danger away from the fire. Alarm, Confine, and Extinguish follow after people are safe.'),

('Fluid & Electrolytes',
 'A client''s potassium level is 6.2 mEq/L. Which ECG change should the nurse expect?',
 '["Flattened T waves","Peaked T waves","Prominent U waves","Prolonged QT interval"]'::jsonb,
 1,
 'Hyperkalemia (normal range ~3.5–5.0 mEq/L) classically produces tall, peaked T waves on ECG, and can progress to widened QRS complexes and arrhythmias. Flattened T waves and prominent U waves are associated with hypokalemia instead.'),

('Maternal-Newborn',
 'A nurse is caring for a client 2 hours postpartum. Which finding requires immediate follow-up?',
 '["Fundus firm and located at the level of the umbilicus","Moderate lochia rubra saturating half a pad in an hour","Fundus soft and boggy, displaced above and to the right of the umbilicus","Client reports mild afterpains during breastfeeding"]'::jsonb,
 2,
 'A boggy, displaced fundus suggests uterine atony and a full bladder, putting the client at risk for postpartum hemorrhage — this needs immediate intervention (fundal massage, voiding). The other findings are expected in the early postpartum period.'),

('Pharmacology',
 'A client is prescribed furosemide. Which lab value should the nurse monitor most closely?',
 '["Sodium","Potassium","Calcium","Magnesium"]'::jsonb,
 1,
 'Furosemide is a loop diuretic that promotes potassium wasting, putting clients at risk for hypokalemia, which can cause dangerous arrhythmias. While it can affect other electrolytes, potassium monitoring is the priority.'),

('Respiratory',
 'A client with COPD has an oxygen saturation of 90% on room air. The nurse should prepare to administer oxygen targeting which range?',
 '["88%–92%","95%–100%","80%–85%","As high as tolerated with no upper limit"]'::jsonb,
 0,
 'Clients with chronic COPD often rely on a hypoxic drive to stimulate breathing. Oxygen is titrated conservatively, typically targeting 88%–92%, to avoid suppressing respiratory drive while still correcting hypoxemia.'),

('Prioritization',
 'Using the ABC framework, which client should the nurse see first during initial rounds?',
 '["A client with a stable tracheostomy and clear breath sounds","A client reporting new-onset stridor and difficulty swallowing","A client with a blood glucose of 180 mg/dL before breakfast","A client requesting pain medication for a 3/10 headache"]'::jsonb,
 1,
 'Stridor and difficulty swallowing suggest an evolving airway obstruction — an immediate threat to Airway, the first priority in ABC. The other clients are stable or have non-urgent needs.'),

('Fundamentals',
 'Before administering a medication, the nurse checks the client''s identity using which two identifiers?',
 '["Room number and bed number","Full name and date of birth (or medical record number)","Verbal confirmation of name only","Physical appearance and chart photo"]'::jsonb,
 1,
 'The Joint Commission''s National Patient Safety Goals require two patient identifiers that are not room or bed number — typically full name plus date of birth or medical record number — to prevent wrong-patient errors.');
