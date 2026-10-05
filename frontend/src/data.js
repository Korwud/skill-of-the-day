export const directions = {
  analyst: { name: 'Системный анализ', short: 'Аналитик', skills: ['Работа с требованиями', 'Моделирование данных', 'SQL', 'REST API', 'UML', 'Git', 'BPMN', 'SOAP'] },
  csharp: { name: 'Разработка C#', short: 'Разработчик C#', skills: ['C#', '.NET', 'SQL', 'Git', 'REST API', 'Docker', 'Entity Framework', 'Тестирование'] },
  qa: { name: 'Тестирование ПО', short: 'Тестировщик', skills: ['Тест-дизайн', 'Тест-кейсы', 'SQL', 'REST API', 'Postman', 'Git', 'Автотесты', 'Python'] },
};
export const regions = ['Москва', 'Санкт-Петербург', 'Екатеринбург'];
export const seedProfile = { direction: 'analyst', regions: [], skills: ['Работа с требованиями', 'Моделирование данных'] };
// Synthetic, deterministic vacancy fixtures. No request to hh.ru is made.
export function vacancies(direction) {
  const s = directions[direction].skills;
  const groups = [[0,1], [0,1,2], [0,1,3], [0,1,2,3], [0,1,2,4], [0,1,3,5], [0,1,2,3,4], [0,1,4,5], [0,1,2,3,4,5], [0,1,6,7]];
  return Array.from({length:120}, (_, i) => ({
    id: `${direction}-${i}`, name: `${directions[direction].short}${i % 5 === 0 ? ' · junior' : ''}`,
    company: ['Компания Север', 'Студия Контур', 'Команда Орбита', 'Бюро Система'][i%4],
    region: regions[i%3], remote: i%4 === 0,
    experience: i%5 === 0 ? 'Без опыта' : '1–3 года',
    required: groups[Math.floor(i/12)].map(index=>s[index]),
  }));
}
export function getScope(profile) {
  return vacancies(profile.direction).filter(v => !profile.regions.length || profile.regions.includes(v.region) || (profile.regions.includes('Удалённая работа') && v.remote));
}
export function coverage(jobs, skills) { return jobs.filter(v=>v.required.every(s=>skills.includes(s))).length; }
export function skillGain(jobs, skills, skill) { return coverage(jobs,[...skills,skill])-coverage(jobs,skills); }
export function buildPlan(jobs, skills) {
  let learned = [...skills];
  const steps=[];
  for(let i=0;i<3;i++) {
    const missing=jobs.map(v=>v.required.filter(s=>!learned.includes(s))).filter(d=>d.length);
    if(!missing.length) break;
    const min=Math.min(...missing.map(d=>d.length));
    const bundles=[...new Map(missing.filter(d=>d.length===min).map(d=>[JSON.stringify([...d].sort()),d])).values()];
    bundles.sort((a,b)=>coverage(jobs,[...learned,...b])-coverage(jobs,[...learned,...a]));
    const selected=bundles[0].slice(0,5);
    const before=[...learned];
    selected.sort((a,b)=>skillGain(jobs,before,b)-skillGain(jobs,before,a));
    learned=[...learned,...selected];
    steps.push({ skills:selected, gain:coverage(jobs,learned)-coverage(jobs,before), before, partial:bundles[0].length>5 });
  }
  return steps;
}
