const fs = require('fs');

// Robust CSV parser that handles quoted fields properly
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

const raw = fs.readFileSync('بنك اسئله فانوس المعرفه للمرحله الاعداديه.csv', 'utf-8');
const lines = raw.split(/\r?\n/);

// Structure: Section > SubSection (محور) > Questions
// CSV cols: [0] SectionName, [1] QuestionNumber, [2] SubSection(محور), [3] Question, [4] Answer, [5] Skill

const sections = {};
let skippedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);

  if (cols.length < 5) {
    skippedCount++;
    continue;
  }

  const sectionRaw = cols[0].trim();
  const qNum = cols[1].trim();
  const subSection = cols[2].trim();
  const question = cols[3].trim();
  const answer = cols[4].trim();
  const skill = cols.length >= 6 ? cols[5].trim() : '';

  // Skip header rows
  if (qNum === 'رقم السؤال' || subSection === 'المحور') continue;

  // Skip empty fields
  if (!question || !answer || !subSection) {
    skippedCount++;
    continue;
  }

  // Clean section name — remove "(100 سؤال)", trailing "(123", etc.
  let sectionName = sectionRaw
    .replace(/\(?\d+\s*سؤال\s*\)?\.?/g, '')  // (100 سؤال).
    .replace(/\(\d+\s*$/, '')                  // trailing (198
    .replace(/[().,]/g, '')
    .trim();

  // Build hierarchy: Section > SubSection > Questions
  if (!sections[sectionName]) {
    sections[sectionName] = {};
  }
  if (!sections[sectionName][subSection]) {
    sections[sectionName][subSection] = [];
  }

  sections[sectionName][subSection].push({
    number: parseInt(qNum) || sections[sectionName][subSection].length + 1,
    question,
    answer,
    skill
  });
}

// Format the output
const finalData = Object.keys(sections).map(sectionName => {
  const subSections = Object.keys(sections[sectionName]).map(subName => ({
    name: subName,
    questions: sections[sectionName][subName]
  }));

  const totalQuestions = subSections.reduce((s, sub) => s + sub.questions.length, 0);

  return {
    section: sectionName,
    totalQuestions,
    subSections
  };
});

fs.writeFileSync('prep_content.json', JSON.stringify(finalData, null, 2), 'utf-8');

console.log('\n✅ Conversion complete — prep_content.json');
console.log('─────────────────────────────────────────');
let grandTotal = 0;
finalData.forEach(s => {
  console.log(`\n📚 ${s.section} (${s.totalQuestions} سؤال)`);
  s.subSections.forEach(sub => {
    console.log(`   ├─ ${sub.name}: ${sub.questions.length} أسئلة`);
  });
  grandTotal += s.totalQuestions;
});
console.log(`\n─────────────────────────────────────────`);
console.log(`  المجموع الكلي: ${grandTotal} سؤال`);
console.log(`  ${finalData.length} أقسام رئيسية`);
if (skippedCount > 0) console.log(`  ⚠ تم تخطي ${skippedCount} سطر`);
