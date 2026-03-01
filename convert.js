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
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
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

const raw = fs.readFileSync('بنك المعلومات.csv', 'utf-8');
const lines = raw.split(/\r?\n/);

const categories = {};
let skippedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);

  if (cols.length < 4) {
    console.log(`⚠ Line ${i + 1}: only ${cols.length} columns. Skipped.`);
    skippedCount++;
    continue;
  }

  const id = cols[0].trim();
  const category = cols[1].trim();
  const question = cols[2].trim();
  const answer = cols[3].trim();

  // Skip header row
  if (id === 'م' || category === 'المجال') continue;

  // Skip empty fields
  if (!category || !question || !answer) {
    console.log(`⚠ Line ${i + 1}: empty field. id=${id} cat=${category} q=${question ? question.substring(0, 30) : ''} a=${answer}`);
    skippedCount++;
    continue;
  }

  if (!categories[category]) {
    categories[category] = [];
  }
  categories[category].push({ question, answer });
}

// Format the output
const finalData = Object.keys(categories).map(cat => ({
  category: cat,
  questions: categories[cat]
}));

fs.writeFileSync('adult_content.json', JSON.stringify(finalData, null, 4), 'utf-8');

console.log('\n✅ Conversion complete!');
console.log('─────────────────────');
finalData.forEach(c => console.log(`  ${c.category}: ${c.questions.length} سؤال`));
const total = finalData.reduce((s, c) => s + c.questions.length, 0);
console.log(`─────────────────────`);
console.log(`  المجموع: ${total} سؤال`);
if (skippedCount > 0) console.log(`  ⚠ تم تخطي ${skippedCount} سطر`);
